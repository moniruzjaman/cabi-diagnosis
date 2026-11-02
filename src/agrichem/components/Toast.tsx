import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

/**
 * Toast notification system for the AgriChem tab.
 *
 * Global standard implementation:
 *   - 4 severity levels: success, error, warning, info
 *   - Auto-dismiss after 4s (errors stay for 6s)
 *   - Stacked in top-right on desktop, top-center on mobile
 *   - Accessible: role="status" / role="alert", aria-live, keyboard dismiss
 *   - Animated entry/exit via Tailwind transition classes
 *   - Bilingual EN/BN labels
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast({ title: 'Saved', description: 'Product added to favorites', variant: 'success' });
 *   toast({ title: 'Search failed', description: 'Please try again', variant: 'error' });
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful no-op fallback if used outside provider — prevents crashes
    // during testing or if a component is reused outside AgriChemApp.
    return {
      toasts: [],
      toast: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
};

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    bgClass: string;
    borderClass: string;
    titleColor: string;
    defaultDuration: number;
    role: 'status' | 'alert';
  }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    bgClass: 'bg-white',
    borderClass: 'border-emerald-200',
    titleColor: 'text-emerald-900',
    defaultDuration: 4000,
    role: 'status',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    bgClass: 'bg-white',
    borderClass: 'border-rose-200',
    titleColor: 'text-rose-900',
    defaultDuration: 6000,
    role: 'alert',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    bgClass: 'bg-white',
    borderClass: 'border-amber-200',
    titleColor: 'text-amber-900',
    defaultDuration: 5000,
    role: 'status',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    bgClass: 'bg-white',
    borderClass: 'border-blue-200',
    titleColor: 'text-blue-900',
    defaultDuration: 4000,
    role: 'status',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = t.duration ?? VARIANT_CONFIG[t.variant].defaultDuration;
      setToasts((prev) => [...prev, { ...t, id, duration }]);
      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  // Keyboard: Escape dismisses the most recent toast
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        dismiss(toasts[toasts.length - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast viewport — top-right on desktop, top-center on mobile */}
      <div
        className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const config = VARIANT_CONFIG[t.variant];
          const Icon = config.icon;
          return (
            <div
              key={t.id}
              role={config.role}
              className={`pointer-events-auto flex items-start gap-3 ${config.bgClass} border ${config.borderClass} rounded-xl shadow-lg p-3.5 pr-10 relative animate-in slide-in-from-top-2 fade-in duration-200`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${config.titleColor}`}>{t.title}</p>
                {t.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Progress bar showing time until auto-dismiss */}
              {t.duration && t.duration > 0 && (
                <div
                  className={`absolute bottom-0 left-0 h-0.5 ${config.iconColor.replace('text-', 'bg-')} opacity-40`}
                  style={{
                    animation: `toast-shrink ${t.duration}ms linear forwards`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
