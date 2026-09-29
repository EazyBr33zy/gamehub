import { Game, AppConfig } from '../types';

const STORAGE_KEY_SYNC = 'gamehub_sync_v1';

export interface SyncSettings {
  url: string;
  key: string;
  revision: number; // última versão do servidor que este aparelho conhece
  dirty: boolean; // há alterações neste aparelho que ainda não foram para o servidor
  lastSyncAt?: string;
}

export function loadSyncSettings(): SyncSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNC);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.url === 'string' && typeof s.key === 'string') {
      return { url: s.url, key: s.key, revision: Number(s.revision) || 0, dirty: !!s.dirty, lastSyncAt: s.lastSyncAt };
    }
  } catch {
    /* ignora */
  }
  return null;
}

export function saveSyncSettings(s: SyncSettings | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY_SYNC, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY_SYNC);
  } catch {
    /* ignora */
  }
}

/** Endereço padrão do script no mesmo site (funciona na raiz ou em subpasta) */
export function defaultEndpoint(): string {
  try {
    return new URL('./api/gamehub.php', window.location.href).toString();
  } catch {
    return './api/gamehub.php';
  }
}

export interface RemoteDoc {
  exists: boolean;
  revision: number;
  updatedAt?: string;
  games?: Game[];
  config?: Partial<AppConfig> | unknown[];
}

export type SyncErrorKind = 'network' | 'notfound' | 'not_configured' | 'unauthorized' | 'server';

export class SyncError extends Error {
  kind: SyncErrorKind;
  constructor(kind: SyncErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function friendlyError(e: unknown): string {
  if (e instanceof SyncError) {
    switch (e.kind) {
      case 'network':
        return 'Não consegui falar com o servidor. Confira a internet e tente de novo.';
      case 'notfound':
        return "Não encontrei o arquivo api/gamehub.php. Confirme que a pasta 'api' foi enviada junto com o site e que você está no site publicado (não no localhost).";
      case 'not_configured':
        return 'O servidor ainda está sem senha. Crie o arquivo gamehub-config.php (passo 2).';
      case 'unauthorized':
        return 'Senha incorreta. Confira se é igual à do arquivo gamehub-config.php.';
      default:
        return e.message || 'O servidor devolveu um erro.';
    }
  }
  return 'Erro inesperado ao falar com o servidor.';
}

async function call(
  url: string,
  key: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<{ status: number; data: any }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'X-GameHub-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctrl.signal,
    });
  } catch {
    throw new SyncError('network', 'sem conexão');
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Não veio JSON: o arquivo PHP não existe (o site devolveu a página inicial) ou o PHP quebrou
    throw new SyncError(res.status === 404 || res.ok ? 'notfound' : 'server', 'resposta inválida');
  }
  if (res.status === 401) throw new SyncError('unauthorized', data?.message || 'senha incorreta');
  if (res.status === 503) throw new SyncError('not_configured', data?.message || 'sem configuração');
  return { status: res.status, data };
}

export async function fetchRemote(url: string, key: string): Promise<RemoteDoc> {
  const { status, data } = await call(url, key, 'GET');
  if (status !== 200) throw new SyncError('server', data?.message || `erro ${status}`);
  return {
    exists: !!data.exists,
    revision: Number(data.revision) || 0,
    updatedAt: data.updatedAt,
    games: Array.isArray(data.games) ? data.games : undefined,
    config: data.config,
  };
}

export type PushResult =
  | { ok: true; revision: number; updatedAt: string }
  | { conflict: true; server: RemoteDoc };

export async function pushRemote(
  url: string,
  key: string,
  payload: { games: Game[]; config: AppConfig; baseRevision: number; force?: boolean }
): Promise<PushResult> {
  const { status, data } = await call(url, key, 'POST', payload);
  if (status === 409) {
    const sv = data?.server || {};
    return {
      conflict: true,
      server: {
        exists: true,
        revision: Number(sv.revision) || 0,
        updatedAt: sv.updatedAt,
        games: Array.isArray(sv.games) ? sv.games : undefined,
        config: sv.config,
      },
    };
  }
  if (status !== 200 || !data?.ok) throw new SyncError('server', data?.message || `erro ${status}`);
  return { ok: true, revision: Number(data.revision) || 0, updatedAt: data.updatedAt };
}
