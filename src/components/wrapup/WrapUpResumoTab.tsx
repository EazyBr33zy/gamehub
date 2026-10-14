import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { fmtH, parseTime } from '../../utils/markdownParser';
import { getScoreLabel } from '../../utils/platformStyles';
import { GameItem } from '../../types/game';
import { GotWinnerCard } from './GotWinnerCard';

interface WrapUpResumoTabProps {
  ANO: number;
  total: number;
  horas: number;
  mediaTempo: number;
  media: number;
  notasArr: number[];
  plataformaDoAno: [string, { count: number; hours: number }] | null;
  generoDoAno: [string, { count: number; hours: number }] | null;
  maisLongo: GameItem | null;
  maisCurto: GameItem | null;
  piorNota: GameItem | null;
  melhor: GameItem | null;
  slogan: string;
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
  onOpenTopTab: () => void;
}

const gameHours = (g: GameItem): number =>
  g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo);

const KPI_CARDS = (
  ANO: number,
  total: number,
  horas: number,
  mediaTempo: number,
  media: number,
  notasArr: number[],
  plataformaDoAno: [string, { count: number; hours: number }] | null,
  generoDoAno: [string, { count: number; hours: number }] | null,
  maisLongo: GameItem | null,
): Array<{ label: string; value: string; sub: string; cor: string }> => [
  {
    label: `Zerados em ${ANO}`,
    value: String(total),
    sub: `≈ ${(total / 12).toFixed(1)} por mês`,
    cor: '#22d3ee',
  },
  {
    label: 'Horas Jogadas',
    value: fmtH(horas),
    sub: `≈ ${fmtH(mediaTempo)} por jogo`,
    cor: '#34d399',
  },
  {
    label: 'Nota Média',
    value: media ? media.toFixed(2) : '—',
    sub: `${notasArr.length} avaliados · ${getScoreLabel(media)}`,
    cor: '#ffd700',
  },
  {
    label: 'Plataforma do Ano',
    value: plataformaDoAno ? plataformaDoAno[0] : '—',
    sub: plataformaDoAno ? `${plataformaDoAno[1].count} zerados` : 'Sem dados',
    cor: '#f97316',
  },
  {
    label: 'Gênero Mais Jogado',
    value: generoDoAno ? generoDoAno[0] : '—',
    sub: generoDoAno ? `${generoDoAno[1].count} jogos` : 'Sem dados',
    cor: '#f472b6',
  },
  {
    label: 'Jogo Mais Longo',
    value: maisLongo ? fmtH(maisLongo.tempoMinutos ? maisLongo.tempoMinutos / 60 : 0) : '—',
    sub: maisLongo?.title || 'Sem dados',
    cor: '#a855f7',
  },
];

