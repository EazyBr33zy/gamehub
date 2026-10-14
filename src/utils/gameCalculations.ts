import { GameItem, GameplayDaySession, GameplaySessionInterval, GameReviewRubric } from '../types/game';
import { calculateRubricScore, parseToMinutes } from './markdownParser';

/**
 * Calculates duration between two times in "HH:mm" format.
 * If end is before start, it is treated as ending the next day (crosses midnight).
 */
export function calculateIntervalDuration(
  inicio: string,
  fim: string
): { minutos: number; crossesMidnight: boolean; isValid: boolean } {
  if (!inicio || !fim) {
    return { minutos: 0, crossesMidnight: false, isValid: false };
  }

  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);

  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) {
    return { minutos: 0, crossesMidnight: false, isValid: false };
  }

  const startMins = h1 * 60 + m1;
  const endMins = h2 * 60 + m2;

  if (endMins < startMins) {
    const minutos = endMins + 1440 - startMins;
    return { minutos, crossesMidnight: true, isValid: true };
  }

  const minutos = endMins - startMins;
  return { minutos, crossesMidnight: false, isValid: true };
}

/**
 * Checks for overlaps between intervals within the same session.
 * Touching endpoints (e.g. 14:00-15:00 and 15:00-16:00) do NOT count as overlap.
 */
export function checkIntervalOverlap(
  intervalos: Array<{ inicio: string; fim: string }>
): { hasOverlap: boolean; overlappingPair?: [number, number]; message?: string } {
  if (intervalos.length <= 1) {
    return { hasOverlap: false };
  }

  interface Segment {
    start: number;
    end: number;
    index: number;
  }

  const segments: Segment[] = [];

  for (let idx = 0; idx < intervalos.length; idx++) {
    const { inicio, fim } = intervalos[idx];
    const { minutos, crossesMidnight, isValid } = calculateIntervalDuration(inicio, fim);
    if (!isValid || minutos <= 0) continue;

    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;

    if (!crossesMidnight) {
      segments.push({ start: startMins, end: endMins, index: idx });
    } else {
      // Crosses midnight: [startMins, 1440] and [0, endMins]
      segments.push({ start: startMins, end: 1440, index: idx });
      segments.push({ start: 0, end: endMins, index: idx });
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const segA = segments[i];
      const segB = segments[j];
      if (segA.index === segB.index) continue; // Same interval's split parts

      // Overlap condition: max(startA, startB) < min(endA, endB)
      if (Math.max(segA.start, segB.start) < Math.min(segA.end, segB.end)) {
        return {
          hasOverlap: true,
          overlappingPair: [segA.index, segB.index],
          message: `Sobreposição detectada entre o intervalo ${segA.index + 1} e o intervalo ${segB.index + 1}.`,
        };
      }
    }
  }

  return { hasOverlap: false };
}

/**
 * Formats total minutes into h:mm format (e.g. 125 -> "2:05").
 */
export function formatMinutesToHMM(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calculates total minutes of a single session.
 * Sums interval durations if present, fallback to session.totalMinutos.
 */
export function calculateSessionTotalMinutes(session: GameplayDaySession): number {
  if (session.intervalos && session.intervalos.length > 0) {
    let sum = 0;
    for (const inter of session.intervalos) {
      if (typeof inter.minutos === 'number' && inter.minutos > 0) {
        sum += inter.minutos;
      } else if (inter.inicio && inter.fim) {
        const { minutos, isValid } = calculateIntervalDuration(inter.inicio, inter.fim);
        if (isValid) sum += minutos;
      }
    }
    if (sum > 0) return sum;
  }
  return typeof session.totalMinutos === 'number' ? Math.max(0, session.totalMinutos) : 0;
}

/**
 * Calculates the effective accumulated time of a game.
 * If the game has sessions, calculates the sum of all sessions and formats as h:mm.
 * If no sessions, uses the game's saved tempo.
 */
export function getGameEffectiveTime(game: Partial<GameItem> | null | undefined): {
  tempo: string;
  tempoMinutos: number;
  hasSessions: boolean;
} {
  if (!game) {
    return { tempo: '0:00', tempoMinutos: 0, hasSessions: false };
  }

  if (game.sessoes && game.sessoes.length > 0) {
    let totalMinutes = 0;
    for (const s of game.sessoes) {
      totalMinutes += calculateSessionTotalMinutes(s);
    }
    const tempo = formatMinutesToHMM(totalMinutes);
    return { tempo, tempoMinutos: totalMinutes, hasSessions: true };
  }

  // Fallback when no sessions are registered
  const tempo = game.tempo || '0:00';
  const tempoMinutos =
    typeof game.tempoMinutos === 'number' && !isNaN(game.tempoMinutos)
      ? game.tempoMinutos
      : parseToMinutes(tempo);

  return {
    tempo,
    tempoMinutos,
    hasSessions: false,
  };
}

/**
 * Calculates the effective score (nota) of a game.
 * If a rubric is saved, calculates the score via calculateRubricScore.
 * If no rubric, uses game.nota if defined, otherwise undefined (displays "—").
 */
export function getGameEffectiveScore(game: Partial<GameItem> | null | undefined): {
  nota: number | undefined;
  hasRubric: boolean;
} {
  if (!game) {
    return { nota: undefined, hasRubric: false };
  }

  const rubric = game.rubric;
  const hasRubric = Boolean(
    rubric && typeof rubric === 'object' && Object.keys(rubric).length > 0
  );

  if (hasRubric) {
    try {
      const nota = calculateRubricScore(rubric as GameReviewRubric);
      return { nota, hasRubric: true };
    } catch {
      // Fallback if rubric calculation fails
    }
  }

  if (typeof game.nota === 'number' && !isNaN(game.nota)) {
    return { nota: game.nota, hasRubric: false };
  }

  return { nota: undefined, hasRubric: false };
}

/**
 * Converts DD/MM/YYYY date string to YYYY-MM-DD for HTML input[type="date"].
 */
export function formatDateBRToISO(dateBR: string): string {
  if (!dateBR) return '';
  const parts = dateBR.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const currentYear = new Date().getFullYear();
    const [d, m] = parts;
    return `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateBR;
}

/**
 * Converts YYYY-MM-DD date string back to DD/MM/YYYY format.
 */
export function formatISOToDateBR(dateISO: string): string {
  if (!dateISO) return '';
  const parts = dateISO.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateISO;
}

/**
 * Parses DD/MM/YYYY into timestamp milliseconds for comparison and sorting.
 */
export function parseDateBRToTimestamp(dateBR: string): number {
  if (!dateBR) return 0;
  const parts = dateBR.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    return new Date(y, m - 1, d).getTime();
  }
  if (parts.length === 2) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, m - 1, d).getTime();
  }
  return new Date(dateBR).getTime() || 0;
}

/**
 * Sorts sessions by date descending (most recent first).
 */
export function sortSessionsDescending(sessions: GameplayDaySession[]): GameplayDaySession[] {
  return [...sessions].sort((a, b) => parseDateBRToTimestamp(b.data) - parseDateBRToTimestamp(a.data));
}
