import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UIProvider, useUI } from './UIContext';
import { GamesProvider, useGames } from './GamesContext';
import { ToastProvider, useToast } from './ToastContext';

export { useAuth } from './AuthContext';
export { useUI } from './UIContext';
export { useGames } from './GamesContext';
export { useToast } from './ToastContext';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <GamesProvider>
          {children}
        </GamesProvider>
      </UIProvider>
    </AuthProvider>
  );
};

export function useGame() {
  const auth = useAuth();
  const ui = useUI();
  const games = useGames();

  return {
    ...auth,
    ...ui,
    ...games,
  };
}
