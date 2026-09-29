import { Game, AppConfig, PlaySession } from '../types';
import { DEFAULT_GAMES } from '../data/defaultGames';

const STORAGE_KEY_GAMES = 'gamehub_games_v2';
const STORAGE_KEY_CONFIG = 'gamehub_config_v2';

export function loadGamesFromStorage(): Game[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAMES);
    if (!raw) {
      // Check legacy key if any
      const legacy = localStorage.getItem('bk');
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          return normalizeGames(parsedLegacy);
        }
      }
      return DEFAULT_GAMES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? normalizeGames(parsed) : DEFAULT_GAMES;
  } catch (err) {
    console.warn('Erro ao carregar jogos do localStorage:', err);
    return DEFAULT_GAMES;
  }
}

export function saveGamesToStorage(games: Game[]): boolean {
  try {
    const json = JSON.stringify(games);
    localStorage.setItem(STORAGE_KEY_GAMES, json);
    // Confere se o navegador realmente guardou (lê de volta e compara)
    return localStorage.getItem(STORAGE_KEY_GAMES) === json;
  } catch (err) {
    console.error('Falha ao salvar no localStorage (limite atingido?):', err);
    return false;
  }
}

export function loadConfigFromStorage(): AppConfig {
  const currentYear = new Date().getFullYear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
    const legacyMeta = localStorage.getItem('bkm');
    return {
      metaAnual: legacyMeta ? parseInt(legacyMeta, 10) || 24 : 24,
      userName: 'Gamer',
      anoSelecionado: currentYear,
    };
  } catch {
    return {
      metaAnual: 24,
      userName: 'Gamer',
      anoSelecionado: currentYear,
    };
  }
}

export function saveConfigToStorage(config: AppConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao salvar configuração:', err);
  }
}

export function normalizeGames(rawList: any[]): Game[] {
  return rawList.map((g) => ({
    id: g.id || `game-${Math.random().toString(36).substring(2, 9)}`,
    nome: g.nome || 'Jogo sem nome',
    console: g.console || 'Geral',
    genero: g.genero || 'Aventura',
    ano: g.ano || '',
    capa: g.capa || '',
    status: (['backlog', 'jogando', 'pausado', 'zerado', 'abandonado'].includes(g.status)
      ? g.status
      : 'backlog') as Game['status'],
    tempo: typeof g.tempo === 'number' ? g.tempo : 0,
    est: typeof g.est === 'number' ? g.est : 0,
    inicio: g.inicio || '',
    fim: g.fim || '',
    nota: typeof g.nota === 'number' ? g.nota : null,
    favorito: !!g.favorito,
    notasPessoais: g.notasPessoais || '',
    dificuldade: g.dificuldade || '',
    sessoes: normalizeSessions(g.sessoes),
    got: g.got && typeof g.got === 'object' ? g.got : undefined,
  }));
}

function normalizeSessions(raw: any): PlaySession[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.data === 'string' && typeof s.inicio === 'string' && typeof s.fim === 'string')
    .map((s, i) => ({
      id: s.id || `s-${i}-${Math.random().toString(36).slice(2, 7)}`,
      data: s.data,
      inicio: s.inicio,
      fim: s.fim,
      minutos: typeof s.minutos === 'number' ? s.minutos : sessionMinutes(s.inicio, s.fim),
    }));
}

/**
 * Minutos entre a hora de início e a de fim (HH:MM).
 * Se o fim for menor que o início, entende que passou da meia-noite.
 */
export function sessionMinutes(inicio: string, fim: string): number {
  const toMin = (t: string) => {
    const [h, m] = (t || '').split(':').map((n) => parseInt(n, 10));
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
  };
  const a = toMin(inicio);
  const b = toMin(fim);
  if (Number.isNaN(a) || Number.isNaN(b) || a === b) return 0;
  return (b - a + 1440) % 1440;
}

/**
 * Redimensiona e comprime uma imagem do cliente para no máximo 300x400
 * para não sobrecarregar o limite de 5MB do localStorage.
 */
export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 320;
        const maxHeight = 420;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Formata minutos em string amigável: "34h 20m" ou "45m"
 */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(m / 60);
  const remainingMinutes = m % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
}

/**
 * Formata data no formato brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}


/* ------------------------------ Backup ------------------------------ */

const STORAGE_KEY_LAST_BACKUP = 'gamehub_last_backup_v1';

export function markBackupDone() {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_BACKUP, new Date().toISOString());
  } catch {
    /* sem problema */
  }
}

/** Data (ISO) do último backup baixado, ou null se nunca fez */
export function getLastBackup(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_BACKUP);
  } catch {
    return null;
  }
}

/** Baixa um arquivo .json com todos os jogos e a meta */
export function downloadBackupFile(games: Game[], config: AppConfig, prefix = 'gamehub_backup') {
  const payload = {
    versao: '2.0',
    dataExportacao: new Date().toISOString(),
    meta: config.metaAnual,
    jogos: games,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
