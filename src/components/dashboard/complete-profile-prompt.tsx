'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompleteProfilePromptProps {
  openByDefault: boolean;
  initialName?: string;
}

export default function CompleteProfilePrompt({
  openByDefault,
  initialName,
}: Readonly<CompleteProfilePromptProps>) {
  const [isOpen, setIsOpen] = useState(openByDefault);
  const [name, setName] = useState(initialName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidName = useMemo(() => name.trim().length > 0, [name]);

  const handleSave = async () => {
    if (!isValidName || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || 'Failed to save profile.');
        return;
      }

      setIsOpen(false);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="[&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Add your name so your store account is fully set up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Your Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Jane Doe"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!isValidName || isSaving}>
            {isSaving ? 'Saving...' : 'Save and continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
