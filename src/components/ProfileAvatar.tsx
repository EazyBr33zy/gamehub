import React, { useCallback, useRef, useState } from 'react';
import { Gamepad2, Camera, Loader2 } from 'lucide-react';
import { PROFILE_AVATAR } from '../config/profile';
import { useProfileAvatar } from '../hooks/useProfileAvatar';

type AvatarSource = 'remote' | 'public' | 'google' | 'fallback';

interface ProfileAvatarProps {
  /** URL da foto da conta Google (currentUser.photoURL), se existir. */
  googlePhotoUrl?: string | null;
  /** Se true (dono), permite clicar para subir uma foto própria. */
  editable?: boolean;
  className?: string;
}

/**
 * Avatar do dono no hero do Painel.
 * A foto customizada é sincronizada via Firestore (settings/site → campo `avatar`),
 * então muda no celular e aparece no desktop (e vice-versa) em tempo real.
 * Ordem de prioridade: foto sincronizada > public/perfil.png >
 * foto da conta Google > ícone de controle.
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  googlePhotoUrl,
  editable = false,
  className = '',
}) => {
  const { remoteAvatar, saveAvatar, isSaving } = useProfileAvatar(editable);
  const [source, setSource] = useState<AvatarSource>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quando a nuvem entrega uma foto, ela passa a ser exibida imediatamente
  // (onSnapshot já propaga mudanças feitas em outro dispositivo).
  React.useEffect(() => {
    if (remoteAvatar) setSource('remote');
  }, [remoteAvatar]);

  const handleError = useCallback(() => {
    setSource((prev) => {
      if (prev === 'remote' || prev === 'public') {
        return googlePhotoUrl ? 'google' : 'fallback';
      }
      return 'fallback';
    });
  }, [googlePhotoUrl]);

  const src =
    source === 'remote' && remoteAvatar
      ? remoteAvatar
      : source === 'public'
        ? PROFILE_AVATAR
        : source === 'google' && googlePhotoUrl
          ? googlePhotoUrl
          : null;

  const inner = src ? (
    <img
      src={src}
      alt="Foto de perfil"
      className="h-full w-full object-cover"
      onError={handleError}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#161b22] to-[#0d1117] text-[#22d3ee]">
      <Gamepad2 className="h-1/2 w-1/2" aria-hidden="true" />
    </span>
  );

  const box = (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-[#22d3ee]/40 shadow-[0_0_24px_rgba(34,211,238,0.25)] ${className}`}
    >
      {inner}
      {editable && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSaving}
          className="absolute inset-x-0 bottom-0 flex min-h-[32px] items-center justify-center gap-1 bg-black/60 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#22d3ee] opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 group-hover/avatar:opacity-100 cursor-pointer disabled:cursor-wait disabled:opacity-100"
          aria-label="Subir foto de perfil"
          title="Clique para subir sua foto (sincroniza em todos os dispositivos)"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{isSaving ? 'Salvando…' : 'Foto'}</span>
        </button>
      )}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void saveAvatar(file);
            e.target.value = '';
          }}
        />
      )}
    </div>
  );

  if (!editable) return box;

  return <span className="group/avatar relative block">{box}</span>;
};

export default ProfileAvatar;
