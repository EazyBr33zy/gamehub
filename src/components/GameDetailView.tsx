import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { 
  Gamepad2, 
  Clock, 
  Calendar, 
  Trophy, 
  Star, 
  FileDown, 
  Plus, 
  Trash2, 
  Check, 
  Edit3, 
  Save, 
  ArrowLeft,
  Flame,
  Award,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Sliders,
  MessageSquare
} from 'lucide-react';
import { getPlatformStyle, getScoreColor, getScoreLabel } from '../utils/platformStyles';
import { calculateRubricScore, fmtH, fmtMinutes, parseTime, parseToMinutes, formatMinutes, formatTempoDisplay, cleanTitle, formatDateBR, sortActiveGames } from '../utils/markdownParser';
import { GameReviewRubric, GameplayDaySession, GameStatus, GameItem } from '../types/game';
import { useIsOwner } from '../hooks/useIsOwner';
import { GameCover } from './GameCover';
import { GameHero } from './gamedetail/GameHero';
import { GameSidebar } from './gamedetail/GameSidebar';
import { SessionsSummary } from './gamedetail/SessionsSummary';
import { Modal } from './Modal';
import { showToast } from '../utils/toast';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { stripUndefined } from '../utils/stripUndefined';
import {
  getGameEffectiveTime,
  getGameEffectiveScore,
  calculateIntervalDuration,
  checkIntervalOverlap,
  formatMinutesToHMM,
  calculateSessionTotalMinutes,
  formatDateBRToISO,
  formatISOToDateBR,
  sortSessionsDescending,
} from '../utils/gameCalculations';
import { getAutoBeatenDate } from '../utils/recentBeatenGames';

