import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  titleId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-lg', 'max-w-3xl'
}

const ModalComponent: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  titleId = 'modal-title',
  children,
  footer,
  icon,
  maxWidth = 'max-w-lg'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Store trigger element focus, lock body scroll, and set initial focus ONLY when modal transitions from closed to open
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = true;

    previousFocusRef.current = document.activeElement as HTMLElement;
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable body element inside modal ONLY ONCE on opening
    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        // If focus is already inside modal (e.g. user already clicked or typed), do NOT steal focus!
        if (modalRef.current.contains(document.activeElement)) {
          return;
        }

        // Prefer first editable field in body (input, textarea, select), otherwise fallback to any focusable element
        const bodyInputs = modalRef.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
        );
        if (bodyInputs.length > 0) {
          bodyInputs[0].focus();
        } else {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null);

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#30363d] bg-[#161b22] text-[#f0f6fc] shadow-2xl overflow-hidden`}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#30363d] bg-[#0d1117] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {icon && <div className="text-[#22d3ee] flex-shrink-0">{icon}</div>}
            <div>
              <h2
                id={titleId}
                className="font-heading text-base sm:text-lg font-black uppercase text-white tracking-wide truncate"
              >
                {title}
              </h2>
              {description && (
                <p className="text-xs text-[#9aa4b2] mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9aa4b2] hover:text-white hover:bg-white/10 active:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-sm text-[#f0f6fc]">
          {children}
        </div>

        {/* Sticky/Fixed Footer if provided */}
        {footer && (
          <div className="sticky bottom-0 z-10 border-t border-[#30363d] bg-[#0d1117] px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Modal = React.memo(ModalComponent);
