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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useActor } from "@caffeineai/core-infrastructure";
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import {
  DEFAULT_THEME,
  THEME_DISPLAY_NAMES,
  THEME_NAMES,
  applyVariant,
  getBaseTheme,
  getVariant,
} from "../lib/themes";

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function maskApiKey(key: string): string {
  if (key.length < 8) return "••••••••••••••••";
  return `${key.slice(0, 4)}••••••••••••••••${key.slice(-4)}`;
}

export default function ProfileSettingsModal({
  open,
  onOpenChange,
}: ProfileSettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { data: userProfile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const rawActor = useActor(createActor as Parameters<typeof useActor>[0]);
  const actor = rawActor.actor as backendInterface | null;

  const [profileName, setProfileName] = useState("");
  const [socialUrl, setSocialUrl] = useState("");

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    if (!open || !actor) return;
    setApiKeyLoading(true);
    actor
      .getMyApiKey()
      .then((key) => setApiKey(key ?? null))
      .catch(() => setApiKey(null))
      .finally(() => setApiKeyLoading(false));
  }, [open, actor]);

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!actor) return;
    setGenerateLoading(true);
    try {
      const newKey = await actor.generateApiKey();
      setApiKey(newKey);
      toast.success("API key generated");
    } catch {
      toast.error("Failed to generate API key");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!actor) return;
    setRevokeLoading(true);
    try {
      await actor.revokeApiKey();
      setApiKey(null);
      setRevokeConfirm(false);
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevokeLoading(false);
    }
  };

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

  const currentTheme = theme || DEFAULT_THEME;
  const currentBase = getBaseTheme(currentTheme);
  const currentVariant = getVariant(currentTheme);

  const handleThemeChange = (newBase: string) => {
    setTheme(applyVariant(newBase, currentVariant));
  };

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
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Theme</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Use the sun/moon toggle in the nav bar to switch light/dark
                    variants.
                  </p>
                  <Select value={currentBase} onValueChange={handleThemeChange}>
                    <SelectTrigger
                      className="w-full font-mono text-sm"
                      data-ocid="settings.theme_select"
                    >
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent className="font-mono max-h-72">
                      {THEME_NAMES.map((slug) => (
                        <SelectItem key={slug} value={slug} className="text-sm">
                          {THEME_DISPLAY_NAMES[slug] ?? slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  data-ocid="settings.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={profileLoading || saveProfile.isPending}
                  data-ocid="settings.save_button"
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

            <Separator />

            {/* API Key Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">API Key</h3>
                <a
                  href="/mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-ocid="settings.api_key.mcp_link"
                >
                  How to connect
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this key to connect MCP clients to your Hyvmind knowledge
                graphs.
              </p>

              {apiKeyLoading ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="settings.api_key.loading_state"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading API key...
                </div>
              ) : apiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 rounded border border-border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider text-foreground select-none"
                      data-ocid="settings.api_key.display"
                    >
                      {maskApiKey(apiKey)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="shrink-0"
                      data-ocid="settings.api_key.copy_button"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {!revokeConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeConfirm(true)}
                      className="text-xs text-destructive hover:text-destructive"
                      data-ocid="settings.api_key.revoke_button"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Revoke Key
                    </Button>
                  ) : (
                    <div
                      className="rounded border border-border bg-muted/30 p-4 space-y-3"
                      data-ocid="settings.api_key.revoke_dialog"
                    >
                      <p className="text-sm text-foreground">
                        This will permanently invalidate your API key. All
                        existing integrations will stop working. Are you sure?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeConfirm(false)}
                          disabled={revokeLoading}
                          data-ocid="settings.api_key.cancel_button"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleRevoke}
                          disabled={revokeLoading}
                          data-ocid="settings.api_key.confirm_button"
                        >
                          {revokeLoading ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Revoking...
                            </>
                          ) : (
                            "Confirm Revoke"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="space-y-3"
                  data-ocid="settings.api_key.empty_state"
                >
                  <p className="text-xs text-muted-foreground">
                    No API key yet. Generate one to connect MCP clients.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generateLoading}
                    data-ocid="settings.api_key.generate_button"
                  >
                    {generateLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Key"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
