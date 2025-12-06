import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useUpdateCallerUsername } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSetupModalProps {
  open: boolean;
  onComplete: () => void;
}

export default function ProfileSetupModal({ open, onComplete }: ProfileSetupModalProps) {
  const [username, setUsername] = useState('');
  const { data: profile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const updateUsernameMutation = useUpdateCallerUsername();

  useEffect(() => {
    if (isFetched && profile && profile.name && profile.name.trim() !== '') {
      onComplete();
    }
  }, [profile, isFetched, onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    try {
      await updateUsernameMutation.mutateAsync(username.trim());
      onComplete();
    } catch (error) {
      console.error('Failed to set username:', error);
    }
  };

  const isLoading = profileLoading || updateUsernameMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md bg-white dark:bg-gray-950 border-2"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Hyvmind!</DialogTitle>
          <DialogDescription>
            Let's set up your profile. Please choose a username.
          </DialogDescription>
        </DialogHeader>

        {profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading profile...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!username.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
