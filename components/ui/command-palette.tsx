'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  PersonIcon,
  FileTextIcon,
  GearIcon,
  ExitIcon,
} from '@radix-ui/react-icons';

interface CommandPaletteProps {
  children?: React.ReactNode;
}

interface CommandAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group?: string;
}

export function CommandPalette({ children }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Define available commands
  const commands: CommandAction[] = [
    {
      id: 'home',
      label: 'Go to Home',
      icon: <HomeIcon className="h-4 w-4" />,
      action: () => router.push('/'),
      keywords: ['home', 'dashboard', 'main'],
      group: 'Navigation',
    },
    {
      id: 'rep-portal',
      label: 'Go to Rep Portal',
      icon: <PersonIcon className="h-4 w-4" />,
      action: () => router.push('/rep'),
      keywords: ['rep', 'portal', 'workspace'],
      group: 'Navigation',
    },
    {
      id: 'dallas',
      label: 'Open Dallas Order Builder',
      icon: <FileTextIcon className="h-4 w-4" />,
      action: () => router.push('/rep/dallas'),
      keywords: ['dallas', 'order', 'builder', 'market'],
      group: 'Navigation',
    },
    {
      id: 'design-system',
      label: 'View Design System',
      icon: <GearIcon className="h-4 w-4" />,
      action: () => router.push('/design-system'),
      keywords: ['design', 'system', 'components', 'ui'],
      group: 'Navigation',
    },
  ];

  // Group commands by category
  const groupedCommands = commands.reduce((acc, cmd) => {
    const group = cmd.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  // Keyboard shortcut listener
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-[640px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <Command className="border-0 shadow-none">
              <div className="flex flex-col">
                <CommandInput
                  placeholder="Type a command or search..."
                  className="border-b border-neutral-200"
                />
                <CommandList className="max-h-[400px]">
                  <CommandEmpty>
                    <div className="py-6 text-center">
                      <MagnifyingGlassIcon className="mx-auto h-6 w-6 text-neutral-400 mb-2" />
                      <p className="text-sm text-neutral-500">No results found.</p>
                    </div>
                  </CommandEmpty>
                  {Object.entries(groupedCommands).map(([group, items]) => (
                    <CommandGroup key={group} heading={group}>
                      {items.map((cmd) => (
                        <CommandItem
                          key={cmd.id}
                          onSelect={() => handleSelect(cmd.action)}
                          className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                        >
                          {cmd.icon && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                              {cmd.icon}
                            </div>
                          )}
                          <span className="flex-1">{cmd.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </div>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// Trigger button component
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        // Dispatch keyboard event to trigger command palette
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
    >
      <MagnifyingGlassIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-xs text-neutral-500">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
