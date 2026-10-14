import React, { useMemo } from 'react';
import { GameItem } from '../types/game';
import { getRecentBeatenGames, getBeatenDisplayDate } from '../utils/recentBeatenGames';
import { getGameEffectiveScore, getGameEffectiveTime } from '../utils/gameCalculations';
import { getUniqueZerados, cleanTitle } from '../utils/markdownParser';
import { GameCover } from './GameCover';
import { Trophy, ArrowRight, Star, Clock, CalendarCheck } from 'lucide-react';

interface RecentBeatenSectionProps {
  games: GameItem[];
}

export const RecentBeatenSection: React.FC<RecentBeatenSectionProps> = ({ games }) => {
  // 8 jogos: 4 em cada coluna (leitura em colunas, como na referência)
  const recentGames = useMemo(() => {
    return getRecentBeatenGames(games, 8);
  }, [games]);

  const totalZerados = useMemo(() => {
    return getUniqueZerados(games.filter((g) => g.status === 'zerado')).length;
  }, [games]);

  const leftColumn = recentGames.slice(0, 4);
  const rightColumn = recentGames.slice(4, 8);

  const renderRow = (game: typeof recentGames[number]) => {
    const { nota } = getGameEffectiveScore(game);
    const ratingDisplay =
      typeof nota === 'number' && !isNaN(nota) ? nota.toFixed(1) : '—';

    const { tempoMinutos } = getGameEffectiveTime(game);
    const hours = Math.floor(tempoMinutos / 60);
    const mins = tempoMinutos % 60;
    const formattedPlayTime = `${hours}h ${String(mins).padStart(2, '0')}m`;

    const displayDate = getBeatenDisplayDate(game);

    return (
      <a
        key={game.id}
        href={`#/jogo/${encodeURIComponent(game.id)}`}
        className="group flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-2.5 hover:border-emerald-400/70 hover:bg-[#161b22] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
      >
        {/* Capa com Selo da Nota */}
        <div className="relative h-20 w-15 sm:h-24 sm:w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#30363d]/80 bg-black/40 aspect-[3/4]">
          <GameCover
            src={game.capa}
            title={game.title}
            consoleName={game.console}
            size="card"
            grayscale={false}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded-md bg-[#0d1117]/90 backdrop-blur-sm border border-[#ffd700]/40 px-1 py-0.5 shadow-md">
            <Star className="h-2.5 w-2.5 fill-[#ffd700] text-[#ffd700]" aria-hidden="true" />
            <span className="font-mono text-xs font-bold text-[#ffd700] leading-none">
              {ratingDisplay}
            </span>
          </div>
        </div>

        {/* Metadados na horizontal */}
        <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
          <div className="min-w-0">
            <h3
              className="font-heading text-sm sm:text-base font-bold text-white group-hover:text-[#22d3ee] transition-colors line-clamp-2 leading-snug"
              title={cleanTitle(game.title)}
            >
              {cleanTitle(game.title)}
            </h3>
            <div
              className="text-xs font-mono font-bold text-[#22d3ee] truncate mt-0.5"
              title={game.console}
            >
              {game.console}
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-mono">
            <span
              className="flex items-center gap-1 text-[#9aa4b2]"
              title={`Tempo jogado: ${formattedPlayTime}`}
            >
              <Clock className="h-3.5 w-3.5 text-[#22d3ee] shrink-0" aria-hidden="true" />
              {formattedPlayTime}
            </span>
            <span
              className="flex items-center gap-1 text-emerald-400 font-semibold"
              title={`Zerado em: ${displayDate}`}
            >
              <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              {displayDate}
            </span>
          </div>
        </div>
      </a>
    );
  };

  return (
    <section
      aria-labelledby="recent-beaten-heading"
      className="recent-beaten-section rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4"
    >
      {/* ── CABEÇALHO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="recent-beaten-heading"
                className="font-heading text-lg sm:text-xl font-black uppercase text-white tracking-tight"
              >
                RECÉM ZERADOS
              </h2>
              {recentGames.length > 0 && (
                <span className="text-xs font-mono font-bold text-[#9aa4b2] bg-white/5 border border-[#30363d] px-2 py-0.5 rounded-md">
                  {recentGames.length} de {totalZerados} zerados
                </span>
              )}
            </div>
            <p className="text-xs text-[#9aa4b2]">
              Últimos jogos concluídos em ordem cronológica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {recentGames.length > 0 && (
            <a
              href="#/backlog?status=zerado"
              className="min-h-[44px] px-2.5 flex items-center gap-1 text-xs font-bold text-[#22d3ee] hover:text-[#06b6d4] cursor-pointer transition-colors rounded-lg hover:bg-white/5"
            >
              <span>Ver zerados</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* ── CONTEÚDO: DUAS COLUNAS DE ITENS HORIZONTAIS ── */}
      {recentGames.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#30363d] p-6 text-center text-xs text-[#9aa4b2]">
          Nenhum jogo zerado ainda
        </div>
      ) : (
        <ul role="list" className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          <li role="listitem" className="flex flex-col gap-2.5 min-w-0">
            {leftColumn.map(renderRow)}
          </li>
          <li role="listitem" className="flex flex-col gap-2.5 min-w-0">
            {rightColumn.map(renderRow)}
          </li>
        </ul>
      )}
    </section>
  );
};
