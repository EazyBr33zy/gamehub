import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GameItem } from '../types/game';
import { getRouletteEligibleGames, pickRandomRouletteGame } from '../utils/roulette';
import { GameCover } from './GameCover';
import { getPlatformStyle } from '../utils/platformStyles';
import { Dices, Sparkles, RotateCw, ExternalLink, Clock, Layers } from 'lucide-react';
import { cleanTitle, formatTempoDisplay } from '../utils/markdownParser';

interface BacklogRouletteSectionProps {
  games: GameItem[];
}

export const BacklogRouletteSection: React.FC<BacklogRouletteSectionProps> = ({ games }) => {
  const eligibleGames = useMemo(() => {
    return getRouletteEligibleGames(games);
  }, [games]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedGame, setDisplayedGame] = useState<GameItem | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const animTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const handleSpin = () => {
    if (eligibleGames.length === 0 || isSpinning) return;

    // Sorteio justo e verdadeiro realizado UMA vez antes da animação
    const targetGame = pickRandomRouletteGame(eligibleGames, selectedGame?.id);
    if (!targetGame) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setSelectedGame(targetGame);
      setDisplayedGame(targetGame);
      setAnnouncement(`Jogo sorteado: ${cleanTitle(targetGame.title)} para ${targetGame.console}`);
      return;
    }

    setIsSpinning(true);
    setSelectedGame(null);
    setAnnouncement('Girando a roleta...');

    // Animation: ~2000ms duration with progressive deceleration
    const totalDuration = 2000;
    const startTime = Date.now();
    let currentInterval = 60; // start fast (60ms)

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      if (progress < 1) {
        // Pick a random game to show during the animation roll
        const randomRoll = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
        setDisplayedGame(randomRoll);

        // Ease-out deceleration
        currentInterval = 60 + Math.floor(Math.pow(progress, 2.5) * 320);
        animTimerRef.current = setTimeout(step, currentInterval);
      } else {
        // Animation finished, reveal the actual pre-picked target
        setDisplayedGame(targetGame);
        setSelectedGame(targetGame);
        setIsSpinning(false);
        setAnnouncement(`Jogo sorteado: ${cleanTitle(targetGame.title)} para ${targetGame.console}`);
      }
    };

    step();
  };

  const activeResultGame = selectedGame || (isSpinning ? displayedGame : null);
  const pStyle = activeResultGame ? getPlatformStyle(activeResultGame.console) : null;

  return (
    <section
      aria-labelledby="roulette-heading"
      className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4"
    >
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22d3ee]/15 border border-[#22d3ee]/30 text-[#22d3ee] shrink-0">
            <Dices className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 
              id="roulette-heading"
              className="font-heading text-lg sm:text-xl font-black uppercase text-white tracking-tight"
            >
              ROLETA DO BACKLOG
            </h2>
            <p className="text-xs text-[#9aa4b2]">
              Sorteie seu próximo jogo entre os títulos intocados da fila
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#9aa4b2]">
          <Layers className="h-3.5 w-3.5 text-[#22d3ee]" aria-hidden="true" />
          <span>
            {eligibleGames.length}{' '}
            {eligibleGames.length === 1 ? 'jogo no sorteio' : 'jogos no sorteio'}
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT: SPIN CONTROLS & RESULT ── */}
      <div className="space-y-4">
        {/* If no games in backlog eligible */}
        {eligibleGames.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#30363d] p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-white">
              Nenhum jogo novo no backlog para sortear
            </p>
            <p className="text-xs text-[#9aa4b2]">
              Adicione jogos com status "Quero Jogar" (Fila) sem sessões registradas para habilitar a roleta.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Spinning preview or Selected result */}
            {activeResultGame && (
              <div 
                className={`w-full max-w-xl rounded-2xl border bg-[#0d1117] p-4 transition-all duration-300 ${
                  isSpinning
                    ? 'border-[#22d3ee]/50 scale-[0.99] shadow-lg shadow-[#22d3ee]/10 animate-pulse'
                    : 'border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Cover */}
                  <div className="w-32 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-[#30363d] bg-black/60 shadow-md">
                    <GameCover
                      src={activeResultGame.capa}
                      title={activeResultGame.title}
                      consoleName={activeResultGame.console}
                      size="card"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 w-full text-center sm:text-left space-y-2.5">
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap mb-1.5">
                        {pStyle && (
                          <span
                            className="rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase"
                            style={{
                              backgroundColor: `${pStyle.col}20`,
                              color: pStyle.col,
                              border: `1px solid ${pStyle.col}40`,
                            }}
                          >
                            {activeResultGame.console}
                          </span>
                        )}
                        <span className="rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] text-purple-300">
                          {activeResultGame.genero}
                        </span>
                      </div>

                      <h3 className="font-heading text-base sm:text-lg font-black text-white leading-tight">
                        {cleanTitle(activeResultGame.title)}
                      </h3>
                    </div>

                    {/* HLTB Estimate */}
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-mono text-[#9aa4b2]">
                      <Clock className="h-3.5 w-3.5 text-[#22d3ee]" aria-hidden="true" />
                      <span>
                        Tempo estimado (HLTB):{' '}
                        <strong className="text-white">
                          {activeResultGame.hltb ? formatTempoDisplay(activeResultGame.hltb) : 'Não informado'}
                        </strong>
                      </span>
                    </div>

                    {/* Action buttons (when final result is ready) */}
                    {!isSpinning && selectedGame && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                        <a
                          href={`#/jogo/${encodeURIComponent(selectedGame.id)}`}
                          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-[#22d3ee] text-[#0d1117] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#22d3ee]/20 hover:bg-[#06b6d4] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <span>Ver jogo</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>

                        <button
                          type="button"
                          onClick={handleSpin}
                          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[#30363d] bg-[#161b22] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                        >
                          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Girar de novo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Initial spin button when no game drawn yet */}
            {(!selectedGame || isSpinning) && (
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || eligibleGames.length === 0}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-[#22d3ee] text-[#0d1117] text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#22d3ee]/25 hover:bg-[#06b6d4] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white"
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Sorteando jogo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                    <span>Girar a roleta</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
