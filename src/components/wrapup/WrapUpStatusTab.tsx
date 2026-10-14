import React from 'react';
import { Activity, ChevronDown, Gamepad2 } from 'lucide-react';
import { fmtH } from '../../utils/markdownParser';
import { getPlatformStyle, getScoreLabel } from '../../utils/platformStyles';
import { GameItem } from '../../types/game';

interface WrapUpStatusTabProps {
  availableYears: number[];
  lifetime: {
    totalLifetime: number;
    horasLifetime: number;
    mediaLifetime: number;
    notas10Lifetime: number;
    notasLifetimeArr: number[];
    topConLifetime: Array<[string, { count: number; hours: number }]>;
    topGenLifetime: Array<[string, { count: number; hours: number }]>;
    histLifetime: Record<string, number>;
    maxNHLifetime: number;
  };
  notaHistCores: Record<string, string>;
  openPlatformsStatus: Record<string, boolean>;
  setOpenPlatformsStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openGenresStatus: Record<string, boolean>;
  setOpenGenresStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  zeradosAll: GameItem[];
  anosStats: Array<{ ano: number; qtd: number; h: number; media: number }>;
  maxAnoQtd: number;
  onGameClick: (id: string) => void;
}

export const WrapUpStatusTab: React.FC<WrapUpStatusTabProps> = ({
  availableYears,
  lifetime,
  notaHistCores,
  openPlatformsStatus,
  setOpenPlatformsStatus,
  openGenresStatus,
  setOpenGenresStatus,
  zeradosAll,
  anosStats,
  maxAnoQtd,
  onGameClick,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Lifetime Header & Overview Banner */}
      <div className="rounded-xl border border-[#22d3ee]/30 bg-gradient-to-r from-[#22d3ee]/10 via-purple-500/10 to-[#161b22] p-3.5 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#22d3ee]">
              <Activity className="h-4 w-4" />
              <span>Status Histórico Global</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-white mt-1">
              Estatísticas de Todos os Anos Somados
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Soma consolidada de toda a sua história na biblioteca: {lifetime.totalLifetime} jogos zerados acumulados, {fmtH(lifetime.horasLifetime)} de jogatina e análise técnica unificada.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-black/60 border border-white/10 p-3">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Anos Ativos</div>
              <div className="font-heading text-2xl font-black text-[#22d3ee]">{availableYears.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* All-time KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:p-4 flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#22d3ee]"></div>
          <div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 line-clamp-2 min-h-[2rem] sm:min-h-0 leading-tight">Total Zerados (Vida)</div>
            <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#22d3ee]">{lifetime.totalLifetime}</div>
          </div>
          <div className="mt-1 truncate text-xs text-slate-400">Todos os anos somados</div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:p-4 flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#34d399]"></div>
          <div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 line-clamp-2 min-h-[2rem] sm:min-h-0 leading-tight">Tempo Total Jogado</div>
            <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#34d399]">{fmtH(lifetime.horasLifetime)}</div>
          </div>
          <div className="mt-1 truncate text-xs text-slate-400">Horas registradas</div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:p-4 flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#ffd700]"></div>
          <div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 line-clamp-2 min-h-[2rem] sm:min-h-0 leading-tight">Nota Média Histórica</div>
            <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#ffd700]">
              {lifetime.mediaLifetime ? lifetime.mediaLifetime.toFixed(2) : '—'}
            </div>
          </div>
          <div className="mt-1 truncate text-xs text-slate-400">{lifetime.notasLifetimeArr.length} jogos avaliados</div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:p-4 flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#a855f7]"></div>
          <div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 line-clamp-2 min-h-[2rem] sm:min-h-0 leading-tight">Masterpieces (10★)</div>
            <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#a855f7]">{lifetime.notas10Lifetime}</div>
          </div>
          <div className="mt-1 truncate text-xs text-slate-400">Jogos supremos</div>
        </div>
      </div>

      {/* Seção 1: Distribuição de Notas (Todos os Anos) */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5">
        <div className="mb-4 flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700]"></span>
          Distribuição de Notas (Todos os Anos Somados)
        </div>

        <div className="wu-chart-row grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
            <div className="grid grid-cols-7 items-end gap-1.5 sm:gap-2 border-b border-white/10 pb-2" style={{ minHeight: '9rem' }}>
            {Object.entries(lifetime.histLifetime).map(([faixa, qtd]) => {
              const pct = Math.max(qtd ? 15 : 4, Math.round((qtd / lifetime.maxNHLifetime) * 100));
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
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
            <div className="text-center pb-3 border-b border-white/10">
              <div className="text-xs uppercase font-bold tracking-widest text-slate-500">Média Geral Histórica</div>
              <div className="mt-1 font-mono text-4xl font-bold tabular-nums text-[#ffd700] text-glow-gold">
                {lifetime.mediaLifetime ? lifetime.mediaLifetime.toFixed(2) : '—'}
              </div>
              <div className="mt-2 inline-block rounded-full bg-[#ffd700]/15 px-3 py-1 text-xs font-bold text-[#ffd700]">
                {getScoreLabel(lifetime.mediaLifetime)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">🏆 Máxima</span>
                <strong className="text-right font-mono tabular-nums text-white">
                  {lifetime.notasLifetimeArr.length ? Math.max(...lifetime.notasLifetimeArr).toFixed(1) : '—'}
                </strong>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">⭐ 10★+</span>
                <strong className="text-right font-mono tabular-nums text-emerald-400">{lifetime.notas10Lifetime}</strong>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-slate-400">📉 Mínima</span>
                <strong className="text-right font-mono tabular-nums text-red-400">
                  {lifetime.notasLifetimeArr.length ? Math.min(...lifetime.notasLifetimeArr).toFixed(1) : '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Plataformas Zeradas (Todos os Anos Somados - 2 colunas, 4 jogos por linha) */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
          Plataformas Zeradas (Todos os Anos Somados)
        </div>

        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-2">
          {lifetime.topConLifetime.map(([nome, stats]) => {
            const s = getPlatformStyle(nome);
            const pct = lifetime.totalLifetime > 0 ? Math.round((stats.count / lifetime.totalLifetime) * 100) : 0;
            const isOpen = openPlatformsStatus[nome] ?? false;
            const platformGames = zeradosAll.filter((g) => g.console === nome);

            return (
              <div key={nome} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <div
                  onClick={() => setOpenPlatformsStatus((prev) => ({ ...prev, [nome]: !isOpen }))}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <span className="text-lg sm:text-xl flex-shrink-0">{s.ico}</span>
                    <div className="min-w-0">
                      <div className="truncate font-heading text-xs font-bold text-white sm:text-sm">{s.name}</div>
                      <div className="truncate font-mono text-xs font-bold uppercase text-slate-500">
                        {pct}% da história
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold tabular-nums text-white">{fmtH(stats.hours)}</div>
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
                            <div className="absolute bottom-1 left-1 max-w-[80%] truncate rounded border border-white/10 bg-black/80 px-1 py-0.2 font-mono text-xs text-slate-300">
                              {g.ano_zerado || 'Zerado'}
                            </div>
                          </div>
                          <div className="p-1.5">
                            <div className="truncate font-heading text-xs font-bold text-white transition-colors group-hover:text-[#22d3ee]">
                              {g.title}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-xs text-slate-400">
                              <span>{g.tempo ? `${g.tempo}` : '—'}</span>
                              <span className="truncate">{g.genero}</span>
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

      {/* Seção 3: Gêneros Zerados (Todos os Anos Somados - 2 colunas, 4 jogos por linha) */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]"></span>
          Gêneros Zerados (Todos os Anos Somados)
        </div>

        <div className="grid grid-cols-1 gap-2.5 items-start lg:grid-cols-2">
          {lifetime.topGenLifetime.map(([nome, stats], idx) => {
            const pct = lifetime.totalLifetime > 0 ? Math.round((stats.count / lifetime.totalLifetime) * 100) : 0;
            const isOpen = openGenresStatus[nome] ?? false;
            const genreGames = zeradosAll.filter((g) => g.genero === nome);

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
                  onClick={() => setOpenGenresStatus((prev) => ({ ...prev, [nome]: !isOpen }))}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black uppercase sm:h-9 sm:w-9 sm:text-sm"
                      style={{ backgroundColor: `${col}20`, color: col, border: `1px solid ${col}40` }}
                    >
                      <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-heading text-xs font-bold text-white sm:text-sm">{nome}</div>
                      <div className="truncate font-mono text-xs font-bold uppercase text-slate-500">
                        {pct}% da história
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold tabular-nums text-white">{fmtH(stats.hours)}</div>
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
                              <span>{g.ano_zerado || '—'}</span>
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

      {/* Seção 4: Evolução e Comparativo de Todos os Anos */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 font-heading text-base font-black uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"></span>
          Evolução e Comparativo de Todos os Anos
        </div>

        <div className="wu-evolution-row grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
            <div className="flex h-36 items-end justify-between gap-2 border-b border-white/10 pb-2 sm:gap-3">
              {anosStats.map((item) => {
                const pct = Math.max(item.qtd ? 15 : 4, Math.round((item.qtd / maxAnoQtd) * 100));
                return (
                  <div key={item.ano} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-xs font-bold tabular-nums text-[#22d3ee]">{item.qtd}</span>
                    <div
                      className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-[#22d3ee]/40 to-[#22d3ee] transition-all"
                      style={{ height: `${pct}%`, boxShadow: '0 0 10px rgba(34,211,238,0.3)' }}
                    ></div>
                    <span className="font-mono text-xs font-bold tabular-nums text-white">{item.ano}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-center text-xs uppercase tracking-widest text-slate-500">
              Zeradas por ano
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Desempenho por Ano</div>
            <div className="space-y-1">
              {anosStats.map((item) => (
                <div
                  key={item.ano}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2"
                >
                  <span className="font-mono font-bold tabular-nums text-white">{item.ano}</span>
                  <span className="truncate font-mono text-xs text-slate-400 sm:text-xs">
                    {item.qtd} jogos · {fmtH(item.h)}
                  </span>
                  <span className="flex-shrink-0 font-mono font-bold tabular-nums text-[#ffd700]">★ {item.media.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
