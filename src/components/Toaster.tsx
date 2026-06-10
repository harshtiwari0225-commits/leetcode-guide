import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/helpers';
import {
  TOAST_EVENT,
  type ToastDetail,
  type ToastVariant,
} from './toast';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

/** Mount once at the panel root. Listens for showToast() calls. */
export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [
        ...prev,
        { id, message: detail.message, variant: detail.variant ?? 'info' },
      ]);
      // Auto-dismiss after 4 s.
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-3 left-3 right-3 flex flex-col gap-1.5 z-10 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastBubble
          key={t.id}
          toast={t}
          onDismiss={() =>
            setToasts((prev) => prev.filter((x) => x.id !== t.id))
          }
        />
      ))}
    </div>
  );
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'bg-gray-800 border-gray-600 text-gray-100',
  success: 'bg-green-900/80 border-green-600/60 text-green-100',
  error: 'bg-red-900/80 border-red-600/60 text-red-100',
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  info: 'ℹ️',
  success: '✓',
  error: '⚠️',
};

interface ToastBubbleProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastBubble: React.FC<ToastBubbleProps> = ({ toast, onDismiss }) => (
  <div
    className={cn(
      'pointer-events-auto flex items-start gap-2 px-2.5 py-2 border rounded-md shadow-lg shadow-black/40 text-[11px] animate-fade-in',
      VARIANT_STYLES[toast.variant],
    )}
  >
    <span className="flex-shrink-0">{VARIANT_ICONS[toast.variant]}</span>
    <span className="flex-1 leading-relaxed">{toast.message}</span>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss notification"
      className="flex-shrink-0 text-gray-400 hover:text-white text-[10px]"
    >
      ✕
    </button>
  </div>
);
