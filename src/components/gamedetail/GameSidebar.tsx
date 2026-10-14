import React from 'react';
import { GameCover } from '../GameCover';
import { GameItem } from '../../types/game';
import { cleanTitle, formatTempoDisplay, parseToMinutes } from '../../utils/markdownParser';
import { getGameEffectiveTime } from '../../utils/gameCalculations';

export interface GameSidebarProps {
  game: GameItem;
  playingGames: GameItem[];
  navigate: (hash: string) => void;
}

// fill: o card preenche exatamente o contêiner (position:absolute inset:0) — assim o painel
// tem a mesma altura do card principal e NUNCA aumenta a altura da linha do grid.
// Sem fill (mobile): fluxo normal com altura máxima própria e rolagem interna.
const Card: React.FC<{ title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; fill?: boolean }> = ({
  title,
  right,
  children,
  fill = false,
}) => (
  <div className={`flex min-h-0 flex-col rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-md ${fill ? 'absolute inset-0' : ''}`}>
    <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-[#30363d]/60 pb-2.5">
      <span className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">{title}</span>
      {right}
    </div>
    {children}
  </div>
);

export const GameSidebar: React.FC<GameSidebarProps> = ({ game, playingGames, navigate }) => {
  const others = playingGames.filter((g) => g.id !== game.id);
  // Tempo efetivo dos jogos em andamento (mesma helper da ficha; exibe apenas o texto já formatado)
  const effectiveTempoOf = (g: GameItem): string => getGameEffectiveTime(g).tempo || g.tempo || '0:00';

  return (
    // Desktop (lg): wrapper h-full — a altura vem do pai (grid items-stretch) e o card em
    // absolute inset-0 nunca aumenta a linha. Mobile (<lg): coluna única com altura máx. própria
    // (12px, padrão da escala mobile) e rolagem interna no GameSidebar.
    <div className="relative min-h-[420px] w-full lg:h-full lg:min-h-0">
      {/* ── OUTROS EM ANDAMENTO ── */}
      {others.length > 0 && (
        <Card
          fill
          title={
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#22d3ee] motion-reduce:animate-none" aria-hidden="true" />
              Outros em andamento
            </span>
          }
          right={
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300">
              {playingGames.length} ativos
            </span>
          }
        >
          <div className="max-h-[calc(420px-76px)] space-y-3 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1 lg:space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#30363d #161b22' }}>
            {others.map((pg) => {
              const played = parseToMinutes(effectiveTempoOf(pg));
              const h = parseToMinutes(pg.hltb);
              const pct = h > 0 ? Math.min(100, Math.round((played / h) * 100)) : null;
              return (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => navigate(`#/jogo/${encodeURIComponent(pg.id)}`)}
                  className="flex min-h-[44px] w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] p-2 text-left transition-colors hover:border-[#22d3ee]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                  aria-label={`Abrir ${cleanTitle(pg.title)}`}
                >
                  <div className="h-11 w-[44px] shrink-0 overflow-hidden rounded-lg bg-black">
                    <GameCover src={pg.capa} title={pg.title} consoleName={pg.console} size="sm" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-white">{cleanTitle(pg.title)}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9aa4b2]">
                      <span className="truncate">{pg.console}</span>
                      <span className="shrink-0 font-mono">⏱ {formatTempoDisplay(effectiveTempoOf(pg))}</span>
                      {pct !== null && <span className="shrink-0 font-mono text-cyan-300">{pct}%</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
