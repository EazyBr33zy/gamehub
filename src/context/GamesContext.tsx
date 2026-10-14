import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GameItem } from '../types/game';
import { 
  parseDateParts, 
  parseTime, 
  parseToMinutes,
  formatMinutes,
  normalizeToISODate,
  normalizeTitleKey, 
  deduplicateGames, 
  normalizeConsoleName, 
  cleanTitle, 
  parseObsidianMarkdown,
  generateObsidianMarkdown,
  parseObsidianVaultFiles,
  parseMultiGameBacklog,
  extractCoverMappings,
  getUniqueZerados
} from '../utils/markdownParser';
import { db } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  writeBatch, 
  getDocs, 
  deleteField
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { showToast } from '../utils/toast';
import { stripUndefined } from '../utils/stripUndefined';
import { getCurrentCycleYear } from '../utils/cycleYear';
import { getAutoBeatenDate } from '../utils/recentBeatenGames';

export interface MigrationPreview {
  totalGames: number;
  gamesToUpdate: number;
  changesSummary: {
    fixedDates: number;
    fixedTimeMinutes: number;
    sampleChanges: { title: string; oldTime?: string; newMinutes?: number; oldDate?: string; newDate?: string }[];
  };
}

export interface GamesContextType {
  games: GameItem[];
  uniqueZerados: GameItem[];
  uniqueZeradosTitleSet: Set<string>;
  totalZerados2026: number;
  totalZeradosLifetime: number;
  currentCycleYear: number;
  getUniqueZeradosForYear: (year?: number) => GameItem[];
  availableYears: number[];

  // Mutations
  addGame: (game: Partial<GameItem>, forceCreate?: boolean) => GameItem;
  updateGame: (id: string, updates: Partial<GameItem>) => void;
  deleteGame: (id: string) => void;
  clearAllGames: () => Promise<void>;
  importDualObsidianFiles: (backlogContent: string, coversContent?: string, backlogName?: string) => Promise<{ success: boolean; count: number; matchedCovers: number; message: string }>;
  importObsidianFiles: (fileListOrGames: { name: string; content: string }[] | GameItem[]) => { count: number; titles: string[] };
  confirmAddDuplicate: (pendingGame: Partial<GameItem>) => GameItem;
  toggleBossStep: (gameId: string, bossName: string) => void;

  // Import / Export
  exportGameMarkdown: (game: GameItem) => void;
  exportAllMarkdown: () => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonString: string) => Promise<{ success: boolean; count: number; message: string }>;

  // Manual Migration
  getMigrationPreview: () => MigrationPreview;
  executeMigration: () => Promise<{ success: boolean; updatedCount: number }>;

  // Annual Goal
  annualGoal: number;
  updateAnnualGoal: (newGoal: number, year?: number) => void | Promise<void>;

  // Sync State
  isCloudSyncing: boolean;
  isServerConnected: boolean;
  serverSyncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  isInitialLoading: boolean;
}

const STORAGE_KEY = 'gamehub_sanctuary_data_v2';
const GOAL_STORAGE_KEY = 'gamehub_annual_goal_v2';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'game_' + Math.random().toString(36).substring(2, 11);
}

function cleanForFirestore(obj: any): any {
  const cleaned = { ...obj };
  delete cleaned.statusSource;
  delete cleaned.statusUnidentified;
  delete cleaned.missingFields;
  return stripUndefined(cleaned);
}

