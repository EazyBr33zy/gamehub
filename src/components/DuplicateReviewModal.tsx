import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useIsOwner } from '../hooks/useIsOwner';
import { 
  CheckCircle2, 
  CopyCheck, 
  AlertTriangle, 
  Layers, 
  Clock, 
  Star, 
  Gamepad2, 
  Image as ImageIcon, 
  Trash2, 
  Download,
  Info,
  Calendar
} from 'lucide-react';
import { GameItem, GameplayDaySession } from '../types/game';
import { 
  cleanTitle, 
  normalizeTitleKey, 
  normalizeConsoleName, 
  formatTempoDisplay, 
  parseToMinutes, 
  formatMinutes 
} from '../utils/markdownParser';
import { getPlatformStyle } from '../utils/platformStyles';
import { Modal } from './Modal';
import { showToast } from '../utils/toast';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { stripUndefined } from '../utils/stripUndefined';

interface DuplicateGroup {
  id: string;
  normalizedTitle: string;
  displayTitle: string;
  isSamePlatform: boolean;
  platformName?: string;
  games: GameItem[];
  suggestedKeepId: string;
}

// Heuristic to pick the most complete game:
// status: zerado > jogando > pausado > fila > wishlist
// with rating, time, sessions, cover; in tie, the oldest (earliest date)
function calculateCompletenessScore(g: GameItem): number {
  let score = 0;
  if (g.status === 'zerado') score += 100;
  else if (g.status === 'jogando') score += 70;
  else if (g.status === 'pausado') score += 50;
  else if (g.status === 'fila') score += 30;
  else if (g.status === 'abandonado') score += 20;
  else if (g.status === 'wishlist') score += 10;

  if (g.nota !== undefined && g.nota > 0) score += 20;

  const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
  if (mins > 0) score += 20;

  if (g.sessoes && g.sessoes.length > 0) {
    score += 25 + Math.min(20, g.sessoes.length * 2);
  }

  if (g.capa && g.capa.trim() !== '' && !g.capa.includes('placeholder')) {
    score += 15;
  }

  if (g.rubric) score += 10;
  if (g.anotacoes && g.anotacoes.trim().length > 0) score += 10;

  return score;
}

function pickSuggestedGame(gamesList: GameItem[]): GameItem {
  const sorted = [...gamesList].sort((a, b) => {
    const scoreA = calculateCompletenessScore(a);
    const scoreB = calculateCompletenessScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Tie-breaker: oldest date (data_inicio) or ID
    const dateA = a.data_inicio || '9999-99-99';
    const dateB = b.data_inicio || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.id || '').localeCompare(b.id || '');
  });
  return sorted[0];
}

// Merge sessions without duplicating identical day and time intervals
function mergeSessionsWithoutDuplicates(
  baseSessions: GameplayDaySession[] = [], 
  extraSessions: GameplayDaySession[] = []
): GameplayDaySession[] {
  const merged: GameplayDaySession[] = JSON.parse(JSON.stringify(baseSessions));

  extraSessions.forEach((extra) => {
    const existingDay = merged.find((s) => s.data === extra.data);
    if (!existingDay) {
      merged.push(JSON.parse(JSON.stringify(extra)));
    } else {
      const existingIntervals = existingDay.intervalos || [];
      const newIntervals = [...existingIntervals];

      (extra.intervalos || []).forEach((extraInt) => {
        const isDuplicate = existingIntervals.some(
          (i) => i.inicio === extraInt.inicio && i.fim === extraInt.fim
        );
        if (!isDuplicate) {
          newIntervals.push(extraInt);
        }
      });

      existingDay.intervalos = newIntervals;
      existingDay.totalMinutos = newIntervals.reduce((sum, i) => sum + i.minutos, 0);
    }
  });

  return merged;
}

