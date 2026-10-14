import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowRight,
  Sparkles,
  Flame,
  Gamepad2
} from 'lucide-react';
import { getPlatformStyle, getScoreColor } from '../utils/platformStyles';
import { parseTime, formatTempoDisplay, cleanTitle } from '../utils/markdownParser';
import { sortByLastSession } from '../utils/gameActivity';
import { GameCover } from './GameCover';

export const ActiveGamesSlider: React.FC = () => {
  const { games } = useGame();
  const { navigate } = useHashRoute();

  // Get games currently being played (status === 'jogando') ordered by latest session
  const activeGames = sortByLastSession(games.filter((g) => g.status === 'jogando'));
  const slideGames = activeGames.length > 0 
    ? activeGames 
    : games.filter((g) => g.status === 'fila' || (g.progressPercent || 0) > 0).slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = currentIndex >= slideGames.length ? 0 : currentIndex;

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  if (slideGames.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slideGames.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === slideGames.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentGame = slideGames[safeIndex] || slideGames[0];
  const pStyle = getPlatformStyle(currentGame.console);

  // Calculate campaign progress
  const calculateProgress = (gameItem: typeof currentGame) => {
    if (gameItem.status === 'zerado') return 100;
    const sessionMinutes = (gameItem.sessoes || []).reduce((acc, s) => acc + (s.totalMinutos || 0), 0);
    const playedHours = sessionMinutes > 0 ? (sessionMinutes / 60) : parseTime(gameItem.tempo);
    const hltbHours = parseTime(gameItem.hltb);

    if (playedHours > 0 && hltbHours > 0) {
      return Math.min(99, Math.max(1, Math.round((playedHours / hltbHours) * 100)));
    }
    if (typeof gameItem.progressPercent === 'number' && gameItem.progressPercent > 0) {
      return Math.min(100, Math.max(0, gameItem.progressPercent));
    }
    if (playedHours > 0) {
      return Math.min(95, Math.max(5, Math.round((playedHours / 15) * 100)));
    }
    return 0;
  };

  const progress = calculateProgress(currentGame);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-surface shadow-2xl shadow-cyan-500/10">
      {/* ── TOP HEADER OF SLIDER ── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
          </span>
          <h2 className="font-heading text-sm sm:text-base font-black uppercase tracking-wider text-text flex items-center gap-1.5">
            Jogando Agora <span className="hidden sm:inline text-slate-500">//</span>
            <span className="hidden sm:inline text-xs font-normal text-text-muted">Em Execução no Santuário</span>
          </h2>
        </div>

        {/* Slide Counter & Arrows */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-text-muted">
            <strong className="text-accent">{currentIndex + 1}</strong> / {slideGames.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Jogo Anterior"
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-white/5 text-slate-300 hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo Jogo"
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-white/5 text-slate-300 hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN SLIDE CARD ── */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden p-4 sm:p-6 transition-all duration-300"
      >
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Cover Poster with GameCover */}
          <div className="md:col-span-4 lg:col-span-5 flex justify-center items-center">
            <a 
              href={`#/jogo/${currentGame.id}`}
              className="group relative w-36 sm:w-48 lg:w-52 aspect-[3/4] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border bg-black shadow-2xl transition-all hover:scale-105 hover:border-accent"
              aria-label={`Ver detalhes de ${currentGame.title}`}
            >
              <GameCover
                src={currentGame.capa}
                title={currentGame.title}
                consoleName={currentGame.console}
                size="lg"
                alt={currentGame.title}
              />

              {/* Score badge */}
              {currentGame.nota && (
                <div 
                  className="absolute top-2.5 right-2.5 rounded-lg bg-black/85 px-2 py-0.5 font-heading text-xs font-black shadow border border-white/10"
                  style={{ color: getScoreColor(currentGame.nota) }}
                >
                  ★ {currentGame.nota.toFixed(1)}
                </div>
              )}
            </a>
          </div>

          {/* Details & Telemetry */}
          <div className="md:col-span-8 lg:col-span-7 flex flex-col justify-between space-y-3.5 sm:space-y-4">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                <span 
                  className="rounded-lg px-2.5 py-1 text-xs font-black uppercase text-black font-mono shadow"
                  style={{ backgroundColor: pStyle.col }}
                >
                  {pStyle.ico} {pStyle.name}
                </span>

                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 border border-border">
                  {currentGame.genero}
                </span>
              </div>

              {/* Title */}
              <a 
                href={`#/jogo/${currentGame.id}`}
                className="block font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-text hover:text-accent transition-colors leading-tight line-clamp-2"
                title={currentGame.title}
              >
                {cleanTitle(currentGame.title)}
              </a>

              {/* Telemetry Row */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                <div className="rounded-lg bg-black/40 border border-border p-2.5">
                  <div className="text-xs font-bold uppercase text-text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3 text-accent" aria-hidden="true" />
                    <span>Tempo Jogado</span>
                  </div>
                  <div className="font-heading text-base sm:text-lg font-black text-accent mt-0.5 font-mono">
                    {formatTempoDisplay(currentGame.tempo)}
                  </div>
                </div>

                <div className="rounded-lg bg-black/40 border border-border p-2.5">
                  <div className="text-xs font-bold uppercase text-text-muted">
                    Estágio / Missão
                  </div>
                  <div className="font-heading text-sm sm:text-base font-bold text-text truncate mt-0.5">
                    {currentGame.currentStage || 'Em Andamento'}
                  </div>
                </div>

                <div className="hidden sm:block rounded-lg bg-black/40 border border-border p-2.5">
                  <div className="text-xs font-bold uppercase text-text-muted">
                    HLTB Campanha
                  </div>
                  <div className="font-heading text-sm sm:text-base font-bold text-purple-300 mt-0.5 font-mono">
                    {currentGame.hltb ? formatTempoDisplay(currentGame.hltb) : 'Campanha Base'}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 rounded-xl bg-black/40 border border-border p-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                  Progresso da Campanha
                </span>
                <span className="font-heading text-sm sm:text-base font-black text-accent font-mono">
                  {progress}% Concluído
                </span>
              </div>

              <div className="relative h-2.5 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-accent via-purple-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(5, progress)}%` }}
                ></div>
              </div>
            </div>

            {/* Slide Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`#/jogo/${currentGame.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-5 py-3 text-xs sm:text-sm font-black uppercase text-bg hover:bg-cyan-300 transition-all shadow-md shadow-cyan-500/20 min-h-[44px]"
              >
                <span>Ver Telemetria & Avaliação</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Pagination Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {slideGames.map((g, idx) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir para jogo ${idx + 1}`}
              className={`h-2 rounded-full transition-all min-h-[24px] flex items-center justify-center ${
                currentIndex === idx 
                  ? 'w-8 bg-accent' 
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            >
              <span className="sr-only">Jogo {idx + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
