import React, { createContext, useContext } from 'react';
import { showToast, ToastAction, ToastMessage } from '../utils/toast';

export interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: ToastAction, duration?: number) => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  success: (message: string, action?: ToastAction, duration?: number) => void;
  error: (message: string, action?: ToastAction, duration?: number) => void;
  info: (message: string, action?: ToastAction, duration?: number) => void;
  warning: (message: string, action?: ToastAction, duration?: number) => void;
}

const defaultToastContext: ToastContextType = {
  showToast,
  toast: (message: string, type = 'info') => showToast(message, type),
  success: (message: string, action?: ToastAction, duration?: number) => showToast(message, 'success', action, duration),
  error: (message: string, action?: ToastAction, duration?: number) => showToast(message, 'error', action, duration),
  info: (message: string, action?: ToastAction, duration?: number) => showToast(message, 'info', action, duration),
  warning: (message: string, action?: ToastAction, duration?: number) => showToast(message, 'info', action, duration),
};

export const ToastContext = createContext<ToastContextType>(defaultToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastContext.Provider value={defaultToastContext}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  return context || defaultToastContext;
}

export { showToast } from '../utils/toast';
export type { ToastAction, ToastMessage } from '../utils/toast';
