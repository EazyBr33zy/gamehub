import { GameItem, GameplayDaySession } from '../types/game';
import { getUniqueZerados } from './markdownParser';

export interface ParsedSessionDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  isoDate: string; // YYYY-MM-DD
  timestamp: number; // Date.UTC(year, month - 1, day)
}

/**
 * Parses a session or completion date string without using `new Date(string)`
 * to avoid local timezone rollback shifts.
 * 
 * Supports:
 * - YYYY-MM-DD or YYYY/MM/DD
 * - DD/MM/YYYY or DD-MM-YYYY
 * - DD/MM or DD-MM (without year: chooses the closest year to the reference year, avoiding future dates)
 */
export function parseSessionDate(
  dateStr?: string | null,
  referenceDate: Date = new Date()
): ParsedSessionDate | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  if (!clean) return null;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12
  const currentDay = referenceDate.getDate();

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    // Format 2: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      let y = parseInt(dmyMatch[3], 10);
      if (dmyMatch[3].length === 2) y += 2000;
      year = y;
    } else {
      // Format 3: DD/MM or DD-MM (sem ano)
      const dmMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})$/);
      if (dmMatch) {
        day = parseInt(dmMatch[1], 10);
        month = parseInt(dmMatch[2], 10);

        // Sem ano: use o ano mais próximo do ano atual, sem datas no futuro
        const isFutureThisYear =
          month > currentMonth || (month === currentMonth && day > currentDay);
        year = isFutureThisYear ? currentYear - 1 : currentYear;
      }
    }
  }

  if (year === null || month === null || day === null) return null;
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timestamp = Date.UTC(year, month - 1, day);

  return { year, month, day, isoDate, timestamp };
}

/**
 * Returns the session with the LARGEST date (comparing timestamps, never as text).
 * Does not assume the latest session is the last item in the array.
 */
export function getLastSessionDate(
  sessions?: GameplayDaySession[] | null,
  referenceDate?: Date
): ParsedSessionDate | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  let best: ParsedSessionDate | null = null;
  for (const s of sessions) {
    if (!s || !s.data) continue;
    const parsed = parseSessionDate(s.data, referenceDate);
    if (!parsed) continue;
    if (!best || parsed.timestamp > best.timestamp) {
      best = parsed;
    }
  }

  return best;
}

/**
 * Determines the automatic beaten date (YYYY-MM-DD) and year.
 * If sessions exist, uses the date of the latest session.
 * If no session is registered, uses today's date.
 */
export function getAutoBeatenDate(
  sessions?: GameplayDaySession[] | null,
  referenceDate: Date = new Date()
): { data_zerado: string; ano_zerado: number } {
  const lastSession = getLastSessionDate(sessions, referenceDate);
  if (lastSession) {
    return {
      data_zerado: lastSession.isoDate,
      ano_zerado: lastSession.year,
    };
  }

  // Sem nenhuma sessão registrada: use a data de hoje
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth() + 1;
  const d = referenceDate.getDate();
  const todayIso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return {
    data_zerado: todayIso,
    ano_zerado: y,
  };
}

/**
 * Returns the effective date used to sort a beaten game:
 * 1. data_zerado
 * 2. Fallback to latest session date
 * 3. null if neither exists
 */
export function getEffectiveBeatenSortDate(
  game: GameItem,
  referenceDate?: Date
): ParsedSessionDate | null {
  if (game.data_zerado) {
    const parsed = parseSessionDate(game.data_zerado, referenceDate);
    if (parsed) return parsed;
  }
  return getLastSessionDate(game.sessoes, referenceDate);
}

/**
 * Formats the completion date for display (DD/MM/YYYY).
 * If neither data_zerado nor session date exists, returns "—".
 */
export function getBeatenDisplayDate(
  game: GameItem,
  referenceDate?: Date
): string {
  if (game.data_zerado) {
    const parsed = parseSessionDate(game.data_zerado, referenceDate);
    if (parsed) {
      const dd = String(parsed.day).padStart(2, '0');
      const mm = String(parsed.month).padStart(2, '0');
      return `${dd}/${mm}/${parsed.year}`;
    }
  }

  const lastSession = getLastSessionDate(game.sessoes, referenceDate);
  if (lastSession) {
    const dd = String(lastSession.day).padStart(2, '0');
    const mm = String(lastSession.month).padStart(2, '0');
    return `${dd}/${mm}/${lastSession.year}`;
  }

  return '—';
}

/**
 * Returns the up to 7 most recently beaten games:
 * - Only status === 'zerado' (abandoned and active games excluded)
 * - Uses getUniqueZerados for deduplication
 * - Ordered by data_zerado (most recent first)
 * - Fallback to last session date if without data_zerado
 * - Games with neither date go to the end, sorted by ano_zerado descending
 */
export function getRecentBeatenGames(
  gamesList: GameItem[],
  limit = 7,
  referenceDate?: Date
): GameItem[] {
  if (!Array.isArray(gamesList)) return [];

  // 1. Apenas jogos com status === 'zerado'
  const beatenOnly = gamesList.filter((g) => g.status === 'zerado');

  // 2. Deduplicação única (mesma função do painel)
  const uniqueList = getUniqueZerados(beatenOnly);

  // 3. Ordenação
  const sorted = [...uniqueList].sort((a, b) => {
    const aDate = getEffectiveBeatenSortDate(a, referenceDate);
    const bDate = getEffectiveBeatenSortDate(b, referenceDate);

    if (aDate && bDate) {
      if (bDate.timestamp !== aDate.timestamp) {
        return bDate.timestamp - aDate.timestamp;
      }
      return a.title.localeCompare(b.title);
    }

    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;

    // Sem nenhuma data: vai para o fim, ordenado por ano_zerado decrescente
    const aYear = a.ano_zerado ?? 0;
    const bYear = b.ano_zerado ?? 0;
    if (bYear !== aYear) {
      return bYear - aYear;
    }

    return a.title.localeCompare(b.title);
  });

  return sorted.slice(0, limit);
}
