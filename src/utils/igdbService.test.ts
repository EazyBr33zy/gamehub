import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getIgdbConfig, 
  saveIgdbConfig, 
  clearIgdbConfig,
  isIgdbConfigured, 
  getValidTwitchToken,
  searchIgdbCovers,
  testIgdbConnection
} from './igdbService';

describe('igdbService', () => {
  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const mockStorage = {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: string) => {
        memoryStore[key] = value;
      },
      removeItem: (key: string) => {
        delete memoryStore[key];
      },
      clear: () => {
        memoryStore = {};
      },
    };

    // Polyfill global localStorage for Vitest Node runner
    (globalThis as any).localStorage = mockStorage;
    vi.restoreAllMocks();
  });

  describe('Configuration Storage', () => {
    it('returns empty config initially', () => {
      const cfg = getIgdbConfig();
      expect(cfg.clientId).toBe('');
      expect(cfg.clientSecret).toBe('');
      expect(isIgdbConfigured()).toBe(false);
    });

    it('saves and reads IGDB credentials', () => {
      saveIgdbConfig({
        clientId: 'client_123',
        clientSecret: 'secret_456',
      });

      const cfg = getIgdbConfig();
      expect(cfg.clientId).toBe('client_123');
      expect(cfg.clientSecret).toBe('secret_456');
      expect(isIgdbConfigured()).toBe(true);
    });

    it('detects configured state with manual access token', () => {
      saveIgdbConfig({
        clientId: 'client_abc',
        accessToken: 'oauth:token_xyz',
      });

      expect(isIgdbConfigured()).toBe(true);
    });

    it('clears IGDB credentials from storage', () => {
      saveIgdbConfig({
        clientId: 'client_abc',
        clientSecret: 'secret_123',
      });
      expect(isIgdbConfigured()).toBe(true);

      clearIgdbConfig();
      expect(isIgdbConfigured()).toBe(false);
      expect(getIgdbConfig().clientId).toBe('');
    });
  });

  describe('Token Retrieval and API Search', () => {
    it('returns cached token if not expired', async () => {
      saveIgdbConfig({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        accessToken: 'valid_cached_token',
        tokenExpiresAt: Date.now() + 1000000,
      });

      const token = await getValidTwitchToken();
      expect(token).toBe('valid_cached_token');
    });

    it('fetches new token from Twitch OAuth if missing or expired', async () => {
      saveIgdbConfig({
        clientId: 'client_live',
        clientSecret: 'secret_live',
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('id.twitch.tv/oauth2/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'fresh_twitch_token_999',
              expires_in: 3600,
            }),
          } as any;
        }
        return { ok: false } as any;
      });

      const token = await getValidTwitchToken();
      expect(token).toBe('fresh_twitch_token_999');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('searches IGDB and transforms results to official 2x cover URLs', async () => {
      saveIgdbConfig({
        clientId: 'client_123',
        accessToken: 'token_123',
        tokenExpiresAt: Date.now() + 500000,
      });

      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('api.igdb.com/v4/games')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1024,
                name: 'Metroid Prime',
                cover: {
                  id: 55,
                  image_id: 'co1r7f',
                  url: '//images.igdb.com/igdb/image/upload/t_thumb/co1r7f.jpg',
                },
              },
            ],
          } as any;
        }
        return { ok: false } as any;
      });

      const results = await searchIgdbCovers('Metroid Prime');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Metroid Prime');
      expect(results[0].source).toBe('IGDB Oficial');
      expect(results[0].url).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1r7f.jpg');
    });

    it('validates test connection successfully', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('id.twitch.tv')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'token_test', expires_in: 3600 }),
          } as any;
        }
        if (String(url).includes('api.igdb.com')) {
          return {
            ok: true,
            json: async () => [{ id: 1, name: 'Super Mario Bros.' }],
          } as any;
        }
        return { ok: false } as any;
      });

      const res = await testIgdbConnection('my_client_id', 'my_client_secret');
      expect(res.success).toBe(true);
      expect(res.message).toContain('Super Mario Bros.');
    });
  });
});
