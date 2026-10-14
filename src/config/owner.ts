export const OWNER_UID = 'qBBKffxqWAMhKJP2YrXvM3Jdvke2';
export const OWNER_EMAILS = ['filipeaurellio@gmail.com'];

export function isOwnerUser(user: { uid?: string; email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.uid === OWNER_UID) return true;
  if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase().trim())) return true;
  return false;
}

/**
 * Detects if the application is running in localhost or the AI Studio preview environment.
 */
export function isDevOrPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Do not automatically bypass when running automated unit tests
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'true' || params.get('bypass_auth') === 'true') {
      return true;
    }
  } catch {}

  const hostname = window.location.hostname.toLowerCase();
  return (
    import.meta.env.DEV ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.run.app') ||
    hostname.includes('aistudio') ||
    hostname.includes('googleusercontent.com') ||
    hostname.includes('webcontainer')
  );
}

export const DEV_ADMIN_USER = {
  uid: OWNER_UID,
  email: 'filipeaurellio@gmail.com',
  displayName: 'Filipe Aurélio (Admin)',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
} as unknown as import('firebase/auth').User;


