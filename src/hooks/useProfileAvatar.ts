import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { AVATAR_STORAGE_KEY } from '../config/profile';
import { showToast } from '../utils/toast';

/** Limite duro (bytes) do data URL salvo — mantido abaixo do limite das regras do Firestore (300.000). */
const MAX_AVATAR_BYTES = 295_000;
/** Largura máxima de redimensionamento no desktop (retina-friendly). */
const MAX_AVATAR_WIDTH = 512;

export interface ProfileAvatarValue {
  /** Data URL da foto salva na nuvem (settings/site → campo `avatar`), ou null. */
  remoteAvatar: string | null;
  /** true enquanto o listener inicial não responde. */
  isLoading: boolean;
  /** Salva um arquivo de imagem: redimensiona, comprime e grava no Firestore. */
  saveAvatar: (file: File) => Promise<void>;
  /** Remove a foto customizada da nuvem (volta ao fallback). */
  clearAvatar: () => Promise<void>;
  /** true durante upload/gravação. */
  isSaving: boolean;
}

const readLocalCache = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeLocalCache = (value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(AVATAR_STORAGE_KEY);
    else localStorage.setItem(AVATAR_STORAGE_KEY, value);
  } catch {
    // Cota do localStorage excedida — cache é só otimização de primeira pintura.
  }
};

/** Redimensiona/comprime a imagem para caber no limite de bytes do documento. */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo não é uma imagem.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_AVATAR_WIDTH / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      for (const quality of [0.85, 0.7, 0.55, 0.4]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_AVATAR_BYTES) {
          resolve(dataUrl);
          return;
        }
      }
      reject(new Error('Imagem muito grande mesmo após comprimir. Tente uma foto menor.'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a imagem.'));
    };
    img.src = url;
  });

/**
 * Avatar do dono sincronizado via Firestore (documento settings/site, campo `avatar`).
 * Em tempo real: muda no celular → aparece no desktop e vice-versa.
 * O localStorage é usado apenas como cache para a primeira pintura instantânea.
 */
export function useProfileAvatar(isOwner: boolean): ProfileAvatarValue {
  const [remoteAvatar, setRemoteAvatar] = useState<string | null>(() => readLocalCache());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        const raw = snap.exists() ? (snap.data().avatar as string | null | undefined) : null;
        const value = typeof raw === 'string' && raw.length > 0 ? raw : null;
        setRemoteAvatar(value);
        writeLocalCache(value); // mantém o cache local em sincronia com a nuvem
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firestore settings avatar listener error:', error);
        setIsLoading(false);
      }
    );
    return unsub;
  }, []);

  const saveAvatar = useCallback(
    async (file: File) => {
      if (!isOwner) {
        showToast('Apenas o dono pode alterar o avatar.', 'error');
        return;
      }
      setIsSaving(true);
      try {
        const dataUrl = await compressImage(file);
        await setDoc(doc(db, 'settings', 'site'), { avatar: dataUrl }, { merge: true });
        // Não atualizamos o estado aqui de propósito: o onSnapshot acima propaga
        // a mudança para todas as abas/dispositivos de forma consistente.
        showToast('Foto de perfil sincronizada! 📸', 'success');
      } catch (err: any) {
        console.error('Failed to save avatar:', err);
        showToast(err?.message || 'Falha ao salvar a foto de perfil.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [isOwner]
  );

  const clearAvatar = useCallback(async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), { avatar: null }, { merge: true });
      showToast('Foto customizada removida.', 'info');
    } catch (err: any) {
      console.error('Failed to clear avatar:', err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    } finally {
      setIsSaving(false);
    }
  }, [isOwner]);

  return { remoteAvatar, isLoading, saveAvatar, clearAvatar, isSaving };
}
