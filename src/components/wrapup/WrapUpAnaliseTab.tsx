import React from 'react';
import { ChevronDown, Gamepad2 } from 'lucide-react';
import { fmtH, formatDateBR } from '../../utils/markdownParser';
import { getPlatformStyle, getScoreLabel } from '../../utils/platformStyles';
import { GameItem } from '../../types/game';

interface WrapUpAnaliseTabProps {
  ANO: number;
  total: number;
  media: number;
  notasArr: number[];
  notas10: number;
  notasHist: Record<string, number>;
  maxNH: number;
  notaHistCores: Record<string, string>;
  meses: Array<{
    i: number;
    nome: string;
    nomeCompleto: string;
    qtd: number;
    h: number;
    games: GameItem[];
  }>;
  maxMes: number;
  mesPico: {
    nome: string;
    nomeCompleto: string;
    qtd: number;
    h: number;
  };
  topCon: Array<[string, { count: number; hours: number }]>;
  topGen: Array<[string, { count: number; hours: number }]>;
  openPlatforms: Record<string, boolean>;
  setOpenPlatforms: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openGenres: Record<string, boolean>;
  setOpenGenres: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  jogosAno: GameItem[];
  onGameClick: (id: string) => void;
}

export const WrapUpAnaliseTab: React.FC<WrapUpAnaliseTabProps> = ({
  ANO,
  total,
  media,
  notasArr,
  notas10,
  notasHist,
  maxNH,
  notaHistCores,
  meses,
  maxMes,
  mesPico,
  topCon,
  topGen,
  openPlatforms,
  setOpenPlatforms,
  openGenres,
  setOpenGenres,
  jogosAno,
  onGameClick,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Seção 1: Distribuição de Notas — painel com barra lateral de contexto */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-4 flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700]"></span>
          Distribuição de Notas
        </div>

        <div className="wu-chart-row grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Histogram bars */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
            <div className="grid grid-cols-7 items-end gap-1.5 sm:gap-2 border-b border-white/10 pb-2" style={{ minHeight: '9rem' }}>
              {Object.entries(notasHist).map(([faixa, qtd]) => {
                const pct = Math.max(qtd ? 15 : 4, Math.round((qtd / maxNH) * 100));
                const cor = notaHistCores[faixa];
                return (
                  <div key={faixa} className="flex h-full flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: cor }}>
                      {qtd || ''}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{ height: `${pct}%`, backgroundColor: cor, boxShadow: `0 0 10px ${cor}33` }}
                    ></div>
                    <span className="text-xs font-bold text-slate-400">{faixa}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-center text-xs uppercase tracking-widest text-slate-500">
              Jogos zerados por faixa de nota · {ANO}
            </div>
          </div>

          {/* Context card */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
            <div className="text-center pb-3 border-b border-white/10">
              <div className="text-xs uppercase font-bold tracking-widest text-slate-500">Média Geral</div>
              <div className="mt-1 font-mono text-4xl font-bold tabular-nums text-[#ffd700] text-glow-gold">
                {media ? media.toFixed(2) : '—'}
              </div>
              <div className="mt-2 inline-block rounded-full bg-[#ffd700]/15 px-3 py-1 text-xs font-bold text-[#ffd700]">
                {getScoreLabel(media)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">🏆 Máxima</span>
                <strong className="text-right font-mono tabular-nums text-white lg:text-right">
                  {notasArr.length ? Math.max(...notasArr).toFixed(1) : '—'}
                </strong>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">⭐ 10★+</span>
                <strong className="text-right font-mono tabular-nums text-emerald-400">{notas10}</strong>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">📉 Mínima</span>
                <strong className="text-right font-mono tabular-nums text-red-400">
                  {notasArr.length ? Math.min(...notasArr).toFixed(1) : '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Atividade Mensal */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-4 flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"></span>
          Atividade Mensal
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
            <div className="grid grid-cols-12 items-end gap-1 sm:gap-1.5 border-b border-white/10 pb-2" style={{ minHeight: '9rem' }}>
              {meses.map((m) => {
                const pct = Math.max(m.qtd ? 15 : 4, Math.round((m.qtd / maxMes) * 100));
                const isPico = m.qtd === mesPico.qtd && m.qtd > 0;
                return (
                  <div key={m.nome} className="flex h-full flex-col items-center justify-end gap-1">
                    <span
                      className="font-mono text-xs font-bold tabular-nums"
                      style={{ color: isPico ? '#ffd700' : '#22d3ee' }}
                    >
                      {m.qtd || '·'}
                    </span>
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${pct}%`,
                        backgroundColor: isPico
                          ? '#ffd700'
                          : m.qtd > 0
                          ? '#22d3ee'
                          : 'rgba(255,255,255,0.05)',
                        boxShadow: isPico ? '0 0 10px rgba(255,215,0,0.5)' : undefined,
                      }}
                    ></div>
                    <span className="text-[10px] min-[390px]:text-xs font-bold uppercase tracking-tight text-slate-400">{m.nome}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-center text-xs uppercase tracking-widest text-slate-500">
              Zeradas por mês · {ANO}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 content-start rounded-xl border border-white/10 bg-black/40 p-4 text-xs lg:grid-cols-1 lg:gap-3">
            <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-slate-400">📅 Mês Pico</span>
              <strong className="text-right font-mono tabular-nums text-[#ffd700]">
                {mesPico.nome} ({mesPico.qtd})
              </strong>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-slate-400">🔢 Meses Ativos</span>
              <strong className="text-right font-mono tabular-nums text-[#22d3ee]">
                {meses.filter((m) => m.qtd > 0).length} / 12
              </strong>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-slate-400">⚡ Ritmo Médio</span>
              <strong className="text-right font-mono tabular-nums text-emerald-400">
                {(total / (meses.filter((m) => m.qtd > 0).length || 1)).toFixed(1)}/mês
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3: Plataformas com Acordeão (2 colunas, 4 jogos por linha) */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
          Plataformas Zeradas em {ANO}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {topCon.map(([nome, stats]) => {
            const s = getPlatformStyle(nome);
            const pct = total > 0 ? Math.round((stats.count / total) * 100) : 0;
            const isOpen = openPlatforms[nome] ?? false;

            const platformGames = jogosAno.filter((g) => g.console === nome);

            return (
              <div key={nome} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <div
                  onClick={() => setOpenPlatforms((prev) => ({ ...prev, [nome]: !isOpen }))}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span className="text-lg sm:text-xl flex-shrink-0">{s.ico}</span>
                    <div className="min-w-0">
                      <div className="font-heading text-xs sm:text-sm font-bold text-white truncate">
                        {s.name}
                      </div>
                      <div className="truncate font-mono text-xs font-bold uppercase text-slate-500">
                        {pct}% dos jogos
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold tabular-nums text-white">
                        {fmtH(stats.hours)}
                      </div>
                      <div className="text-xs uppercase text-slate-500">Horas</div>
                    </div>
                    <div className="border-l border-white/10 pl-2 text-right sm:pl-3">
                      <div className="font-mono text-base font-bold tabular-nums sm:text-lg" style={{ color: s.col }}>
                        {stats.count}
                      </div>
                      <div className="text-xs uppercase text-slate-500">Zerados</div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Progress track */}
                <div className="h-1 w-full bg-white/5">
                  <div className="h-full" style={{ width: `${pct}%`, backgroundColor: s.col }}></div>
                </div>

                {/* Expanded game grid (4 jogos por linha) */}
                {isOpen && (
                  <div className="border-t border-white/5 bg-black/60 p-3">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {platformGames.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => onGameClick(g.id)}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] hover:border-[#22d3ee] hover:shadow-lg hover:shadow-[#22d3ee]/20 transition-all cursor-pointer"
                          title={`${g.title} (★ ${g.nota !== undefined ? g.nota.toFixed(1) : '—'})`}
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                            <img
                              src={g.capa}
                              alt={g.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {g.nota !== undefined && !isNaN(g.nota) && (
                              <div className="absolute right-1 top-1 rounded border border-white/10 bg-black/85 px-1 py-0.2 font-mono text-xs font-bold tabular-nums text-[#ffd700]">
                                ★{g.nota.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="p-1.5">
                            <div className="truncate font-heading text-xs font-bold text-white transition-colors group-hover:text-[#22d3ee]">
                              {g.title}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between font-mono text-xs text-slate-400">
                              <span>{g.tempo ? `${g.tempo}` : '—'}</span>
                              {g.data_zerado && <span>{formatDateBR(g.data_zerado).slice(0, 5)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 4: Gêneros Zerados (2 colunas, 4 jogos por linha) */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]"></span>
          Gêneros Zerados em {ANO}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {topGen.map(([nome, stats], idx) => {
            const pct = total > 0 ? Math.round((stats.count / total) * 100) : 0;
            const isOpen = openGenres[nome] ?? false;
            const genreGames = jogosAno.filter((g) => g.genero === nome);

            // Palette color per index
            const genreColors = [
              '#a855f7',
              '#22d3ee',
              '#ff0055',
              '#ffd700',
              '#34d399',
              '#f97316',
              '#6366f1',
              '#ec4899',
            ];
            const col = genreColors[idx % genreColors.length];

            return (
              <div key={nome} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <div
                  onClick={() => setOpenGenres((prev) => ({ ...prev, [nome]: !isOpen }))}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-xs sm:text-sm font-black uppercase flex-shrink-0"
                      style={{ backgroundColor: `${col}20`, color: col, border: `1px solid ${col}40` }}
                    >
                      <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-heading text-xs sm:text-sm font-bold text-white truncate">
                        {nome}
                      </div>
                      <div className="truncate font-mono text-xs font-bold uppercase text-slate-500">
                        {pct}% dos jogos
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold tabular-nums text-white">
                        {fmtH(stats.hours)}
                      </div>
                      <div className="text-xs uppercase text-slate-500">Horas</div>
                    </div>
                    <div className="border-l border-white/10 pl-2 text-right sm:pl-3">
                      <div className="font-mono text-base font-bold tabular-nums sm:text-lg" style={{ color: col }}>
                        {stats.count}
                      </div>
                      <div className="text-xs uppercase text-slate-500">Zerados</div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Progress track */}
                <div className="h-1 w-full bg-white/5">
                  <div className="h-full" style={{ width: `${pct}%`, backgroundColor: col }}></div>
                </div>

                {/* Expanded game grid (4 jogos por linha) */}
                {isOpen && (
                  <div className="border-t border-white/5 bg-black/60 p-3">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {genreGames.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => onGameClick(g.id)}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] hover:border-[#a855f7] hover:shadow-lg hover:shadow-[#a855f7]/20 transition-all cursor-pointer"
                          title={`${g.title} (★ ${g.nota !== undefined ? g.nota.toFixed(1) : '—'})`}
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                            <img
                              src={g.capa}
                              alt={g.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {g.nota !== undefined && !isNaN(g.nota) && (
                              <div className="absolute right-1 top-1 rounded border border-white/10 bg-black/85 px-1 py-0.2 font-mono text-xs font-bold tabular-nums text-[#ffd700]">
                                ★{g.nota.toFixed(1)}
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1 max-w-[80%] truncate rounded border border-white/10 bg-black/80 px-1 py-0.2 font-mono text-xs text-slate-300">
                              {g.console}
                            </div>
                          </div>
                          <div className="p-1.5">
                            <div className="truncate font-heading text-xs font-bold text-white transition-colors group-hover:text-[#a855f7]">
                              {g.title}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between font-mono text-xs text-slate-400">
                              <span>{g.tempo ? `${g.tempo}` : '—'}</span>
                              {g.data_zerado && <span>{formatDateBR(g.data_zerado).slice(0, 5)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
