import React, { useMemo } from 'react';
import { GameItem } from '../types/game';
import { getUpcomingGames } from '../utils/roulette';
import { GameCover } from './GameCover';
import { getPlatformStyle } from '../utils/platformStyles';
import { Star, ArrowRight, Bookmark } from 'lucide-react';
import { cleanTitle } from '../utils/markdownParser';
import { useIsOwner } from '../hooks/useIsOwner';

interface UpcomingGamesSectionProps {
  games: GameItem[];
}

export const UpcomingGamesSection: React.FC<UpcomingGamesSectionProps> = ({ games }) => {
  const isOwner = useIsOwner();

  const upcomingGames = useMemo(() => {
    return getUpcomingGames(games);
  }, [games]);

  const visibleGames = upcomingGames.slice(0, 6);

  return (
    <section
      aria-labelledby="upcoming-games-heading"
      className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4"
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <Star className="h-5 w-5 fill-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h2 
              id="upcoming-games-heading"
              className="font-heading text-lg sm:text-xl font-black uppercase text-white tracking-tight"
            >
              PRÓXIMOS JOGOS
            </h2>
            <p className="text-xs text-[#9aa4b2]">
              Jogos prioritários para jogar a seguir
            </p>
          </div>
        </div>

        {upcomingGames.length > 0 && (
          <a
            href="#/backlog?prioridade=1"
            className="min-h-[44px] px-2.5 flex items-center gap-1 text-xs font-bold text-[#22d3ee] hover:text-[#06b6d4] cursor-pointer transition-colors rounded-lg hover:bg-white/5"
          >
            <span>Ver todos ({upcomingGames.length})</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      {/* ── LIST / EMPTY STATE ── */}
      {upcomingGames.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#30363d] p-6 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-[#30363d] mx-auto text-[#9aa4b2]">
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-white">
            Nenhum jogo marcado como prioridade
          </p>
          {isOwner && (
            <p className="text-xs text-[#9aa4b2] max-w-sm mx-auto">
              Ao cadastrar ou editar um jogo no acervo, marque a opção <strong>"Marcar como prioridade"</strong> para fixá-lo aqui.
            </p>
          )}
        </div>
      ) : (
        <div 
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
          {visibleGames.map((game) => {
            const pStyle = getPlatformStyle(game.console);

            return (
              <a
                key={game.id}
                href={`#/jogo/${encodeURIComponent(game.id)}`}
                className="group relative flex items-center gap-3 p-3 min-h-[96px] overflow-hidden rounded-xl border border-[#30363d] bg-gradient-to-r from-[#0d1117] to-[#161b22] hover:border-[#22d3ee] hover:-translate-y-0.5 hover:shadow-lg transition-all text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
                aria-label={`Ver jogo prioritário ${cleanTitle(game.title)}`}
              >
                {/* Cover left (64px width, 2:3 ratio) */}
                <div className="relative w-[64px] min-w-[64px] aspect-[2/3] overflow-hidden rounded-lg bg-black/60 shrink-0 border border-[#30363d]">
                  <GameCover
                    src={game.capa}
                    title={game.title}
                    consoleName={game.console}
                    size="thumb"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Metadata right */}
                <div className="min-w-0 flex-1 pr-6 flex flex-col justify-center space-y-1.5">
                  <h3 className="font-heading text-[14px] font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#22d3ee] transition-colors">
                    {cleanTitle(game.title)}
                  </h3>
                  <div>
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-mono font-bold uppercase truncate max-w-full"
                      style={{
                        backgroundColor: `${pStyle.col}20`,
                        color: pStyle.col,
                        border: `1px solid ${pStyle.col}40`,
                      }}
                    >
                      {game.console}
                    </span>
                  </div>
                </div>

                {/* Priority star top right */}
                <div className="absolute top-3 right-3 flex items-center justify-center rounded-md bg-black/80 px-1.5 py-1 text-amber-400 border border-amber-400/40 shadow-xs shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
};
