export interface PlatformStyle {
  col: string;
  ico: string;
  color?: string;
  icon?: string;
  name: string;
}

function resolvePlatform(consoleName: string | undefined | null): { col: string; ico: string; name: string } {
  const c = String(consoleName || '').toLowerCase().trim();
  if (c.includes('amiga') || c.includes('cd32')) {
    return { col: '#eab308', ico: '🟡', name: consoleName || 'Amiga CD32' };
  }
  if (c.includes('arcade') || c.includes('mame') || c.includes('cps') || c.includes('fba')) {
    return { col: '#ff6b35', ico: '🕹️', name: 'Arcade' };
  }
  if (c.includes('dreamcast')) {
    return { col: '#00bcd4', ico: '🌊', name: 'Dreamcast' };
  }
  if (c.includes('game boy color') || c.includes('gbc')) {
    return { col: '#eab308', ico: '🎨', name: 'Game Boy Color' };
  }
  if (c.includes('game boy advance') || c.includes('gba')) {
    return { col: '#22c55e', ico: '🔋', name: 'Game Boy Advance' };
  }
  if (c.includes('game gear') || c === 'gg') {
    return { col: '#22c55e', ico: '🔋', name: 'Game Gear' };
  }
  if (c.includes('game boy') || c === 'gb') {
    return { col: '#06b6d4', ico: '🎮', name: 'Game Boy' };
  }
  if (c.includes('steam deck') || c.includes('deck')) {
    return { col: '#1a9fff', ico: '🎮', name: 'Steam Deck' };
  }
  if (c.includes('mega drive') || c.includes('genesis')) {
    return { col: '#3b82f6', ico: '⚡', name: 'Mega Drive' };
  }
  if (c.includes('master system')) {
    return { col: '#3b82f6', ico: '🕹️', name: 'Master System' };
  }
  if (c.includes('saturn')) {
    return { col: '#a855f7', ico: '🪐', name: 'Sega Saturn' };
  }
  if (c.includes('n64') || c.includes('nintendo 64')) {
    return { col: '#eab308', ico: '🕹️', name: 'Nintendo 64' };
  }
  if (c.includes('ps5') || c.includes('playstation 5')) {
    return { col: '#8EB4E3', ico: '⬛', name: 'PlayStation 5' };
  }
  if (c.includes('ps4') || c.includes('playstation 4')) {
    return { col: '#003791', ico: '🟦', name: 'PlayStation 4' };
  }
  if (c.includes('ps3') || c.includes('playstation 3')) {
    return { col: '#FF0000', ico: '🟥', name: 'PlayStation 3' };
  }
  if (c.includes('ps2') || c.includes('playstation 2')) {
    return { col: '#2E6DB4', ico: '🟦', name: 'PlayStation 2' };
  }
  if (c.includes('ps1') || c.includes('psx') || c.includes('playstation')) {
    return { col: '#AAAFB4', ico: '💿', name: 'PlayStation' };
  }
  if (c.includes('switch') || c.includes('nintendo switch')) {
    return { col: '#e60012', ico: '🟥', name: 'Nintendo Switch' };
  }
  if (c.includes('snes') || c.includes('super nintendo')) {
    return { col: '#8265A1', ico: '🟣', name: 'SNES' };
  }
  if (c.includes('3ds')) {
    return { col: '#D12228', ico: '🟥', name: 'Nintendo 3DS' };
  }
  if (c.includes('ds')) {
    return { col: '#c0392b', ico: '🟥', name: 'Nintendo DS' };
  }
  if (c.includes('nes')) {
    return { col: '#e53935', ico: '🕹️', name: 'NES' };
  }
  if (c.includes('neo geo') || c.includes('neogeo')) {
    return { col: '#eab308', ico: '🕹️', name: 'Neo Geo' };
  }
  if (
    c.includes('pc engine') ||
    c.includes('pc-engine') ||
    c === 'pcengine' ||
    c.includes('turbografx') ||
    c === 'tg16' ||
    c === 'tg-16' ||
    c.includes('turbo grafx')
  ) {
    return { col: '#ff5722', ico: '🎮', name: 'PC Engine' };
  }
  if (c.includes('pc') || c.includes('steam')) {
    return { col: '#39ff14', ico: '⌨️', name: 'PC / Steam' };
  }
  return { col: '#22d3ee', ico: '🎮', name: consoleName || 'Multi' };
}

export function getPlatformStyle(consoleName: string | undefined | null): PlatformStyle {
  const resolved = resolvePlatform(consoleName);
  return {
    ...resolved,
    color: resolved.col,
    icon: resolved.ico,
  };
}

export function getGenreIcon(genreName: string | undefined | null): string {
  const n = String(genreName || '').toLowerCase();
  if (n.includes('rpg') || n.includes('jrpg') || n.includes('crpg')) return '🐉';
  if (n.includes('tiro') || n.includes('shooter') || n.includes('fps')) return '🔫';
  if (n.includes('ação') || n.includes('action') || n.includes('mecha')) return '⚔️';
  if (n.includes('corrida') || n.includes('racing')) return '🏎️';
  if (n.includes('luta') || n.includes('fighting')) return '🥊';
  if (n.includes('plataforma') || n.includes('platform')) return '🍄';
  if (n.includes('puzzle') || n.includes('quebra') || n.includes('roguelike')) return '🧩';
  if (n.includes('estratégia') || n.includes('strategy')) return '♟️';
  if (n.includes('sobrevivência') || n.includes('survival') || n.includes('terror') || n.includes('horror')) return '👻';
  if (n.includes('esporte') || n.includes('sports')) return '⚽';
  if (n.includes('narrativ') || n.includes('visual novel')) return '📖';
  if (n.includes('metroidvania')) return '🦇';
  if (n.includes('shmup')) return '🚀';
  return '✦';
}

export function getScoreColor(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return '#64748b';
  if (score >= 9.5) return '#FFD700'; // Dourado
  if (score >= 9.0) return '#ffcc00';
  if (score >= 8.0) return '#00ff9f'; // Verde esmeralda neon
  if (score >= 6.0) return '#00f5ff'; // Ciano
  if (score >= 4.0) return '#ff7a00'; // Laranja
  return '#ff4d6d'; // Vermelho
}

export function getScoreLabel(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return 'NÃO AVALIADO';
  if (score >= 9.5) return 'OBRA-PRIMA';
  if (score >= 9.0) return 'IMPERDÍVEL';
  if (score >= 8.0) return 'EXCELENTE';
  if (score >= 7.0) return 'MUITO BOM';
  if (score >= 6.0) return 'BOM';
  if (score >= 5.0) return 'MÉDIO';
  return 'FRACO';
}
