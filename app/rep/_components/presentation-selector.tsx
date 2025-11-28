'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Check, Trash, Edit } from 'lucide-react';
import { Presentation } from '@/lib/selections/types';

interface PresentationSelectorProps {
  presentations: Presentation[];
  currentPresentationId: string | null;
  onSelect: (presentationId: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (presentationId: string) => Promise<void>;
  onRename: (presentationId: string, newName: string) => Promise<void>;
  onSetActive: (presentationId: string) => Promise<void>;
}

export function PresentationSelector({
  presentations,
  currentPresentationId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onSetActive,
}: PresentationSelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName);
    setNewName('');
    setShowCreateDialog(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || !renameId) return;
    await onRename(renameId, newName);
    setNewName('');
    setRenameId(null);
    setShowRenameDialog(false);
  };

  const currentPresentation = presentations.find(p => p.id === currentPresentationId);

  return (
    <div className="flex items-center gap-2">
      <Select value={currentPresentationId || ''} onValueChange={onSelect}>
        <SelectTrigger className="w-[280px] max-w-[320px]">
          <div className="flex items-center justify-between w-full gap-2 pr-1">
            <SelectValue placeholder="Select a presentation..." className="truncate flex-1" />
            {currentPresentation?.isActive && (
              <Badge variant="default" className="text-xs flex-shrink-0">Active</Badge>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="z-[60]">
          {presentations.map((presentation) => (
            <SelectItem key={presentation.id} value={presentation.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="truncate flex-1">{presentation.name}</span>
                {presentation.isActive && (
                  <Badge variant="default" className="text-xs flex-shrink-0">Active</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {currentPresentation && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onSetActive(currentPresentation.id)}
              disabled={currentPresentation.isActive}
            >
              <Check className="h-4 w-4 mr-2" />
              Set as Active
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setRenameId(currentPresentation.id);
                setNewName(currentPresentation.name);
                setShowRenameDialog(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(currentPresentation.id)}
              disabled={presentations.length === 1}
              className="text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Presentation</DialogTitle>
            <DialogDescription>
              Give your presentation a descriptive name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Presentation Name</Label>
              <Input
                id="name"
                placeholder="e.g., Spring 2025 Launch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename">Presentation Name</Label>
              <Input
                id="rename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
