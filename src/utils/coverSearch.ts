import { isIgdbConfigured, searchIgdbCovers } from './igdbService';

export interface CoverSearchResult {
  id: string;
  title: string;
  url: string;
  source: string;
}

/**
 * Normalizes input: if user inputs an IGDB image hash (e.g. co3i89 or co2kqq),
 * convert it to full high-res IGDB URL.
 */
export function normalizeCoverUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If it's an IGDB image ID (e.g. "co3i89", "co1x77")
  if (/^co[0-9a-z]{3,7}$/i.test(trimmed)) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${trimmed}.jpg`;
  }

  // If user pasted IGDB URL with low resolution (e.g. t_thumb or t_cover_small)
  if (trimmed.includes('images.igdb.com/igdb/image/upload/')) {
    return trimmed.replace(/\/t_[a-z0-9_]+\//, '/t_cover_big_2x/');
  }

  return trimmed;
}

/**
 * Searches covers: Uses official IGDB API if credentials are provided,
 * otherwise falls back to Wikipedia Gaming Box Art.
 */
export async function searchGameCovers(gameTitle: string): Promise<CoverSearchResult[]> {
  const clean = gameTitle.trim();
  if (!clean || clean.length < 2) return [];

  // 1. Try official IGDB search first if API credentials are configured
  if (isIgdbConfigured()) {
    try {
      const igdbResults = await searchIgdbCovers(clean);
      if (igdbResults.length > 0) {
        return igdbResults;
      }
    } catch (err) {
      console.warn('IGDB search fallback to Wikipedia:', err);
    }
  }

  // 2. Wikipedia Box Art fallback
  const results: CoverSearchResult[] = [];

  try {
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=' +
      encodeURIComponent(clean + ' video game') +
      '&gsrlimit=8&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&pilicense=any';

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as any[];

    for (const p of pages) {
      const img = p.original?.source || p.thumbnail?.source;
      if (
        img &&
        !img.toLowerCase().includes('logo') &&
        !img.toLowerCase().includes('commons-logo') &&
        !img.toLowerCase().includes('crystal_clear') &&
        !img.toLowerCase().includes('svg')
      ) {
        const cleanTitle = p.title.replace(/ \(video game\)/i, '').replace(/ \(franchise\)/i, '');
        results.push({
          id: String(p.pageid),
          title: cleanTitle,
          url: img,
          source: 'Box Art Oficial',
        });
      }
    }

    // Sort: exact matches or contains query first
    const lowerQuery = clean.toLowerCase();
    results.sort((a, b) => {
      const aLower = a.title.toLowerCase();
      const bLower = b.title.toLowerCase();
      const aExact = aLower === lowerQuery ? 3 : aLower.startsWith(lowerQuery) ? 2 : aLower.includes(lowerQuery) ? 1 : 0;
      const bExact = bLower === lowerQuery ? 3 : bLower.startsWith(lowerQuery) ? 2 : bLower.includes(lowerQuery) ? 1 : 0;
      return bExact - aExact;
    });
  } catch (err) {
    console.warn('Cover search error:', err);
  }

  return results;
}
