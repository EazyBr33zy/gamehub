import React, { Suspense } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/AuthContext';
import { useHashRoute } from './hooks/useHashRoute';
import { Navbar } from './components/Navbar';
import { SkeletonView } from './components/SkeletonView';
import { ObsidianImportModal } from './components/ObsidianImportModal';
import { NewGameModal } from './components/NewGameModal';
import { EditGameModal } from './components/EditGameModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { DuplicateReviewModal } from './components/DuplicateReviewModal';
import { MigrationModal } from './components/MigrationModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertCircle, Gamepad2, LogIn, Lock } from 'lucide-react';

import { DashboardView } from './components/DashboardView';
import { BacklogView } from './components/BacklogView';
import { GameDetailView } from './components/GameDetailView';
import { WrapUpView } from './components/WrapUpView';

const AppContent: React.FC = () => {
  const { serverSyncStatus } = useGame();
  const { currentUser, isAuthLoading, isOwner, authError, login } = useAuth();
  const { tab } = useHashRoute();
  const currentYear = new Date().getFullYear();

  // Loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-dvh bg-[#0d1117] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Gamepad2 className="h-10 w-10 text-[#22d3ee] animate-pulse" aria-hidden="true" />
          <span className="text-xs font-mono text-[#9aa4b2]">Carregando GameHub...</span>
        </div>
      </div>
    );
  }

  // Private entrance screen: displayed when not authenticated or not owner
  if (!currentUser || !isOwner) {
    return (
      <div className="min-h-dvh bg-[#0d1117] text-[#f0f6fc] flex flex-col items-center justify-center p-4 selection:bg-[#22d3ee]/30 selection:text-white">
        <div className="w-full max-w-sm rounded-2xl border border-[#30363d] bg-[#161b22] p-6 sm:p-8 shadow-2xl text-center space-y-6">
          {/* Logo GameHub */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06b6d4]/15 border border-[#06b6d4]/35 text-[#06b6d4] shadow-lg">
              <Gamepad2 className="h-9 w-9 text-[#22d3ee]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-black tracking-wider text-white">
                Game<span className="text-[#22d3ee]">Hub</span>
              </h1>
              <p className="text-xs text-[#9aa4b2] mt-0.5">Telemetria de Jogos & Backlog</p>
            </div>
          </div>

          {/* Texto "Acesso restrito" */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
              <Lock className="h-3.5 w-3.5 text-[#22d3ee]" aria-hidden="true" />
              <span>Acesso restrito</span>
            </div>
            <p className="text-xs text-slate-400">
              Acervo pessoal e privado de uso exclusivo do administrador.
            </p>
          </div>

          {/* Mensagem de conta sem acesso se usuário não for o dono */}
          {authError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
              <span>{authError}</span>
            </div>
          )}

          {/* Botão Entrar com Google */}
          <button
            type="button"
            onClick={login}
            className="w-full min-h-[44px] flex items-center justify-center gap-2.5 rounded-xl border border-[#22d3ee]/50 bg-[#22d3ee] hover:bg-[#06b6d4] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#0d1117] transition-all cursor-pointer shadow-lg active:scale-98 focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Entrar com Google</span>
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  }

  const getSyncStatusDisplay = () => {
    switch (serverSyncStatus) {
      case 'synced':
        return {
          dotColor: 'bg-[#10b981]',
          textColor: 'text-[#10b981]',
          label: 'Sincronizado',
        };
      case 'syncing':
        return {
          dotColor: 'bg-[#22d3ee] animate-ping',
          textColor: 'text-[#22d3ee]',
          label: 'Sincronizando...',
        };
      case 'offline':
        return {
          dotColor: 'bg-[#f59e0b]',
          textColor: 'text-[#f59e0b]',
          label: 'Offline (Cache local)',
        };
      case 'error':
      default:
        return {
          dotColor: 'bg-[#f43f5e]',
          textColor: 'text-[#f43f5e]',
          label: 'Erro de sincronização',
        };
    }
  };

  const syncStatus = getSyncStatusDisplay();

  return (
    <div className="min-h-dvh bg-[#0d1117] text-[#f0f6fc] flex flex-col justify-between selection:bg-[#06b6d4]/30 selection:text-white">
      <Navbar />

      {/* Discret banner in case of sync error */}
      {serverSyncStatus === 'error' && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2.5 text-center text-xs text-red-300 flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
          <span>Não foi possível sincronizar com o servidor no momento. Exibindo dados em cache local.</span>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 pb-24 md:pb-8">
        <Suspense fallback={<SkeletonView />}>
          {tab === 'painel' && <DashboardView />}
          {tab === 'backlog' && <BacklogView />}
          {(tab === 'jogando' || tab === 'jogo') && <GameDetailView />}
          {tab === 'wrapup' && <WrapUpView />}
        </Suspense>
      </main>

      {/* ── FOOTER STATUS BAR ── */}
      <footer className="border-t border-[#30363d] bg-[#0d1117] px-4 py-3.5 pb-20 md:pb-3.5 text-xs text-[#9aa4b2] font-mono">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="font-heading font-black text-white tracking-wider">GAMEHUB</span>
            <span aria-hidden="true">—</span>
            <span>Filipe Aurélio © {currentYear}</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className={`flex items-center gap-1.5 font-bold ${syncStatus.textColor}`}>
              <span className={`h-2 w-2 rounded-full ${syncStatus.dotColor}`} aria-hidden="true"></span>
              <span>{syncStatus.label}</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Global Modals & Notifications */}
      <ObsidianImportModal />
      <NewGameModal />
      <EditGameModal />
      <DuplicateWarningModal />
      <DuplicateReviewModal />
      <MigrationModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
