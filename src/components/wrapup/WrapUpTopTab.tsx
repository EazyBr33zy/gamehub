import React from 'react';
import { getScoreColor } from '../../utils/platformStyles';
import { GameItem } from '../../types/game';

interface WrapUpTopTabProps {
  ANO: number;
  /** @deprecated mantido por compatibilidade; a seção "Melhores Avaliados" foi removida do layout. */
  top10Notas?: GameItem[];
  gotAwards: {
    goty: GameItem | null;
    gameplay: GameItem | null;
    narrativa: GameItem | null;
    arte: GameItem | null;
    indie: GameItem | null;
    surpresa: GameItem | null;
    retro: GameItem | null;
    dificil: GameItem | null;
    pior: GameItem | null;
  };
  onGameClick: (id: string) => void;
}

export const WrapUpTopTab: React.FC<WrapUpTopTabProps> = ({
  ANO,
  gotAwards,
  onGameClick,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Games of the Year: GOTY em destaque + categorias ── */}
      <section className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-3 flex items-center gap-2 font-heading text-base sm:text-lg font-black uppercase text-[#ffd700]">
          <span>👑</span>
          <span className="truncate">Games of the Year — {ANO}</span>
        </div>

        {/* GOTY — caixa destacada com borda amarelo neon */}
        <div
          onClick={() => gotAwards.goty && onGameClick(gotAwards.goty.id)}
          className={`group relative mb-3 flex items-center gap-4 overflow-hidden rounded-2xl border-2 p-4 shadow-[0_0_24px_rgba(250,204,21,0.25)] transition-all lg:justify-between lg:items-center ${
            gotAwards.goty
              ? 'cursor-pointer border-[#facc15] bg-gradient-to-br from-[#facc15]/15 via-[#0d1117] to-[#161b22] hover:shadow-[0_0_36px_rgba(250,204,21,0.4)]'
              : 'border-dashed border-[#facc15]/40 bg-[#0d1117] opacity-70'
          }`}
        >
          <div className="pointer-events-none absolute -right-2 -top-4 z-0 select-none font-heading text-6xl font-black text-[#facc15]/[0.05] sm:text-7xl lg:top-2 lg:right-16">
            GOTY
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-28 w-[84px] flex-shrink-0 overflow-hidden rounded-xl border border-[#facc15]/50 bg-black shadow-lg sm:h-32 sm:w-[96px]">
              {gotAwards.goty?.capa ? (
                <img
                  src={gotAwards.goty.capa}
                  alt={gotAwards.goty.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🏆</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-widest text-[#facc15]">
                🏆 Game of the Year — {ANO}
              </div>
              <h3
                className="mt-1 truncate font-heading text-xl font-black uppercase text-white drop-shadow-[0_0_10px_rgba(250,204,21,0.35)] sm:text-2xl"
                title={gotAwards.goty?.title}
              >
                {gotAwards.goty?.title || 'Não definido'}
              </h3>
              {gotAwards.goty?.console && (
                <div className="mt-1 truncate font-mono text-xs text-slate-400">{gotAwards.goty.console}</div>
              )}
              {gotAwards.goty?.nota !== undefined && (
                <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#facc15] lg:hidden">
                  ★ {gotAwards.goty.nota.toFixed(1)}
                </div>
              )}
            </div>
          </div>
          {gotAwards.goty?.nota !== undefined && (
            <div className="hidden lg:flex items-center font-mono font-bold tabular-nums text-[#facc15] lg:text-[48px] lg:shrink-0 lg:pr-6 z-10">
              ★ {gotAwards.goty.nota.toFixed(1)}
            </div>
          )}
        </div>

        {/* Demais premiações — duas colunas */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            { title: 'Melhor Gameplay', g: gotAwards.gameplay, ico: '🕹️', cor: '#22d3ee' },
            { title: 'Melhor Narrativa', g: gotAwards.narrativa, ico: '📖', cor: '#a855f7' },
            { title: 'Direção de Arte', g: gotAwards.arte, ico: '🎨', cor: '#ff6400' },
            { title: 'Indie do Ano', g: gotAwards.indie, ico: '🌱', cor: '#34d399' },
            { title: 'Surpresa do Ano', g: gotAwards.surpresa, ico: '💥', cor: '#ff0055' },
            { title: 'Retro do Ano', g: gotAwards.retro, ico: '📼', cor: '#a78bfa' },
            { title: 'Mais Difícil', g: gotAwards.dificil, ico: '💀', cor: '#f97316' },
            { title: 'Pior do Ano', g: gotAwards.pior, ico: '💩', cor: '#64748b' },
          ].map((award, i) => (
            <div
              key={i}
              onClick={() => award.g && onGameClick(award.g!.id)}
              className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 transition-all ${
                award.g ? 'cursor-pointer hover:border-white/30' : 'opacity-60'
              }`}
            >
              <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: award.cor }}></div>
              <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-black">
                {award.g?.capa ? (
                  <img
                    src={award.g.capa}
                    alt={award.g.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs">🎮</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold uppercase tracking-wider" style={{ color: award.cor }}>
                  {award.ico} {award.title}
                </span>
                <div className="mt-0.5 truncate font-heading text-sm font-bold text-white" title={award.g?.title}>
                  {award.g?.title || 'Não definido'}
                </div>
                {award.g?.nota !== undefined && (
                  <div
                    className="mt-0.5 font-mono text-xs font-bold tabular-nums"
                    style={{ color: getScoreColor(award.g.nota) }}
                  >
                    ★ {award.g.nota.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
