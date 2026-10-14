import { GameItem, GameplayDaySession, GameplaySessionInterval } from '../types/game';
import { parseFlexibleDate } from './gameActivity';

export interface GamePlaySessionItem {
  game: GameItem;
  session: GameplayDaySession;
  minutes: number;
}

export interface DayPlayData {
  dateKey: string; // YYYY-MM-DD
  year: number;
  month: number; // 0-indexed (0=Jan, 11=Dec)
  day: number; // 1-31
  totalMinutes: number;
  items: GamePlaySessionItem[];
  topGame: GameItem;
  otherGamesCount: number;
}

export interface CalendarDayCell {
  dayNumber: number; // 1..31
  dateKey: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  hasSession: boolean;
  sessionData?: DayPlayData;
}

/**
 * Extracts session minutes safely from totalMinutos or by summing intervals.
 */
export function getSessionTotalMinutes(session: GameplayDaySession): number {
  if (typeof session.totalMinutos === 'number' && session.totalMinutos > 0) {
    return session.totalMinutos;
  }
  if (Array.isArray(session.intervalos) && session.intervalos.length > 0) {
    return session.intervalos.reduce((acc, interval) => {
      if (typeof interval.minutos === 'number' && interval.minutos > 0) {
        return acc + interval.minutos;
      }
      return acc;
    }, 0);
  }
  return 0;
}

/**
 * Parse a session date into local year, month (0-indexed), day without timezone shifting.
 * Supports DD/MM/YYYY, DD/MM (with context fallback year), YYYY-MM-DD, DD-MM-YYYY.
 */
export function parseSessionDateToLocal(
  dateStr?: string | null,
  gameContext?: {
    data_inicio?: string;
    data_zerado?: string;
    ano_zerado?: number;
    ano_lancamento?: number;
  }
): { year: number; month: number; day: number; key: string } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  if (!clean) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Try extracting fallback year from game context if needed
  let fallbackYear: number | undefined;
  if (gameContext) {
    if (gameContext.data_inicio) {
      const p = parseFlexibleDate(gameContext.data_inicio);
      if (p) fallbackYear = p.year;
    }
    if (!fallbackYear && gameContext.data_zerado) {
      const p = parseFlexibleDate(gameContext.data_zerado);
      if (p) fallbackYear = p.year;
    }
    if (!fallbackYear && gameContext.ano_zerado && gameContext.ano_zerado >= 1970 && gameContext.ano_zerado <= currentYear) {
      fallbackYear = gameContext.ano_zerado;
    }
    if (!fallbackYear && gameContext.ano_lancamento && gameContext.ano_lancamento >= 1970 && gameContext.ano_lancamento <= currentYear) {
      fallbackYear = gameContext.ano_lancamento;
    }
  }

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // Pattern 1: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else {
    // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10) - 1;
      let y = parseInt(dmyMatch[3], 10);
      if (dmyMatch[3].length === 2) y += 2000;
      year = y;
    } else {
      // Pattern 3: DD/MM or DD-MM (2 parts without year)
      const dmMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})$/);
      if (dmMatch) {
        day = parseInt(dmMatch[1], 10);
        month = parseInt(dmMatch[2], 10) - 1;

        if (fallbackYear && fallbackYear <= currentYear) {
          year = fallbackYear;
        } else {
          // Use current year if not in future, else previous year
          const candidate = new Date(currentYear, month, day, 23, 59, 59);
          if (candidate.getTime() > now.getTime()) {
            year = currentYear - 1;
          } else {
            year = currentYear;
          }
        }
      }
    }
  }

  if (year === null || month === null || day === null) return null;
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, key };
}

/**
 * Pre-computes a map of all days with gaming sessions across all games.
 * Key: "YYYY-MM-DD" -> DayPlayData
 */
export function buildPlayDaysMap(games: GameItem[]): Map<string, DayPlayData> {
  const map = new Map<string, DayPlayData>();

  games.forEach((game) => {
    if (!Array.isArray(game.sessoes)) return;

    game.sessoes.forEach((session) => {
      const parsed = parseSessionDateToLocal(session.data, {
        data_inicio: game.data_inicio,
        data_zerado: game.data_zerado,
        ano_zerado: game.ano_zerado,
        ano_lancamento: game.ano_lancamento,
      });

      if (!parsed) return;

      const minutes = getSessionTotalMinutes(session);
      const existing = map.get(parsed.key);

      if (existing) {
        existing.totalMinutes += minutes;
        existing.items.push({ game, session, minutes });
        // Re-sort items by minutes descending to determine topGame
        existing.items.sort((a, b) => b.minutes - a.minutes);
        existing.topGame = existing.items[0].game;
        existing.otherGamesCount = new Set(existing.items.map((i) => i.game.id)).size - 1;
      } else {
        map.set(parsed.key, {
          dateKey: parsed.key,
          year: parsed.year,
          month: parsed.month,
          day: parsed.day,
          totalMinutes: minutes,
          items: [{ game, session, minutes }],
          topGame: game,
          otherGamesCount: 0,
        });
      }
    });
  });

  return map;
}

/**
 * Extracts all unique years available from sessions, plus current year, in descending order.
 */