export const WrapUpResumoTab: React.FC<WrapUpResumoTabProps> = ({
  ANO,
  total,
  horas,
  mediaTempo,
  media,
  notasArr,
  plataformaDoAno,
  generoDoAno,
  maisLongo,
  maisCurto,
  piorNota,
  melhor,
  slogan,
  gotAwards,
  onGameClick,
  onOpenTopTab,
}) => {
  const kpis = KPI_CARDS(ANO, total, horas, mediaTempo, media, notasArr, plataformaDoAno, generoDoAno, maisLongo);

  // ── DESTAQUE DO ANO: 4 jogos — 2 em cada coluna (horizontal) ──
  const destaques = [
    {
      cat: '⭐ Melhor Avaliado',
      g: melhor,
      valor: melhor?.nota !== undefined ? `★ ${melhor.nota.toFixed(1)}` : '—',
      cor: '#ffd700',
      icone: '🏆',
    },
    {
      cat: '📉 Menor Nota',
      g: piorNota,
      valor: piorNota?.nota !== undefined ? `★ ${piorNota.nota.toFixed(1)}` : '—',
      cor: '#ef4444',
      icone: '💤',
    },
    {
      cat: '⏳ Jogo Mais Longo',
      g: maisLongo,
      valor: maisLongo ? fmtH(gameHours(maisLongo)) : '—',
      cor: '#a855f7',
      icone: '🗺️',
    },
    {
      cat: '⚡ Jogo Mais Rápido',
      g: maisCurto,
      valor: maisCurto ? fmtH(gameHours(maisCurto)) : '—',
      cor: '#22d3ee',
      icone: '🚀',
    },
  ];

  const premiados = [
    { cat: '🕹️ Melhor Gameplay', g: gotAwards.gameplay, cor: '#22d3ee' },
    { cat: '📖 Melhor Narrativa', g: gotAwards.narrativa, cor: '#a855f7' },
    { cat: '🎨 Melhor Arte / Gráficos', g: gotAwards.arte, cor: '#f472b6' },
    { cat: '💎 Melhor Indie', g: gotAwards.indie, cor: '#34d399' },
    { cat: '⚡ Maior Surpresa', g: gotAwards.surpresa, cor: '#ffd700' },
    { cat: '📼 Melhor Retrô', g: gotAwards.retro, cor: '#f97316' },
    { cat: '💀 Maior Desafio', g: gotAwards.dificil, cor: '#e60012' },
    { cat: '💩 Decepção / Menor Nota', g: gotAwards.pior, cor: '#ef4444' },
  ].filter((item) => item.g);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Faixa de KPIs: 2 colunas no mobile, 3 no tablet, 6 no desktop ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 items-stretch">
        {kpis.map((kpi) => {
          const isLongText = kpi.label === 'Gênero Mais Jogado' || kpi.label === 'Plataforma do Ano';
          return (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 flex flex-col justify-between h-full transition-colors hover:border-white/25"
            >
              <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: kpi.cor }}></div>
              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 line-clamp-2 min-h-[2rem] sm:min-h-0 leading-tight">
                  {kpi.label}
                </div>
                <div
                  className={`mt-1 font-mono text-[clamp(18px,1.5vw,24px)] font-bold tabular-nums leading-tight flex items-center min-h-[36px] ${
                    isLongText ? 'line-clamp-2 text-[15px] sm:text-[18px] lg:line-clamp-none lg:text-[clamp(18px,1.5vw,24px)] lg:min-w-0 lg:overflow-hidden' : 'whitespace-nowrap'
                  }`}
                  style={{ color: kpi.cor }}
                  title={kpi.value}
                >
                  {kpi.value}
                </div>
              </div>
              <div className="mt-1 line-clamp-2 sm:truncate text-[11px] sm:text-xs text-slate-400 leading-tight" title={kpi.sub}>
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESTAQUE DO ANO: 4 jogos — 2 em cada coluna (horizontal) ── */}
      <section className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-heading text-base sm:text-lg font-black uppercase text-[#22d3ee]">
            <span>✨</span>
            <span className="truncate">Destaque do Ano — {ANO}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {destaques.map((d, i) => (
            <div
              key={i}
              onClick={() => d.g && onGameClick(d.g.id)}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 transition-all ${
                d.g ? 'cursor-pointer hover:border-white/30' : 'opacity-60'
              }`}
            >
              <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: d.cor }}></div>
              <div className="h-20 w-15 sm:h-24 sm:w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                {d.g?.capa ? (
                  <img
                    src={d.g.capa}
                    alt={d.g.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">{d.icone}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="block truncate text-xs font-bold uppercase tracking-wider"
                  style={{ color: d.cor }}
                >
                  {d.cat}
                </span>
                <h4
                  className="mt-0.5 truncate font-heading text-sm sm:text-base font-bold text-white transition-colors group-hover:text-[#ffd700]"
                  title={d.g?.title}
                >
                  {d.g?.title || 'Não definido'}
                </h4>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono text-slate-400">{d.g?.console}</span>
                  <span className="flex-shrink-0 font-mono font-bold tabular-nums" style={{ color: d.cor }}>
                    {d.valor}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prêmios do Ano: GOTY + prêmios lado a lado no desktop ── */}
      <section className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-heading text-base sm:text-lg font-black uppercase text-[#ffd700]">
            <span>👑</span>
            <span className="truncate">Prêmios do Ano — {ANO}</span>
          </div>
          <button
            onClick={onOpenTopTab}
            className="flex min-h-[44px] flex-shrink-0 items-center gap-1 rounded-full border border-[#ffd700]/30 px-3 py-1.5 text-xs font-bold text-[#ffd700] transition-colors hover:border-[#ffd700] hover:bg-[#ffd700]/10 cursor-pointer"
          >
            <span className="hidden sm:inline">Ver Pódio Completo</span>
            <span className="sm:hidden">Pódio</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:items-stretch">
          {/* GOTY Supreme Card */}
          {gotAwards.goty && (
            <GotWinnerCard game={gotAwards.goty} ano={ANO} onClick={() => onGameClick(gotAwards.goty!.id)} />
          )}

          {/* Grade de prêmios especializados */}
          <div className="grid grid-cols-1 content-start gap-2.5 sm:grid-cols-2 lg:content-stretch lg:h-full lg:[grid-template-rows:repeat(5,1fr)]">
            {premiados.slice(0, 8).map((item, i) => (
              <div
                key={i}
                onClick={() => item.g && onGameClick(item.g.id)}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-2.5 transition-all hover:border-white/30 lg:h-full"
              >
                <div className="h-14 w-11 flex-shrink-0 overflow-hidden rounded-md border border-white/10 bg-black">
                  {item.g?.capa ? (
                    <img
                      src={item.g.capa}
                      alt={item.g.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs">🎮</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-xs font-bold uppercase tracking-wider"
                    style={{ color: item.cor }}
                  >
                    {item.cat}
                  </div>
                  <h4 className="mt-0.5 truncate font-heading text-sm font-bold text-white transition-colors group-hover:text-[#ffd700]" title={item.g?.title}>
                    {item.g?.title || 'Sem título'}
                  </h4>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-slate-400">{item.g?.console}</span>
                    <span className="flex-shrink-0 font-mono font-bold tabular-nums" style={{ color: item.cor }}>
                      {item.g?.nota !== undefined ? `★ ${item.g.nota.toFixed(1)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Slogan do ano ── */}
      <section className="rounded-2xl border border-[#22d3ee]/20 bg-gradient-to-r from-[#22d3ee]/5 via-purple-500/5 to-transparent p-4 sm:p-5">
        <div className="flex items-center gap-2 font-heading text-sm font-black uppercase tracking-wider text-[#22d3ee]">
          <span className="h-0.5 w-4 bg-[#22d3ee]"></span>
          ✦ {ANO} em uma frase
        </div>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
          {slogan}{' '}
          {plataformaDoAno && (
            <>
              A plataforma dominante foi <strong className="text-white">{plataformaDoAno[0]}</strong> com{' '}
              {plataformaDoAno[1].count} jogos zerados.{' '}
            </>
          )}
          {melhor && (
            <>
              Destaque crítico supremo:{' '}
              <strong className="text-[#ffd700]">{melhor.title}</strong>{' '}
              {melhor.nota !== undefined ? `(Nota ${melhor.nota.toFixed(1)})` : ''}.
            </>
          )}
        </p>
      </section>
    </div>
  );
};
