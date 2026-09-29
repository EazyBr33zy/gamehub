import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, AppConfig } from '../types';
import {
  RemoteDoc,
  SyncSettings,
  fetchRemote,
  friendlyError,
  loadSyncSettings,
  pushRemote,
  saveSyncSettings,
} from '../utils/sync';
import { downloadBackupFile, normalizeGames } from '../utils/storage';

export type SyncStatus = 'off' | 'checking' | 'syncing' | 'ok' | 'error' | 'conflict';

interface Options {
  /** true depois que os dados locais foram carregados */
  ready: boolean;
  /** sempre devolve os dados mais recentes da tela */
  getLatest: () => { games: Game[]; config: AppConfig };
  /** substitui os dados locais pelos do servidor (sem reenviar) */
  applyRemote: (games: Game[], config?: Partial<AppConfig>) => void;
}

const DEBOUNCE_MS = 1500;

export function useServerSync({ ready, getLatest, applyRemote }: Options) {
  const [settings, setSettings] = useState<SyncSettings | null>(() => loadSyncSettings());
  const [status, setStatus] = useState<SyncStatus>(() => (loadSyncSettings() ? 'checking' : 'off'));
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState<RemoteDoc | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const settingsRef = useRef<SyncSettings | null>(settings);
  const conflictRef = useRef<RemoteDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushing = useRef(false);
  const changeCounter = useRef(0);
  const getLatestRef = useRef(getLatest);
  const applyRef = useRef(applyRemote);
  getLatestRef.current = getLatest;
  applyRef.current = applyRemote;
  conflictRef.current = conflict;

  const persist = useCallback((patch: Partial<SyncSettings> | null) => {
    if (patch === null) {
      settingsRef.current = null;
      setSettings(null);
      saveSyncSettings(null);
      return;
    }
    if (!settingsRef.current) return;
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSyncSettings(next);
  }, []);

  const openConflictWith = useCallback((doc: RemoteDoc) => {
    conflictRef.current = doc;
    setConflict(doc);
    setConflictOpen(true);
    setStatus('conflict');
    setMessage('Os dados do servidor são diferentes dos deste aparelho.');
  }, []);

  /** Envia os dados deste aparelho para o servidor */
  const doPush = useCallback(
    async (opts: { force?: boolean; baseRevision?: number } = {}) => {
      const s = settingsRef.current;
      if (!s || pushing.current) return;
      pushing.current = true;
      setStatus('syncing');
      const startCounter = changeCounter.current;
      try {
        const latest = getLatestRef.current();
        const res = await pushRemote(s.url, s.key, {
          games: latest.games,
          config: latest.config,
          baseRevision: opts.baseRevision ?? s.revision,
          force: opts.force,
        });
        if ('conflict' in res) {
          openConflictWith(res.server);
          return;
        }
        const changedMeanwhile = changeCounter.current !== startCounter;
        persist({ revision: res.revision, dirty: changedMeanwhile, lastSyncAt: new Date().toISOString() });
        setStatus('ok');
        setMessage('');
        if (changedMeanwhile) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => doPush(), DEBOUNCE_MS);
        }
      } catch (e) {
        setStatus('error');
        setMessage(friendlyError(e));
      } finally {
        pushing.current = false;
      }
    },
    [persist, openConflictWith]
  );

  /** Compara este aparelho com o servidor e decide o que fazer */
  const reconcile = useCallback(async () => {
    const s = settingsRef.current;
    if (!s) return;
    setStatus('checking');
    try {
      const remote = await fetchRemote(s.url, s.key);
      if (!remote.exists) {
        await doPush({ baseRevision: 0 });
      } else if (remote.revision === s.revision) {
        if (s.dirty) await doPush();
        else {
          persist({ lastSyncAt: new Date().toISOString() });
          setStatus('ok');
          setMessage('');
        }
      } else if (!s.dirty && s.revision > 0) {
        // o servidor tem novidades e este aparelho não mudou nada: só atualiza
        applyRef.current(normalizeGames(remote.games || []), remote.config as Partial<AppConfig>);
        persist({ revision: remote.revision, dirty: false, lastSyncAt: new Date().toISOString() });
        setStatus('ok');
        setMessage('');
      } else {
        openConflictWith(remote);
      }
    } catch (e) {
      setStatus('error');
      setMessage(friendlyError(e));
    }
  }, [doPush, persist, openConflictWith]);

  // Ao abrir o site: confere com o servidor
  const startedRef = useRef(false);
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    if (settingsRef.current) reconcile();
  }, [ready, reconcile]);

  // Tenta de novo quando a internet volta e a cada minuto se ficou pendente
  useEffect(() => {
    const retry = () => {
      if (settingsRef.current?.dirty && !conflictRef.current) doPush();
    };
    window.addEventListener('online', retry);
    const id = setInterval(retry, 60000);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(id);
    };
  }, [doPush]);

  /** Chamar toda vez que o usuário mudar algo */
  const notifyChange = useCallback(() => {
    if (!settingsRef.current) return;
    changeCounter.current++;
    persist({ dirty: true });
    // Em conflito, as alterações ficam guardadas neste aparelho até o usuário decidir
    if (conflictRef.current) return;
    setStatus('syncing');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doPush(), DEBOUNCE_MS);
  }, [doPush, persist]);

  const enable = useCallback(
    async (url: string, key: string): Promise<{ ok: boolean; message?: string }> => {
      try {
        await fetchRemote(url, key); // testa endereço e senha
      } catch (e) {
        return { ok: false, message: friendlyError(e) };
      }
      const s: SyncSettings = { url, key, revision: 0, dirty: true };
      settingsRef.current = s;
      setSettings(s);
      saveSyncSettings(s);
      await reconcile();
      return { ok: true };
    },
    [reconcile]
  );

  const disable = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    persist(null);
    conflictRef.current = null;
    setStatus('off');
    setMessage('');
    setConflict(null);
    setConflictOpen(false);
  }, [persist]);

  const syncNow = useCallback(() => reconcile(), [reconcile]);

  const resolveUseServer = useCallback(() => {
    const doc = conflictRef.current;
    if (!doc) return;
    const local = getLatestRef.current();
    // Guarda uma cópia dos dados deste aparelho antes de trocar
    if (local.games.length > 0) downloadBackupFile(local.games, local.config, 'gamehub_antes_do_servidor');
    applyRef.current(normalizeGames(doc.games || []), doc.config as Partial<AppConfig>);
    persist({ revision: doc.revision, dirty: false, lastSyncAt: new Date().toISOString() });
    conflictRef.current = null;
    setConflict(null);
    setConflictOpen(false);
    setStatus('ok');
    setMessage('');
  }, [persist]);

  const resolveUseLocal = useCallback(async () => {
    const doc = conflictRef.current;
    if (!doc) return;
    setConflictOpen(false);
    conflictRef.current = null;
    setConflict(null);
    persist({ revision: doc.revision });
    await doPush({ force: true, baseRevision: doc.revision });
  }, [doPush, persist]);

  return {
    settings,
    status,
    message,
    conflict,
    conflictOpen,
    notifyChange,
    enable,
    disable,
    syncNow,
    resolveUseServer,
    resolveUseLocal,
    openConflict: () => {
      if (conflictRef.current) setConflictOpen(true);
    },
    closeConflict: () => setConflictOpen(false),
  };
}

export type SyncApi = ReturnType<typeof useServerSync>;
