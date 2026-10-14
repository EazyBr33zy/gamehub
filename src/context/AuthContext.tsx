import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from '../firebase/config';
import { isOwnerUser, isDevOrPreviewEnvironment, DEV_ADMIN_USER } from '../config/owner';
import { showToast } from '../utils/toast';
import { clearIgdbConfig } from '../utils/igdbService';

export interface AuthContextType {
  currentUser: User | null;
  isAuthLoading: boolean;
  isOwner: boolean;
  authError: string | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isBypass = isDevOrPreviewEnvironment();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isBypass) {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gamehub_dev_logged_out') === 'true') {
        return null;
      }
      return DEV_ADMIN_USER;
    }
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => {
    if (isBypass && !(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gamehub_dev_logged_out') === 'true')) {
      return false;
    }
    return true;
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAppStorage = () => {
    try {
      clearIgdbConfig();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!isOwnerUser(user)) {
          if (isBypass) {
            // Keep DEV_ADMIN_USER in preview/localhost
            setCurrentUser(DEV_ADMIN_USER);
            setAuthError(null);
            setIsAuthLoading(false);
            return;
          }
          // Non-owner: immediate sign out, clear local cache, and show access denied
          clearAppStorage();
          try {
            await logoutUser();
          } catch (e) {
            console.warn('Sign out failed:', e);
          }
          setCurrentUser(null);
          setAuthError('Esta conta não tem acesso');
          setIsAuthLoading(false);
          return;
        }
        setCurrentUser(user);
        setAuthError(null);
      } else {
        if (isBypass && !(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gamehub_dev_logged_out') === 'true')) {
          setCurrentUser(DEV_ADMIN_USER);
          setAuthError(null);
        } else {
          setCurrentUser(null);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isBypass]);

  const isOwner = isOwnerUser(currentUser) || (isBypass && !!currentUser);

  const login = async () => {
    setAuthError(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('gamehub_dev_logged_out');
    }
    if (isBypass) {
      setCurrentUser(DEV_ADMIN_USER);
      showToast('Autenticado como Administrador (Modo Preview)', 'success');
      return { user: DEV_ADMIN_USER };
    }
    try {
      const result = await loginWithGoogle();
      if (result?.user) {
        if (!isOwnerUser(result.user)) {
          clearAppStorage();
          try {
            await logoutUser();
          } catch (e) {}
          setCurrentUser(null);
          setAuthError('Esta conta não tem acesso');
          showToast('Esta conta não tem acesso.', 'error');
          return null;
        }
        setCurrentUser(result.user);
        setAuthError(null);
        showToast(`Bem-vindo, ${result.user.displayName || 'Comandante'}!`, 'success');
        return result;
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Não foi possível autenticar com Google.', 'error');
      }
    }
  };

  const logout = async () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('gamehub_dev_logged_out', 'true');
      }
      clearAppStorage();
      await logoutUser();
      setCurrentUser(null);
      setAuthError(null);
      showToast('Sessão encerrada com sucesso.', 'info');
    } catch (error) {
      showToast('Erro ao deslogar.', 'error');
    }
  };

  const value = {
    currentUser,
    isAuthLoading,
    isOwner,
    authError,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
