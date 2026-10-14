export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: ToastAction;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners: ToastListener[] = [];

export function subscribeToast(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  action?: ToastAction,
  duration = 4000
) {
  const toast: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    type,
    action,
    duration,
  };
  listeners.forEach((listener) => listener(toast));
}
