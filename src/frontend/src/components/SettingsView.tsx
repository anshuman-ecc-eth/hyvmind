import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";
import {
  useGetCallerUserProfile,
  useGetMyBuzzBalance,
  useGetMyTrustBalance,
  useGetMyTrustTransactions,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { useSettings } from "../hooks/useSettings";
import { FONT_PAIRINGS, type FontSize } from "../lib/fontSettings";
import {
  DEFAULT_THEME,
  THEME_DISPLAY_NAMES,
  THEME_NAMES,
  applyVariant,
  getBaseTheme,
  getVariant,
} from "../lib/themes";
import type { TrustTransaction } from "../types/trustExtensions";
import { CreateBuzzModal } from "./CreateBuzzModal";

function maskApiKey(key: string): string {
  if (key.length < 8) return "••••••••••••••••";
  return `${key.slice(0, 4)}••••••••••••••••${key.slice(-4)}`;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { data: userProfile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const rawActor = useActor(createActor as Parameters<typeof useActor>[0]);
  const actor = rawActor.actor as backendInterface | null;
  const { fontPairing, setFontPairing, fontSize, setFontSize } = useSettings();

  const [createBuzzOpen, setCreateBuzzOpen] = useState(false);
  const { data: buzzBalance } = useGetMyBuzzBalance();
  const {
    data: trustBalance,
    refetch: refetchTrust,
    isRefetching: isTrustRefetching,
  } = useGetMyTrustBalance();
  const { data: trustTransactions, refetch: refetchTransactions } =
    useGetMyTrustTransactions();
  const [txLogOpen, setTxLogOpen] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [socialUrl, setSocialUrl] = useState("");

  // Plugin Binding state
  const [myPrincipal, setMyPrincipal] = useState<string | null>(null);
  const [pendingBindings, setPendingBindings] = useState<string[]>([]);
  const [pluginBound, setPluginBound] = useState<boolean>(false);
  const [principalCopied, setPrincipalCopied] = useState<boolean>(false);

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Load plugin binding data on mount
  useEffect(() => {
    if (!actor) return;
    (async () => {
      try {
        const principal = await actor.getMyPrincipal();
        setMyPrincipal(
          typeof (principal as { toText?: () => string }).toText === "function"
            ? (principal as { toText: () => string }).toText()
            : String(principal),
        );
      } catch {
        // ignore
      }
      try {
        const pending = await actor.getPendingPluginBindings();
        setPendingBindings(
          (pending as unknown[]).map((p) =>
            typeof (p as { toText?: () => string }).toText === "function"
              ? (p as { toText: () => string }).toText()
              : String(p),
          ),
        );
      } catch {
        // ignore
      }
      try {
        const bound = await actor.getPluginBindingStatus();
        setPluginBound(Boolean(bound));
      } catch {
        // ignore
      }
    })();
  }, [actor]);

  // Load API key on mount
  useEffect(() => {
    if (!actor) return;
    setApiKeyLoading(true);
    actor
      .getMyApiKey()
      .then((key) => setApiKey(key ?? null))
      .catch(() => setApiKey(null))
      .finally(() => setApiKeyLoading(false));
  }, [actor]);

  // Sync profile form with loaded data
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || "");
    }
  }, [userProfile]);

  const handleCopyPrincipal = () => {
    if (!myPrincipal) return;
    navigator.clipboard.writeText(myPrincipal);
    setPrincipalCopied(true);
    setTimeout(() => setPrincipalCopied(false), 2000);
  };

  const handleApproveBinding = async (key: string) => {
    if (!actor) return;
    const { Principal } = await import("@dfinity/principal");
    await actor.approvePluginBinding(Principal.fromText(key));
    setPendingBindings((prev) => prev.filter((k) => k !== key));
    toast.success("Plugin binding approved");
  };

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
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setProfileName(userProfile.name);
      setSocialUrl(userProfile.socialUrl || "");
    }
  };

  const currentTheme = theme || DEFAULT_THEME;
  const currentBase = getBaseTheme(currentTheme);
  const currentVariant = getVariant(currentTheme);

  const handleThemeChange = (newBase: string) => {
    setTheme(applyVariant(newBase, currentVariant));
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your appearance, profile, and API access.
          </p>
        </div>

        {/* Appearance Section */}
        <section className="space-y-5" data-ocid="settings.appearance.section">
          <h2 className="text-lg font-medium">Appearance</h2>
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-5">
            {/* Theme */}
            <div>
              <Label className="mb-1 block text-sm font-medium">Theme</Label>
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

            <Separator />

            {/* Font Pairing */}
            <div>
              <Label className="mb-1 block text-sm font-medium">
                Font Pairing
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Choose a heading + body font combination.
              </p>
              <Select value={fontPairing} onValueChange={setFontPairing}>
                <SelectTrigger
                  className="w-full font-mono text-sm"
                  data-ocid="settings.font-pairing.select"
                >
                  <SelectValue placeholder="Select font pairing" />
                </SelectTrigger>
                <SelectContent className="font-mono max-h-72">
                  {FONT_PAIRINGS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Font Size */}
            <div>
              <Label className="mb-3 block text-sm font-medium">
                Font Size
              </Label>
              <div className="flex gap-3">
                {(["small", "medium", "large"] as FontSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    data-ocid={`settings.font-size.${size}`}
                    className={`flex-1 rounded border px-3 py-2 text-xs font-mono capitalize transition-colors ${
                      fontSize === size
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Profile Section */}
        <section className="space-y-5" data-ocid="settings.profile.section">
          <h2 className="text-lg font-medium">Profile Information</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="settings-profileName">Profile Name</Label>
              <Input
                id="settings-profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your profile name"
                disabled={profileLoading || saveProfile.isPending}
                data-ocid="settings.profile.name_input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-socialUrl">Social URL (optional)</Label>
              <Input
                id="settings-socialUrl"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                placeholder="https://..."
                disabled={profileLoading || saveProfile.isPending}
                data-ocid="settings.profile.social_input"
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
        </section>

        <Separator />

        {/* Plugin Binding Section */}
        <section
          className="space-y-5"
          data-ocid="settings.plugin_binding.section"
        >
          <div>
            <h2 className="text-lg font-medium">Plugin Binding</h2>
            <p className="text-sm text-muted-foreground">
              Link the Obsidian plugin to your account so it can import folder
              data into your notes.
            </p>
          </div>

          {/* Principal ID subsection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Principal ID</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                {myPrincipal ?? "Loading..."}
              </code>
              <button
                type="button"
                onClick={handleCopyPrincipal}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                data-ocid="settings.plugin_binding.copy_principal_button"
              >
                {principalCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Pending bindings subsection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Pending Plugin Requests</p>
            {pendingBindings.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="settings.plugin_binding.empty_state"
              >
                No pending binding requests.
              </p>
            ) : (
              <div
                className="space-y-2"
                data-ocid="settings.plugin_binding.pending_list"
              >
                {pendingBindings.map((key, idx) => (
                  <div
                    key={key}
                    className="flex items-center gap-2"
                    data-ocid={`settings.plugin_binding.pending.item.${idx + 1}`}
                  >
                    <code className="font-mono text-xs">
                      {key.slice(0, 8)}...
                    </code>
                    <button
                      type="button"
                      onClick={() => handleApproveBinding(key)}
                      className="text-xs border border-border px-2 py-1 rounded hover:bg-muted"
                      data-ocid={`settings.plugin_binding.approve_button.${idx + 1}`}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Binding status subsection */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Binding Status</p>
            {pluginBound ? (
              <p
                className="text-sm text-green-600 dark:text-green-400"
                data-ocid="settings.plugin_binding.status_bound"
              >
                ✓ Plugin bound
              </p>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="settings.plugin_binding.status_unbound"
              >
                No plugin bound
              </p>
            )}
          </div>
        </section>

        <Separator />

        {/* API Key Section */}
        <section className="space-y-4" data-ocid="settings.api_key.section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">API Key</h2>
            <a
              href="/skills"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="settings.api_key.mcp_link"
            >
              Give your agent Hyvmind skills
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-sm text-primary font-medium">
            No API key required — Hyvmind is now open access
          </p>
          <div className="opacity-50 grayscale pointer-events-none space-y-4">
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
        </section>

        <Separator />

        {/* Wallet Section */}
        <section className="space-y-4" data-ocid="settings.wallet.section">
          <h2 className="text-lg font-medium">Wallet</h2>
          <p className="text-sm text-muted-foreground">
            Manage your Buzz and Trust balances.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p
                  className="text-sm font-medium"
                  data-ocid="settings.wallet.buzz_balance"
                >
                  {buzzBalance !== undefined
                    ? (Number(buzzBalance) / 10).toFixed(1)
                    : "0.0"}{" "}
                  <span className="text-muted-foreground">Buzz</span>
                </p>
                <p
                  className="text-sm text-muted-foreground"
                  data-ocid="settings.wallet.trust_balance"
                >
                  {trustBalance !== undefined
                    ? (Number(trustBalance) / 10_000_000).toFixed(7)
                    : "0.0000000"}{" "}
                  <span>Trust</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 align-middle"
                    onClick={() => {
                      refetchTrust();
                      refetchTransactions();
                    }}
                    data-ocid="settings.wallet.refresh_trust"
                  >
                    <RotateCcw
                      className={`h-3 w-3${isTrustRefetching ? " animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 align-middle"
                    onClick={() => setTxLogOpen(true)}
                    data-ocid="settings.wallet.trust_tx_log"
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateBuzzOpen(true)}
                data-ocid="settings.wallet.create_buzz_button"
              >
                Create Buzz
              </Button>
            </div>
          </div>
        </section>

        <CreateBuzzModal
          isOpen={createBuzzOpen}
          onClose={() => setCreateBuzzOpen(false)}
        />

        <Dialog open={txLogOpen} onOpenChange={setTxLogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Trust Transactions</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {trustTransactions && trustTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Saver</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Buzz Base</TableHead>
                      <TableHead>Trust Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trustTransactions.map((tx: TrustTransaction) => (
                      <TableRow
                        key={`${String(tx.saver)}-${String(tx.savedAt)}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {typeof (tx.saver as { toText?: () => string })
                            .toText === "function"
                            ? `${(tx.saver as { toText: () => string }).toText().slice(0, 10)}...`
                            : `${String(tx.saver).slice(0, 10)}...`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(
                            Number(tx.savedAt) / 1_000_000,
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {`\u221a${tx.saveNumber.toString()}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(Number(tx.totalBuzzCost) / 10).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(Number(tx.earned) / 10_000_000).toFixed(7)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No trust transactions yet.
                </p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
