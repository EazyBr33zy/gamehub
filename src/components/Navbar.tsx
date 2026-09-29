import React from 'react';
import {
  LayoutDashboard,
  Library,
  Gamepad2,
  Trophy,
  Plus,
  DownloadCloud
} from 'lucide-react';

export type NavTab = 'inicio' | 'backlog' | 'jogando' | 'wrap';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenBackupModal: () => void;
  saveLabel: string;
  saveTone: 'ok' | 'info' | 'warn' | 'error';
  onSaveInfoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenBackupModal,
  saveLabel,
  saveTone,
  onSaveInfoClick,
}) => {
  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP / TABLET TOP BAR (Compliant with 3-Zone Top Bar Contract) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => setActiveTab('inicio')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <Gamepad2 className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Game<span className="text-cyan-400">Hub</span>
            </span>
          </button>

          {/* Zone 2: 4-5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('inicio')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'inicio'
                  ? 'bg-slate-800/90 text-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveTab('backlog')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'backlog'
                  ? 'bg-slate-800/90 text-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Backlog
            </button>
            <button
              onClick={() => setActiveTab('jogando')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'jogando'
                  ? 'bg-slate-800/90 text-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Jogando Agora
            </button>
            <button
              onClick={() => setActiveTab('wrap')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'wrap'
                  ? 'bg-slate-800/90 text-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Wrap-Up Anual
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSaveInfoClick}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                saveTone === 'error'
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                  : saveTone === 'warn'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : saveTone === 'info'
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
              title="Estado do salvamento (clique para abrir o Backup)"
              aria-live="polite"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-current ${saveTone === 'info' ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              <span className="max-w-[110px] truncate sm:max-w-none">{saveLabel}</span>
            </button>

            <button
              onClick={onOpenBackupModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
              title="Backup e Sincronização"
            >
              <DownloadCloud className="h-3.5 w-3.5 text-slate-400" />
              <span>Backup</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 rounded-lg shadow-sm shadow-cyan-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden xs:inline">Adicionar</span> Jogo
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly, ergonomic, <= 15% height) */}
      {/* ========================================================================= */}
      <nav
        aria-label="Navegação mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-2 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto">
          {/* Tab 1: Início */}
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors ${
              activeTab === 'inicio' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] tracking-tight mt-1">Início</span>
          </button>

          {/* Tab 2: Backlog */}
          <button
            onClick={() => setActiveTab('backlog')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors ${
              activeTab === 'backlog' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Library className="h-5 w-5" />
            <span className="text-[10px] tracking-tight mt-1">Backlog</span>
          </button>

          {/* Center Prominent Action Button: + Adicionar */}
          <div className="flex items-center justify-center">
            <button
              onClick={onOpenAddModal}
              className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform"
              aria-label="Adicionar novo jogo"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Jogando */}
          <button
            onClick={() => setActiveTab('jogando')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors ${
              activeTab === 'jogando' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="h-5 w-5" />
            <span className="text-[10px] tracking-tight mt-1">Jogando</span>
          </button>

          {/* Tab 4: Wrap-Up */}
          <button
            onClick={() => setActiveTab('wrap')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors ${
              activeTab === 'wrap' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] tracking-tight mt-1">Wrap-Up</span>
          </button>
        </div>
      </nav>
    </>
  );
};
