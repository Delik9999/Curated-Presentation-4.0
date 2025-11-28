'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const variant = toast.variant || 'info';

  const variantStyles = {
    success: {
      bg: 'bg-success/10 border-success/20',
      icon: <CheckCircledIcon className="h-5 w-5 text-success" />,
      text: 'text-success',
    },
    error: {
      bg: 'bg-error/10 border-error/20',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-error" />,
      text: 'text-error',
    },
    warning: {
      bg: 'bg-warning/10 border-warning/20',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-warning" />,
      text: 'text-warning',
    },
    info: {
      bg: 'bg-primary-50 border-primary-200',
      icon: <InfoCircledIcon className="h-5 w-5 text-primary-600" />,
      text: 'text-primary-600',
    },
  };

  const style = variantStyles[variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 40,
      }}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-lg transition-all mb-3',
        style.bg
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className={cn('text-sm font-semibold', style.text)}>{toast.title}</div>
        {toast.description && (
          <div className="text-sm text-neutral-600">{toast.description}</div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-neutral-100 group-hover:opacity-100 focus:opacity-100"
      >
        <Cross2Icon className="h-4 w-4 text-neutral-500" />
      </button>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{
          duration: (toast.duration || 5000) / 1000,
          ease: 'linear',
        }}
        className={cn('absolute bottom-0 left-0 h-1 origin-left', style.text.replace('text-', 'bg-'))}
      />
    </motion.div>
  );
}

// Convenience hooks for specific toast types
export function useSuccessToast() {
  const { addToast } = useToast();
  return React.useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'success' });
    },
    [addToast]
  );
}

export function useErrorToast() {
  const { addToast } = useToast();
  return React.useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'error' });
    },
    [addToast]
  );
}

export function useWarningToast() {
  const { addToast } = useToast();
  return React.useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'warning' });
    },
    [addToast]
  );
}

export function useInfoToast() {
  const { addToast } = useToast();
  return React.useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'info' });
    },
    [addToast]
  );
}
