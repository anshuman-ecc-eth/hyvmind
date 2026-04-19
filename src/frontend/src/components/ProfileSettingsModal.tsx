import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSettingsModal({
  open,
  onOpenChange,
}: ProfileSettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { data: userProfile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const [profileName, setProfileName] = useState("");
  const [socialUrl, setSocialUrl] = useState("");

  // Update form when profile data loads
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || "");
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast.error("Profile name is required");
      return;
    }

    try {
      await saveProfile.mutateAsync({
        name: profileName.trim(),
        socialUrl: socialUrl.trim() || undefined,
      });
      toast.success("Profile updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || "");
    }
    onOpenChange(false);
  };

  const isLight = theme === "light";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl">Settings</DialogTitle>
              <DialogDescription>
                Update your profile information and view your wallet.
              </DialogDescription>
            </DialogHeader>

            {/* Appearance Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Appearance</h3>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  {isLight ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isLight ? "Light Mode" : "Dark Mode"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Toggle between light and dark theme
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isLight}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "light" : "dark")
                  }
                  data-ocid="settings.switch"
                />
              </div>
            </div>

            <Separator />

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
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