export const DuplicateReviewModal: React.FC = () => {
  const { 
    games, 
    isDuplicatesModalOpen, 
    setIsDuplicatesModalOpen, 
    exportBackupJSON, 
    deleteGame, 
    updateGame 
  } = useGame();

  const isOwner = useIsOwner();

  const [selectedKeeps, setSelectedKeeps] = useState<Record<string, string>>({});
  const [enabledGroups, setEnabledGroups] = useState<Record<string, boolean>>({});
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Group games by normalized title key
  const { samePlatformGroups, crossPlatformGroups } = useMemo(() => {
    const titleMap = new Map<string, GameItem[]>();

    games.forEach((g) => {
      const key = normalizeTitleKey(g.title);
      if (!key) return;
      const list = titleMap.get(key) || [];
      list.push(g);
      titleMap.set(key, list);
    });

    const sameGroups: DuplicateGroup[] = [];
    const crossGroups: DuplicateGroup[] = [];

    titleMap.forEach((gList, normTitle) => {
      if (gList.length < 2) return;

      // Group by canonical console
      const consoleMap = new Map<string, GameItem[]>();
      gList.forEach((g) => {
        const cKey = normalizeConsoleName(g.console).toLowerCase();
        const cList = consoleMap.get(cKey) || [];
        cList.push(g);
        consoleMap.set(cKey, cList);
      });

      // 1. Same Title + Same Console: TRUE DUPLICATE
      consoleMap.forEach((cList, cKey) => {
        if (cList.length >= 2) {
          const suggested = pickSuggestedGame(cList);
          const groupId = `same_${normTitle}_${cKey}`;
          sameGroups.push({
            id: groupId,
            normalizedTitle: normTitle,
            displayTitle: cleanTitle(suggested.title),
            isSamePlatform: true,
            platformName: normalizeConsoleName(cList[0].console),
            games: cList,
            suggestedKeepId: suggested.id,
          });
        }
      });

      // 2. Same Title + Different Consoles: CROSS PLATFORM MATCH
      const distinctConsoles = Array.from(consoleMap.keys());
      if (distinctConsoles.length >= 2) {
        const suggested = pickSuggestedGame(gList);
        const groupId = `cross_${normTitle}`;
        crossGroups.push({
          id: groupId,
          normalizedTitle: normTitle,
          displayTitle: cleanTitle(suggested.title),
          isSamePlatform: false,
          games: gList,
          suggestedKeepId: suggested.id,
        });
      }
    });

    return { samePlatformGroups: sameGroups, crossPlatformGroups: crossGroups };
  }, [games]);

  // Total detected duplicate groups
  const totalGroupsCount = samePlatformGroups.length + crossPlatformGroups.length;

  // Initialize selections when modal opens or groups change
  React.useEffect(() => {
    if (!isDuplicatesModalOpen) {
      setIsConfirmingAction(false);
      return;
    }

    const initialKeeps: Record<string, string> = {};
    const initialEnabled: Record<string, boolean> = {};

    samePlatformGroups.forEach((g) => {
      initialKeeps[g.id] = g.suggestedKeepId;
      initialEnabled[g.id] = true; // Habilitado por padrão
    });

    crossPlatformGroups.forEach((g) => {
      initialKeeps[g.id] = g.suggestedKeepId;
      initialEnabled[g.id] = false; // DESMARCADO por padrão como exigido
    });

    setSelectedKeeps(initialKeeps);
    setEnabledGroups(initialEnabled);
  }, [isDuplicatesModalOpen, samePlatformGroups, crossPlatformGroups]);

  // Calculate items to delete
  const totalToRemoveCount = useMemo(() => {
    let count = 0;
    samePlatformGroups.forEach((group) => {
      if (enabledGroups[group.id]) {
        count += group.games.length - 1;
      }
    });
    crossPlatformGroups.forEach((group) => {
      if (enabledGroups[group.id]) {
        count += group.games.length - 1;
      }
    });
    return count;
  }, [samePlatformGroups, crossPlatformGroups, enabledGroups]);

  // Execute Merge & Deletion
  const handleExecuteMerge = async () => {
    if (!isOwner || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Baixe automaticamente um backup JSON completo
      exportBackupJSON();

      const allActiveGroups = [
        ...samePlatformGroups.filter((g) => enabledGroups[g.id]),
        ...crossPlatformGroups.filter((g) => enabledGroups[g.id]),
      ];

      let removedTotal = 0;
      const batch = writeBatch(db);

      for (const group of allActiveGroups) {
        const keepId = selectedKeeps[group.id] || group.suggestedKeepId;
        const keptGame = group.games.find((g) => g.id === keepId) || group.games[0];
        const gamesToRemove = group.games.filter((g) => g.id !== keptGame.id);

        if (gamesToRemove.length === 0) continue;

        // 2. Mescle no jogo mantido os campos vazios e as sessões
        let mergedCapa = keptGame.capa;
        let mergedNota = keptGame.nota;
        let mergedGenero = keptGame.genero;
        let mergedAnotacoes = keptGame.anotacoes || '';
        let mergedHltb = keptGame.hltb;
        let mergedRubric = keptGame.rubric;
        let mergedDataInicio = keptGame.data_inicio;
        let mergedDataZerado = keptGame.data_zerado;
        let mergedStatus = keptGame.status;
        let combinedSessions = keptGame.sessoes || [];

        gamesToRemove.forEach((rem) => {
          if ((!mergedCapa || mergedCapa.includes('placeholder')) && rem.capa && !rem.capa.includes('placeholder')) {
            mergedCapa = rem.capa;
          }
          if ((mergedNota === undefined || mergedNota === 0) && rem.nota && rem.nota > 0) {
            mergedNota = rem.nota;
          }
          if ((!mergedGenero || mergedGenero === 'Geral') && rem.genero && rem.genero !== 'Geral') {
            mergedGenero = rem.genero;
          }
          if (!mergedHltb && rem.hltb) {
            mergedHltb = rem.hltb;
          }
          if (!mergedRubric && rem.rubric) {
            mergedRubric = rem.rubric;
          }
          if (!mergedDataInicio && rem.data_inicio) {
            mergedDataInicio = rem.data_inicio;
          }
          if (!mergedDataZerado && rem.data_zerado) {
            mergedDataZerado = rem.data_zerado;
          }
          if (mergedStatus !== 'zerado' && rem.status === 'zerado') {
            mergedStatus = 'zerado';
          }
          if (rem.anotacoes && !mergedAnotacoes.includes(rem.anotacoes)) {
            mergedAnotacoes = mergedAnotacoes ? `${mergedAnotacoes}\n\n${rem.anotacoes}` : rem.anotacoes;
          }

          if (rem.sessoes && rem.sessoes.length > 0) {
            combinedSessions = mergeSessionsWithoutDuplicates(combinedSessions, rem.sessoes);
          }
        });

        // Recalculate playtime from combined sessions
        let mergedMins = typeof keptGame.tempoMinutos === 'number' ? keptGame.tempoMinutos : parseToMinutes(keptGame.tempo);
        if (combinedSessions.length > 0) {
          const sessionsMins = combinedSessions.reduce((acc, s) => acc + (s.totalMinutos || 0), 0);
          if (sessionsMins > 0) {
            mergedMins = sessionsMins;
          }
        } else {
          gamesToRemove.forEach((rem) => {
            const remMins = typeof rem.tempoMinutos === 'number' ? rem.tempoMinutos : parseToMinutes(rem.tempo);
            if (remMins > mergedMins) mergedMins = remMins;
          });
        }

        const updatedFields: Partial<GameItem> = {
          capa: mergedCapa,
          nota: mergedNota,
          genero: mergedGenero,
          hltb: mergedHltb,
          rubric: mergedRubric,
          data_inicio: mergedDataInicio,
          data_zerado: mergedDataZerado,
          status: mergedStatus,
          anotacoes: mergedAnotacoes,
          sessoes: combinedSessions,
          tempoMinutos: mergedMins,
          tempo: formatMinutes(mergedMins, 'colon'),
        };

        // Update kept game
        updateGame(keptGame.id, updatedFields);
        const keptDocRef = doc(db, 'games', keptGame.id);
        batch.set(keptDocRef, stripUndefined(updatedFields), { merge: true });

        // Delete duplicates
        gamesToRemove.forEach((rem) => {
          deleteGame(rem.id);
          const remDocRef = doc(db, 'games', rem.id);
          batch.delete(remDocRef);
          removedTotal++;
        });
      }

      await batch.commit();

      showToast(`${removedTotal} jogos repetidos removidos com sucesso!`, 'success');
      setIsDuplicatesModalOpen(false);
      setIsConfirmingAction(false);
    } catch (err) {
      console.error('Erro ao mesclar duplicados:', err);
      showToast('Ocorreu um erro ao processar a mesclagem.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isDuplicatesModalOpen || !isOwner) return null;

  return (
    <Modal
      isOpen={isDuplicatesModalOpen}
      onClose={() => {
        if (!isProcessing) {
          setIsDuplicatesModalOpen(false);
          setIsConfirmingAction(false);
        }
      }}
      title={
        <div className="flex items-center gap-2 text-[#22d3ee]">
          <CopyCheck className="h-5 w-5" aria-hidden="true" />
          <span>Verificação de Jogos Repetidos</span>
        </div>
      }
      description="Detecte títulos duplicados, escolha qual registro manter e mescle sessões e notas"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full border-t border-[#30363d]/60 pt-3">
          <div className="text-xs text-[#9aa4b2] font-mono text-center sm:text-left">
            {totalToRemoveCount > 0 ? (
              <span>
                <strong className="text-white">{totalToRemoveCount}</strong> jogos selecionados para exclusão
              </span>
            ) : (
              <span>Nenhum jogo selecionado para exclusão</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (isConfirmingAction) {
                  setIsConfirmingAction(false);
                } else {
                  setIsDuplicatesModalOpen(false);
                }
              }}
              disabled={isProcessing}
              className="min-h-[44px] px-4 rounded-xl border border-[#30363d] text-xs font-bold text-[#9aa4b2] hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {isConfirmingAction ? 'Voltar à Lista' : 'Fechar'}
            </button>

            {totalToRemoveCount > 0 && !isConfirmingAction && (
              <button
                type="button"
                onClick={() => setIsConfirmingAction(true)}
                className="min-h-[44px] px-5 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0d1117] font-black text-xs uppercase shadow-lg shadow-[#22d3ee]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Revisar Exclusão ({totalToRemoveCount})</span>
              </button>
            )}

            {isConfirmingAction && (
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={isProcessing}
                className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Confirmar e Apagar {totalToRemoveCount} Jogos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 max-h-[68vh] overflow-y-auto pr-1">
        {/* Confirmação Passo Final */}
        {isConfirmingAction ? (
          <div className="space-y-4 p-4 rounded-2xl border border-red-500/40 bg-red-950/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-heading text-sm sm:text-base font-bold text-white uppercase">
                  Confirmação de Exclusão e Mesclagem
                </h4>
                <p className="text-xs text-[#9aa4b2]">
                  Esta ação é irreversível no Firestore, mas um backup será baixado antes.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d]">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Download className="h-4 w-4" />
                <span>1. Um arquivo JSON com todos os dados atuais será baixado no seu computador.</span>
              </div>
              <div className="flex items-center gap-2 text-[#22d3ee] font-bold">
                <CopyCheck className="h-4 w-4" />
                <span>2. Informações faltantes e sessões serão mescladas no jogo mantido de cada grupo.</span>
              </div>
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Trash2 className="h-4 w-4" />
                <span>3. Exatamente {totalToRemoveCount} registros repetidos serão apagados do Firestore.</span>
              </div>
            </div>

            <p className="text-xs text-[#9aa4b2] italic">
              Clique em "Confirmar e Apagar" abaixo para prosseguir com a mesclagem.
            </p>
          </div>
        ) : (
          <>
            {/* ESTADO VAZIO: NENHUM DUPLICADO */}
            {totalGroupsCount === 0 && (
              <div className="rounded-2xl border border-dashed border-[#30363d] p-8 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading text-base font-bold text-white">
                    Nenhum jogo repetido encontrado
                  </h4>
                  <p className="text-xs text-[#9aa4b2] max-w-sm mx-auto leading-relaxed">
                    Sua biblioteca está 100% normalizada, sem títulos repetidos na mesma plataforma.
                  </p>
                </div>
              </div>
            )}

            {/* GRUPO 1: DUPLICADOS CONFIRMADOS (MESMA PLATAFORMA) */}
            {samePlatformGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Jogos Repetidos na Mesma Plataforma ({samePlatformGroups.length})
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-[#9aa4b2]">Marcados por padrão</span>
                </div>

                <div className="space-y-3">
                  {samePlatformGroups.map((group) => {
                    const isGroupEnabled = enabledGroups[group.id] !== false;
                    const keepId = selectedKeeps[group.id] || group.suggestedKeepId;

                    return (
                      <div
                        key={group.id}
                        className={`rounded-xl border transition-all p-3.5 space-y-3 ${
                          isGroupEnabled
                            ? 'border-[#30363d] bg-[#0d1117]'
                            : 'border-[#30363d]/40 bg-black/20 opacity-60'
                        }`}
                      >
                        {/* Header do Grupo */}
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isGroupEnabled}
                              onChange={(e) =>
                                setEnabledGroups((prev) => ({ ...prev, [group.id]: e.target.checked }))
                              }
                              className="h-4 w-4 rounded border-[#30363d] text-[#22d3ee] focus:ring-0 cursor-pointer"
                            />
                            <span className="font-heading text-sm font-bold text-white">
                              {group.displayTitle}
                            </span>
                            <span className="rounded bg-[#22d3ee]/10 border border-[#22d3ee]/30 px-2 py-0.5 text-xs font-mono font-bold text-[#22d3ee]">
                              {group.platformName}
                            </span>
                          </label>

                          <span className="text-xs text-red-400 font-mono font-semibold">
                            {group.games.length} registros ({group.games.length - 1} a remover)
                          </span>
                        </div>

                        {/* Lista de Registros do Grupo */}
                        <div className="space-y-1.5 pt-1">
                          {group.games.map((g) => {
                            const isKept = keepId === g.id;
                            const isSuggested = group.suggestedKeepId === g.id;
                            const sessionsCount = g.sessoes?.length || 0;
                            const hasCover = Boolean(g.capa && g.capa.trim() !== '' && !g.capa.includes('placeholder'));

                            return (
                              <div
                                key={g.id}
                                onClick={() =>
                                  isGroupEnabled &&
                                  setSelectedKeeps((prev) => ({ ...prev, [group.id]: g.id }))
                                }
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 transition-all cursor-pointer ${
                                  isKept
                                    ? 'border-emerald-500/50 bg-emerald-950/20 shadow-sm'
                                    : 'border-[#30363d]/50 bg-black/30 hover:border-[#30363d]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="radio"
                                    name={`keep_${group.id}`}
                                    checked={isKept}
                                    onChange={() =>
                                      setSelectedKeeps((prev) => ({ ...prev, [group.id]: g.id }))
                                    }
                                    disabled={!isGroupEnabled}
                                    className="text-emerald-500 focus:ring-0 cursor-pointer"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-white truncate">
                                        {g.title}
                                      </span>
                                      {isSuggested && (
                                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 text-xs font-bold uppercase">
                                          Mais completo
                                        </span>
                                      )}
                                      {isKept && (
                                        <span className="rounded bg-[#22d3ee]/20 text-[#22d3ee] px-1.5 py-0.5 text-xs font-bold uppercase">
                                          Manter este
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#9aa4b2] mt-0.5">
                                      ID: {g.id} • Data: {g.data_inicio || g.data_zerado || 'Não registrada'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 font-mono text-[#9aa4b2] shrink-0 text-right sm:text-left self-end sm:self-auto">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                                    g.status === 'zerado' ? 'bg-emerald-500/20 text-emerald-400' :
                                    g.status === 'jogando' ? 'bg-[#22d3ee]/20 text-[#22d3ee]' :
                                    g.status === 'abandonado' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white'
                                  }`}>
                                    {g.status}
                                  </span>
                                  <span>{g.nota !== undefined ? `★ ${g.nota.toFixed(1)}` : '★ —'}</span>
                                  <span>{g.tempo ? formatTempoDisplay(g.tempo) : '0h00'}</span>
                                  <span>{sessionsCount} {sessionsCount === 1 ? 'sessão' : 'sessões'}</span>
                                  <span className={hasCover ? 'text-emerald-400' : 'text-slate-500'}>
                                    {hasCover ? 'Com capa' : 'Sem capa'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GRUPO 2: MESMO JOGO EM PLATAFORMAS DIFERENTES (DESMARCADO POR PADRÃO) */}
            {crossPlatformGroups.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Mesmo jogo em plataformas diferentes (provavelmente legítimo) ({crossPlatformGroups.length})
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-amber-300">Desmarcado por padrão</span>
                </div>

                <div className="space-y-3">
                  {crossPlatformGroups.map((group) => {
                    const isGroupEnabled = Boolean(enabledGroups[group.id]);
                    const keepId = selectedKeeps[group.id] || group.suggestedKeepId;

                    return (
                      <div
                        key={group.id}
                        className={`rounded-xl border transition-all p-3.5 space-y-3 ${
                          isGroupEnabled
                            ? 'border-amber-500/40 bg-[#0d1117]'
                            : 'border-[#30363d]/40 bg-black/20 opacity-60'
                        }`}
                      >
                        {/* Header do Grupo Cross-Platform */}
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isGroupEnabled}
                              onChange={(e) =>
                                setEnabledGroups((prev) => ({ ...prev, [group.id]: e.target.checked }))
                              }
                              className="h-4 w-4 rounded border-[#30363d] text-amber-400 focus:ring-0 cursor-pointer"
                            />
                            <span className="font-heading text-sm font-bold text-white">
                              {group.displayTitle}
                            </span>
                          </label>

                          <span className="text-xs text-amber-300 font-mono">
                            {isGroupEnabled ? 'Será mesclado' : 'Ignorado (manter ambos)'}
                          </span>
                        </div>

                        {/* Lista de Registros em Plataformas Diferentes */}
                        <div className="space-y-1.5 pt-1">
                          {group.games.map((g) => {
                            const isKept = keepId === g.id;
                            const isSuggested = group.suggestedKeepId === g.id;
                            const sessionsCount = g.sessoes?.length || 0;
                            const hasCover = Boolean(g.capa && g.capa.trim() !== '' && !g.capa.includes('placeholder'));

                            return (
                              <div
                                key={g.id}
                                onClick={() =>
                                  isGroupEnabled &&
                                  setSelectedKeeps((prev) => ({ ...prev, [group.id]: g.id }))
                                }
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 transition-all cursor-pointer ${
                                  isKept && isGroupEnabled
                                    ? 'border-emerald-500/50 bg-emerald-950/20'
                                    : 'border-[#30363d]/50 bg-black/30 hover:border-[#30363d]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="radio"
                                    name={`keep_${group.id}`}
                                    checked={isKept}
                                    onChange={() =>
                                      setSelectedKeeps((prev) => ({ ...prev, [group.id]: g.id }))
                                    }
                                    disabled={!isGroupEnabled}
                                    className="text-emerald-500 focus:ring-0 cursor-pointer"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-white truncate">
                                        {g.title}
                                      </span>
                                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-cyan-300 font-bold">
                                        {g.console}
                                      </span>
                                      {isSuggested && isGroupEnabled && (
                                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 text-xs font-bold uppercase">
                                          Mais completo
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#9aa4b2] mt-0.5">
                                      ID: {g.id} • Data: {g.data_inicio || g.data_zerado || 'Não registrada'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 font-mono text-[#9aa4b2] shrink-0 text-right sm:text-left self-end sm:self-auto">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                                    g.status === 'zerado' ? 'bg-emerald-500/20 text-emerald-400' :
                                    g.status === 'jogando' ? 'bg-[#22d3ee]/20 text-[#22d3ee]' :
                                    g.status === 'abandonado' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white'
                                  }`}>
                                    {g.status}
                                  </span>
                                  <span>{g.nota !== undefined ? `★ ${g.nota.toFixed(1)}` : '★ —'}</span>
                                  <span>{g.tempo ? formatTempoDisplay(g.tempo) : '0h00'}</span>
                                  <span>{sessionsCount} sessões</span>
                                  <span className={hasCover ? 'text-emerald-400' : 'text-slate-500'}>
                                    {hasCover ? 'Com capa' : 'Sem capa'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
