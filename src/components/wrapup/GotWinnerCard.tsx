import React from 'react';
import { Star, Trophy } from 'lucide-react';
import { GameItem, GameReviewRubric } from '../../types/game';
import { GameCover } from '../GameCover';
import { fmtH, formatDateBR, parseTime } from '../../utils/markdownParser';

interface GotWinnerCardProps {
  game: GameItem;
  ano: number;
  onClick: () => void;
}

// Média simples de um grupo da rubrica, ignorando campos vazios/inválidos.
const groupAvg = (rubric: GameReviewRubric, keys: Array<keyof GameReviewRubric>): number | null => {
  const vals = keys
    .map((k) => rubric[k])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const RUBRIC_GROUPS: Array<{ label: string; keys: Array<keyof GameReviewRubric> }> = [
  { label: 'Jogabilidade', keys: ['controles', 'dificuldade', 'levelDesign', 'mecanicas'] },
  { label: 'Gráficos', keys: ['estiloVisual', 'animacoes', 'paletaCores', 'detalhes'] },
  { label: 'Trilha sonora', keys: ['musicasMemoraveis', 'adequacao', 'variedade', 'efeitosSonoros'] },
  { label: 'Diversão', keys: ['querContinuarJogando', 'satisfacao', 'rejogabilidade', 'interesse'] },
];

export const GotWinnerCard: React.FC<GotWinnerCardProps> = ({ game, ano, onClick }) => {
  const hasCapa = Boolean(game.capa && game.capa.trim());
  const hours = game.tempoMinutos ? game.tempoMinutos / 60 : parseTime(game.tempo);
  const sessionCount = game.sessoes?.length || 0;

  const stats: Array<{ label: string; value: string }> = [];
  if (Number.isFinite(hours) && hours > 0) stats.push({ label: 'Tempo jogado', value: fmtH(hours) });
  if (game.data_zerado) stats.push({ label: 'Zerado em', value: formatDateBR(game.data_zerado) });
  if (sessionCount > 0) stats.push({ label: 'Sessões', value: String(sessionCount) });

  const rubricBars = game.rubric
    ? RUBRIC_GROUPS.map((g) => ({ label: g.label, avg: groupAvg(game.rubric!, g.keys) })).filter(
        (b) => b.avg !== null,
      )
    : [];

  return (
    <div
      onClick={onClick}
      className="goty-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-[#ffd700]/80 bg-[#0d1117] p-4 shadow-[0_0_24px_rgba(255,215,0,0.25)] transition-shadow hover:shadow-[0_0_36px_rgba(255,215,0,0.4)] sm:p-6"
    >
      {/* Fundo: capa desfocada + degradê escuro + brilho radial dourado */}
      {hasCapa && (
        <>
          <img
            src={game.capa}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.28] blur-2xl"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0d1117]/95 via-[#0d1117]/70 to-transparent" />
        </>
      )}
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.18), transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Marca d'água GOTY inteira, atrás do título, canto superior direito */}
      <span
        className="pointer-events-none absolute right-2 top-2 select-none font-heading text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-widest text-[#ffd700]/[0.05] overflow-hidden max-w-[40%]"
        aria-hidden="true"
      >
        GOTY
      </span>

      {/* Linha 1: capa + conteúdo */}
      <div className="relative z-10 flex flex-1 flex-col gap-4 md:flex-row md:items-stretch">
        {/* Capa grande (esquerda, ~200px de largura) */}
        <div className="w-[110px] shrink-0 self-start md:w-[200px] lg:w-[clamp(170px,14vw,200px)] md:self-start flex flex-col">
          <div className="aspect-[3/4] md:aspect-none lg:aspect-[264/374] md:h-full lg:h-auto md:w-full overflow-hidden rounded-xl border-2 border-[#ffd700]/70 shadow-[0_0_18px_rgba(255,215,0,0.25)] flex">
            <GameCover
              src={game.capa}
              title={game.title}
              consoleName={game.console}
              size="lg"
              priority
              className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:[object-position:center_top]"
            />
          </div>
        </div>

        {/* Bloco de texto ao lado da capa */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#ffd700]">
              <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Game of the Year · {ano}</span>
            </div>
            <h3
              className="mt-1 line-clamp-2 font-heading text-[clamp(1.4rem,4vw,2.75rem)] font-black uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] break-words"
              title={game.title}
            >
              {game.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {game.console && (
                <span className="rounded-md border border-white/10 bg-black/50 px-2 py-0.5 text-xs text-slate-200">
                  {game.console}
                </span>
              )}
              {game.genero && (
                <span className="rounded-md border border-white/10 bg-black/50 px-2 py-0.5 text-xs text-slate-200">
                  {game.genero}
                </span>
              )}
              {game.ano_lancamento !== undefined && (
                <span className="rounded-md border border-white/10 bg-black/50 px-2 py-0.5 text-xs text-slate-200">
                  {game.ano_lancamento}
                </span>
              )}
            </div>
          </div>

          {/* Destaques (mini-estatísticas) — responsivo no mobile para evitar corte do 3º quadro */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 min-[430px]:grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-[10px] lg:gap-[8px]">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0 rounded-lg border border-white/10 bg-black/40 py-2 sm:py-[10px] px-2.5 sm:px-[14px] lg:p-[8px_10px]">
                  <div className="text-[11px] sm:text-xs font-medium text-slate-400 truncate lg:text-[11px] lg:whitespace-nowrap lg:overflow-visible">{s.label}</div>
                  <div className="mt-0.5 truncate font-mono text-sm min-[390px]:text-base font-bold tabular-nums text-white lg:text-[15px] lg:whitespace-nowrap lg:overflow-visible">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-between gap-3 border-t border-[#ffd700]/30 pt-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#ffd700]">Vencedor Supremo</span>
            <span
              className="flex items-center gap-1.5 font-mono font-bold tabular-nums text-[#ffd700]"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', textShadow: '0 0 18px rgba(255,215,0,0.45)' }}
            >
              <Star className="h-6 w-6 shrink-0 fill-[#ffd700] stroke-[#ffd700]" aria-hidden="true" />
              {game.nota !== undefined && Number.isFinite(game.nota) ? game.nota.toFixed(1) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Linha 2: barras da rubrica ocupando a largura TOTAL do cartão */}
      {rubricBars.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-col gap-2">
          {rubricBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs text-slate-400">{bar.label}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ffd700] to-[#f97316]"
                  style={{ width: `${Math.min(((bar.avg as number) / 10) * 100, 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-[#ffd700]">
                {(bar.avg as number).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
