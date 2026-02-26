import { useState, useEffect } from 'react';
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
  useGetMyBuzzBalance,
  useGetMintSettings,
  useSetMintSettings,
} from '../hooks/useQueries';
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
import { Loader2, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

// Scale factor: all BUZZ values are stored as Int × 10^7
const BUZZ_SCALE = 10_000_000;

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: buzzBalance, isLoading: buzzLoading, isError: buzzError } = useGetMyBuzzBalance();
  const { data: mintSettings, isLoading: mintSettingsLoading } = useGetMintSettings();
  const saveProfile = useSaveCallerUserProfile();
  const setMintSettings = useSetMintSettings();

  const [profileName, setProfileName] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [numCopies, setNumCopies] = useState<number>(1);

  // Update form when profile data loads
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || '');
    }
  }, [userProfile]);

  // Update numCopies when mint settings load
  useEffect(() => {
    if (mintSettings) {
      setNumCopies(Number(mintSettings.numCopies));
    }
  }, [mintSettings]);

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast.error('Profile name is required');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        name: profileName.trim(),
        socialUrl: socialUrl.trim() || undefined,
      });
      toast.success('Profile updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || '');
    }
    onOpenChange(false);
  };

  const handleSaveMintSettings = async () => {
    const copies = Math.max(1, Math.floor(numCopies));
    if (copies < 1) {
      toast.error('Number of copies must be at least 1');
      return;
    }

    try {
      await setMintSettings.mutateAsync({ numCopies: BigInt(copies) });
      toast.success('Mint settings saved');
    } catch (error) {
      console.error('Failed to save mint settings:', error);
      toast.error('Failed to save mint settings');
    }
  };

  // Compute base prices based on current numCopies input
  const safeCopies = Math.max(1, Math.floor(numCopies) || 1);
  const lawTokenPrice = (3 / safeCopies).toFixed(7);
  const interpretationTokenPrice = (5 / safeCopies).toFixed(7);

  // Human-readable BUZZ balance: divide scaled Int by 10^7
  const displayBalance = buzzBalance !== undefined
    ? (Number(buzzBalance) / BUZZ_SCALE).toFixed(7)
    : '0.0000000';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Close button in top right */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl">Settings</DialogTitle>
              <DialogDescription>
                Update your profile information, view your wallet, and configure mint settings.
              </DialogDescription>
            </DialogHeader>

            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Profile Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="profileName">Profile Name</Label>
                <Input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your profile name"
                  disabled={profileLoading || saveProfile.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialUrl">Social URL (optional)</Label>
                <Input
                  id="socialUrl"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={profileLoading || saveProfile.isPending}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveProfile.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={profileLoading || saveProfile.isPending}
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
            </div>

            <Separator />

            {/* Wallet Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <h3 className="text-lg font-medium">Wallet</h3>
              </div>
              
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">BUZZ Balance</p>
                  {buzzLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading balance...</span>
                    </div>
                  ) : buzzError ? (
                    <p className="text-sm text-destructive">Failed to load balance</p>
                  ) : (
                    <p className="text-2xl font-bold">{displayBalance} <span className="text-base font-normal text-muted-foreground">BUZZ</span></p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Mint Settings Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Mint Settings</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Set the global number of copies for all your collectibles. This applies to future mints only — already-minted collectibles retain their original copy count and BUZZ price.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numCopies">Number of Copies</Label>
                  <Input
                    id="numCopies"
                    type="number"
                    min={1}
                    step={1}
                    value={numCopies}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNumCopies(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    disabled={mintSettingsLoading || setMintSettings.isPending}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: 1 copy
                  </p>
                </div>

                {/* Price preview */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Base Mint Price Preview
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Law Token</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {lawTokenPrice} <span className="text-xs font-normal text-muted-foreground">BUZZ / copy</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        3 ÷ {safeCopies} copies
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Interpretation Token</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {interpretationTokenPrice} <span className="text-xs font-normal text-muted-foreground">BUZZ / copy</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        5 ÷ {safeCopies} copies
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleSaveMintSettings}
                    disabled={mintSettingsLoading || setMintSettings.isPending}
                    size="sm"
                  >
                    {setMintSettings.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Mint Settings'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
