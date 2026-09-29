import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Gamepad2, Plus, Trophy, Pencil, Flame } from 'lucide-react';
import { Game } from '../types';
import { GameCover } from './GameCover';
import { formatMinutes } from '../utils/storage';

interface NowPlayingSliderProps {
  games: Game[]; // jogos com status "jogando"
  onSelectGame: (game: Game) => void;
  onQuickAddTime: (gameId: string, minutes: number) => void;
  onAdjustTime: (game: Game) => void;
  onQuickFinish: (game: Game) => void;
  onGoBacklog: () => void;
}

/** Data+hora da última sessão registrada (ou início do jogo, como fallback) */
const lastActivityKey = (g: Game): string => {
  const ss = g.sessoes || [];
  if (ss.length > 0) {
    const last = [...ss].sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio))[0];
    return `${last.data}T${last.inicio || '00:00'}`;
  }
  return g.inicio ? `${g.inicio}T00:00` : '';
};

const AUTOPLAY_MS = 6000;

export const NowPlayingSlider: React.FC<NowPlayingSliderProps> = ({
  games,
  onSelectGame,
  onQuickAddTime,
  onAdjustTime,
  onQuickFinish,
  onGoBacklog,
}) => {
  // Ordem: o jogo com a sessão registrada mais recente aparece primeiro
  const sorted = useMemo(
    () =>
      [...games].sort((a, b) => {
        const ka = lastActivityKey(a);
        const kb = lastActivityKey(b);
        if (ka === kb) return 0;
        return kb.localeCompare(ka);
      }),
    [games]
  );

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = sorted.length;

  // Se a lista encolher (zerou/excluiu), volta para um slide válido
  useEffect(() => {
    if (idx > total - 1) setIdx(0);
  }, [total, idx]);

  // Passa sozinho a cada 6s (para quando o mouse/dedo está em cima)
  useEffect(() => {
    if (total < 2 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [idx, total, paused]);

  const go = (n: number) => setIdx(((n % total) + total) % total);

  if (total === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <Gamepad2 className="mx-auto mb-3 h-9 w-9 text-slate-600" />
        <h2 className="font-display text-lg font-bold text-white">Nenhum jogo em andamento</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
          Escolha um jogo do seu backlog para começar a jogar e ele aparece aqui.
        </p>
        <button
          onClick={onGoBacklog}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Ver meu backlog
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Jogos em andamento"
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 45) go(dx < 0 ? idx + 1 : idx - 1);
      }}
    >
      {/* Faixa com todos os slides */}
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {sorted.map((game, i) => {
          const estMin = (game.est || 0) * 60;
          const pct = estMin > 0 ? Math.min(100, Math.round(((game.tempo || 0) / estMin) * 100)) : null;
          const falta = remainingMinutes(game);
          const perto = pct !== null && pct >= 80;
          return (
            <div key={game.id} className="relative w-full shrink-0" aria-hidden={i !== idx}>
              {/* Fundo com a capa desfocada */}
              {game.capa ? (
                <img
                  src={game.capa}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950/60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-slate-950/70" />

              <div className="relative flex gap-4 p-4 sm:gap-6 sm:p-7">
                <button
                  onClick={() => onSelectGame(game)}
                  className="w-28 shrink-0 self-start sm:w-44"
                  tabIndex={i === idx ? 0 : -1}
                  aria-label={`Editar ${game.nome}`}
                >
                  <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
                    <GameCover
                      capa={game.capa}
                      nome={game.nome}
                      genero={game.genero}
                      consoleName={game.console}
                      aspect="portrait"
                    />
                  </div>
                </button>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-cyan-400">Jogando agora</span>
                    <span className="text-slate-500">
                      {i + 1} / {total}
                    </span>
                    {perto && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-orange-300">
                        <Flame className="h-3 w-3" /> Perto do fim
                      </span>
                    )}
                  </div>

                  <h2 className="mt-1 line-clamp-2 font-display text-xl font-bold leading-tight text-white sm:text-3xl">
                    {game.nome}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                      {game.console}
                    </span>
                    <span className="rounded-md bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                      {game.genero}
                    </span>
                  </div>

                  <div className="mt-3">
                    {falta !== Infinity ? (
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                        {falta === 0 ? 'Meta atingida' : `Faltam ${formatMinutes(falta)}`}
                      </p>
                    ) : (
                      <p className="font-display text-lg font-bold text-slate-300">Sem estimativa para zerar</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      Jogado: <span className="font-semibold text-slate-200">{formatMinutes(game.tempo)}</span>
                      {game.est ? ` de ~${game.est}h` : ''}
                    </p>
                    {pct !== null && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-fuchsia-300">{pct}%</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => onQuickAddTime(game.id, 30)}
                      tabIndex={i === idx ? 0 : -1}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5 text-cyan-400" /> 30 min
                    </button>
                    <button
                      onClick={() => onAdjustTime(game)}
                      tabIndex={i === idx ? 0 : -1}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Registrar sessão
                    </button>
                    <button
                      onClick={() => onQuickFinish(game)}
                      tabIndex={i === idx ? 0 : -1}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                    >
                      <Trophy className="h-3.5 w-3.5" /> Zerei
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setas */}
      {total > 1 && (
        <>
          <button
            onClick={() => go(idx - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-800 sm:block"
            aria-label="Jogo anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(idx + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-800 sm:block"
            aria-label="Próximo jogo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Miniaturas das capas */}
      {total > 1 && (
        <div className="relative flex items-center gap-2 overflow-x-auto border-t border-slate-800/70 bg-slate-950/70 px-4 py-3">
          {sorted.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              className={`w-9 shrink-0 overflow-hidden rounded-md transition-all ${
                i === idx ? 'ring-2 ring-cyan-400 opacity-100' : 'opacity-50 hover:opacity-90'
              }`}
              aria-label={`Ir para ${g.nome}`}
              aria-current={i === idx}
            >
              <GameCover capa={g.capa} nome={g.nome} genero={g.genero} consoleName="" aspect="portrait" />
            </button>
          ))}
          <span className="ml-auto shrink-0 pl-2 text-[10px] text-slate-500">Ordem: mais perto de zerar</span>
        </div>
      )}
    </section>
  );
};
