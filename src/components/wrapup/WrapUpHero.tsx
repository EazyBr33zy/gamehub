import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WrapUpHeroProps {
  ANO: number;
  availableYears: number[];
  activeTab: 'resumo' | 'analise' | 'status' | 'top' | 'timeline';
  setActiveTabLocal: (tab: 'resumo' | 'analise' | 'status' | 'top' | 'timeline') => void;
  onYearChange: (delta: number) => void;
}

const TABS = [
  { id: 'resumo', label: 'Resumo', icon: '📊' },
  { id: 'analise', label: 'Análise', icon: '📈' },
  { id: 'status', label: 'Status', icon: '⚡' },
  { id: 'top', label: 'Top Jogos', icon: '🏆' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
] as const;

export const WrapUpHero: React.FC<WrapUpHeroProps> = ({
  ANO,
  availableYears,
  activeTab,
  setActiveTabLocal,
  onYearChange,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl">
      {/* Glows radiais nas esquinas (ciano + roxo) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(560px circle at 8% -10%, rgba(34,211,238,0.14), transparent 60%), radial-gradient(480px circle at 96% 110%, rgba(168,85,247,0.14), transparent 60%)',
        }}
      />
      {/* Grid cyber sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.6) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* ── Faixa superior: título + seletor de ano ── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#22d3ee] mb-1">
            <span className="h-0.5 w-4 sm:w-6 bg-[#22d3ee]"></span>
            Retrospectiva Gamer
          </div>
          <h1 className="font-heading text-xl sm:text-3xl lg:text-4xl font-black uppercase tracking-normal sm:tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#22d3ee] to-[#a855f7]">
            Wrap-Up Anual
          </h1>
          <p className="hidden sm:block text-xs text-slate-400 mt-1 max-w-2xl lg:max-w-3xl [text-wrap:balance] leading-relaxed">
            KPIs de desempenho, gráficos de análise, pódio dos melhores jogos e calendário de zeradas — tudo do ciclo selecionado.
          </p>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm self-start sm:self-auto">
          <span className="hidden md:inline text-xs font-black uppercase tracking-widest text-slate-500">
            Ciclo
          </span>
          <button
            onClick={() => onYearChange(1)}
            disabled={availableYears.indexOf(ANO) >= availableYears.length - 1}
            aria-label="Ano anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:border-[#22d3ee] hover:bg-[#22d3ee]/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="font-mono text-2xl font-bold text-[#22d3ee] min-w-[64px] text-center tabular-nums text-glow-cyan">
            {ANO}
          </div>
          <button
            onClick={() => onYearChange(-1)}
            disabled={availableYears.indexOf(ANO) <= 0}
            aria-label="Próximo ano"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:border-[#22d3ee] hover:bg-[#22d3ee]/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Navegação por abas: pills deslizantes ── */}
      <div className="relative z-10 mt-4 px-3 pb-3 sm:px-5 sm:pb-4">
        {/* Mobile: scroll horizontal suave com snap para evitar cortes nos rótulos */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-none sm:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabLocal(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`flex min-h-[44px] shrink-0 min-w-[70px] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-center transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#22d3ee]/60 bg-[#22d3ee]/10 text-[#22d3ee] shadow-sm shadow-[#22d3ee]/20 font-black'
                  : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span className="whitespace-nowrap text-[11px] font-bold leading-tight">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Desktop: pills */}
        <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabLocal(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#22d3ee]/60 bg-[#22d3ee]/10 text-[#22d3ee] shadow-[0_0_18px_rgba(34,211,238,0.15)]'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