export function getAvailableSessionYears(games: GameItem[]): number[] {
  const currentYear = new Date().getFullYear();
  const yearSet = new Set<number>([currentYear]);

  games.forEach((g) => {
    if (!Array.isArray(g.sessoes)) return;
    g.sessoes.forEach((s) => {
      const parsed = parseSessionDateToLocal(s.data, {
        data_inicio: g.data_inicio,
        data_zerado: g.data_zerado,
        ano_zerado: g.ano_zerado,
        ano_lancamento: g.ano_lancamento,
      });
      if (parsed) {
        yearSet.add(parsed.year);
      }
    });
  });

  return Array.from(yearSet).sort((a, b) => b - a);
}

/**
 * Generates the 7-column calendar matrix for a specific month and year.
 * DOM (0), SEG (1), TER (2), QUA (3), QUI (4), SEX (5), SÁB (6).
 */
export function getCalendarMonthGrid(
  year: number,
  monthIndex: number, // 0 to 11
  playDaysMap: Map<string, DayPlayData>
): {
  firstDayWeekday: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  totalDays: number; // 28, 29, 30, 31
  paddingBefore: number; // empty cells before day 1
  days: CalendarDayCell[];
  activeDaysCount: number;
  totalMonthMinutes: number;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const firstDay = new Date(year, monthIndex, 1);
  const firstDayWeekday = firstDay.getDay(); // 0..6
  const totalDays = new Date(year, monthIndex + 1, 0).getDate(); // 28..31

  const days: CalendarDayCell[] = [];
  let activeDaysCount = 0;
  let totalMonthMinutes = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sessionData = playDaysMap.get(dateKey);
    const isToday = year === currentYear && monthIndex === currentMonth && d === currentDay;
    const hasSession = !!sessionData && sessionData.items.length > 0;

    if (hasSession) {
      activeDaysCount++;
      totalMonthMinutes += sessionData.totalMinutes;
    }

    days.push({
      dayNumber: d,
      dateKey,
      isCurrentMonth: true,
      isToday,
      hasSession,
      sessionData,
    });
  }

  return {
    firstDayWeekday,
    totalDays,
    paddingBefore: firstDayWeekday,
    days,
    activeDaysCount,
    totalMonthMinutes,
  };
}

/**
 * Formats minutes into short time strings for badges (e.g. "15m", "56m", "1h", "1h 15m")
 */
export function formatPlayTimeShort(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Formats total month play time (e.g. "3h 01m" or "56m")
 */
export function formatPlayTimeFull(minutes: number): string {
  if (minutes <= 0) return '0h 00m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Formats a calendar date into full Portuguese string (e.g. "Terça-feira, 6 de outubro de 2026")
 */
export function formatFullCalendarDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  const weekdayNames = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const monthNames = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const weekday = weekdayNames[date.getDay()];
  const monthName = monthNames[monthIndex];
  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

export interface MonthTopGame {
  game: GameItem;
  minutes: number;
}

export interface MonthRecentSession {
  dateKey: string;
  day: number;
  month: number;
  year: number;
  topGame: GameItem;
  otherGamesCount: number;
  totalMinutes: number;
  sessionData: DayPlayData;
}

export interface MonthSummaryData {
  year: number;
  monthIndex: number;
  activeDaysCount: number;
  totalMonthMinutes: number;
  avgMinutesPerActiveDay: number;
  topGames: MonthTopGame[];
  otherGamesCount: number;
  maxGameMinutes: number;
  recentSessions: MonthRecentSession[];
  hasActivity: boolean;
}

/**
 * Computes month-level summary metrics (active days, total time, average per active day,
 * top 3 played games with proportion bar reference, and recent sessions)
 * strictly using the same playDaysMap and time calculation rules.
 */
export function computeMonthSummary(
  year: number,
  monthIndex: number,
  playDaysMap: Map<string, DayPlayData>
): MonthSummaryData {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const gameMinutesMap = new Map<string, { game: GameItem; minutes: number }>();
  const recentSessions: MonthRecentSession[] = [];
  let totalMonthMinutes = 0;
  let activeDaysCount = 0;

  // Iterate days descending so that recent sessions are ordered from most recent day
  for (let d = totalDays; d >= 1; d--) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = playDaysMap.get(dateKey);

    if (dayData && dayData.items.length > 0) {
      activeDaysCount++;
      totalMonthMinutes += dayData.totalMinutes;

      recentSessions.push({
        dateKey,
        day: d,
        month: monthIndex,
        year,
        topGame: dayData.topGame,
        otherGamesCount: dayData.otherGamesCount,
        totalMinutes: dayData.totalMinutes,
        sessionData: dayData,
      });

      // Aggregate game minutes for the month
      dayData.items.forEach((item) => {
        const existing = gameMinutesMap.get(item.game.id);
        if (existing) {
          existing.minutes += item.minutes;
        } else {
          gameMinutesMap.set(item.game.id, {
            game: item.game,
            minutes: item.minutes,
          });
        }
      });
    }
  }

  const allTopGames = Array.from(gameMinutesMap.values()).sort((a, b) => b.minutes - a.minutes);
  const topGames = allTopGames.slice(0, 3);
  const otherGamesCount = Math.max(0, allTopGames.length - 3);
  const maxGameMinutes = topGames[0]?.minutes || 1;

  const avgMinutesPerActiveDay = activeDaysCount > 0 ? Math.round(totalMonthMinutes / activeDaysCount) : 0;

  return {
    year,
    monthIndex,
    activeDaysCount,
    totalMonthMinutes,
    avgMinutesPerActiveDay,
    topGames,
    otherGamesCount,
    maxGameMinutes,
    recentSessions: recentSessions.slice(0, 3),
    hasActivity: activeDaysCount > 0,
  };
}

