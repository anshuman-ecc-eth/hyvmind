/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetAllData } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

export default function DataResetDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const resetMutation = useResetAllData();

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      toast.error('Please type RESET to confirm');
      return;
    }

    try {
      await resetMutation.mutateAsync();
      toast.success('All data has been reset successfully');
      setOpen(false);
      setConfirmText('');
      
      // Reload the page after a short delay to reflect the clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to reset data'
      );
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Reset All Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Reset All Application Data
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This action will permanently delete all curations, swarms, annotations,
            tokens, interpretations, and membership data. User profiles and access
            control settings will be preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-foreground">
              Type <span className="font-bold">RESET</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="bg-background border-border text-foreground"
              disabled={resetMutation.isPending}
            />
          </div>
          
          {resetMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Resetting all data...</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={resetMutation.isPending}
            className="bg-background border-border text-foreground hover:bg-muted"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={confirmText !== 'RESET' || resetMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset All Data'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
