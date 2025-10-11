'use client';

import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { ToastRoot, ToastTitle, ToastDescription, ToastViewport, ToastClose, useToast } from './use-toast';

function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <>
      {toasts.map((toast) => (
        <ToastRoot
          key={toast.id}
          className={clsx(
            'relative flex w-[320px] flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-lg backdrop-blur-sm',
            toast.variant === 'destructive' && 'border-red-200 bg-red-50 text-red-900'
          )}
          duration={toast.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(toast.id);
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {toast.title && <ToastTitle className="text-sm font-semibold">{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription className="text-sm text-slate-600">{toast.description}</ToastDescription>
              )}
            </div>
            <ToastClose className="text-slate-400 transition hover:text-slate-600">
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-4 w-4" />
            </ToastClose>
          </div>
          {toast.action}
        </ToastRoot>
      ))}
      <ToastViewport className="fixed bottom-6 right-6 flex max-h-screen flex-col gap-3" />
    </>
  );
}

export function Toaster() {
  return <ToastContainer />;
}
