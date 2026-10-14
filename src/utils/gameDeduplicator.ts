import { GameItem } from '../types/game';
import { normalizeTitleKey } from './markdownParser';

/**
 * Normalizes console/platform names to prevent duplicates from casing,
 * typos (e.g. 'Advanced' vs 'Advance'), or alternative abbreviations (e.g. 'PS5' vs 'PlayStation 5').
 */
export function normalizeConsoleName(raw: string | undefined | null): string {
  const c = String(raw || '').trim();
  if (!c) return 'Outros';

  const lower = c.toLowerCase();

  // PlayStation families
  if (lower === 'ps5' || lower === 'playstation 5' || lower === 'playstation5') return 'PlayStation 5';
  if (lower === 'ps4' || lower === 'playstation 4' || lower === 'playstation4') return 'PlayStation 4';
  if (lower === 'ps3' || lower === 'playstation 3' || lower === 'playstation3') return 'PlayStation 3';
  if (lower === 'ps2' || lower === 'playstation 2' || lower === 'playstation2') return 'PlayStation 2';
  if (lower === 'ps1' || lower === 'psx' || lower === 'playstation' || lower === 'playstation 1' || lower === 'psone') return 'PlayStation';

  // Arcade / CPS
  if (lower === 'arcade' || lower.includes('cps') || lower.includes('mame') || lower.includes('fba') || lower.includes('retro / cps2')) {
    return 'Arcade';
  }

  // PC Engine / TurboGrafx-16 (Must be before PC / Steam)
  if (
    lower.includes('pc engine') ||
    lower.includes('pc-engine') ||
    lower === 'pcengine' ||
    lower.includes('turbografx') ||
    lower === 'tg-16' ||
    lower === 'tg16' ||
    lower.includes('turbo grafx')
  ) {
    return 'PC Engine';
  }

  // PC / Steam
  if (lower === 'pc' || lower === 'steam' || lower === 'pc / steam' || lower === 'windows') return 'PC / Steam';

  // Game Boy families
  if (lower === 'game boy advanced' || lower === 'gba' || lower === 'game boy advance') return 'Game Boy Advance';
  if (lower === 'game boy color' || lower === 'gbc') return 'Game Boy Color';
  if (lower === 'game boy' || lower === 'gb') return 'Game Boy';
  if (lower === 'game gear' || lower === 'gg') return 'Game Gear';

  // Nintendo consoles & handhelds
  if (lower === 'snes' || lower === 'super nintendo') return 'SNES';
  if (lower === 'nes' || lower === 'nintendo entertainment system') return 'NES';
  if (lower === 'n64' || lower === 'nintendo 64') return 'Nintendo 64';
  if (lower === 'nintendo switch' || lower === 'switch') return 'Nintendo Switch';
  if (lower === 'switch / pc') return 'Switch / PC';
  if (lower === 'nintendo ds' || lower === 'nds' || lower === 'ds') return 'Nintendo DS';
  if (lower === 'nintendo 3ds' || lower === '3ds') return 'Nintendo 3DS';

  // Sega
  if (lower === 'mega drive' || lower === 'genesis' || lower === 'sega genesis') return 'Mega Drive';
  if (lower === 'master system') return 'Master System';
  if (lower === 'sega saturn' || lower === 'saturn') return 'Sega Saturn';
  if (lower === 'dreamcast') return 'Dreamcast';

  // Other retro & modern
  if (lower === 'amiga cd32' || lower === 'amigacd32' || lower === 'cd32') return 'Amiga CD32';
  if (lower === 'neo geo' || lower === 'neogeo' || lower === 'mvs' || lower === 'aes') return 'Neo Geo';
  if (lower === 'steam deck' || lower === 'deck') return 'Steam Deck';
  if (lower === 'android' || lower === 'mobile') return 'Android';

  // Return standard capitalized/trimmed version
  return c;
}

export interface DeduplicationReport {
  totalBefore: number;
  duplicatesRemoved: number;
  totalAfter: number;
  duplicateDetails: Array<{
    title: string;
    console: string;
    removedId: string;
    keptId: string;
  }>;
}

/**
 * Deduplicates games so that no game appears more than once IN THE SAME CONSOLE.
 * If the same game title exists in different consoles (e.g. PS2 vs PC), both are preserved.
 */
export function deduplicateGames(games: GameItem[]): {
  dedupedGames: GameItem[];
  report: DeduplicationReport;
} {
  const totalBefore = games.length;
  const gameMap = new Map<string, GameItem>();
  const duplicateDetails: DeduplicationReport['duplicateDetails'] = [];

  games.forEach((game) => {
    const canonicalConsole = normalizeConsoleName(game.console);
    const normalizedTitle = normalizeTitleKey(game.title);
    const key = `${canonicalConsole.toLowerCase()}:::${normalizedTitle}`;

    // Update game with canonical console
    const normalizedGame: GameItem = {
      ...game,
      console: canonicalConsole,
    };

    if (!gameMap.has(key)) {
      gameMap.set(key, normalizedGame);
    } else {
      const existing = gameMap.get(key)!;
      // Prefer the game that has status 'zerado', or higher review/playtime
      const shouldReplace = 
        (normalizedGame.status === 'zerado' && existing.status !== 'zerado') ||
        (normalizedGame.nota && !existing.nota) ||
        (normalizedGame.bossLadder && !existing.bossLadder);

      duplicateDetails.push({
        title: game.title,
        console: canonicalConsole,
        removedId: shouldReplace ? existing.id : game.id,
        keptId: shouldReplace ? game.id : existing.id,
      });

      if (shouldReplace) {
        gameMap.set(key, {
          ...existing,
          ...normalizedGame,
          // Retain any fields from existing that might be useful
          bossLadder: normalizedGame.bossLadder || existing.bossLadder,
        });
      } else {
        // Merge any richer data
        gameMap.set(key, {
          ...normalizedGame,
          ...existing,
          bossLadder: existing.bossLadder || normalizedGame.bossLadder,
        });
      }
    }
  });

  const dedupedGames = Array.from(gameMap.values());
  const duplicatesRemoved = totalBefore - dedupedGames.length;

  return {
    dedupedGames,
    report: {
      totalBefore,
      duplicatesRemoved,
      totalAfter: dedupedGames.length,
      duplicateDetails,
    },
  };
}
