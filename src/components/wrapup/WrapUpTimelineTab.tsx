import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { fmtH, parseDateParts, formatDateBR } from '../../utils/markdownParser';
import { getPlatformStyle } from '../../utils/platformStyles';
import { GameItem } from '../../types/game';

interface WrapUpTimelineTabProps {
  ANO: number;
  activeMonthIndex: number;
  setActiveMonthIndex: React.Dispatch<React.SetStateAction<number>>;
  CURRENT_OCTOBER_MONTH: number;
  NOMES_MESES_COMPLETOS: string[];
  jogosAno: GameItem[];
  meses: Array<{
    i: number;
    nome: string;
    nomeCompleto: string;
    qtd: number;
    h: number;
    games: GameItem[];
  }>;
  maxMes: number;
  activeMonthData: {
    monthGames: GameItem[];
    totalGames: number;
    totalHours: number;
    mediaNotas: string;
    avgHoursPerGame: number;
    destaque: GameItem | null;
    consolesList: Array<[string, number]>;
    generosList: Array<[string, number]>;
  };
  recordesAno: {
    diaMaisZeradoFormatted: string;
    jogoMaisLongo: GameItem | null;
    melhorAvaliado: GameItem | null;
    consoleDoAno: { nome: string; count: number; hours: number } | null;
    mesMaisZerado: string;
    generoDoAno: { nome: string; count: number; hours: number } | null;
  };
  setTimelineMonthFilter: (filter: 'ALL' | number) => void;
  onGameClick: (id: string) => void;
}

