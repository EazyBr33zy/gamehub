import { CoverSearchResult } from './coverSearch';

export interface IgdbConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  tokenExpiresAt?: number;
}

const STORAGE_KEY = 'gamehub_igdb_config';

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Environments without storage
  }
  return null;
}

/**
 * Retrieves stored IGDB configuration from localStorage.
 */
export function getIgdbConfig(): IgdbConfig {
  try {
    const storage = getSafeStorage();
    const raw = storage ? storage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          clientId: parsed.clientId || '',
          clientSecret: parsed.clientSecret || '',
          accessToken: parsed.accessToken || '',
          tokenExpiresAt: parsed.tokenExpiresAt || 0,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to read IGDB config from localStorage:', err);
  }
  return { clientId: '', clientSecret: '' };
}

/**
 * Saves IGDB configuration to localStorage.
 */
export function saveIgdbConfig(config: Partial<IgdbConfig>): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;
    const current = getIgdbConfig();
    const updated: IgdbConfig = {
      ...current,
      ...config,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save IGDB config to localStorage:', err);
  }
}

/**
 * Clears stored IGDB credentials completely from localStorage.
 */
export function clearIgdbConfig(): void {
  try {
    const storage = getSafeStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear IGDB config from localStorage:', err);
  }
}

/**
 * Checks if the IGDB API is configured with valid credentials.
 */
export function isIgdbConfigured(): boolean {
  const config = getIgdbConfig();
  return Boolean(config.clientId.trim() && (config.clientSecret.trim() || config.accessToken?.trim()));
}

/**
 * Obtains a valid Twitch OAuth Access Token (client_credentials).
 * Automatically refreshes if expired.
 */
export async function getValidTwitchToken(config = getIgdbConfig()): Promise<string | null> {
  // If a manual or cached token is still valid (with 60s buffer)
  if (config.accessToken && config.tokenExpiresAt && config.tokenExpiresAt > Date.now() + 60000) {
    return config.accessToken;
  }

  // If we have manual token without expiration, use it directly
  if (config.accessToken && !config.clientSecret) {
    return config.accessToken;
  }

  if (!config.clientId || !config.clientSecret) {
    return null;
  }

  const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
    config.clientId.trim()
  )}&client_secret=${encodeURIComponent(config.clientSecret.trim())}&grant_type=client_credentials`;

  try {
    const res = await fetch(tokenUrl, { method: 'POST' });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Twitch OAuth token request failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      const expiresAt = Date.now() + expiresInSec * 1000;

      saveIgdbConfig({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        accessToken: data.access_token,
        tokenExpiresAt: expiresAt,
      });

      return data.access_token;
    }
  } catch (err) {
    console.error('Network error requesting Twitch OAuth token:', err);
  }

  return null;
}

/**
 * Sends a query to the IGDB games endpoint with CORS proxy fallback if necessary.
 */
async function queryIgdbEndpoint(bodyText: string, clientId: string, token: string): Promise<any[] | null> {
  const endpoint = 'https://api.igdb.com/v4/games';

  // 1. Try direct fetch first
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Client-ID': clientId.trim(),
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'text/plain',
      },
      body: bodyText,
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Direct call blocked by CORS or network, proceed to proxy
  }

  // 2. Fallback to corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`;
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Client-ID': clientId.trim(),
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'text/plain',
      },
      body: bodyText,
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Proxy IGDB query failed:', err);
  }

  return null;
}

/**
 * Searches for game covers on IGDB using official API credentials.
 */
export async function searchIgdbCovers(gameTitle: string): Promise<CoverSearchResult[]> {
  const clean = gameTitle.trim();
  if (!clean || clean.length < 2) return [];

  const config = getIgdbConfig();
  if (!config.clientId) return [];

  const token = await getValidTwitchToken(config);
  if (!token) return [];

  // Query: Search for game and retrieve cover image_id
  const safeTitle = clean.replace(/["\\]/g, '');
  const igdbQuery = `fields id, name, cover.image_id, cover.url, first_release_date; search "${safeTitle}"; where cover != null; limit 10;`;

  const data = await queryIgdbEndpoint(igdbQuery, config.clientId, token);
  if (!data || !Array.isArray(data)) return [];

  const results: CoverSearchResult[] = [];

  for (const item of data) {
    const imageId = item.cover?.image_id;
    if (imageId) {
      // Official high-res 2x vertical cover URL
      const fullCoverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
      results.push({
        id: `igdb_${item.id}`,
        title: item.name,
        url: fullCoverUrl,
        source: 'IGDB Oficial',
      });
    }
  }

  return results;
}

/**
 * Validates credentials by requesting a token and running a fast test query.
 */
export async function testIgdbConnection(
  clientId: string,
  clientSecret: string,
  manualToken?: string
): Promise<{ success: boolean; message: string }> {
  const cId = clientId.trim();
  const cSec = clientSecret.trim();
  const mTok = manualToken?.trim();

  if (!cId) {
    return { success: false, message: 'Por favor, informe o Client ID da sua aplicação Twitch/IGDB.' };
  }

  let tokenToUse = mTok;

  if (!tokenToUse) {
    if (!cSec) {
      return { success: false, message: 'Informe o Client Secret ou um Token de Acesso válido.' };
    }

    try {
      const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
        cId
      )}&client_secret=${encodeURIComponent(cSec)}&grant_type=client_credentials`;
      const res = await fetch(tokenUrl, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Falha na autenticação da Twitch (${res.status}): ${text}` };
      }
      const data = await res.json();
      tokenToUse = data.access_token;
    } catch (e: any) {
      return { success: false, message: `Erro ao conectar com a Twitch: ${e.message || 'Falha de rede'}` };
    }
  }

  if (!tokenToUse) {
    return { success: false, message: 'Não foi possível gerar o token de acesso.' };
  }

  // Test query
  try {
    const testQuery = 'fields id, name, cover.image_id; search "Super Mario"; limit 1;';
    const result = await queryIgdbEndpoint(testQuery, cId, tokenToUse);
    if (result && Array.isArray(result) && result.length > 0) {
      // Save credentials if test passed
      saveIgdbConfig({
        clientId: cId,
        clientSecret: cSec,
        accessToken: tokenToUse,
        tokenExpiresAt: Date.now() + 3600 * 1000,
      });
      return { success: true, message: `Conexão bem-sucedida! Encontrado jogo no IGDB: "${result[0].name}".` };
    }
    return { success: false, message: 'Token aceito, mas a consulta ao IGDB não retornou dados.' };
  } catch (e: any) {
    return { success: false, message: `Erro ao consultar API do IGDB: ${e.message || 'Falha de rede'}` };
  }
}