export const GameDetailView: React.FC = () => {
  const { 
    games, 
    updateGame, 
    exportGameMarkdown,
    openEditModal
  } = useGame();

  const { route, goBack, navigate } = useHashRoute();
  const isOwner = useIsOwner();

  const routeGameId = route.params.id;
  // Aba standalone "#/jogando" (sem id na rota): destaque + Outros em andamento lado a lado
  const isPlayingTab = route.path === 'jogando' && !routeGameId;

  // Games currently with status "jogando"
  const playingGames = useMemo(() => {
    return games.filter((g) => g.status === 'jogando');
  }, [games]);

  // Active game to show in full detail
  // If #/jogando without id, select the most recently updated "jogando" game
  const game = useMemo(() => {
    if (routeGameId) {
      const found = games.find((g) => g.id === routeGameId);
      if (found) return found;
    }
    if (playingGames.length > 0) {
      const sorted = sortActiveGames(playingGames);
      return sorted[0];
    }
    return games[0] || null;
  }, [games, routeGameId, playingGames]);

  // Update document title when viewing game
  useEffect(() => {
    if (game) {
      document.title = `${cleanTitle(game.title)} · GameHub`;
    } else {
      document.title = 'Jogando Agora · GameHub';
    }
  }, [game]);

  // ── INLINE EDITING STATE FOR OWNER (WITH DEBOUNCE AUTOSAVE & "SALVO ✓" INDICATOR) ──
  const effectiveTime = useMemo(() => getGameEffectiveTime(game), [game]);
  const effectiveScore = useMemo(() => getGameEffectiveScore(game), [game]);

  const [localStatus, setLocalStatus] = useState<GameStatus>(game?.status || 'fila');
  const [localNota, setLocalNota] = useState<string>(
    effectiveScore.nota !== undefined ? String(effectiveScore.nota) : ''
  );
  const [localTempo, setLocalTempo] = useState<string>(effectiveTime.tempo);
  const [localAnotacoes, setLocalAnotacoes] = useState<string>(game?.anotacoes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Track initial/loaded values to avoid triggering owner typing autosave when loading or synchronizing
  const lastLoadedValuesRef = useRef({
    status: game?.status || 'fila',
    nota: effectiveScore.nota !== undefined ? String(effectiveScore.nota) : '',
    tempo: effectiveTime.tempo,
    anotacoes: game?.anotacoes || '',
  });

  // Sync local fields when active game or its calculated metrics change
  useEffect(() => {
    if (game) {
      const nextStatus = game.status;
      const nextNota = effectiveScore.nota !== undefined ? String(effectiveScore.nota) : '';
      const nextTempo = effectiveTime.tempo;
      const nextAnotacoes = game.anotacoes || '';

      setLocalStatus(nextStatus);
      setLocalNota(nextNota);
      setLocalTempo(nextTempo);
      setLocalAnotacoes(nextAnotacoes);
      setSaveStatus('idle');

      lastLoadedValuesRef.current = {
        status: nextStatus,
        nota: nextNota,
        tempo: nextTempo,
        anotacoes: nextAnotacoes,
      };
    }
  }, [game?.id, effectiveTime.tempo, effectiveScore.nota]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    isInitialMount.current = true;
  }, [game?.id]);

  // Autosave with 600ms debounce for owner when editing fields manually
  useEffect(() => {
    if (!isOwner || !game) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasUserChanges =
      localStatus !== lastLoadedValuesRef.current.status ||
      localNota !== lastLoadedValuesRef.current.nota ||
      localTempo !== lastLoadedValuesRef.current.tempo ||
      localAnotacoes !== lastLoadedValuesRef.current.anotacoes;

    if (!hasUserChanges) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const parsedNota = localNota.trim() !== '' ? parseFloat(localNota) : undefined;
      const validNota =
        parsedNota !== undefined && !isNaN(parsedNota)
          ? Math.min(10, Math.max(0, parsedNota))
          : undefined;

      lastLoadedValuesRef.current = {
        status: localStatus,
        nota: localNota,
        tempo: localTempo,
        anotacoes: localAnotacoes,
      };

      const isBecomingZerado = localStatus === 'zerado' && game.status !== 'zerado';
      const autoBeaten = isBecomingZerado && !game.data_zerado ? getAutoBeatenDate(game.sessoes) : null;

      updateGame(game.id, {
        status: localStatus,
        nota: validNota,
        tempo: localTempo,
        tempoMinutos: Math.round(parseTime(localTempo) * 60),
        anotacoes: localAnotacoes,
        ...(autoBeaten ? { data_zerado: autoBeaten.data_zerado, ano_zerado: autoBeaten.ano_zerado } : {}),
      });

      setSaveStatus('saved');
      const resetTimer = setTimeout(() => setSaveStatus('idle'), 2500);
      return () => clearTimeout(resetTimer);
    }, 600);

    return () => clearTimeout(timer);
  }, [localStatus, localNota, localTempo, localAnotacoes, isOwner, game?.id, updateGame]);

  // ── BACKGROUND SYNCHRONIZATION FOR OWNER ONLY (DEBOUNCED, NO TOAST, NO LOOPS) ──
  const lastSyncedSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!isOwner || !game) return;

    // Check if sessions sum differs from saved tempo/tempoMinutos
    const timeDiscrepancy =
      effectiveTime.hasSessions &&
      (game.tempo !== effectiveTime.tempo || game.tempoMinutos !== effectiveTime.tempoMinutos);

    // Check if rubric score differs from saved nota
    const scoreDiscrepancy =
      effectiveScore.hasRubric &&
      effectiveScore.nota !== undefined &&
      game.nota !== effectiveScore.nota;

    if (!timeDiscrepancy && !scoreDiscrepancy) {
      return;
    }

    const signature = `${game.id}_${effectiveTime.tempo}_${effectiveTime.tempoMinutos}_${effectiveScore.nota}`;
    if (lastSyncedSignatureRef.current === signature) {
      return;
    }

    const timer = setTimeout(() => {
      lastSyncedSignatureRef.current = signature;
      const updates: Partial<GameItem> = {};
      if (timeDiscrepancy) {
        updates.tempo = effectiveTime.tempo;
        updates.tempoMinutos = effectiveTime.tempoMinutos;
      }
      if (scoreDiscrepancy && effectiveScore.nota !== undefined) {
        updates.nota = effectiveScore.nota;
      }

      if (Object.keys(updates).length > 0) {
        updateGame(game.id, updates);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isOwner,
    game?.id,
    game?.tempo,
    game?.tempoMinutos,
    game?.nota,
    effectiveTime.hasSessions,
    effectiveTime.tempo,
    effectiveTime.tempoMinutos,
    effectiveScore.hasRubric,
    effectiveScore.nota,
    updateGame,
  ]);

  const [activeSubTab, setActiveSubTab] = useState<'sessoes' | 'rubrica' | 'got' | 'anotacoes'>('sessoes');

  // ── RUBRIC STATE ──
  const defaultRubric: GameReviewRubric = useMemo(() => ({
    controles: 9,
    dificuldade: 8,
    levelDesign: 9,
    mecanicas: 9,
    estiloVisual: 9,
    animacoes: 9,
    paletaCores: 9,
    detalhes: 9,
    musicasMemoraveis: 8,
    adequacao: 9,
    variedade: 8,
    efeitosSonoros: 8,
    querContinuarJogando: 9,
    satisfacao: 9,
    rejogabilidade: 8,
    interesse: 9,
  }), []);

  const [localRubric, setLocalRubric] = useState<GameReviewRubric>(game?.rubric || defaultRubric);

  useEffect(() => {
    if (game?.rubric) {
      setLocalRubric(game.rubric);
    } else {
      setLocalRubric(defaultRubric);
    }
  }, [game?.id, game?.rubric, defaultRubric]);

  const handleRubricScoreChange = (field: keyof GameReviewRubric, value: number) => {
    if (!isOwner || !game) return;
    const clamped = Math.min(10, Math.max(0, value));
    const nextRubric = { ...localRubric, [field]: clamped };
    setLocalRubric(nextRubric);
    const calculated = calculateRubricScore(nextRubric);
    setLocalNota(String(calculated));
    setSaveStatus('saving');
    updateGame(game.id, {
      rubric: nextRubric,
      nota: calculated,
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // ── GOT AWARDS CONFIG & TOGGLE ──
  const gotConfig = [
    { key: 'got_jogo' as const, label: '🏆 Jogo do Ano (GOTY)', desc: 'Melhor jogo absoluto do ano', color: '#ffd700', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    { key: 'got_gameplay' as const, label: '⚔️ Melhor Jogabilidade', desc: 'Controles, combate e mecânicas superiores', color: '#22d3ee', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
    { key: 'got_narrativa' as const, label: '📖 Melhor Narrativa', desc: 'História, lore e desenvolvimento de roteiro', color: '#a855f7', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { key: 'got_arte' as const, label: '🎨 Melhor Direção de Arte', desc: 'Estética, gráficos e estilo visual marcante', color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
    { key: 'got_indie' as const, label: '💎 Melhor Jogo Indie', desc: 'Melhor produção independente do ano', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { key: 'got_surpresa' as const, label: '✨ Maior Surpresa', desc: 'Superou todas as expectativas positivas', color: '#06b6d4', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
    { key: 'got_retro' as const, label: '🕹️ Melhor Retrô', desc: 'Melhor clássico jogado nesta temporada', color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { key: 'got_dificil' as const, label: '🔥 Mais Difícil / Desafiador', desc: 'Maior desafio de gameplay superado', color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    { key: 'got_pior' as const, label: '💩 Maior Decepção', desc: 'Jogo que não entregou o esperado', color: '#78716c', bg: 'bg-stone-500/10', border: 'border-stone-500/30' },
  ];

  const handleToggleGot = (key: (typeof gotConfig)[number]['key']) => {
    if (!isOwner || !game) return;
    const currentVal = Boolean(game[key]);
    const nextVal = !currentVal;
    setSaveStatus('saving');
    updateGame(game.id, { [key]: nextVal });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    showToast(nextVal ? `Premiação adicionada ao jogo!` : `Premiação removida.`, 'info');
  };

  // Active GOT badges for the current game
  const activeGotBadges = useMemo(() => {
    if (!game) return [];
    return gotConfig.filter((c) => Boolean(game[c.key]));
  }, [game]);

  // ── SESSIONS STATE ──
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [newStart, setNewStart] = useState('20:00');
  const [newEnd, setNewEnd] = useState('21:30');

  const handleDeleteSession = (sessionIdx: number) => {
    if (!game || !isOwner) return;
    const existingSessions = game.sessoes || [];
    const updatedSessions = existingSessions.filter((_, idx) => idx !== sessionIdx);

    const totalMinutesAll = updatedSessions.reduce(
      (acc, curr) => acc + calculateSessionTotalMinutes(curr),
      0
    );
    const newTempoStr = formatMinutesToHMM(totalMinutesAll);

    updateGame(game.id, {
      sessoes: updatedSessions,
      tempo: newTempoStr,
      tempoMinutos: totalMinutesAll,
    });
    setLocalTempo(newTempoStr);
    showToast('Sessão removida do histórico.', 'info');
  };

  const handleAddManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game || !isOwner) return;

    const { minutos: diffMinutes, isValid } = calculateIntervalDuration(newStart, newEnd);
    if (!isValid || diffMinutes <= 0) {
      showToast('Horário de término deve ser diferente do de início.', 'error');
      return;
    }

    const newInterval = { inicio: newStart, fim: newEnd, minutos: diffMinutes };
    const existingSessions = game.sessoes || [];
    let updatedSessions = [...existingSessions];

    const existingDayIdx = updatedSessions.findIndex((s) => s.data === newDate);
    if (existingDayIdx >= 0) {
      const mergedIntervals = [...updatedSessions[existingDayIdx].intervalos, newInterval];
      const mergedTotal = mergedIntervals.reduce((acc, curr) => acc + curr.minutos, 0);
      updatedSessions[existingDayIdx] = {
        ...updatedSessions[existingDayIdx],
        intervalos: mergedIntervals,
        totalMinutos: mergedTotal,
      };
    } else {
      updatedSessions.push({
        data: newDate,
        intervalos: [newInterval],
        totalMinutos: diffMinutes,
      });
    }

    updatedSessions = sortSessionsDescending(updatedSessions);
    const totalMinutesAll = updatedSessions.reduce(
      (acc, curr) => acc + calculateSessionTotalMinutes(curr),
      0
    );
    const newTempoStr = formatMinutesToHMM(totalMinutesAll);

    updateGame(game.id, {
      sessoes: updatedSessions,
      tempo: newTempoStr,
      tempoMinutos: totalMinutesAll,
    });
    setLocalTempo(newTempoStr);

    showToast(`+${diffMinutes} minutos registrados para ${cleanTitle(game.title)}!`, 'success');
  };

  // ── MODAL DE EDIÇÃO DE SESSÕES CADASTRADAS (SOMENTE DONO) ──
  const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
  const [editDateISO, setEditDateISO] = useState<string>('');
  const [editIntervals, setEditIntervals] = useState<Array<{ inicio: string; fim: string }>>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const originalSessionRef = useRef<{ dateISO: string; intervals: Array<{ inicio: string; fim: string }> } | null>(null);

  const handleOpenEditSession = (sessionIdx: number) => {
    if (!game?.sessoes || !game.sessoes[sessionIdx]) return;
    const session = game.sessoes[sessionIdx];
    const dateISO = formatDateBRToISO(session.data);
    const intervalsCopy =
      session.intervalos && session.intervalos.length > 0
        ? session.intervalos.map((i) => ({ inicio: i.inicio, fim: i.fim }))
        : [{ inicio: '20:00', fim: '21:00' }];

    setEditingSessionIdx(sessionIdx);
    setEditDateISO(dateISO);
    setEditIntervals(intervalsCopy);
    originalSessionRef.current = {
      dateISO,
      intervals: JSON.parse(JSON.stringify(intervalsCopy)),
    };
    setShowDiscardConfirm(false);
    setIsEditModalOpen(true);
  };

  const isSessionDirty = useMemo(() => {
    if (!originalSessionRef.current) return false;
    if (editDateISO !== originalSessionRef.current.dateISO) return true;
    if (editIntervals.length !== originalSessionRef.current.intervals.length) return true;
    for (let i = 0; i < editIntervals.length; i++) {
      if (editIntervals[i].inicio !== originalSessionRef.current.intervals[i].inicio) return true;
      if (editIntervals[i].fim !== originalSessionRef.current.intervals[i].fim) return true;
    }
    return false;
  }, [editDateISO, editIntervals]);

  const handleRequestCloseModal = () => {
    if (isSessionDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditModalOpen(false);
      setEditingSessionIdx(null);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setIsEditModalOpen(false);
    setEditingSessionIdx(null);
  };

  const handleAddInterval = () => {
    setEditIntervals((prev) => [...prev, { inicio: '20:00', fim: '21:00' }]);
  };

  const handleRemoveInterval = (index: number) => {
    setEditIntervals((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateInterval = (index: number, field: 'inicio' | 'fim', val: string) => {
    setEditIntervals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Live total of this session
  const liveSessionTotalMinutes = useMemo(() => {
    return editIntervals.reduce((acc, curr) => {
      const { minutos, isValid } = calculateIntervalDuration(curr.inicio, curr.fim);
      return acc + (isValid ? minutos : 0);
    }, 0);
  }, [editIntervals]);

  // Live validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!editDateISO) {
      errors.push('Selecione uma data para a sessão.');
    }
    if (editIntervals.length === 0) {
      errors.push('A sessão precisa de pelo menos 1 intervalo.');
      return errors;
    }

    for (let i = 0; i < editIntervals.length; i++) {
      const item = editIntervals[i];
      if (!item.inicio || !item.fim) {
        errors.push(`Intervalo ${i + 1}: preencha início e fim.`);
        continue;
      }
      const { minutos, isValid } = calculateIntervalDuration(item.inicio, item.fim);
      if (!isValid || minutos < 1) {
        errors.push(`Intervalo ${i + 1}: duração mínima de 1 minuto.`);
      }
    }

    const overlap = checkIntervalOverlap(editIntervals);
    if (overlap.hasOverlap) {
      errors.push(overlap.message || 'Existem intervalos com horários sobrepostos nesta sessão.');
    }

    return errors;
  }, [editDateISO, editIntervals]);

  // Check if target date already exists in another session
  const targetDateBR = useMemo(() => formatISOToDateBR(editDateISO), [editDateISO]);
  const conflictingSessionIdx = useMemo(() => {
    if (!game?.sessoes || editingSessionIdx === null || !targetDateBR) return -1;
    return game.sessoes.findIndex((s, idx) => idx !== editingSessionIdx && s.data === targetDateBR);
  }, [game?.sessoes, editingSessionIdx, targetDateBR]);

  const handleSaveEditedSession = async () => {
    if (!game || editingSessionIdx === null || !isOwner) return;
    if (validationErrors.length > 0) {
      showToast(validationErrors[0], 'error');
      return;
    }

    setIsSavingSession(true);

    const processedIntervals = editIntervals.map((i) => {
      const { minutos } = calculateIntervalDuration(i.inicio, i.fim);
      return {
        inicio: i.inicio,
        fim: i.fim,
        minutos,
      };
    });

    const sessionMinutes = processedIntervals.reduce((acc, curr) => acc + curr.minutos, 0);

    let updatedSessions: GameplayDaySession[] = [...(game.sessoes || [])];

    if (conflictingSessionIdx >= 0) {
      // Merge intervals with existing session on that date
      const conflictingSession = updatedSessions[conflictingSessionIdx];
      const mergedIntervals = [...(conflictingSession.intervalos || []), ...processedIntervals];
      mergedIntervals.sort((a, b) => {
        const [hA, mA] = a.inicio.split(':').map(Number);
        const [hB, mB] = b.inicio.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
      });

      const mergedTotalMinutes = mergedIntervals.reduce((acc, curr) => acc + curr.minutos, 0);

      updatedSessions[conflictingSessionIdx] = {
        data: targetDateBR,
        intervalos: mergedIntervals,
        totalMinutos: mergedTotalMinutes,
      };
      updatedSessions = updatedSessions.filter((_, idx) => idx !== editingSessionIdx);
    } else {
      updatedSessions[editingSessionIdx] = {
        data: targetDateBR,
        intervalos: processedIntervals,
        totalMinutos: sessionMinutes,
      };
    }

    const finalSessions = sortSessionsDescending(updatedSessions);
    const totalMinutesAll = finalSessions.reduce(
      (acc, curr) => acc + calculateSessionTotalMinutes(curr),
      0
    );
    const newTempoStr = formatMinutesToHMM(totalMinutesAll);

    // Optimistic local update
    const previousSessions = game.sessoes || [];
    const previousTempo = game.tempo;
    const previousTempoMinutos = game.tempoMinutos;

    updateGame(game.id, {
      sessoes: finalSessions,
      tempo: newTempoStr,
      tempoMinutos: totalMinutesAll,
    });
    setLocalTempo(newTempoStr);
    setIsEditModalOpen(false);
    setEditingSessionIdx(null);

    // Persist to Firestore with error rollback
    try {
      const fullDoc = stripUndefined({
        ...game,
        sessoes: finalSessions,
        tempo: newTempoStr,
        tempoMinutos: totalMinutesAll,
      });
      await setDoc(doc(db, 'games', game.id), fullDoc);
      showToast('Sessão atualizada com sucesso!', 'success');
    } catch (err: any) {
      // Rollback
      updateGame(game.id, {
        sessoes: previousSessions,
        tempo: previousTempo,
        tempoMinutos: previousTempoMinutos,
      });
      setLocalTempo(previousTempo || '0:00');
      const errorMsg = err?.code
        ? `Falha ao salvar sessão (${err.code}). Alterações revertidas.`
        : 'Não foi possível salvar a sessão. As alterações foram revertidas.';
      showToast(errorMsg, 'error');
    } finally {
      setIsSavingSession(false);
    }
  };

  if (!game) {
    return (
      <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Nenhum jogo selecionado</h2>
        <p className="text-xs text-[#9aa4b2]">Selecione um jogo no Backlog para visualizar seus detalhes.</p>
        <a
          href="#/backlog"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#22d3ee] text-[#0d1117] font-bold text-xs"
        >
          Ir para o Backlog
        </a>
      </div>
    );
  }

  const pStyle = getPlatformStyle(game.console);
  const scoreColor = getScoreColor(game.nota);
  const calculatedRubric = calculateRubricScore(localRubric);

  // ── Blocos movidos para o GameHero via slots (JSX original, sem alterações de lógica) ──
  const hltbBlock = (
    <>
        {(() => {
          const playedMinutes = parseToMinutes(effectiveTime.tempo || localTempo || game.tempo);
          const hltbMinutes = parseToMinutes(game.hltb);
          if (hltbMinutes <= 0 && game.status !== 'jogando') return null;

          const pct = hltbMinutes > 0 ? Math.round((playedMinutes / hltbMinutes) * 100) : 0;
          const remainingMin = Math.max(0, hltbMinutes - playedMinutes);

          return (
            <div className="gd-hltb rounded-xl border border-[#30363d] bg-[#0d1117] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs">
                <div className="flex flex-1 min-w-0 items-center gap-1.5 font-bold uppercase tracking-tight text-[#9aa4b2]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#22d3ee] shadow-[0_0_6px_#22d3ee]" aria-hidden="true" />
                  <span className="text-xs leading-tight tracking-tight whitespace-normal break-words">PROGRESSO DA CAMPANHA (HLTB)</span>
                </div>
                <div className="shrink-0 whitespace-nowrap text-right font-mono font-bold text-xs">
                  {hltbMinutes > 0 ? (
                    <span className={pct >= 100 ? 'text-emerald-400' : 'text-[#22d3ee]'}>
                      {pct}% CONCLUÍDO
                    </span>
                  ) : (
                    <span className="text-[#9aa4b2] text-xs font-normal">HLTB não definido</span>
                  )}
                </div>
              </div>

              {/* Barra Visual */}
              <div className="relative h-2.5 w-full rounded-full bg-[#161b22] border border-[#30363d]/60 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
                    pct >= 100
                      ? 'bg-gradient-to-r from-[#22d3ee] to-emerald-400'
                      : 'bg-gradient-to-r from-[#0284c7] via-[#22d3ee] to-[#a855f7]'
                  }`}
                  style={{
                    width: `${hltbMinutes > 0 ? Math.min(100, Math.max(playedMinutes > 0 ? 3 : 0, pct)) : 0}%`,
                  }}
                />
              </div>

              <div className="gd-hltb-lines flex flex-col items-start gap-1.5 text-xs font-mono text-[#9aa4b2] sm:flex-row sm:items-center sm:justify-between">
                <span className="whitespace-nowrap">
                  Tempo registrado: <strong className="text-white">{formatTempoDisplay(effectiveTime.tempo || localTempo || game.tempo)}</strong>
                </span>
                <span className="whitespace-nowrap">
                  Estimativa HLTB:{' '}
                  <strong className="text-[#22d3ee]">
                    {game.hltb ? formatTempoDisplay(game.hltb) : '—'}
                  </strong>
                  {hltbMinutes > 0 && remainingMin > 0 && (
                    <span className="text-[#9aa4b2] ml-1">
                      (~{formatMinutes(remainingMin)} restante)
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })()}
    </>
  );

  const ownerControls = (
        <div className="gd-owner-controls gd-owner-row grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch gap-2.5 py-2.5 px-3.5 rounded-xl border border-[#30363d] bg-[#0d1117]">
          {/* Status */}
          <div className="flex flex-col">
            <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Status</label>
            {isOwner ? (
              <select
                value={localStatus}
                onChange={(e) => setLocalStatus(e.target.value as GameStatus)}
                className="w-full h-9 box-border rounded-lg border border-[#30363d] bg-[#161b22] px-2.5 text-xs sm:text-sm font-bold text-white focus:border-[#22d3ee] focus:outline-none cursor-pointer"
              >
                <option value="jogando">Jogando</option>
                <option value="fila">Na Fila</option>
                <option value="pausado">Pausado</option>
                <option value="abandonado">Abandonado</option>
                <option value="wishlist">Wishlist</option>
                <option value="zerado">Zerado</option>
              </select>
            ) : (
              <span className="text-sm font-bold text-white uppercase">{game.status}</span>
            )}
          </div>

          {/* Nota */}
          <div className="flex flex-col">
            <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Nota (0–10)</label>
            {isOwner ? (
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={localNota}
                onChange={(e) => setLocalNota(e.target.value)}
                placeholder="—"
                className="w-full h-9 box-border rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-xs sm:text-sm font-mono font-bold text-[#ffd700] focus:border-[#22d3ee] focus:outline-none text-center"
              />
            ) : (
              <span className="text-sm font-mono font-bold text-[#ffd700]">
                {effectiveScore.nota !== undefined ? `★ ${effectiveScore.nota.toFixed(1)}` : '—'}
              </span>
            )}
          </div>

          {/* Tempo */}
          <div className="flex flex-col">
            <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Tempo Total</label>
            {isOwner ? (
              <input
                type="text"
                value={localTempo}
                onChange={(e) => setLocalTempo(e.target.value)}
                placeholder="0:00"
                className="w-full h-9 box-border rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-xs sm:text-sm font-mono font-bold text-white focus:border-[#22d3ee] focus:outline-none text-center"
              />
            ) : (
              <span className="text-sm font-mono font-bold text-white">
                {effectiveTime.tempo ? formatTempoDisplay(effectiveTime.tempo) : '0h00'}
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col">
            <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Ações</label>
            {isOwner ? (
              <div className="gd-actions-row flex flex-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(game)}
                  className="flex-1 h-9 box-border flex items-center justify-center gap-1 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-white/5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
                  title="Editar ficha completa"
                >
                  <Edit3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportGameMarkdown(game)}
                  className="flex-1 h-9 box-border flex items-center justify-center gap-1 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-white/5 text-xs sm:text-sm font-bold text-[#22d3ee] transition-colors cursor-pointer"
                  title="Baixar arquivo Markdown do Obsidian"
                >
                  <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>.md</span>
                </button>
              </div>
            ) : (
              <div className="h-9 box-border flex items-center justify-center rounded-lg border border-[#30363d]/40 bg-black/20 text-xs sm:text-sm font-mono text-[#9aa4b2] px-3">
                Modo Leitura
              </div>
            )}
          </div>
        </div>
  );

  return (
    <div className="gd-page space-y-5 pb-20 font-sans">
      {/* ── SELETOR DE JOGOS EM ANDAMENTO (aba #/jogando: abaixo do hero, já que o hero ocupa a largura toda) ── */}
      {playingGames.length > 0 && (
        <div className="gd-playing-strip rounded-2xl border border-[#30363d] bg-[#161b22] p-3 shadow-md lg:hidden sm:p-4">
          <div className="gd-strip-head flex items-center justify-between text-xs mb-2.5">
            <span className="font-bold uppercase tracking-wider text-[#9aa4b2] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#22d3ee] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              <span>Jogando Agora ({playingGames.length})</span>
            </span>
            <span className="text-xs font-mono text-[#22d3ee] font-bold">
              {playingGames.findIndex((g) => g.id === game.id) + 1} de {playingGames.length}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {playingGames.map((pg) => {
              const isSelected = game.id === pg.id;
              const plat = getPlatformStyle(pg.console);
              return (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => navigate(`#/jogo/${encodeURIComponent(pg.id)}`)}
                  className={`min-h-[44px] flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-white shadow-md'
                      : 'bg-[#0d1117] border-[#30363d] text-[#9aa4b2] hover:text-white hover:border-[#9aa4b2]'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Selecionar ${cleanTitle(pg.title)}`}
                >
                  <div className="h-7 w-5 rounded overflow-hidden shrink-0 bg-black">
                    <GameCover src={pg.capa} title={pg.title} consoleName={pg.console} size="thumb" />
                  </div>
                  <div className="text-left">
                    <div className="truncate max-w-[150px] leading-tight">{cleanTitle(pg.title)}</div>
                    <div className="font-mono text-xs opacity-70 mt-0.5 leading-none">⏱ {formatTempoDisplay(getGameEffectiveTime(pg).tempo || pg.tempo || '0:00')}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA SUPERIOR: VOLTAR + STATUS DE SALVAMENTO ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goBack('#/backlog')}
          className="flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border border-[#30363d] bg-[#161b22] text-xs font-bold text-[#9aa4b2] hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Voltar ao Acervo</span>
        </button>

        {isOwner && (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[#22d3ee]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Salvando...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Salvo ✓</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-[#9aa4b2] hidden sm:inline">Edição automática ativada</span>
            )}
          </div>
        )}
      </div>

      {/* ── HERO DA FICHA (GameHero) ── */}
      {/* PROBLEMA 1 (desktop ≥1024px): layout UNIFICADO para todos os caminhos (#/jogando,
          ficha aberta do Painel ou de "Outros em andamento") — hero à esquerda + painel
          "Outros em andamento" à direita, com rolagem interna. Abaixo de 1024px o grid é
          desligado (classes lg:) e cada rota mantém exatamente o DOM mobile aprovado. */}
      <div className="gd-focus-grid lg:grid lg:gap-5 lg:items-stretch">
      {/* Coluna 1: o card principal define a altura da linha (align-self:start no CSS desktop) */}
      <div className="min-w-0 lg:self-start">
      <GameHero
        game={game}
        pStyle={pStyle}
        gotBadges={activeGotBadges}
        tempoRegistrado={effectiveTime.tempo || localTempo || game.tempo}
        nota={effectiveScore.nota}
        sessionCount={game.sessoes?.length || 0}
        lastSessionDate={sortSessionsDescending(game.sessoes || [])[0]?.data}
        startDate={game.data_inicio || sortSessionsDescending(game.sessoes || []).slice(-1)[0]?.data}
        daysSinceStart={(() => {
          const d = game.data_inicio || sortSessionsDescending(game.sessoes || []).slice(-1)[0]?.data;
          if (!d) return undefined;
          let dia: number, mes: number, ano: number;
          const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
          const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
          if (iso) { ano = +iso[1]; mes = +iso[2]; dia = +iso[3]; }
          else if (br) { dia = +br[1]; mes = +br[2]; ano = +br[3]; }
          else return undefined;
          const ms = Date.now() - new Date(ano, mes - 1, dia).getTime();
          return Math.max(0, Math.floor(ms / 86400000));
        })()}
        hltbBlock={hltbBlock}
        controls={ownerControls}
        compactCover={isPlayingTab}
        developerLine={(() => {
          const parts = [game.developer, game.publisher].filter(Boolean);
          const dev = Array.from(new Set(parts)).join(' · ');
          return dev || game.ano_lancamento ? `${dev}${dev && game.ano_lancamento ? ' · ' : ''}${game.ano_lancamento || ''}` : undefined;
        })()}
      />
      </div>

      {/* Coluna 2 (desktop, todas as rotas): "OUTROS EM ANDAMENTO" reutilizando o GameSidebar
          (sem duplicar JSX/lógica). No mobile (#/jogando) aparece aqui com altura própria; na
          ficha #/jogo/:id este bloco fica oculto no mobile e a lateral original (abaixo das
          abas) assume — DOM mobile de cada rota permanece como aprovado. */}
      {playingGames.filter((g) => g.id !== game.id).length > 0 && (
        // Desktop: relative h-full — altura = linha do grid (definida pelo card principal);
        // o GameSidebar usa absolute inset-0 internamente, então NUNCA estica a linha.
        // Mobile (<lg): coluna única com altura máx. própria e rolagem interna no GameSidebar.
        <aside className={`relative min-h-0 w-full lg:h-full${isPlayingTab ? '' : ' hidden lg:block'}`}>
          <GameSidebar game={game} playingGames={playingGames} navigate={navigate} />
        </aside>
      )}
      </div>

      {/* ── CORPO: ABAS. No desktop ≥1024px a lateral "Outros em andamento" já aparece ao lado
          do destaque (linha acima) — o corpo fica em largura total, sem duplicar a lateral.
          Abaixo de 1024px cada rota mantém exatamente o DOM aprovado (#/jogando: empilhado;
          #/jogo/:id: grade com a lateral abaixo das abas). */}
      <div className="gd-body space-y-5 lg:!block">
        <div className="min-w-0 space-y-5 lg:max-w-none">
          {/* ── ABAS DE NAVEGAÇÃO INTERNA (SUBTABS) — segmentadas, sticky abaixo do header, roláveis no mobile ── */}
          <div role="tablist" aria-label="Seções da ficha do jogo" className="gd-tabs sticky top-16 z-10 flex items-center gap-2 overflow-x-auto scrollbar-none rounded-xl border border-[#30363d] bg-[#161b22]/95 p-1.5 backdrop-blur motion-reduce:backdrop-blur-none">
            <button
              type="button"
              role="tab"
              id="tab-sessoes"
              aria-selected={activeSubTab === 'sessoes'}
              aria-controls="game-detail-tabpanel"
              onClick={() => setActiveSubTab('sessoes')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none ${
                activeSubTab === 'sessoes'
                  ? 'bg-[#22d3ee] text-[#0d1117] font-black shadow-md'
                  : 'bg-[#161b22] border border-[#30363d] text-[#9aa4b2] hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Sessões ({game.sessoes?.length || 0})</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-rubrica"
              aria-selected={activeSubTab === 'rubrica'}
              aria-controls="game-detail-tabpanel"
              onClick={() => setActiveSubTab('rubrica')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none ${
                activeSubTab === 'rubrica'
                  ? 'bg-[#22d3ee] text-[#0d1117] font-black shadow-md'
                  : 'bg-[#161b22] border border-[#30363d] text-[#9aa4b2] hover:text-white'
              }`}
            >
              <Sliders className="h-4 w-4" aria-hidden="true" />
              <span>Rubrica & Avaliação</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-got"
              aria-selected={activeSubTab === 'got'}
              aria-controls="game-detail-tabpanel"
              onClick={() => setActiveSubTab('got')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none ${
                activeSubTab === 'got'
                  ? 'bg-[#22d3ee] text-[#0d1117] font-black shadow-md'
                  : 'bg-[#161b22] border border-[#30363d] text-[#9aa4b2] hover:text-white'
              }`}
            >
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span>GOT Awards ({activeGotBadges.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-anotacoes"
              aria-selected={activeSubTab === 'anotacoes'}
              aria-controls="game-detail-tabpanel"
              onClick={() => setActiveSubTab('anotacoes')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none ${
                activeSubTab === 'anotacoes'
                  ? 'bg-[#22d3ee] text-[#0d1117] font-black shadow-md'
                  : 'bg-[#161b22] border border-[#30363d] text-[#9aa4b2] hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>Anotações & Review</span>
            </button>
          </div>

          {/* ── CONTEÚDO DA SUBTAB: SESSÕES DE GAMEPLAY ── */}
          {activeSubTab === 'sessoes' && (
            <div role="tabpanel" id="game-detail-tabpanel" aria-labelledby="tab-sessoes" className="gd-panel rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#30363d]/60 pb-3 gap-1.5 sm:gap-2">
                <div className="gd-hist-title flex items-start gap-2.5 min-w-0">
                  <Clock className="h-5 w-5 shrink-0 text-[#22d3ee] mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 className="font-heading text-base sm:text-lg font-bold uppercase text-white leading-tight">
                      Histórico de Sessões de Gameplay
                    </h2>
                    <span className="block sm:hidden text-xs font-mono text-[#22d3ee] font-bold mt-0.5">
                      {game.sessoes?.length || 0} {(game.sessoes?.length || 0) === 1 ? 'dia registrado' : 'dias registrados'}
                    </span>
                  </div>
                </div>
                <span className="hidden sm:inline-block shrink-0 text-xs font-mono text-[#22d3ee] font-bold sm:pl-2 sm:text-right">
                  {game.sessoes?.length || 0} {(game.sessoes?.length || 0) === 1 ? 'dia registrado' : 'dias registrados'}
                </span>
              </div>

              {/* Faixa de resumo calculada das sessões existentes (some na aba #/jogando, por pedido do dono) */}
              <SessionsSummary sessions={game.sessoes || []} hideSummary={isPlayingTab} />

              {/* Formulário Manual de Nova Sessão (Dono) */}
              {isOwner && (
                <form onSubmit={handleAddManualSession} className="gd-session-form p-3.5 rounded-xl border border-[#30363d] bg-[#0d1117] space-y-3">
                  <div className="text-xs font-bold uppercase text-[#22d3ee] flex items-center gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Adicionar Sessão de Gameplay Manualmente</span>
                  </div>

                  <div className="gd-session-grid grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                    <div>
                      <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Data (DD/MM/AAAA)</label>
                      <input
                        type="text"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3 text-base md:text-xs text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Hora Início</label>
                      <input
                        type="text"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        placeholder="20:00"
                        className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3 text-base md:text-xs text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">Hora Término</label>
                      <input
                        type="text"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        placeholder="21:30"
                        className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3 text-base md:text-xs text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0d1117] font-black text-xs uppercase transition-all cursor-pointer shadow"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                      <span>Salvar Sessão</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lista / Tabela de Sessões */}
              {game.sessoes && game.sessoes.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="hidden sm:block overflow-hidden rounded-xl border border-[#30363d] bg-black/20">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-[#30363d] bg-white/[0.03] text-xs font-bold uppercase text-[#9aa4b2]">
                        <tr>
                          <th className="py-2.5 px-4">Data</th>
                          <th className="py-2.5 px-4">Horários / Intervalos</th>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap w-[120px] min-w-[120px]">Tempo Total</th>
                          {isOwner && <th className="py-2.5 px-4 text-center w-28">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {game.sessoes.map((s, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-4 font-bold text-[#22d3ee]">{s.data}</td>
                            <td className="py-2.5 px-4 space-y-1">
                              {s.intervalos.map((i, iIdx) => (
                                <span key={iIdx} className="inline-block mr-2 text-slate-300">
                                  {i.inicio} às {i.fim} <strong className="text-emerald-400 font-bold">(+{i.minutos} min)</strong>
                                </span>
                              ))}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-white">
                              {fmtMinutes(s.totalMinutos)}
                            </td>
                            {isOwner && (
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSession(idx)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-[#22d3ee] hover:bg-[#22d3ee]/10 transition-colors cursor-pointer"
                                    title="Editar sessão"
                                    aria-label={`Editar sessão de ${s.data}`}
                                  >
                                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSession(idx)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Excluir sessão"
                                    aria-label={`Excluir sessão de ${s.data}`}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-2">
                    {game.sessoes.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[#30363d] bg-[#0d1117] flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-bold text-[#22d3ee]">{s.data}</div>
                          <div className="text-xs text-[#9aa4b2] font-mono mt-1 flex flex-col gap-1">
                            {s.intervalos.map((i, iIdx) => (
                              <span key={iIdx} className="whitespace-nowrap inline-block">
                                {i.inicio}–{i.fim}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-1 rounded border border-[#30363d] shrink-0">
                            {fmtMinutes(s.totalMinutos)}
                          </span>
                          {isOwner && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSession(idx)}
                                className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#22d3ee] hover:bg-[#22d3ee]/10 rounded-lg cursor-pointer transition-colors"
                                aria-label={`Editar sessão de ${s.data}`}
                                title="Editar sessão"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSession(idx)}
                                className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                                aria-label={`Excluir sessão de ${s.data}`}
                                title="Excluir sessão"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#9aa4b2] border border-dashed border-[#30363d] rounded-xl">
                  Nenhuma sessão de gameplay registrada para este jogo ainda.
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA SUBTAB: RUBRICA & AVALIAÇÃO ── */}
          {activeSubTab === 'rubrica' && (
            <div role="tabpanel" id="game-detail-tabpanel" aria-labelledby="tab-rubrica" className="gd-panel rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d]/60 pb-3">
                <div>
                  <h2 className="font-heading text-lg font-bold uppercase text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[#22d3ee]" aria-hidden="true" />
                    <span>Rubrica de Avaliação Detalhada</span>
                  </h2>
                  <p className="text-xs text-[#9aa4b2] mt-0.5">
                    Cálculo ponderado oficial do Obsidian (Jogabilidade 2x, Gráficos 1x, Trilha Sonora 1x, Diversão 2x)
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1117] p-2.5 px-4 rounded-xl border border-[#30363d]">
                  <span className="text-xs text-[#9aa4b2] uppercase font-bold">Nota Calculada:</span>
                  <span className="font-heading text-2xl font-black text-amber-400 font-mono">
                    ★ {calculatedRubric.toFixed(1)} / 10
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. JOGABILIDADE (Peso 2x) */}
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#22d3ee] flex items-center gap-1.5">
                      <Gamepad2 className="h-4 w-4" />
                      <span>🕹️ Jogabilidade (Peso 2x)</span>
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'controles' as const, label: 'Controles' },
                      { key: 'dificuldade' as const, label: 'Dificuldade & Desafio' },
                      { key: 'levelDesign' as const, label: 'Level Design & Fases' },
                      { key: 'mecanicas' as const, label: 'Mecânicas de Jogo' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-slate-300 font-medium">{label}</span>
                        {isOwner ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={localRubric[key]}
                            onChange={(e) => handleRubricScoreChange(key, parseFloat(e.target.value) || 0)}
                            className="w-16 min-h-[36px] rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-center text-xs font-mono font-bold text-white focus:border-[#22d3ee] focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-white">{localRubric[key]}/10</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. GRÁFICOS (Peso 1x) */}
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>🎨 Gráficos & Arte (Peso 1x)</span>
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'estiloVisual' as const, label: 'Estilo Visual' },
                      { key: 'animacoes' as const, label: 'Animações' },
                      { key: 'paletaCores' as const, label: 'Paleta de Cores' },
                      { key: 'detalhes' as const, label: 'Detalhes & Polimento' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-slate-300 font-medium">{label}</span>
                        {isOwner ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={localRubric[key]}
                            onChange={(e) => handleRubricScoreChange(key, parseFloat(e.target.value) || 0)}
                            className="w-16 min-h-[36px] rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-center text-xs font-mono font-bold text-white focus:border-[#22d3ee] focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-white">{localRubric[key]}/10</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. TRILHA SONORA (Peso 1x) */}
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Flame className="h-4 w-4" />
                      <span>🎵 Trilha Sonora (Peso 1x)</span>
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'musicasMemoraveis' as const, label: 'Músicas Memoráveis' },
                      { key: 'adequacao' as const, label: 'Adequação ao Clima' },
                      { key: 'variedade' as const, label: 'Variedade Sonora' },
                      { key: 'efeitosSonoros' as const, label: 'Efeitos Sonoros' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-slate-300 font-medium">{label}</span>
                        {isOwner ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={localRubric[key]}
                            onChange={(e) => handleRubricScoreChange(key, parseFloat(e.target.value) || 0)}
                            className="w-16 min-h-[36px] rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-center text-xs font-mono font-bold text-white focus:border-[#22d3ee] focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-white">{localRubric[key]}/10</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. DIVERSÃO (Peso 2x) */}
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Star className="h-4 w-4" />
                      <span>⭐ Diversão (Peso 2x)</span>
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'querContinuarJogando' as const, label: 'Vontade de Continuar' },
                      { key: 'satisfacao' as const, label: 'Sensação de Satisfação' },
                      { key: 'rejogabilidade' as const, label: 'Fator Rejogabilidade' },
                      { key: 'interesse' as const, label: 'Interesse Geral' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-slate-300 font-medium">{label}</span>
                        {isOwner ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={localRubric[key]}
                            onChange={(e) => handleRubricScoreChange(key, parseFloat(e.target.value) || 0)}
                            className="w-16 min-h-[36px] rounded-lg border border-[#30363d] bg-[#161b22] px-2 text-center text-xs font-mono font-bold text-white focus:border-[#22d3ee] focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-white">{localRubric[key]}/10</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTEÚDO DA SUBTAB: GOT AWARDS ── */}
          {activeSubTab === 'got' && (
            <div role="tabpanel" id="game-detail-tabpanel" aria-labelledby="tab-got" className="gd-panel rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-[#30363d]/60 pb-3">
                <h2 className="font-heading text-lg font-bold uppercase text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  <span>Premiações e Destaques (GOT Awards)</span>
                </h2>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  {isOwner ? 'Clique nas categorias para premiar este jogo' : 'Categorias de premiação conquistadas por este jogo'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {gotConfig.map((item) => {
                  const isAwarded = Boolean(game[item.key]);

                  if (!isOwner && !isAwarded) {
                    return null;
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleGot(item.key)}
                      disabled={!isOwner}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isOwner ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                      } ${
                        isAwarded
                          ? `${item.bg} ${item.border} shadow-md`
                          : 'bg-[#0d1117] border-[#30363d] opacity-50 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xs font-bold" style={{ color: item.color }}>
                          {item.label}
                        </span>
                        {isAwarded && (
                          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#ffd700]" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-xs text-[#9aa4b2] mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                      {isOwner && (
                        <div className="mt-2 text-xs font-mono font-bold">
                          {isAwarded ? (
                            <span className="text-emerald-400">✓ Conquistado</span>
                          ) : (
                            <span className="text-[#9aa4b2]">+ Conceder Prêmio</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {!isOwner && activeGotBadges.length === 0 && (
                <div className="p-8 text-center text-xs text-[#9aa4b2] border border-dashed border-[#30363d] rounded-xl">
                  Nenhuma premiação concedida a este jogo até o momento.
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA SUBTAB: ANOTAÇÕES & REVIEW ── */}
          {activeSubTab === 'anotacoes' && (
            <div role="tabpanel" id="game-detail-tabpanel" aria-labelledby="tab-anotacoes" className="gd-panel rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-[#30363d]/60 pb-3">
                <h2 className="font-heading text-lg font-bold uppercase text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#22d3ee]" aria-hidden="true" />
                  <span>Anotações, Análise & Registro Crítico</span>
                </h2>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  {isOwner ? 'Edição com salvamento automático ao digitar' : 'Notas e observações registradas'}
                </p>
              </div>

              <div className="space-y-2">
                {isOwner ? (
                  <textarea
                    value={localAnotacoes}
                    onChange={(e) => setLocalAnotacoes(e.target.value)}
                    placeholder="Escreva impressões, builds, análises ou anotações técnicas sobre este jogo..."
                    rows={10}
                    className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-4 text-base md:text-xs text-slate-200 placeholder-[#9aa4b2] focus:border-[#22d3ee] focus:outline-none leading-relaxed font-sans"
                  />
                ) : (
                  <div className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {game.anotacoes || 'Nenhuma anotação registrada para este jogo.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Lateral original da ficha #/jogo/:id — SOMENTE mobile/tablet (<1024px), abaixo das
            abas, exatamente como está hoje. No desktop a lateral já aparece ao lado do destaque. */}
        {!isPlayingTab && (
        <aside className="self-start lg:sticky lg:top-20 hidden lg:hidden">
          <GameSidebar game={game} playingGames={playingGames} navigate={navigate} />
        </aside>
        )}
      </div>

      {/* ── MODAL DE EDIÇÃO DE SESSÃO CADASTRADA (DONO) ── */}
      {isOwner && editingSessionIdx !== null && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleRequestCloseModal}
          title="Editar Sessão de Gameplay"
          description="Altere a data e os horários dos intervalos desta sessão."
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={handleRequestCloseModal}
                className="min-h-[44px] px-4 rounded-xl border border-[#30363d] bg-[#161b22] text-xs font-bold text-[#9aa4b2] hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSession}
                disabled={isSavingSession || validationErrors.length > 0}
                className={`min-h-[44px] px-5 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSavingSession || validationErrors.length > 0
                    ? 'bg-[#30363d] text-[#9aa4b2] cursor-not-allowed opacity-60'
                    : 'bg-[#22d3ee] text-[#0d1117] hover:bg-[#06b6d4] shadow-md'
                }`}
              >
                {isSavingSession ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          {showDiscardConfirm ? (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="text-sm font-bold text-amber-300">
                Descartar alterações da sessão?
              </div>
              <p className="text-xs text-[#9aa4b2]">
                Você fez alterações nos intervalos ou data. Se fechar agora, essas alterações serão perdidas.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="min-h-[44px] px-3.5 rounded-lg border border-[#30363d] bg-[#161b22] text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="min-h-[44px] px-3.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold cursor-pointer"
                >
                  Sim, descartar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Data da sessão */}
              <div>
                <label className="text-xs uppercase font-bold text-[#9aa4b2] block mb-1">
                  Data da Sessão
                </label>
                <input
                  type="date"
                  value={editDateISO}
                  onChange={(e) => setEditDateISO(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3 text-base md:text-sm text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                />
              </div>

              {/* Aviso se a data já existe em outra sessão */}
              {conflictingSessionIdx >= 0 && (
                <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-1">
                  <div className="text-xs font-bold text-[#22d3ee] flex items-center gap-1.5">
                    <span>ℹ️ Data já existente no histórico</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A data <strong>{targetDateBR}</strong> já possui uma sessão cadastrada com {game.sessoes?.[conflictingSessionIdx]?.intervalos?.length || 0} intervalo(s). Ao salvar, os intervalos serão mesclados nessa data.
                  </p>
                </div>
              )}

              {/* Total ao vivo da sessão */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#30363d] bg-[#0d1117]">
                <span className="text-xs font-bold uppercase text-[#9aa4b2]">
                  Total da Sessão:
                </span>
                <span className="text-base font-mono font-black text-[#22d3ee]">
                  {formatMinutesToHMM(liveSessionTotalMinutes)} ({liveSessionTotalMinutes} min)
                </span>
              </div>

              {/* Lista de Intervalos */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white">
                    Intervalos ({editIntervals.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddInterval}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg border border-[#22d3ee]/40 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 text-xs font-bold text-[#22d3ee] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Adicionar intervalo</span>
                  </button>
                </div>

                {editIntervals.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-red-500/40 bg-red-500/10 text-center space-y-3">
                    <p className="text-xs text-red-300 font-medium">
                      Todos os intervalos foram removidos. Uma sessão precisa ter ao menos 1 intervalo.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteSession(editingSessionIdx);
                        setIsEditModalOpen(false);
                        setEditingSessionIdx(null);
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir sessão</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {editIntervals.map((interval, iIdx) => {
                      const dur = calculateIntervalDuration(interval.inicio, interval.fim);
                      return (
                        <div
                          key={iIdx}
                          className="p-3 rounded-xl border border-[#30363d] bg-[#0d1117] space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-[#9aa4b2] block mb-1">Início</label>
                              <input
                                type="time"
                                value={interval.inicio}
                                onChange={(e) => handleUpdateInterval(iIdx, 'inicio', e.target.value)}
                                className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-2.5 text-base md:text-sm text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-[#9aa4b2] block mb-1">Término</label>
                              <input
                                type="time"
                                value={interval.fim}
                                onChange={(e) => handleUpdateInterval(iIdx, 'fim', e.target.value)}
                                className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-2.5 text-base md:text-sm text-white font-mono focus:border-[#22d3ee] focus:outline-none"
                              />
                            </div>
                            <div className="pt-5">
                              <button
                                type="button"
                                onClick={() => handleRemoveInterval(iIdx)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                                title="Remover intervalo"
                                aria-label={`Remover intervalo ${iIdx + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs font-mono">
                            {dur.isValid && dur.minutos >= 1 ? (
                              dur.crossesMidnight ? (
                                <span className="text-amber-400 font-bold">
                                  ⏱ +{formatMinutesToHMM(dur.minutos)} ({dur.minutos} min) · ⚠️ Passa da meia-noite (dia seguinte)
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">
                                  ⏱ +{formatMinutesToHMM(dur.minutos)} ({dur.minutos} min)
                                </span>
                              )
                            ) : (
                              <span className="text-red-400 font-bold">
                                ⚠️ Duração inválida (mínimo 1 minuto)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mensagens de validação */}
                {validationErrors.length > 0 && editIntervals.length > 0 && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 space-y-1">
                    {validationErrors.map((err, errIdx) => (
                      <div key={errIdx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

    </div>
  );
};
