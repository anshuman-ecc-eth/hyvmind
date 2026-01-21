import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
  const [name, setName] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  // Load existing profile data when modal opens
  useEffect(() => {
    if (open && userProfile) {
      setName(userProfile.name || '');
      setSocialUrl(userProfile.socialUrl || '');
    }
  }, [open, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await saveProfile.mutateAsync({ 
        name: name.trim(),
        socialUrl: socialUrl.trim() || undefined
      });
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (userProfile) {
      setName(userProfile.name || '');
      setSocialUrl(userProfile.socialUrl || '');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        {profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saveProfile.isPending}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-url">Social URL (optional)</Label>
              <Input
                id="social-url"
                type="url"
                placeholder="https://..."
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                disabled={saveProfile.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Add a link to your social media profile or website
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saveProfile.isPending}
                className="flex-1 hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveProfile.isPending}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90"
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
