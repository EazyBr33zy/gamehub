import React, { useState, useEffect } from 'react';
import { subscribeToast, ToastMessage } from '../utils/toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 4000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Notificações"
      className="fixed bottom-20 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-auto pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-slide-up ${
            t.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/50'
              : t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
              : 'bg-[#161b22]/95 border-[#30363d] text-slate-200 shadow-black/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {t.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
            {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {(!t.type || t.type === 'info') && <Info className="h-4 w-4 text-[#22d3ee] shrink-0" />}
            <span className="text-xs font-semibold leading-snug">{t.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  setToasts((prev) => prev.filter((item) => item.id !== t.id));
                }}
                className="px-3 py-1.5 rounded-lg bg-[#22d3ee] text-[#0d1117] text-xs font-black uppercase hover:bg-[#67e8f9] transition-colors cursor-pointer"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
};
