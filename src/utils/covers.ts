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

/** Fallback sem chave: API pública de capas usada pelo Steam/SteamDB (CDN do Steam, aceita <img>) */
async function searchCoverArtApi(title: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://coverartopenapi.steamdb.app/search?term=${encodeURIComponent(title)}&appid_filterlist=steam,pc`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const results: any[] = Array.isArray(data) ? data : [];
    const nt = norm(title);
    // Preferência por correspondência exata de nome
    const exact = results.find((x) => norm(x?.name || '') === nt && x?.games?.[0]?.img);
    const pick = exact || results.find((x) => x?.games?.[0]?.img);
    const url: string | undefined = pick?.games?.[0]?.img;
    if (!url) return null;
    return `${url}?format=jpg&quality=80&width=400`;
  } catch {
    return null;
  }
}

/** Último recurso: procura a primeira URL de imagem embutida na página de imagens do DuckDuckGo */
async function searchCoverDuckDuckGo(title: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(title + ' game cover art boxart')}&t=h_&iar=images&iax=images&ia=images`
    );
    if (!r.ok) return null;
    const text = await r.text();
    const m = text.match(/"image":"(https:[^"]+?)"/);
    if (!m) return null;
    return m[1].replace(/\\\//g, '/');
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
      url =
        (await searchCoverRawg(title)) ||
        (await searchCoverArtApi(title)) ||
        (await searchCoverDuckDuckGo(title));
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
