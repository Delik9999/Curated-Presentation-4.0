'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  duration?: number;
  variant?: 'default' | 'destructive';
};

const ToastContext = React.createContext<{
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  return (
    <ToastContext.Provider value={{ toasts, setToasts }}>
      <ToastPrimitive.Provider swipeDirection="right">{children}</ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  const { toasts, setToasts } = context;

  const toast = React.useCallback(
    ({ duration = 4000, ...toastData }: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, duration, ...toastData }]);
      return id;
    },
    [setToasts]
  );

  const dismiss = React.useCallback(
    (id: string) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id)),
    [setToasts]
  );

  return { toast, dismiss, toasts };
}

export const ToastViewport = ToastPrimitive.Viewport;
export const ToastRoot = ToastPrimitive.Root;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;
