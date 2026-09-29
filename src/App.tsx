/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Game, AppConfig, PlaySession } from './types';
import { DEFAULT_GAMES } from './data/defaultGames';
import {
  loadGamesFromStorage,
  saveGamesToStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
  getLastBackup,
} from './utils/storage';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BacklogView } from './components/BacklogView';
import { PlayingView } from './components/PlayingView';
import { WrapUpView } from './components/WrapUpView';
import { GameModal } from './components/GameModal';
import { FinishGameModal } from './components/FinishGameModal';
import { BackupModal } from './components/BackupModal';
import { TimeAdjustModal } from './components/TimeAdjustModal';
import { SyncConflictModal } from './components/SyncConflictModal';
import { useServerSync } from './hooks/useServerSync';

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    metaAnual: 24,
    userName: 'Gamer',
    anoSelecionado: new Date().getFullYear(),
  });
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');

  // Modals state
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishingGame, setFinishingGame] = useState<Game | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingGame, setAdjustingGame] = useState<Game | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const [ready, setReady] = useState(false);
  const [localSave, setLocalSave] = useState<{ ok: boolean; at: number } | null>(null);
  const [backupBannerHidden, setBackupBannerHidden] = useState(false);

  // Sempre guarda a versão mais recente dos dados (o envio ao servidor lê daqui)
  const gamesRef = useRef<Game[]>([]);
  const configRef = useRef<AppConfig>(config);
  gamesRef.current = games;
  configRef.current = config;

  // Carregar dados iniciais do localStorage
  useEffect(() => {
    const loadedGames = loadGamesFromStorage();
    const loadedConfig = loadConfigFromStorage();
    setGames(loadedGames);
    setConfig(loadedConfig);
    gamesRef.current = loadedGames;
    configRef.current = loadedConfig;
    setReady(true);
    // Pede ao navegador para não apagar estes dados sozinho quando faltar espaço
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  // Dados vindos do servidor: substitui os locais sem reenviar
  const applyRemote = (remoteGames: Game[], remoteConfig?: Partial<AppConfig>) => {
    gamesRef.current = remoteGames;
    setGames(remoteGames);
    saveGamesToStorage(remoteGames);
    if (remoteConfig && !Array.isArray(remoteConfig) && typeof remoteConfig === 'object') {
      const merged = { ...configRef.current, ...remoteConfig, anoSelecionado: configRef.current.anoSelecionado };
      configRef.current = merged;
      setConfig(merged);
      saveConfigToStorage(merged);
    }
    setLocalSave({ ok: true, at: Date.now() });
  };

  const sync = useServerSync({
    ready,
    getLatest: () => ({ games: gamesRef.current, config: configRef.current }),
    applyRemote,
  });

  // Salvar no localStorage sempre que jogos mudarem
  const updateGamesState = (newGames: Game[]) => {
    setGames(newGames);
    gamesRef.current = newGames;
    const ok = saveGamesToStorage(newGames);
    setLocalSave({ ok, at: Date.now() });
    sync.notifyChange();
    if (!ok) {
      alert(
        'Atenção: não foi possível salvar no navegador (espaço cheio ou navegação anônima). ' +
          'Faça um Backup agora para não perder seus dados e, se possível, use links (URL) nas capas em vez de enviar imagens.'
      );
    }
  };

  // Salvar configurações
  const handleUpdateConfig = (newConfigPartial: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfigPartial };
    setConfig(updated);
    configRef.current = updated;
    saveConfigToStorage(updated);
    sync.notifyChange();
  };

  // Manipuladores de Jogos
  const handleOpenAddModal = () => {
    setEditingGame(null);
    setIsGameModalOpen(true);
  };

  const handleSelectGameForEdit = (game: Game) => {
    setEditingGame(game);
    setIsGameModalOpen(true);
  };

  const handleSaveGame = (savedGame: Game) => {
    const exists = games.some((g) => g.id === savedGame.id);
    let nextGames: Game[];
    if (exists) {
      nextGames = games.map((g) => (g.id === savedGame.id ? savedGame : g));
    } else {
      nextGames = [savedGame, ...games];
    }
    updateGamesState(nextGames);
  };

  const handleDeleteGame = (gameId: string): boolean => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return false;
    if (confirm(`Deseja remover "${game.nome}" da sua lista?`)) {
      const nextGames = games.filter((g) => g.id !== gameId);
      updateGamesState(nextGames);
      return true;
    }
    return false;
  };

  // Ajuste manual do tempo de jogo
  const handleOpenAdjustTime = (game: Game) => {
    setAdjustingGame(game);
    setIsAdjustModalOpen(true);
  };

  const handleApplySession = (gameId: string, session: PlaySession) => {
    const nextGames = games.map((g) =>
      g.id === gameId
        ? {
            ...g,
            tempo: (g.tempo || 0) + session.minutos,
            sessoes: [...(g.sessoes || []), session].sort((a, b) =>
              (a.data + a.inicio).localeCompare(b.data + b.inicio)
            ),
            inicio: g.inicio || session.data,
          }
        : g
    );
    updateGamesState(nextGames);
  };

  const handleApplyTime = (gameId: string, newTotalMinutes: number) => {
    const nextGames = games.map((g) =>
      g.id === gameId ? { ...g, tempo: Math.max(0, Math.round(newTotalMinutes)) } : g
    );
    updateGamesState(nextGames);
  };

  const handleQuickAddTime = (gameId: string, minutes: number) => {
    const nextGames = games.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          tempo: (g.tempo || 0) + minutes,
        };
      }
      return g;
    });
    updateGamesState(nextGames);
  };

  const handleQuickPlay = (game: Game) => {
    const today = new Date().toISOString().slice(0, 10);
    const nextGames = games.map((g) => {
      if (g.id === game.id) {
        return {
          ...g,
          status: 'jogando' as const,
          inicio: g.inicio || today,
        };
      }
      return g;
    });
    updateGamesState(nextGames);
    setActiveTab('jogando');
  };

  const handleOpenFinishModal = (game: Game) => {
    setFinishingGame(game);
    setIsFinishModalOpen(true);
  };

  const handleConfirmFinish = (
    gameId: string,
    fimDate: string,
    nota: number | null,
    totalMinutes: number,
    review: string
  ) => {
    const nextGames = games.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          status: 'zerado' as const,
          fim: fimDate,
          inicio: g.inicio || fimDate,
          nota,
          tempo: totalMinutes,
          notasPessoais: review || g.notasPessoais,
        };
      }
      return g;
    });
    updateGamesState(nextGames);
  };

  const handleUpdateGameStatus = (gameId: string, status: Game['status']) => {
    const today = new Date().toISOString().slice(0, 10);
    const nextGames = games.map((g) => {
      if (g.id === gameId) {
        return {
          ...g,
          status,
          inicio: status === 'jogando' && !g.inicio ? today : g.inicio,
          fim: status === 'zerado' && !g.fim ? today : g.fim,
        };
      }
      return g;
    });
    updateGamesState(nextGames);
  };

  const handleImportGames = (importedGames: Game[], importedConfig?: Partial<AppConfig>) => {
    updateGamesState(importedGames);
    if (importedConfig) {
      handleUpdateConfig(importedConfig);
    }
  };

  const handleResetToDefaults = () => {
    updateGamesState(DEFAULT_GAMES);
    handleUpdateConfig({ metaAnual: 24 });
  };

  // Indicador de "salvo" no topo
  const hhmm = localSave
    ? new Date(localSave.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  let saveLabel = 'Salvo neste aparelho';
  let saveTone: 'ok' | 'info' | 'warn' | 'error' = 'ok';
  if (localSave && !localSave.ok) {
    saveLabel = 'NÃO SALVOU';
    saveTone = 'error';
  } else if (sync.settings) {
    if (sync.status === 'ok') saveLabel = 'Salvo no servidor';
    else if (sync.status === 'syncing' || sync.status === 'checking') {
      saveLabel = 'Enviando...';
      saveTone = 'info';
    } else if (sync.status === 'conflict') {
      saveLabel = 'Conflito de dados';
      saveTone = 'warn';
    } else {
      saveLabel = 'Só neste aparelho';
      saveTone = 'warn';
    }
  } else if (hhmm) {
    saveLabel = `Salvo ${hhmm}`;
  }

  const lastBackup = getLastBackup();
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 864e5) : null;
  const showBackupBanner =
    ready &&
    !backupBannerHidden &&
    games.length > 0 &&
    !(sync.settings && sync.status === 'ok') &&
    (daysSinceBackup === null || daysSinceBackup >= 7);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Navbar & Mobile Bottom Tab */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        saveLabel={saveLabel}
        saveTone={saveTone}
        onSaveInfoClick={() => (sync.status === 'conflict' ? sync.openConflict() : setIsBackupModalOpen(true))}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-24 md:pb-12">
        {showBackupBanner && (
          <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-amber-200">
              {daysSinceBackup === null
                ? 'Você ainda não fez nenhum backup. Seus jogos ficam só neste navegador.'
                : `Faz ${daysSinceBackup} dias desde o seu último backup.`}{' '}
              Faça um backup ou ative o salvamento no servidor.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                Abrir backup
              </button>
              <button onClick={() => setBackupBannerHidden(true)} className="text-xs text-slate-500 hover:text-slate-300">
                Agora não
              </button>
            </div>
          </div>
        )}
        {activeTab === 'inicio' && (
          <Dashboard
            games={games}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onSelectGame={handleSelectGameForEdit}
            onQuickAddTime={handleQuickAddTime}
            onAdjustTime={handleOpenAdjustTime}
            onQuickFinish={handleOpenFinishModal}
            onOpenAddModal={handleOpenAddModal}
                onChangeTab={(t) => setActiveTab(t as any)}
          />
        )}

        {activeTab === 'backlog' && (
          <BacklogView
            games={games}
            onSelectGame={handleSelectGameForEdit}
            onQuickPlay={handleQuickPlay}
            onQuickFinish={handleOpenFinishModal}
            onDeleteGame={handleDeleteGame}
            onOpenAddModal={handleOpenAddModal}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}

        {activeTab === 'jogando' && (
          <PlayingView
            games={games}
            onSelectGame={handleSelectGameForEdit}
            onQuickAddTime={handleQuickAddTime}
            onQuickFinish={handleOpenFinishModal}
            onUpdateGameStatus={handleUpdateGameStatus}
            onAdjustTime={handleOpenAdjustTime}
            onDeleteGame={handleDeleteGame}
            onOpenAddModal={handleOpenAddModal}
          />
        )}

        {activeTab === 'wrap' && (
          <WrapUpView
            games={games}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onSelectGame={handleSelectGameForEdit}
          />
        )}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Game Hub · Gerenciador de Backlog & Tempo de Gameplay</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Backup & Exportar
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GameModal
        isOpen={isGameModalOpen}
        game={editingGame}
        games={games}
        onClose={() => setIsGameModalOpen(false)}
        onSave={handleSaveGame}
        onDelete={handleDeleteGame}
      />

      <TimeAdjustModal
        isOpen={isAdjustModalOpen}
        game={adjustingGame}
        onClose={() => setIsAdjustModalOpen(false)}
        onApply={handleApplyTime}
        onApplySession={handleApplySession}
      />

      <FinishGameModal
        isOpen={isFinishModalOpen}
        game={finishingGame}
        onClose={() => setIsFinishModalOpen(false)}
        onConfirmFinish={handleConfirmFinish}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        games={games}
        config={config}
        onImportGames={handleImportGames}
        onResetToDefaults={handleResetToDefaults}
        sync={sync}
      />

      <SyncConflictModal sync={sync} localGames={games} />
    </div>
  );
}