function parseGameDocSnapshot(docSnap: any): GameItem {
  const data = docSnap.data() as Partial<GameItem>;
  const gId = docSnap.id;
  
  let parsedYear = data.ano_zerado;
  if (!parsedYear && data.data_zerado) {
    const parts = parseDateParts(data.data_zerado);
    if (parts) parsedYear = parts.year;
  }

  const calcMinutes = typeof data.tempoMinutos === 'number' 
    ? data.tempoMinutos 
    : parseToMinutes(data.tempo);

  return {
    id: gId,
    title: cleanTitle(data.title || 'Jogo Sem Nome'),
    fileName: data.fileName || `${cleanTitle(data.title || 'Jogo')}.md`,
    status: data.status || 'fila',
    ano_zerado: parsedYear,
    ano_lancamento: data.ano_lancamento,
    console: data.console || 'Outros',
    genero: data.genero || 'Geral',
    nota: data.nota,
    capa: data.capa || '',
    tempo: data.tempo || formatMinutes(calcMinutes, 'colon'),
    tempoMinutos: calcMinutes,
    hltb: data.hltb,
    hltb_real: data.hltb_real,
    data_inicio: data.data_inicio,
    data_zerado: data.data_zerado,
    got_jogo: data.got_jogo,
    got_gameplay: data.got_gameplay,
    got_narrativa: data.got_narrativa,
    got_arte: data.got_arte,
    got_indie: data.got_indie,
    got_surpresa: data.got_surpresa,
    got_retro: data.got_retro,
    got_dificil: data.got_dificil,
    got_pior: data.got_pior,
    developer: data.developer,
    publisher: data.publisher,
    progressPercent: data.progressPercent,
    currentStage: data.currentStage,
    estimatedRemaining: data.estimatedRemaining,
    isArcadeRun: data.isArcadeRun,
    bossLadder: data.bossLadder,
    rubric: data.rubric,
    sessoes: data.sessoes,
    anotacoes: data.anotacoes,
    prioridade: data.prioridade,
    prioridadeEm: data.prioridadeEm,
  };
}

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export const GamesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOwner, currentUser } = useAuth();
  const currentCycleYear = getCurrentCycleYear();

  const [games, setGames] = useState<GameItem[]>(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateGames(parsed).dedupedGames;
        }
      }
    } catch (e) {
      console.warn('Could not read cached games:', e);
    }
    return [];
  });

  const [annualGoal, setAnnualGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GOAL_STORAGE_KEY);
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch (e) {
      console.warn('Could not read annual goal:', e);
    }
    return 30;
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Connectivity listener for offline/online status
  useEffect(() => {
    const handleOnline = () => {
      setServerSyncStatus('synced');
    };
    const handleOffline = () => {
      setServerSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Realtime listeners: ONLY opened after owner is confirmed
  useEffect(() => {
    if (!isOwner || !currentUser) {
      setGames([]);
      setIsInitialLoading(false);
      setIsServerConnected(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(GOAL_STORAGE_KEY);
      } catch (e) {}
      return;
    }

    setIsInitialLoading(true);
    setServerSyncStatus(navigator.onLine ? 'syncing' : 'offline');

    // 1. Single realtime onSnapshot listener for games collection
    const colRef = collection(db, 'games');
    const unsubscribeGames = onSnapshot(
      colRef,
      (snapshot) => {
        setIsInitialLoading(false);
        setIsServerConnected(true);
        setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');

        const remoteGames: GameItem[] = [];
        snapshot.forEach((docSnap) => {
          remoteGames.push(parseGameDocSnapshot(docSnap));
        });

        const deduped = deduplicateGames(remoteGames).dedupedGames;
        setGames(deduped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
        } catch (err) {
          console.warn('LocalStorage save failed:', err);
        }
      },
      (error) => {
        console.error('Firestore onSnapshot games error:', error);
        setIsInitialLoading(false);
        setServerSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'games');
      }
    );

    // 2. Single realtime onSnapshot listener for settings/site document
    const settingsDocRef = doc(db, 'settings', 'site');
    const unsubscribeSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const yearKey = String(currentCycleYear);
          const prevYearKey = String(currentCycleYear - 1);
          let savedGoal: number | undefined;

          if (data.metaPorAno && typeof data.metaPorAno[yearKey] === 'number') {
            savedGoal = data.metaPorAno[yearKey];
          } else if (data.metaPorAno && typeof data.metaPorAno[prevYearKey] === 'number') {
            // sem meta no ano novo, mostre a do ano anterior como sugestão sem gravar
            savedGoal = data.metaPorAno[prevYearKey];
          } else if (typeof data.metaZerados === 'number') {
            savedGoal = data.metaZerados;
          }

          if (savedGoal && savedGoal >= 1 && savedGoal <= 500) {
            setAnnualGoal(savedGoal);
            try {
              localStorage.setItem(GOAL_STORAGE_KEY, String(savedGoal));
            } catch (e) {
              // ignore
            }
          }
        }
      },
      (error) => {
        console.warn('Firestore settings listener error:', error);
      }
    );

    return () => {
      unsubscribeGames();
      unsubscribeSettings();
    };
  }, [isOwner, currentUser, currentCycleYear]);

  // Update annual goal with optimistic update, rollback, and error toast
  const updateAnnualGoal = useCallback(async (newGoal: number, year: number = currentCycleYear) => {
    if (newGoal < 1 || newGoal > 500) {
      showToast('A meta deve ser entre 1 e 500 jogos.', 'error');
      return;
    }
    const previousGoal = annualGoal;
    // Optimistic update
    setAnnualGoal(newGoal);
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, String(newGoal));
    } catch (e) {
      console.warn(e);
    }

    if (!isOwner) {
      showToast('Apenas o dono pode alterar a meta anual.', 'error');
      return;
    }

    try {
      const docRef = doc(db, 'settings', 'site');
      await setDoc(
        docRef,
        {
          metaZerados: newGoal,
          metaPorAno: {
            [String(year)]: newGoal,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast(`Meta anual atualizada para ${newGoal} jogos!`, 'success');
    } catch (err: any) {
      console.error('Failed to save annual goal to Firestore:', err);
      // Rollback
      setAnnualGoal(previousGoal);
      try {
        localStorage.setItem(GOAL_STORAGE_KEY, String(previousGoal));
      } catch (e) {
        // ignore
      }
      showToast('Erro ao salvar meta no servidor. Alteração revertida.', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    }
  }, [annualGoal, isOwner, currentCycleYear]);

  // Derived unique zerados calculations
  const uniqueZerados = useMemo(() => getUniqueZerados(games), [games]);
  const uniqueZeradosTitleSet = useMemo(() => new Set(uniqueZerados.map((g) => normalizeTitleKey(g.title))), [uniqueZerados]);
  const totalZerados2026 = useMemo(() => getUniqueZerados(games, currentCycleYear).length, [games, currentCycleYear]);
  const totalZeradosLifetime = useMemo(() => uniqueZerados.length, [uniqueZerados]);

  const getUniqueZeradosForYear = useCallback((year?: number) => getUniqueZerados(games, year ?? currentCycleYear), [games, currentCycleYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    games.forEach((g) => {
      if (g.status === 'zerado') {
        if (g.ano_zerado) years.add(g.ano_zerado);
        if (g.data_zerado) {
          const parts = parseDateParts(g.data_zerado);
          if (parts) years.add(parts.year);
        }
      }
    });
    years.add(currentCycleYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [games, currentCycleYear]);

  // Mutations
  const addGame = useCallback((newGame: Partial<GameItem>, forceCreate = false): GameItem => {
    const calcMinutes = typeof newGame.tempoMinutos === 'number' 
      ? newGame.tempoMinutos 
      : parseToMinutes(newGame.tempo);

    let finalDataZerado = normalizeToISODate(newGame.data_zerado);
    let finalAnoZerado = newGame.ano_zerado;
    if (newGame.status === 'zerado') {
      if (!finalDataZerado) {
        const auto = getAutoBeatenDate(newGame.sessoes);
        finalDataZerado = auto.data_zerado;
        if (!finalAnoZerado) {
          finalAnoZerado = auto.ano_zerado;
        }
      } else if (!finalAnoZerado) {
        const yr = parseInt(finalDataZerado.split('-')[0], 10);
        if (!isNaN(yr)) finalAnoZerado = yr;
      }
    }

    const fullGame: GameItem = {
      id: newGame.id || generateId(),
      title: cleanTitle(newGame.title || 'Sem Título'),
      fileName: newGame.fileName || `${cleanTitle(newGame.title || 'Sem Título')}.md`,
      status: newGame.status || 'fila',
      ano_zerado: finalAnoZerado,
      ano_lancamento: newGame.ano_lancamento,
      console: newGame.console || 'Outros',
      genero: newGame.genero || 'Geral',
      nota: newGame.nota,
      capa: newGame.capa || '',
      tempo: newGame.tempo || formatMinutes(calcMinutes, 'colon'),
      tempoMinutos: calcMinutes,
      hltb: newGame.hltb,
      hltb_real: newGame.hltb_real,
      data_inicio: newGame.data_inicio,
      data_zerado: finalDataZerado,
      got_jogo: newGame.got_jogo,
      got_gameplay: newGame.got_gameplay,
      got_narrativa: newGame.got_narrativa,
      got_arte: newGame.got_arte,
      got_indie: newGame.got_indie,
      got_surpresa: newGame.got_surpresa,
      got_retro: newGame.got_retro,
      got_dificil: newGame.got_dificil,
      got_pior: newGame.got_pior,
      developer: newGame.developer,
      publisher: newGame.publisher,
      progressPercent: newGame.progressPercent,
      currentStage: newGame.currentStage,
      estimatedRemaining: newGame.estimatedRemaining,
      isArcadeRun: newGame.isArcadeRun,
      bossLadder: newGame.bossLadder,
      rubric: newGame.rubric,
      sessoes: newGame.sessoes,
      anotacoes: newGame.anotacoes,
      prioridade: newGame.prioridade,
      prioridadeEm: newGame.prioridadeEm,
    };

    setGames((prev) => [fullGame, ...prev]);

    if (isOwner) {
      const sanitized = cleanForFirestore(fullGame);
      setDoc(doc(db, 'games', fullGame.id), sanitized).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `games/${fullGame.id}`);
      });
    }

    return fullGame;
  }, [isOwner]);

  const confirmAddDuplicate = useCallback((pendingGame: Partial<GameItem>) => {
    return addGame(pendingGame, true);
  }, [addGame]);

  const updateGame = useCallback((id: string, updates: Partial<GameItem>) => {
    let calcMinutes = updates.tempoMinutos;
    if (calcMinutes === undefined && updates.tempo !== undefined) {
      calcMinutes = parseToMinutes(updates.tempo);
    }

    const existing = games.find((g) => g.id === id);

    const cleanUpdates = {
      ...updates,
      ...(calcMinutes !== undefined ? { tempoMinutos: calcMinutes } : {}),
      ...(updates.data_zerado ? { data_zerado: normalizeToISODate(updates.data_zerado) } : {}),
    };

    const isTransitioningToZerado = updates.status === 'zerado';
    const isTransitioningFromZerado =
      updates.status && updates.status !== 'zerado' && existing?.status === 'zerado';

    if (isTransitioningToZerado) {
      if (existing?.status === 'zerado' && existing?.data_zerado) {
        // Se o jogo já estava zerado e já tem data_zerado, NÃO altere a data ao salvar outras edições
        if (cleanUpdates.data_zerado === undefined) {
          cleanUpdates.data_zerado = existing.data_zerado;
        }
        if (cleanUpdates.ano_zerado === undefined) {
          cleanUpdates.ano_zerado = existing.ano_zerado;
        }
      } else {
        // Passando a zerado sem data_zerado definida
        if (!cleanUpdates.data_zerado) {
          const auto = getAutoBeatenDate(existing?.sessoes || updates.sessoes);
          cleanUpdates.data_zerado = auto.data_zerado;
          if (!cleanUpdates.ano_zerado) {
            cleanUpdates.ano_zerado = auto.ano_zerado;
          }
        }
      }
    }

    if (cleanUpdates.data_zerado && !cleanUpdates.ano_zerado) {
      const yr = parseInt(cleanUpdates.data_zerado.split('-')[0], 10);
      if (!isNaN(yr)) {
        cleanUpdates.ano_zerado = yr;
      }
    }

    const fullUpdated: GameItem | undefined = existing ? { ...existing, ...cleanUpdates } : undefined;
    if (fullUpdated && updates.prioridade === false) {
      delete fullUpdated.prioridade;
      delete fullUpdated.prioridadeEm;
    }
    if (fullUpdated && isTransitioningFromZerado) {
      delete fullUpdated.data_zerado;
      delete fullUpdated.ano_zerado;
    }

    setGames((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const res = { ...g, ...cleanUpdates };
          if (updates.prioridade === false) {
            delete res.prioridade;
            delete res.prioridadeEm;
          }
          if (isTransitioningFromZerado) {
            delete res.data_zerado;
            delete res.ano_zerado;
          }
          return res;
        }
        return g;
      })
    );

    if (isOwner) {
      const fieldsToUpdate: Record<string, any> = cleanForFirestore({ ...cleanUpdates });
      if (updates.prioridade === false) {
        fieldsToUpdate.prioridade = deleteField();
        fieldsToUpdate.prioridadeEm = deleteField();
      }
      // Nota 11 (favorito): null em `nota` significa remover o campo nota
      // (jogo volta a "não avaliado") ao desmarcar/substituir um favorito.
      if ('nota' in updates && updates.nota === null) {
        fieldsToUpdate.nota = deleteField();
      }
      if (isTransitioningFromZerado) {
        delete fieldsToUpdate.data_zerado;
        delete fieldsToUpdate.ano_zerado;
        fieldsToUpdate.data_zerado = deleteField();
        fieldsToUpdate.ano_zerado = deleteField();
      }
      updateDoc(doc(db, 'games', id), fieldsToUpdate).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `games/${id}`);
      });
    }
  }, [games, isOwner]);

  const deleteGame = useCallback((id: string) => {
    const deletedGame = games.find((g) => g.id === id);
    if (!deletedGame) return;

    // Pure state update without side-effects in updater
    setGames((prev) => prev.filter((g) => g.id !== id));

    if (isOwner) {
      deleteDoc(doc(db, 'games', id))
        .then(() => {
          showToast(
            `"${cleanTitle(deletedGame.title)}" removido!`,
            'info',
            {
              label: 'Desfazer',
              onClick: () => {
                const sanitized = cleanForFirestore(deletedGame);
                setDoc(doc(db, 'games', deletedGame.id), sanitized).catch((err) => {
                  handleFirestoreError(err, OperationType.CREATE, `games/${deletedGame.id}`);
                });
                setGames((prev) => [deletedGame, ...prev]);
                showToast(`"${cleanTitle(deletedGame.title)}" restaurado!`, 'success');
              },
            },
            5000
          );
        })
        .catch((err) => {
          setGames((prev) => [deletedGame, ...prev]);
          handleFirestoreError(err, OperationType.DELETE, `games/${id}`);
        });
    }
  }, [games, isOwner]);

  const clearAllGames = useCallback(async () => {
    if (!isOwner) {
      showToast('Apenas o dono pode limpar o acervo.', 'error');
      return;
    }

    exportBackupJSON();
    setIsCloudSyncing(true);
    setServerSyncStatus('syncing');

    try {
      const colRef = collection(db, 'games');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }

      setGames([]);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
      showToast('Todos os jogos foram apagados do banco de dados.', 'info');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'games');
      throw err;
    } finally {
      setIsCloudSyncing(false);
      setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  }, [isOwner]);

  const toggleBossStep = useCallback((gameId: string, bossName: string) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId || !g.bossLadder) return g;
        const nextLadder = g.bossLadder.map((step) => {
          if (step.name === bossName) {
            return { ...step, completed: !step.completed };
          }
          return step;
        });
        if (isOwner) {
          setDoc(doc(db, 'games', gameId), { bossLadder: nextLadder }, { merge: true }).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
          });
        }
        return { ...g, bossLadder: nextLadder };
      })
    );
  }, [isOwner]);

  // Export / Backup functions
  const exportGameMarkdown = useCallback((game: GameItem) => {
    if (!isOwner) {
      showToast('Apenas o dono pode exportar o arquivo Markdown.', 'error');
      return;
    }
    const content = generateObsidianMarkdown(game);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle(game.title).replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Arquivo .md de "${cleanTitle(game.title)}" baixado!`, 'success');
  }, [isOwner]);

  const exportAllMarkdown = useCallback(() => {
    if (!isOwner) {
      showToast('Apenas o dono pode exportar o acervo.', 'error');
      return;
    }
    if (games.length === 0) {
      showToast('Nenhum jogo para exportar.', 'info');
      return;
    }
    games.forEach((g) => exportGameMarkdown(g));
    showToast(`${games.length} arquivos .md exportados!`, 'success');
  }, [games, exportGameMarkdown, isOwner]);

  const exportBackupJSON = useCallback(() => {
    if (!isOwner) {
      showToast('Apenas o dono pode baixar o backup.', 'error');
      return;
    }
    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      annualGoal,
      gamesCount: games.length,
      games,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GameHub_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      localStorage.setItem('gamehub_last_backup_date', new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save last backup date:', e);
    }

    showToast('Arquivo de Backup JSON baixado com sucesso!', 'success');
  }, [games, annualGoal, isOwner]);

  const importBackupJSON = useCallback(async (jsonString: string): Promise<{ success: boolean; count: number; message: string }> => {
    if (!isOwner) {
      showToast('Apenas o dono pode importar backups.', 'error');
      return { success: false, count: 0, message: 'Permissão negada' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      const incomingGames: GameItem[] = Array.isArray(parsed) ? parsed : parsed.games || [];

      if (!incomingGames || incomingGames.length === 0) {
        return { success: false, count: 0, message: 'Nenhum jogo encontrado no arquivo de backup.' };
      }

      setIsCloudSyncing(true);
      setServerSyncStatus('syncing');

      // Accept old backups (generated before improvements, without tempoMinutos) and new ones
      const sanitizedList: GameItem[] = incomingGames.map((g) => {
        const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
        return {
          ...g,
          id: g.id || generateId(),
          title: cleanTitle(g.title || 'Jogo Sem Nome'),
          // Preserve original tempo string e.g. "0:45", or format from mins
          tempo: g.tempo !== undefined && g.tempo !== '' ? String(g.tempo) : formatMinutes(mins, 'colon'),
          tempoMinutos: mins,
          data_zerado: g.data_zerado ? (normalizeToISODate(g.data_zerado) || g.data_zerado) : undefined,
        };
      });

      for (let i = 0; i < sanitizedList.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = sanitizedList.slice(i, i + 400);
        chunk.forEach((game) => {
          const docRef = doc(db, 'games', game.id);
          batch.set(docRef, cleanForFirestore(game), { merge: true });
        });
        await batch.commit();
      }

      setGames(sanitizedList);
      showToast(`${sanitizedList.length} jogos restaurados do backup!`, 'success');
      return { success: true, count: sanitizedList.length, message: `${sanitizedList.length} jogos importados com sucesso.` };
    } catch (err: any) {
      console.error('Backup import error:', err);
      showToast('Erro ao ler arquivo de backup JSON.', 'error');
      return { success: false, count: 0, message: err?.message || 'Formato JSON inválido.' };
    } finally {
      setIsCloudSyncing(false);
      setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  }, [isOwner]);

  const importDualObsidianFiles = useCallback(async (
    backlogContent: string,
    coversContent?: string,
    backlogName = 'backlog.md'
  ): Promise<{ success: boolean; count: number; matchedCovers: number; message: string }> => {
    if (!isOwner) {
      showToast('Apenas o dono pode importar arquivos.', 'error');
      return { success: false, count: 0, matchedCovers: 0, message: 'Permissão negada' };
    }

    try {
      const coversMap = extractCoverMappings(coversContent || '');
      const parsedGames = parseMultiGameBacklog(backlogContent, backlogName, coversMap);

      if (parsedGames.length === 0) {
        return { success: false, count: 0, matchedCovers: 0, message: 'Nenhum jogo identificado no arquivo de backlog.' };
      }

      let matchedCoversCount = 0;
      parsedGames.forEach((g) => {
        const normKey = normalizeTitleKey(g.title);
        if (coversMap.has(normKey) || (g.capa && !g.capa.includes('co3i89.jpg') && !g.capa.includes('placeholder'))) {
          matchedCoversCount++;
        }
      });

      setIsCloudSyncing(true);
      setServerSyncStatus('syncing');

      const sanitizedGames = parsedGames.map((g) => {
        const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
        return {
          ...g,
          tempoMinutos: mins,
          tempo: g.tempo || formatMinutes(mins, 'colon'),
          data_zerado: normalizeToISODate(g.data_zerado),
        };
      });

      for (let i = 0; i < sanitizedGames.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = sanitizedGames.slice(i, i + 400);
        chunk.forEach((game) => {
          const docRef = doc(db, 'games', game.id);
          batch.set(docRef, cleanForFirestore(game), { merge: true });
        });
        await batch.commit();
      }

      setGames((prev) => deduplicateGames([...sanitizedGames, ...prev]).dedupedGames);

      showToast(`${sanitizedGames.length} jogos importados (${matchedCoversCount} capas associadas)!`, 'success');
      return {
        success: true,
        count: sanitizedGames.length,
        matchedCovers: matchedCoversCount,
        message: `${sanitizedGames.length} jogos importados do Vault.`,
      };
    } catch (err: any) {
      console.error('Dual Obsidian import error:', err);
      showToast('Erro ao importar arquivos do Obsidian.', 'error');
      return { success: false, count: 0, matchedCovers: 0, message: err?.message || 'Erro no processamento.' };
    } finally {
      setIsCloudSyncing(false);
      setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  }, [isOwner]);

  const importObsidianFiles = useCallback((fileListOrGames: { name: string; content: string }[] | GameItem[]): { count: number; titles: string[] } => {
    if (!isOwner) {
      showToast('Apenas o dono pode importar arquivos.', 'error');
      return { count: 0, titles: [] };
    }
    let parsedGames: GameItem[] = [];
    if (Array.isArray(fileListOrGames) && fileListOrGames.length > 0 && 'title' in fileListOrGames[0] && 'status' in fileListOrGames[0]) {
      parsedGames = fileListOrGames as GameItem[];
    } else {
      const { games } = parseObsidianVaultFiles(fileListOrGames as { name: string; content: string }[]);
      parsedGames = games;
    }
    if (parsedGames.length === 0) {
      return { count: 0, titles: [] };
    }

    const sanitizedGames = parsedGames.map((g) => {
      const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
      return {
        ...g,
        tempoMinutos: mins,
        tempo: g.tempo || formatMinutes(mins, 'colon'),
        data_zerado: normalizeToISODate(g.data_zerado),
      };
    });

    (async () => {
      try {
        setIsCloudSyncing(true);
        for (let i = 0; i < sanitizedGames.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = sanitizedGames.slice(i, i + 400);
          chunk.forEach((game) => {
            const docRef = doc(db, 'games', game.id);
            batch.set(docRef, cleanForFirestore(game), { merge: true });
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Batch save error in importObsidianFiles:', err);
      } finally {
        setIsCloudSyncing(false);
        setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');
      }
    })();

    setGames((prev) => deduplicateGames([...sanitizedGames, ...prev]).dedupedGames);
    const titles = sanitizedGames.map((g) => cleanTitle(g.title));
    showToast(`${sanitizedGames.length} notas importadas com sucesso!`, 'success');
    return { count: titles.length, titles };
  }, [isOwner]);

  // ── MANUAL DATA MIGRATION ENGINE (RETROCOMPATIBILITY & NORMALIZATION) ──
  const getMigrationPreview = useCallback((): MigrationPreview => {
    let fixedDates = 0;
    let fixedTimeMinutes = 0;
    const sampleChanges: MigrationPreview['changesSummary']['sampleChanges'] = [];

    games.forEach((g) => {
      const isoDate = normalizeToISODate(g.data_zerado);
      const isDateOutdated = g.data_zerado && isoDate && g.data_zerado !== isoDate;
      const calcMinutes = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
      const isMinutesMissing = g.tempoMinutos === undefined || g.tempoMinutos !== calcMinutes;

      if (isDateOutdated || isMinutesMissing) {
        if (isDateOutdated) fixedDates++;
        if (isMinutesMissing) fixedTimeMinutes++;
        if (sampleChanges.length < 5) {
          sampleChanges.push({
            title: g.title,
            oldTime: g.tempo,
            newMinutes: calcMinutes,
            oldDate: g.data_zerado,
            newDate: isoDate,
          });
        }
      }
    });

    const gamesToUpdate = games.filter((g) => {
      const isoDate = normalizeToISODate(g.data_zerado);
      const isDateOutdated = g.data_zerado && isoDate && g.data_zerado !== isoDate;
      const calcMinutes = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
      const isMinutesMissing = g.tempoMinutos === undefined || g.tempoMinutos !== calcMinutes;
      return isDateOutdated || isMinutesMissing;
    }).length;

    return {
      totalGames: games.length,
      gamesToUpdate,
      changesSummary: {
        fixedDates,
        fixedTimeMinutes,
        sampleChanges,
      },
    };
  }, [games]);

  const executeMigration = useCallback(async (): Promise<{ success: boolean; updatedCount: number }> => {
    if (!isOwner) {
      showToast('Apenas o dono pode executar a migração.', 'error');
      return { success: false, updatedCount: 0 };
    }

    // 1. Always create safety backup first
    exportBackupJSON();

    setIsCloudSyncing(true);
    setServerSyncStatus('syncing');

    try {
      const updatedGames = games.map((g) => {
        const isoDate = normalizeToISODate(g.data_zerado);
        const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
        return {
          ...g,
          data_zerado: isoDate || g.data_zerado,
          tempoMinutos: mins,
          tempo: g.tempo || formatMinutes(mins, 'colon'),
        };
      });

      for (let i = 0; i < updatedGames.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = updatedGames.slice(i, i + 400);
        chunk.forEach((game) => {
          const docRef = doc(db, 'games', game.id);
          batch.set(docRef, cleanForFirestore(game), { merge: true });
        });
        await batch.commit();
      }

      setGames(updatedGames);
      showToast(`Migração concluída! ${updatedGames.length} jogos normalizados.`, 'success');
      return { success: true, updatedCount: updatedGames.length };
    } catch (err: any) {
      console.error('Migration error:', err);
      showToast('Erro ao executar migração de dados.', 'error');
      return { success: false, updatedCount: 0 };
    } finally {
      setIsCloudSyncing(false);
      setServerSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  }, [games, isOwner, exportBackupJSON]);

  const value = {
    games,
    uniqueZerados,
    uniqueZeradosTitleSet,
    totalZerados2026,
    totalZeradosLifetime,
    currentCycleYear,
    getUniqueZeradosForYear,
    availableYears,
    addGame,
    updateGame,
    deleteGame,
    clearAllGames,
    importDualObsidianFiles,
    importObsidianFiles,
    confirmAddDuplicate,
    toggleBossStep,
    exportGameMarkdown,
    exportAllMarkdown,
    exportBackupJSON,
    importBackupJSON,
    getMigrationPreview,
    executeMigration,
    annualGoal,
    updateAnnualGoal,
    isCloudSyncing,
    isServerConnected,
    serverSyncStatus,
    isInitialLoading,
  };

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
};

export const useGames = () => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
};
