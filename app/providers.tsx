'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { ToastProvider } from '@/components/ui/use-toast';
import { SessionProvider } from '@/components/providers/session-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
