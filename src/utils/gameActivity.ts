import { GameItem, GameplayDaySession } from '../types/game';

/**
 * Parses dates in DD/MM/YYYY, DD/MM (nearest year without future dates), and YYYY-MM-DD formats.
 */
export function parseFlexibleDate(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  if (!clean) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  const resolveTwoPartDate = (d: number, m: number) => {
    let y = currentYear;
    // Assume year closest to current year, avoiding future dates
    const endOfDayCandidate = new Date(currentYear, m, d, 23, 59, 59, 999);
    if (endOfDayCandidate.getTime() > now.getTime()) {
      y = currentYear - 1;
    }
    return { year: y, month: m, day: d };
  };

  // Format with hyphen: YYYY-MM-DD or DD-MM-YYYY or DD-MM
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[2].length === 2) y += 2000;
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      }
    } else if (parts.length === 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(d) && !isNaN(m)) return resolveTwoPartDate(d, m);
    }
  }

  // Format with slash: DD/MM/YYYY or YYYY/MM/DD or DD/MM
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[2].length === 2) y += 2000;
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      }
    } else if (parts.length === 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(d) && !isNaN(m)) return resolveTwoPartDate(d, m);
    }
  }

  return null;
}

/**
 * Extracts hour and minute from clock strings such as "18:30", "18h30", "18h", "9:00", "até 19:45"
 */
export function parseClockHoursMinutes(timeStr?: string | null): [number, number] {
  if (!timeStr) return [0, 0];
  const s = String(timeStr).trim().toLowerCase();
  const match = s.match(/(\d{1,2})(?:[:h](\d{1,2}))?/);
  if (match) {
    const h = parseInt(match[1], 10) || 0;
    const m = match[2] ? parseInt(match[2], 10) || 0 : 0;
    return [h, m];
  }
  return [0, 0];
}

/**
 * Calculates timestamp of a session based on session.data + end of the last interval
 * If no clock is provided, falls back to end of day (23:59:59).
 */
export function getSessionTimestamp(session: GameplayDaySession): number {
  const parts = parseFlexibleDate(session.data);
  if (!parts) return 0;

  let h = 23;
  let m = 59;
  let s = 59;
  let dayOffset = 0;

  if (session.intervalos && session.intervalos.length > 0) {
    const lastInterval = session.intervalos[session.intervalos.length - 1];
    const targetClock = lastInterval.fim || lastInterval.inicio;
    if (targetClock) {
      const [parsedH, parsedM] = parseClockHoursMinutes(targetClock);
      h = parsedH;
      m = parsedM;
      s = 0;

      // If interval ends at earlier hour than it started (e.g. 23:00 to 01:00), it crossed midnight
      if (lastInterval.inicio && lastInterval.fim) {
        const [startH] = parseClockHoursMinutes(lastInterval.inicio);
        if (parsedH < startH) {
          dayOffset = 1;
        }
      }
    }
  }

  return new Date(parts.year, parts.month, parts.day + dayOffset, h, m, s, 0).getTime();
}

/**
 * Returns latest session timestamp for a game.
 * If the game has sessions, returns the timestamp of the session with highest timestamp.
 * If no valid sessions exist, returns 0.
 */
export function getLastSessionTimestamp(game: GameItem): number {
  if (!game.sessoes || game.sessoes.length === 0) return 0;

  let maxTs = 0;
  for (const session of game.sessoes) {
    const ts = getSessionTimestamp(session);
    if (ts > maxTs) {
      maxTs = ts;
    }
  }
  return maxTs;
}

export const getGameLatestSessionTs = getLastSessionTimestamp;

/**
 * Returns timestamp for game's data_inicio
 */
export function getGameStartDateTs(game: GameItem): number {
  if (!game.data_inicio) return 0;
  const parts = parseFlexibleDate(game.data_inicio);
  if (!parts) return 0;
  return new Date(parts.year, parts.month, parts.day, 0, 0, 0, 0).getTime();
}

/**
 * Returns the latest activity timestamp for a game.
 * If sessions exist, uses the latest session timestamp.
 * Otherwise falls back to data_inicio timestamp.
 */
export function getGameLatestActivityTs(game: GameItem): number {
  const sessionTs = getLastSessionTimestamp(game);
  if (sessionTs > 0) return sessionTs;
  return getGameStartDateTs(game);
}

/**
 * Sorts active games ("jogando"):
 * 1. Games with sessions come first, ordered from most recent to oldest by latest session (data + fim)
 * 2. Fallback: games without sessions go after, ordered by data_inicio (most recent first) and then by title
 */
export function sortByLastSession(gamesList: GameItem[]): GameItem[] {
  return [...gamesList].sort((a, b) => {
    const sessionTsA = getLastSessionTimestamp(a);
    const sessionTsB = getLastSessionTimestamp(b);

    const hasSessionsA = sessionTsA > 0;
    const hasSessionsB = sessionTsB > 0;

    if (hasSessionsA && !hasSessionsB) return -1;
    if (!hasSessionsA && hasSessionsB) return 1;

    if (hasSessionsA && hasSessionsB) {
      if (sessionTsB !== sessionTsA) {
        return sessionTsB - sessionTsA; // Most recent session first
      }
    }

    // Tie-breaker or both without sessions: data_inicio (most recent first)
    const initA = getGameStartDateTs(a);
    const initB = getGameStartDateTs(b);
    if (initB !== initA) {
      return initB - initA;
    }

    // Secondary tie-breaker: title alphabetically
    return (a.title || '').localeCompare(b.title || '');
  });
}

export const sortActiveGames = sortByLastSession;
