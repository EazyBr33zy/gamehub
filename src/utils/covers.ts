// Busca automática de capas (cover art) para jogos importados sem imagem.
// Fontes: RAWG (com chave em .env / localStorage) e fallback no cover-art.atlassian.net
// (usado pelo SteamDB/IGDB — funciona sem chave).

declare const __APP_ENV__: Record<string, string | undefined>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Remove sufixos do tipo "(PS5)", "(2018)", "[Remastered]" para melhorar a busca */
export function cleanGameTitle(nome: string): string {
  return nome
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\b(digital deluxe|game of the year|goty|complete|ultimate|definitive|remake|remaster(ed)?|deluxe|standard|legendary)\b.*$/i, '')
    .replace(/[!?.,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRawgKey(): string | null {
  try {
    const env = typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__ : undefined;
    return localStorage.getItem('gamehub_rawg_key') || env?.VITE_RAWG_API_KEY || null;
  } catch {
    return null;
  }
}

async function searchCoverRawg(title: string): Promise<string | null> {
  const key = getRawgKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(title)}&page_size=5`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const results: { name?: string; background_image?: string }[] = data.results || [];
    // Melhor correspondência de nome, senão o primeiro com imagem
    const nt = norm(title);
    const exact = results.find((x) => norm(x.name || '') === nt && x.background_image);
    const pick = exact || results.find((x) => x.background_image);
    return pick?.background_image || null;
  } catch {
    return null;
  }
}

async function searchCoverArtApi(title: string): Promise<string | null> {
  try {
    const r = await fetch(`https://coverartopenapi.steamdb.app/search?term=${encodeURIComponent(title)}`);
    if (!r.ok) return null;
    const data = await r.json();
    const first = Array.isArray(data) ? data[0] : null;
    const url: string | undefined = first?.games?.[0]?.img;
    if (!url) return null;
    return `${url}?format=jpg&quality=80&width=300`;
  } catch {
    return null;
  }
}

/**
 * Preenche capas automaticamente nos jogos sem `capa`.
 * Retorna quantos jogos receberam capa. Não grava nada — quem salva é o chamador.
 */
export async function fillMissingCovers(
  games: GameLike[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const missing = games.filter((g) => !g.capa);
  let filled = 0;
  let done = 0;
  for (const g of missing) {
    const title = cleanGameTitle(g.nome);
    let url: string | null = null;
    if (title.length >= 2) {
      url = (await searchCoverRawg(title)) || (await searchCoverArtApi(title));
    }
    if (url) {
      g.capa = url;
      filled++;
    }
    done++;
    onProgress?.(done, missing.length);
  }
  return filled;
}

interface GameLike {
  nome: string;
  capa?: string;
}
