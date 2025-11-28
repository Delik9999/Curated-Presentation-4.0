'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ExitIcon } from '@radix-ui/react-icons';

export function LogoutButton() {
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="gap-2"
    >
      <ExitIcon className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
