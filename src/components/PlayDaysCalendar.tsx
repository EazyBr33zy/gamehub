import React, { useState, useMemo } from 'react';
import { GameItem } from '../types/game';
import { 
  buildPlayDaysMap, 
  getAvailableSessionYears, 
  getCalendarMonthGrid, 
  computeMonthSummary,
  formatPlayTimeShort, 
  formatPlayTimeFull, 
  formatFullCalendarDate,
  DayPlayData
} from '../utils/calendarActivity';
import { GameCover } from './GameCover';
import { Modal } from './Modal';
import { useHashRoute } from '../hooks/useHashRoute';
import { getPlatformStyle } from '../utils/platformStyles';
import { ChevronLeft, ChevronRight, Gamepad2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { cleanTitle } from '../utils/markdownParser';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

interface PlayDaysCalendarProps {
  games: GameItem[];
}

export const PlayDaysCalendar: React.FC<PlayDaysCalendarProps> = ({ games }) => {
  const { navigate } = useHashRoute();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [activeDayDetail, setActiveDayDetail] = useState<DayPlayData | null>(null);

  // Pre-calculate all sessions map across games
  const playDaysMap = useMemo(() => {
    return buildPlayDaysMap(games);
  }, [games]);

  // Available years from session history + current year (descending)
  const availableYears = useMemo(() => {
    return getAvailableSessionYears(games);
  }, [games]);

  const minYear = availableYears[availableYears.length - 1] ?? currentYear;
  const maxYear = availableYears[0] ?? currentYear;

  // Grid computation for the active month
  const grid = useMemo(() => {
    return getCalendarMonthGrid(selectedYear, selectedMonth, playDaysMap);
  }, [selectedYear, selectedMonth, playDaysMap]);

  // Month summary metrics computation for desktop panel (≥1024px)
  const monthSummary = useMemo(() => {
    return computeMonthSummary(selectedYear, selectedMonth, playDaysMap);
  }, [selectedYear, selectedMonth, playDaysMap]);

  const isCurrentMonthView = selectedYear === currentYear && selectedMonth === currentMonth;

  // Handlers for month navigation with year rollover and boundary constraints
  const canGoPrev = selectedYear > minYear || selectedMonth > 0;
  const canGoNext = selectedYear < maxYear || selectedMonth < 11;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      if (selectedYear > minYear) {
        setSelectedYear((y) => y - 1);
        setSelectedMonth(11);
      }
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      if (selectedYear < maxYear) {
        setSelectedYear((y) => y + 1);
        setSelectedMonth(0);
      }
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value, 10));
  };

  const handleCardClick = (gameId: string) => {
    setActiveDayDetail(null);
    navigate(`#/jogo/${encodeURIComponent(gameId)}`);
  };

  return (
    <section 
      aria-labelledby="play-days-calendar-heading"
      className="w-full rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl space-y-4 overflow-hidden"
    >
      <div className="gd-calendar-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-stretch">
        {/* ── LEFT COLUMN: CALENDAR (FLEXIBLE) ── */}
        <div className="flex flex-col space-y-3.5 sm:space-y-4 min-w-0">
          {/* ── HEADER ── */}
          <div className="space-y-3 border-b border-[#30363d]/60 pb-3 sm:pb-4">
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                  <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 id="play-days-calendar-heading" className="font-heading text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                  DIAS QUE JOGUEI
                </h2>
              </div>

              {/* "Hoje" button when not in current month */}
              {!isCurrentMonthView && (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="min-h-[36px] sm:min-h-[44px] px-3 rounded-xl border border-[#22d3ee]/40 bg-[#22d3ee]/10 text-xs font-bold text-[#22d3ee] hover:bg-[#22d3ee]/20 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                >
                  <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hoje</span>
                </button>
              )}
            </div>

            {/* Navigation row with Prev/Next, Month Name, and Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrev}
                  aria-label="Mês anterior"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-white hover:bg-white/10 hover:border-[#22d3ee] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Month & Year Title with embedded Native Selectors */}
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#0d1117]/80 border border-[#30363d]/50">
                  <div className="relative inline-block">
                    <select
                      value={selectedMonth}
                      onChange={handleMonthSelect}
                      aria-label="Selecionar mês"
                      className="appearance-none font-heading text-base sm:text-xl font-extrabold text-white bg-transparent border-0 pr-5 pl-1 py-1 cursor-pointer focus:outline-none rounded"
                      style={{ fontSize: '16px' }}
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx} className="bg-[#161b22] text-white">
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[#9aa4b2] text-xs">
                      ▼
                    </div>
                  </div>

                  <div className="relative inline-block">
                    <select
                      value={selectedYear}
                      onChange={handleYearSelect}
                      aria-label="Selecionar ano"
                      className="appearance-none font-mono text-base sm:text-xl font-extrabold text-white bg-transparent border-0 pr-5 pl-1 py-1 cursor-pointer focus:outline-none rounded"
                      style={{ fontSize: '16px' }}
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr} className="bg-[#161b22] text-white">
                          {yr}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[#9aa4b2] text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={!canGoNext}
                  aria-label="Próximo mês"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-white hover:bg-white/10 hover:border-[#22d3ee] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Month Summary Text: Only shown on mobile/tablet (<1024px). Hidden on desktop (≥1024px) */}
              <div className="lg:hidden text-left sm:text-right text-xs sm:text-sm font-mono flex items-center gap-1.5 pl-1 sm:pl-0">
                <span className="font-bold text-purple-400">
                  {grid.activeDaysCount} {grid.activeDaysCount === 1 ? 'dia' : 'dias'}
                </span>
                <span className="text-[#9aa4b2]">·</span>
                <span className="font-bold text-[#22d3ee]">
                  {formatPlayTimeFull(grid.totalMonthMinutes)}
                </span>
                <span className="text-[#9aa4b2]">jogados</span>
              </div>
            </div>
          </div>

          {/* ── WEEKDAYS HEADER ── */}
          <div className="grid grid-cols-7 gap-1 min-[360px]:gap-1.5 sm:gap-1.5 text-center">
            {WEEKDAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-xs font-mono font-bold uppercase tracking-wider text-[#9aa4b2] py-0.5"
              >
                {name}
              </div>
            ))}
          </div>

          {/* ── CALENDAR 7-COLUMN GRID ── */}
          <div className="gd-calendar-days grid grid-cols-7 gap-1 min-[360px]:gap-1.5 sm:gap-1.5">
            {/* Leading empty cells for proper week alignment */}
            {Array.from({ length: grid.paddingBefore }).map((_, idx) => (
              <div
                key={`pad-before-${idx}`}
                aria-hidden="true"
                className="calendar-cell gd-calendar-cell aspect-[3/4] rounded-md sm:rounded-xl border border-transparent bg-transparent"
              />
            ))}

            {/* Month Day Cells */}
            {grid.days.map((cell) => {
              const { dayNumber, isToday, hasSession, sessionData } = cell;

              if (hasSession && sessionData) {
                const { topGame, otherGamesCount, totalMinutes } = sessionData;
                const formattedTime = formatPlayTimeShort(totalMinutes);
                const ariaText = `${dayNumber} de ${MONTH_NAMES[selectedMonth]}, ${cleanTitle(topGame.title)}, ${totalMinutes} minutos`;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setActiveDayDetail(sessionData)}
                    aria-label={ariaText}
                    className={`calendar-cell gd-calendar-cell group relative aspect-[3/4] w-full overflow-hidden rounded-md sm:rounded-xl border transition-all duration-200 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none p-0 flex flex-col justify-between ${
                      isToday
                        ? 'border-[#22d3ee] ring-1.5 ring-[#22d3ee]/60 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                        : 'border-purple-500/50 hover:border-[#22d3ee]'
                    }`}
                  >
                    {/* Background Cover */}
                    <div className="absolute inset-0 bg-black/80 z-0 pointer-events-none overflow-hidden">
                      <GameCover
                        src={topGame.capa}
                        title={topGame.title}
                        consoleName={topGame.console}
                        size="lg"
                        className="h-full w-full object-cover rounded-md sm:rounded-xl"
                      />
                      {/* Dark gradient for text legibility */}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e14]/25 via-[#0a0e14]/55 to-[#0a0e14]/92" />
                    </div>

                    {/* Top row in normal flow (Day Number & +N) */}
                    <div className="relative z-10 w-full flex items-start justify-between p-1 sm:p-2">
                      <div className="flex items-center justify-center rounded bg-[#0a0e14]/75 px-1 sm:px-1.5 py-0.5 border border-white/15 text-[10px] sm:text-xs font-black font-mono text-white leading-none shadow-xs">
                        {dayNumber}
                      </div>

                      {otherGamesCount > 0 && (
                        <div 
                          className="flex min-w-[15px] h-[15px] sm:h-auto sm:w-auto items-center justify-center rounded bg-purple-600/90 border border-purple-400/40 px-0.5 sm:px-1 sm:py-0.5 text-[9px] sm:text-xs font-black text-white leading-none shadow-xs"
                          title={`+${otherGamesCount} outro(s) jogo(s)`}
                        >
                          +{otherGamesCount}
                        </div>
                      )}
                    </div>

                    {/* Bottom row in normal flow (Title & Time Pill) */}
                    <div className="relative z-10 w-full p-1 sm:p-2 flex flex-col gap-1">
                      <div className="hidden md:block line-clamp-2 text-[12px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] group-hover:text-[#22d3ee] transition-colors leading-tight">
                        {cleanTitle(topGame.title)}
                      </div>
                      <div className="flex items-center">
                        <span className="rounded bg-[#0a0e14]/90 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] min-[390px]:text-[10px] sm:text-xs leading-none sm:leading-normal font-bold font-mono text-emerald-300 shadow-xs truncate max-w-full">
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }

              // Empty day cell (no session)
              return (
                <div
                  key={cell.dateKey}
                  className={`calendar-cell gd-calendar-cell relative aspect-[3/4] w-full rounded-md sm:rounded-xl p-1 sm:p-2 flex flex-col justify-between transition-colors bg-[#0d1117] ${
                    isToday
                      ? 'border border-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                      : 'border border-[#30363d]/40'
                  }`}
                >
                  <span
                    className={`text-xs font-mono font-bold ${
                      isToday ? 'text-[#22d3ee]' : 'text-[#9aa4b2]'
                    }`}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── FOOTER: EMPTY MONTH NOTICE & LEGEND ── */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#30363d]/50 text-xs">
            {grid.activeDaysCount === 0 ? (
              <p className="text-[#9aa4b2] italic text-xs">
                Nenhuma sessão registrada em {MONTH_NAMES[selectedMonth]} de {selectedYear}.
              </p>
            ) : (
              <div className="text-[#9aa4b2] text-xs">
                Toque em um dia com sessão para ver detalhes.
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs font-medium text-[#9aa4b2] self-start sm:self-auto">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-purple-600 border border-purple-400/40" aria-hidden="true" />
                <span>Joguei</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-[#0d1117] border border-[#22d3ee]" aria-hidden="true" />
                <span>Hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-[#0d1117] border border-[#30363d]" aria-hidden="true" />
                <span>Sem sessão</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: RESUMO DO MÊS PANEL (DESKTOP ONLY ≥1024px) ── */}
        <div className="gd-calendar-summary hidden lg:flex flex-col justify-start rounded-xl border border-[#30363d]/70 bg-[#0d1117]/60 p-4 space-y-4 min-w-[320px] max-w-[320px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#30363d]/60 pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
              RESUMO DE {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
          </div>

          {!monthSummary.hasActivity ? (
            <div className="p-4 text-center my-auto">
              <p className="text-xs text-[#9aa4b2] italic">
                Nenhuma sessão em {MONTH_NAMES[selectedMonth]}.
              </p>
            </div>
          ) : (
            <>
              {/* 3 Highlight Numbers */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#161b22] border border-[#30363d]/80 p-2.5 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">Dias jogados</span>
                  <span className="font-mono text-base font-black text-purple-400 mt-1">
                    {monthSummary.activeDaysCount}
                  </span>
                </div>
                <div className="rounded-lg bg-[#161b22] border border-[#30363d]/80 p-2.5 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">Tempo total</span>
                  <span className="font-mono text-xs font-black text-[#22d3ee] mt-1 truncate" title={formatPlayTimeFull(monthSummary.totalMonthMinutes)}>
                    {formatPlayTimeFull(monthSummary.totalMonthMinutes)}
                  </span>
                </div>
                <div className="rounded-lg bg-[#161b22] border border-[#30363d]/80 p-2.5 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">Média por dia</span>
                  <span className="font-mono text-xs font-black text-emerald-400 mt-1 truncate" title={monthSummary.avgMinutesPerActiveDay > 0 ? formatPlayTimeFull(monthSummary.avgMinutesPerActiveDay) : '—'}>
                    {monthSummary.avgMinutesPerActiveDay > 0 ? formatPlayTimeFull(monthSummary.avgMinutesPerActiveDay) : '—'}
                  </span>
                </div>
              </div>

              {/* Jogos do mês (Top 3) */}
              {monthSummary.topGames.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
                    <span>Jogos do mês</span>
                    {monthSummary.otherGamesCount > 0 && (
                      <span className="text-xs text-purple-400 font-normal">
                        +{monthSummary.otherGamesCount} outro{monthSummary.otherGamesCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {monthSummary.topGames.map(({ game, minutes }) => {
                      const ratioPercent = Math.min(100, Math.max(5, Math.round((minutes / monthSummary.maxGameMinutes) * 100)));
                      return (
                        <a
                          key={game.id}
                          href={`#/jogo/${encodeURIComponent(game.id)}`}
                          className="group flex items-center gap-2.5 p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 hover:border-[#22d3ee]/60 transition-all cursor-pointer"
                        >
                          <div className="h-10 w-10 min-w-[40px] rounded overflow-hidden bg-black/60 shrink-0 border border-[#30363d]">
                            <GameCover
                              src={game.capa}
                              title={game.title}
                              consoleName={game.console}
                              size="thumb"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h4 className="text-xs font-bold text-white truncate group-hover:text-[#22d3ee] transition-colors">
                                {cleanTitle(game.title)}
                              </h4>
                              <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                {formatPlayTimeShort(minutes)}
                              </span>
                            </div>
                            {/* Proportion bar */}
                            <div className="h-1.5 w-full rounded-full bg-black/60 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#22d3ee]"
                                style={{ width: `${ratioPercent}%` }}
                              />
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Últimas sessões do mês */}
              {monthSummary.recentSessions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
                    Últimas sessões do mês
                  </div>
                  <div className="space-y-1.5">
                    {monthSummary.recentSessions.map((sessionItem) => {
                      const { dateKey, day, month, topGame, otherGamesCount, totalMinutes, sessionData } = sessionItem;
                      const formattedDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setActiveDayDetail(sessionData)}
                          className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-[#161b22] border border-[#30363d]/60 hover:border-purple-500/60 hover:bg-[#1c2128] transition-all cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded shrink-0">
                              {formattedDate}
                            </span>
                            <span className="text-xs text-slate-200 truncate font-medium">
                              {cleanTitle(topGame.title)}
                              {otherGamesCount > 0 && (
                                <span className="text-purple-400 text-xs ml-1">
                                  (+{otherGamesCount})
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#22d3ee] shrink-0">
                            {formatPlayTimeShort(totalMinutes)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL: DAY SESSIONS DETAIL (TOUCH & CLICK) ── */}
      {activeDayDetail && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDayDetail(null)}
          title={formatFullCalendarDate(activeDayDetail.year, activeDayDetail.month, activeDayDetail.day)}
        >
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-xs">
              <span className="text-[#9aa4b2]">Total do dia:</span>
              <span className="font-mono font-bold text-[#22d3ee] text-sm">
                {formatPlayTimeFull(activeDayDetail.totalMinutes)}
              </span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeDayDetail.items.map((item, index) => {
                const { game, session, minutes } = item;
                const pStyle = getPlatformStyle(game.console);

                return (
                  <div
                    key={`${game.id}-${index}`}
                    className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3.5 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Game Cover */}
                      <div className="h-16 w-12 rounded-lg overflow-hidden shrink-0 border border-[#30363d] bg-black/60">
                        <GameCover
                          src={game.capa}
                          title={game.title}
                          consoleName={game.console}
                          size="thumb"
                        />
                      </div>

                      {/* Game Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-mono font-bold uppercase"
                            style={{
                              backgroundColor: `${pStyle.col}20`,
                              color: pStyle.col,
                              border: `1px solid ${pStyle.col}40`,
                            }}
                          >
                            {game.console}
                          </span>
                          <span className="rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-300">
                            {game.genero}
                          </span>
                        </div>
                        <h4 className="font-heading text-sm font-bold text-white truncate">
                          {cleanTitle(game.title)}
                        </h4>
                        <div className="text-xs font-mono text-emerald-400 mt-1">
                          Tempo nesta data: <strong>{formatPlayTimeShort(minutes)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Intervals list if present */}
                    {session.intervalos && session.intervalos.length > 0 && (
                      <div className="rounded-lg bg-black/40 border border-[#30363d]/50 p-2.5 space-y-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
                          Intervalos registrados:
                        </div>
                        <div className="space-y-1">
                          {session.intervalos.map((interval, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs font-mono text-slate-300"
                            >
                              <span>
                                {interval.inicio} – {interval.fim}
                              </span>
                              <span className="text-[#22d3ee]">{interval.minutos} min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button: Ver jogo */}
                    <button
                      type="button"
                      onClick={() => handleCardClick(game.id)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#22d3ee] hover:text-[#0d1117] hover:border-[#22d3ee] py-2 px-3 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                    >
                      <span>Ver Ficha do Jogo</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