export const WrapUpTimelineTab: React.FC<WrapUpTimelineTabProps> = ({
  ANO,
  activeMonthIndex,
  setActiveMonthIndex,
  CURRENT_OCTOBER_MONTH,
  NOMES_MESES_COMPLETOS,
  jogosAno,
  meses,
  maxMes,
  activeMonthData,
  recordesAno,
  setTimelineMonthFilter,
  onGameClick,
}) => {
  const monthIndex = activeMonthIndex;
  const firstDay = new Date(ANO, monthIndex, 1).getDay();
  const daysInMonth = new Date(ANO, monthIndex + 1, 0).getDate();

  // Jogos zerados neste mês
  const monthGames = jogosAno.filter((g) => {
    if (!g.data_zerado) return false;
    const parts = parseDateParts(g.data_zerado);
    return parts && parts.year === ANO && parts.month === monthIndex;
  });

  const monthHours = monthGames.reduce((acc, curr) => acc + (curr.tempoMinutos ? curr.tempoMinutos / 60 : 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendário Header com Navegação Mês a Mês */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-4">
          <div>
            <div className="flex items-center gap-2.5 font-heading text-lg sm:text-2xl font-black uppercase text-white tracking-wide">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22d3ee] animate-pulse"></span>
              Calendário de Zeradas
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Visualização mensal das conclusões de campanha.
            </p>
          </div>

          {/* Controles de Navegação de Mês */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <button
              onClick={() => setActiveMonthIndex((prev) => (prev === 0 ? 11 : prev - 1))}
              aria-label="Mês anterior"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-all hover:border-[#22d3ee] hover:bg-[#22d3ee]/10 active:scale-95 cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#22d3ee] min-w-[160px] sm:min-w-[240px] text-center uppercase tracking-wider drop-shadow-md">
              {NOMES_MESES_COMPLETOS[activeMonthIndex]} {ANO}
            </div>

            <button
              onClick={() => setActiveMonthIndex((prev) => (prev === 11 ? 0 : prev + 1))}
              aria-label="Próximo mês"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-all hover:border-[#22d3ee] hover:bg-[#22d3ee]/10 active:scale-95 cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {activeMonthIndex !== CURRENT_OCTOBER_MONTH && (
              <button
                onClick={() => setActiveMonthIndex(CURRENT_OCTOBER_MONTH)}
                className="ml-1 min-h-[44px] rounded-xl border border-[#22d3ee]/40 bg-[#22d3ee]/15 px-3 py-1.5 text-xs font-bold uppercase text-[#22d3ee] shadow-sm transition-all hover:bg-[#22d3ee]/25 active:scale-95 cursor-pointer"
                title="Voltar ao mês atual (Outubro)"
              >
                Atual
              </button>
            )}
          </div>
        </div>

        {/* Mês Vigente em Exibição */}
        <div className="space-y-4">
          {/* Resumo do Mês */}
          <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-400 bg-white/[0.02] p-3 sm:p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-bold text-white uppercase text-xs sm:text-sm">
                {NOMES_MESES_COMPLETOS[monthIndex]} de {ANO}
              </span>
              <span>•</span>
              <span className="text-[#22d3ee] font-bold text-xs sm:text-sm">
                {monthGames.length} jogo{monthGames.length !== 1 ? 's' : ''} zerado{monthGames.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="font-mono text-xs sm:text-sm text-slate-300">
              Tempo: <strong className="text-emerald-400">{fmtH(monthHours)}</strong>
            </div>
          </div>

          {/* Grid de Dias do Mês */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2 sm:p-4">
            <div className="min-w-[320px] sm:min-w-0">
              {/* Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] min-[390px]:text-xs font-black text-slate-400 uppercase tracking-tight sm:tracking-wider">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendário */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 wu-cal-grid">
                {Array.from({ length: firstDay }, (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[56px] sm:min-h-[64px] lg:min-h-[64px] rounded-lg sm:rounded-xl border border-transparent bg-transparent"
                  ></div>
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayGames = monthGames.filter((g) => {
                    const parts = parseDateParts(g.data_zerado);
                    return parts && parts.day === day;
                  });
                  const hasGames = dayGames.length > 0;
                  const firstGame = dayGames[0];
                  const now = new Date();
                  const isToday = ANO === now.getFullYear() && monthIndex === now.getMonth() && day === now.getDate();

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (firstGame) onGameClick(firstGame.id);
                      }}
                      className={`relative min-h-[56px] sm:min-h-[128px] lg:min-h-[144px] rounded-lg sm:rounded-xl border p-1 sm:p-2 transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                        hasGames
                          ? 'border-[#22d3ee]/70 bg-gradient-to-b from-[#22d3ee]/20 via-[#0d1117] to-[#161b22] shadow-md shadow-[#22d3ee]/15 ring-1 ring-[#22d3ee]/30 hover:border-[#22d3ee]'
                          : isToday
                          ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30 hover:border-orange-500/80'
                          : 'border-white/5 bg-[#0d1117]/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold leading-none ${
                            hasGames
                              ? 'text-[#22d3ee] font-black'
                              : isToday
                              ? 'text-orange-400 font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          {day}
                        </span>
                        {hasGames && dayGames.length > 1 && (
                          <span className="rounded bg-[#22d3ee] text-black px-1 text-xs font-black leading-tight">
                            +{dayGames.length - 1}
                          </span>
                        )}
                        {isToday && !hasGames && (
                          <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse"></span>
                        )}
                      </div>

                      {hasGames ? (
                        <div className="flex flex-col items-center justify-center flex-1 min-h-0 mt-1 w-full">
                          <div className="sm:hidden flex items-center justify-center py-0.5">
                            <div className="relative h-7 w-5.5 rounded overflow-hidden bg-black border border-[#22d3ee]/70 shadow">
                              <img src={firstGame.capa} alt="" className="h-full w-full object-cover" />
                            </div>
                          </div>

                          <div className="hidden sm:flex group/cal relative flex-col items-center w-full">
                            <div className="relative aspect-[264/374] sm:h-16 lg:h-auto wu-cal-cover overflow-hidden rounded bg-black border border-[#22d3ee]/50 shadow-md flex-shrink-0">
                              <img
                                src={firstGame.capa}
                                alt={firstGame.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover group-hover/cal:scale-105 transition-transform duration-200"
                              />
                              {firstGame.nota !== undefined && !isNaN(firstGame.nota) && (
                                <div className="absolute top-0.5 right-0.5 rounded bg-black/90 px-1 py-0.2 text-xs font-heading font-black text-[#ffd700] border border-white/10">
                                  ★{firstGame.nota.toFixed(1)}
                                </div>
                              )}
                            </div>

                            <div className="hidden sm:block font-heading text-xs lg:text-xs font-bold text-white truncate max-w-full text-center px-0.5 mt-1 leading-tight group-hover/cal:text-[#22d3ee]">
                              {firstGame.title}
                            </div>
                            <div className="hidden lg:block text-xs text-slate-400 font-mono truncate max-w-full text-center">
                              {firstGame.console}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── SEÇÃO DETALHADA DO MÊS (ESTILO MESES 1.JPG) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
              <div className="flex items-center gap-2 font-heading text-sm sm:text-base font-black uppercase text-white tracking-wider">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#22d3ee]/20 text-[#22d3ee] text-xs font-mono">
                  🗓️
                </span>
                <span>
                  {NOMES_MESES_COMPLETOS[monthIndex]} · {ANO}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {activeMonthData.totalGames}{' '}
                {activeMonthData.totalGames === 1 ? 'jogo concluído' : 'jogos concluídos'}
              </span>
            </div>

            {activeMonthData.totalGames === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-xs text-slate-400">
                Nenhum jogo registrado como zerado em {NOMES_MESES_COMPLETOS[monthIndex]} de {ANO}.
              </div>
            ) : (
              <>
                {/* 1. Destaque do Mês Card */}
                {activeMonthData.destaque && (() => {
                  const d = activeMonthData.destaque;
                  const pStyle = getPlatformStyle(d.console);
                  const dHours = d.tempoMinutos ? d.tempoMinutos / 60 : 0;
                  const dHltbHours = d.hltb ? parseFloat(d.hltb) || dHours : dHours;
                  const vsHltbPct = dHltbHours > 0 ? Math.round((dHours / dHltbHours) * 100) : 100;
                  const dScore = d.nota !== undefined && !isNaN(d.nota) ? d.nota : 10;

                  return (
                    <div className="relative overflow-hidden rounded-2xl border border-[#ffd700]/30 bg-[#0d1117]/90 p-4 sm:p-5 shadow-xl shadow-[#ffd700]/5 transition-all group">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ffd700] via-[#ffd700]/80 to-transparent"></div>

                      <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                        <span className="font-heading text-xs font-black uppercase text-[#ffd700] tracking-wider flex items-center gap-1.5">
                          🏆 DESTAQUE DO MÊS
                        </span>
                        {d.data_zerado && (
                          <span className="text-xs font-mono text-slate-400">
                            zerado em {formatDateBR(d.data_zerado).toLowerCase()}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                        <div
                          onClick={() => onGameClick(d.id)}
                          className="relative h-28 w-20 sm:h-32 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl bg-black border border-white/10 shadow-lg cursor-pointer group-hover:border-[#ffd700]/60 transition-colors"
                        >
                          <img
                            src={d.capa}
                            alt={d.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {d.nota !== undefined && !isNaN(d.nota) && (
                            <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/90 px-1.5 py-0.5 font-heading text-xs font-black text-[#ff0055] border border-white/10 shadow">
                              {d.nota.toFixed(1)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <h3
                            onClick={() => onGameClick(d.id)}
                            className="font-heading text-base sm:text-xl font-black text-white cursor-pointer hover:text-[#22d3ee] transition-colors truncate"
                          >
                            {d.title}
                          </h3>

                          <div className="flex items-center gap-1 text-[#ffd700] text-sm">
                            {[1, 2, 3, 4, 5].map((starNum) => {
                              const starVal = dScore / 2;
                              const isFull = starVal >= starNum;
                              const isHalf = !isFull && starVal >= starNum - 0.5;
                              return (
                                <span
                                  key={starNum}
                                  className={isFull || isHalf ? 'text-[#ffd700]' : 'text-slate-700'}
                                >
                                  ★
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span
                              className="rounded-md px-2 py-0.5 text-xs font-bold font-mono uppercase"
                              style={{
                                color: pStyle.col,
                                backgroundColor: `${pStyle.col}20`,
                                border: `1px solid ${pStyle.col}40`,
                              }}
                            >
                              {pStyle.ico} {d.console}
                            </span>
                            <span className="rounded-md bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/40 px-2 py-0.5 text-xs font-bold uppercase">
                              🎮 {d.genero}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 pt-3 mt-2 border-t border-white/5 text-center sm:text-left">
                            <div>
                              <div className="font-mono text-xs sm:text-sm font-black text-[#34d399]">
                                {d.tempo || fmtH(dHours)}
                              </div>
                              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                TEMPO
                              </div>
                            </div>

                            <div>
                              <div className="font-mono text-xs sm:text-sm font-black text-[#ffd700]">
                                {d.hltb || (d.tempo ? `${d.tempo}` : '—')}
                              </div>
                              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                HLTB
                              </div>
                            </div>

                            <div>
                              <div className="font-mono text-xs sm:text-sm font-black text-[#22d3ee]">
                                {vsHltbPct}%
                              </div>
                              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                VS HLTB
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. KPIs Row */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3.5 sm:p-4 text-center">
                    <div className="font-mono text-2xl font-bold tabular-nums text-[#22d3ee] sm:text-3xl">
                      {activeMonthData.totalGames}
                    </div>
                    <div className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">
                      ZERADOS
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3.5 sm:p-4 text-center">
                    <div className="font-mono text-2xl font-bold tabular-nums text-[#34d399] sm:text-3xl">
                      {fmtH(activeMonthData.totalHours)}
                    </div>
                    <div className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">
                      HORAS
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3.5 sm:p-4 text-center">
                    <div className="font-mono text-2xl font-bold tabular-nums text-[#ff0055] sm:text-3xl">
                      {activeMonthData.mediaNotas}
                    </div>
                    <div className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">
                      MÉDIA
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3.5 sm:p-4 text-center">
                    <div className="font-mono text-2xl font-bold tabular-nums text-[#a855f7] sm:text-3xl">
                      {fmtH(activeMonthData.avgHoursPerGame)}
                    </div>
                    <div className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">
                      Ø/JOGO
                    </div>
                  </div>
                </div>

                {/* 3. Lista de Todos os Jogos do Mês com suas Notas */}
                <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:p-4 space-y-2">
                  <div className="text-xs uppercase font-black text-slate-400 tracking-wider mb-2">
                    Jogos Concluídos no Mês ({activeMonthData.totalGames})
                  </div>
                  <div className="space-y-2">
                    {activeMonthData.monthGames.map((g, idx) => {
                      const pStyle = getPlatformStyle(g.console);
                      return (
                        <div
                          key={g.id}
                          onClick={() => onGameClick(g.id)}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-black/40 hover:border-[#22d3ee]/40 hover:bg-white/[0.02] cursor-pointer transition-all group"
                        >
                          <span className="font-mono text-xs font-black text-[#ffd700] min-w-[20px] text-center">
                            {idx + 1}
                          </span>

                          <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-black border border-white/10 shadow">
                            <img
                              src={g.capa}
                              alt={g.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading text-xs sm:text-sm font-bold text-white group-hover:text-[#22d3ee] transition-colors truncate">
                              {g.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className="rounded px-1.5 py-0.2 text-xs font-bold font-mono uppercase"
                                style={{ color: pStyle.col, backgroundColor: `${pStyle.col}20` }}
                              >
                                {pStyle.ico} {g.console}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ⏱ {g.tempo ? `${g.tempo}` : '—'}
                              </span>
                              {g.data_zerado && (
                                <span className="text-xs text-slate-500 font-mono">
                                  📅 {formatDateBR(g.data_zerado).toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="font-heading text-sm sm:text-base font-black text-[#ff0055] flex-shrink-0 pl-2">
                            {g.nota !== undefined && !isNaN(g.nota) ? `${g.nota.toFixed(1)}★` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Duas Colunas: GÊNEROS e CONSOLES do Mês */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4 sm:p-5 space-y-3">
                    <div className="font-heading text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase text-[#a855f7] tracking-wider flex items-center gap-2">
                      <span>🎮</span>
                      <span>GÊNEROS</span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {activeMonthData.generosList.map(([genNome, genCount]) => {
                        const pct =
                          activeMonthData.totalGames > 0
                            ? (genCount / activeMonthData.totalGames) * 100
                            : 0;
                        return (
                          <div key={genNome} className="space-y-1">
                            <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                              <span className="text-white">{genNome}</span>
                              <span className="text-[#a855f7] font-mono">{genCount}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#a855f7]" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4 sm:p-5 space-y-3">
                    <div className="font-heading text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                      <span>🕹️</span>
                      <span>CONSOLES</span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {activeMonthData.consolesList.map(([conNome, conCount]) => {
                        const pct =
                          activeMonthData.totalGames > 0
                            ? (conCount / activeMonthData.totalGames) * 100
                            : 0;
                        const s = getPlatformStyle(conNome);
                        return (
                          <div key={conNome} className="space-y-1">
                            <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                              <span className="text-white flex items-center gap-1.5">
                                <span>{s.ico}</span>
                                <span>{conNome}</span>
                              </span>
                              <span className="text-orange-400 font-mono">{conCount}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Gráfico de Barras: JOGOS POR MÊS */}
                <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-black uppercase text-white tracking-wider">
                    <span>📊</span>
                    <span>JOGOS POR MÊS — {ANO}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-28 sm:h-32 pt-4 pb-1">
                    {meses.map((m, idx) => {
                      const isSelected = activeMonthIndex === idx;
                      const heightPct = maxMes > 0 ? Math.max(12, (m.qtd / maxMes) * 100) : 12;

                      return (
                        <div
                          key={m.nome}
                          onClick={() => {
                            setActiveMonthIndex(idx);
                            setTimelineMonthFilter(idx);
                          }}
                          className="flex flex-col items-center justify-end h-full cursor-pointer group/bar"
                          title={`${m.nomeCompleto}: ${m.qtd} jogos`}
                        >
                          <span
                            className={`text-xs font-mono font-bold mb-1 ${
                              isSelected
                                ? 'text-[#ffd700] font-black'
                                : m.qtd > 0
                                ? 'text-white'
                                : 'text-transparent'
                            }`}
                          >
                            {m.qtd > 0 ? m.qtd : 0}
                          </span>

                          <div
                            className={`w-full rounded-t-md transition-all ${
                              isSelected
                                ? 'bg-gradient-to-t from-[#ffd700] to-[#ffaa00] shadow-lg shadow-[#ffd700]/30 ring-1 ring-[#ffd700]'
                                : m.qtd > 0
                                ? 'bg-[#a855f7]/70 group-hover/bar:bg-[#a855f7]'
                                : 'bg-white/5'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          ></div>

                          <span
                            className={`text-xs font-mono uppercase mt-1.5 ${
                              isSelected ? 'text-[#ffd700] font-black' : 'text-slate-500'
                            }`}
                          >
                            {m.nome.slice(0, 1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO RECORDES DO ANO ({ANO}) ── */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#ffd700]/20 text-[#ffd700] text-sm sm:text-base font-mono font-black border border-[#ffd700]/30 shadow">
            ⭐
          </span>
          <div>
            <h3 className="font-heading text-base sm:text-lg lg:text-2xl font-black uppercase text-white tracking-wide">
              Recordes de {ANO}
            </h3>
            <p className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Os maiores feitos, marcos e destaques estatísticos deste ano
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {/* 1. Dia com Mais Jogos Zerados */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-orange-500/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-orange-400">
              <span>📅</span>
              <span>Dia com Mais Zeramentos</span>
            </div>
            <div className="font-heading text-base sm:text-lg lg:text-2xl font-black text-white">
              {recordesAno.diaMaisZeradoFormatted}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Maior quantidade de campanhas encerradas em um único dia.
            </div>
          </div>

          {/* 2. Jogo Mais Longo */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-emerald-500/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-emerald-400">
              <span>⏱️</span>
              <span>Jogo Mais Longo</span>
            </div>
            {recordesAno.jogoMaisLongo ? (
              <div
                onClick={() => onGameClick(recordesAno.jogoMaisLongo!.id)}
                className="flex items-center gap-3 cursor-pointer hover:text-[#22d3ee] transition-colors group"
              >
                <div className="h-10 w-7.5 sm:h-12 sm:w-9 lg:h-14 lg:w-10 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-white/10 group-hover:border-[#22d3ee]">
                  <img
                    src={recordesAno.jogoMaisLongo.capa}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-heading text-sm sm:text-base lg:text-lg font-bold text-white group-hover:text-[#22d3ee] truncate">
                    {recordesAno.jogoMaisLongo.title}
                  </div>
                  <div className="text-xs sm:text-xs lg:text-sm font-mono text-emerald-400 font-bold">
                    {recordesAno.jogoMaisLongo.tempo} · {recordesAno.jogoMaisLongo.console}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Nenhum registro</div>
            )}
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Maior tempo investido em uma única campanha.
            </div>
          </div>

          {/* 3. Melhor Avaliado */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-[#ffd700]/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-[#ffd700]">
              <span>👑</span>
              <span>Melhor Avaliado</span>
            </div>
            {recordesAno.melhorAvaliado ? (
              <div
                onClick={() => onGameClick(recordesAno.melhorAvaliado!.id)}
                className="flex items-center gap-3 cursor-pointer hover:text-[#22d3ee] transition-colors group"
              >
                <div className="h-10 w-7.5 sm:h-12 sm:w-9 lg:h-14 lg:w-10 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-white/10 group-hover:border-[#ffd700]">
                  <img
                    src={recordesAno.melhorAvaliado.capa}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-heading text-sm sm:text-base lg:text-lg font-bold text-white group-hover:text-[#ffd700] truncate">
                    {recordesAno.melhorAvaliado.title}
                  </div>
                  <div className="text-xs sm:text-xs lg:text-sm font-heading font-black text-[#ffd700]">
                    ★{' '}
                    {recordesAno.melhorAvaliado.nota !== undefined
                      ? recordesAno.melhorAvaliado.nota.toFixed(1)
                      : '10.0'}{' '}
                    · {recordesAno.melhorAvaliado.console}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Nenhum registro</div>
            )}
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Maior nota pessoal concedida no ano.
            </div>
          </div>

          {/* 4. Console do Ano */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-[#22d3ee]/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-[#22d3ee]">
              <span>🕹️</span>
              <span>Console do Ano</span>
            </div>
            {recordesAno.consoleDoAno ? (
              <div>
                <div className="font-heading text-base sm:text-lg lg:text-2xl font-black text-white">
                  {recordesAno.consoleDoAno.nome}
                </div>
                <div className="text-xs sm:text-xs lg:text-sm font-mono text-[#22d3ee] font-bold">
                  {recordesAno.consoleDoAno.count} jogos · {fmtH(recordesAno.consoleDoAno.hours)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Nenhum registro</div>
            )}
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Plataforma com maior volume de conclusões.
            </div>
          </div>

          {/* 5. Mês com Mais Jogos Zerados */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-[#a855f7]/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-[#a855f7]">
              <span>🔥</span>
              <span>Mês com Mais Zeramentos</span>
            </div>
            <div className="font-heading text-base sm:text-lg lg:text-2xl font-black text-white">
              {recordesAno.mesMaisZerado}
            </div>
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Período com maior ritmo e frequência de conclusões.
            </div>
          </div>

          {/* 6. Gênero do Ano */}
          <div className="rounded-xl border border-white/10 bg-black/40 space-y-2 p-3.5 transition-all hover:border-pink-500/40">
            <div className="flex items-center gap-2 text-xs sm:text-xs lg:text-sm font-bold uppercase tracking-wider text-pink-400">
              <span>🎮</span>
              <span>Gênero do Ano</span>
            </div>
            {recordesAno.generoDoAno ? (
              <div>
                <div className="font-heading text-base sm:text-lg lg:text-2xl font-black text-white">
                  {recordesAno.generoDoAno.nome}
                </div>
                <div className="text-xs sm:text-xs lg:text-sm font-mono text-pink-400 font-bold">
                  {recordesAno.generoDoAno.count} jogos · {fmtH(recordesAno.generoDoAno.hours)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Nenhum registro</div>
            )}
            <div className="text-xs sm:text-xs lg:text-sm text-slate-400">
              Gênero favorito mais jogado no período.
            </div>
          </div>
        </div>
      </div>

      {/* ── PANORAMA MENSAL CONSOLIDADO DE 2026 (ESTILO MESES 2.JPG) ── */}
      <div className="rounded-2xl border border-white/10 bg-[#161b22] p-3.5 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-heading text-sm sm:text-base font-black uppercase text-white tracking-wide">
                PANORAMA & COMPARATIVO MENSAL — {ANO}
              </h3>
              <p className="text-xs text-slate-400">
                Visão consolidada de cada mês do ano com destaques, horas acumuladas e jogo do mês (GOTM)
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-[#22d3ee] font-bold">12 Meses Calendário</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {meses.map((m) => {
            const mesGames = m.games;
            const notasDoMes = mesGames
              .map((g) => g.nota)
              .filter((n): n is number => typeof n === 'number' && !isNaN(n));
            const mediaMes = notasDoMes.length
              ? (notasDoMes.reduce((a, b) => a + b, 0) / notasDoMes.length).toFixed(1)
              : null;
            const bestGame = [...mesGames].sort((a, b) => (b.nota || 0) - (a.nota || 0))[0] || null;
            const pctPace = Math.min(100, Math.round((m.qtd / maxMes) * 100));

            return (
              <div
                key={m.nome}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  m.qtd > 0
                    ? 'border-white/15 bg-black/50 hover:border-[#22d3ee]/40 shadow-md'
                    : 'border-white/5 bg-black/20 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                    <span className="font-heading text-xs sm:text-sm font-bold uppercase text-white">
                      {m.nomeCompleto}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-mono font-bold uppercase ${
                        m.qtd > 0
                          ? 'bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/30'
                          : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {m.qtd > 0 ? `${m.qtd} zerados` : 'Sem registros'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between text-slate-400">
                      <span>⏱ Tempo Total:</span>
                      <strong className="text-emerald-400 font-mono">{fmtH(m.h)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>⭐ Média Notas:</span>
                      <strong className="text-[#ffd700] font-mono">{mediaMes ? `★ ${mediaMes}` : '—'}</strong>
                    </div>
                  </div>

                  {bestGame && (
                    <div
                      onClick={() => onGameClick(bestGame.id)}
                      className="mt-2 rounded-lg bg-[#0d1117] border border-white/10 p-2 flex items-center gap-2 cursor-pointer hover:border-[#ffd700] transition-colors group/best"
                      title={`Destaque do Mês: ${bestGame.title}`}
                    >
                      <div className="h-10 w-7.5 flex-shrink-0 overflow-hidden rounded bg-black border border-white/10">
                        <img
                          src={bestGame.capa}
                          alt={bestGame.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover group-hover/best:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black uppercase text-[#ffd700] tracking-wider truncate">
                          🏆 Jogo do Mês
                        </div>
                        <div className="font-heading text-xs font-bold text-white truncate group-hover/best:text-[#22d3ee]">
                          {bestGame.title}
                        </div>
                        <div className="text-xs text-[#ffd700] font-mono">
                          ★ {bestGame.nota !== undefined ? bestGame.nota.toFixed(1) : '10'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-xs text-slate-500 font-mono mb-1">
                    <span>Ritmo Mensal</span>
                    <span>{pctPace}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#22d3ee] to-emerald-400"
                      style={{ width: `${pctPace}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
