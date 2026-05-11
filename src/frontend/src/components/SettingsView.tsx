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
  const [boundPluginKeys, setBoundPluginKeys] = useState<string[]>([]);
  const [pluginBound, setPluginBound] = useState<boolean>(false);
  const [principalCopied, setPrincipalCopied] = useState<boolean>(false);
  const [pluginSectionLoading, setPluginSectionLoading] =
    useState<boolean>(false);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);

  // Load plugin binding data on mount
  useEffect(() => {
    if (!actor) return;
    setPluginSectionLoading(true);
    (async () => {
      try {
        const toStr = (p: unknown) =>
          typeof (p as { toText?: () => string }).toText === "function"
            ? (p as { toText: () => string }).toText()
            : String(p);
        const [principal, pending, bound, boundKeys] = await Promise.allSettled(
          [
            actor.getMyPrincipal(),
            actor.getPendingPluginBindings(),
            actor.getPluginBindingStatus(),
            actor.getBoundPluginKeys(),
          ],
        );
        if (principal.status === "fulfilled")
          setMyPrincipal(toStr(principal.value));
        if (pending.status === "fulfilled")
          setPendingBindings((pending.value as unknown[]).map(toStr));
        if (bound.status === "fulfilled") setPluginBound(Boolean(bound.value));
        if (boundKeys.status === "fulfilled")
          setBoundPluginKeys((boundKeys.value as unknown[]).map(toStr));
      } catch (e) {
        toast.error("Failed to load plugin binding data");
        console.error(e);
      } finally {
        setPluginSectionLoading(false);
      }
    })();
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
    setApprovingKey(key);
    try {
      const { Principal } = await import("@dfinity/principal");
      await actor.approvePluginBinding(Principal.fromText(key));
      setPendingBindings((prev) => prev.filter((k) => k !== key));
      // Refresh bound keys and status after approval
      const [boundKeys, status] = await Promise.allSettled([
        actor.getBoundPluginKeys(),
        actor.getPluginBindingStatus(),
      ]);
      const toStr = (p: unknown) =>
        typeof (p as { toText?: () => string }).toText === "function"
          ? (p as { toText: () => string }).toText()
          : String(p);
      if (boundKeys.status === "fulfilled")
        setBoundPluginKeys((boundKeys.value as unknown[]).map(toStr));
      if (status.status === "fulfilled") setPluginBound(Boolean(status.value));
      toast.success("Plugin binding approved");
    } catch {
      toast.error("Failed to approve plugin binding");
    } finally {
      setApprovingKey(null);
    }
  };

  const handleRevokeBinding = async (key: string) => {
    if (!actor) return;
    setRevokingKey(key);
    try {
      const { Principal } = await import("@dfinity/principal");
      await actor.revokePluginBinding(Principal.fromText(key));
      setBoundPluginKeys((prev) => prev.filter((k) => k !== key));
      setConfirmRevokeKey(null);
      // Refresh status after revoke
      try {
        const newStatus = await actor.getPluginBindingStatus();
        setPluginBound(Boolean(newStatus));
      } catch {
        // ignore
      }
      toast.success("Plugin binding revoked");
    } catch {
      toast.error("Failed to revoke plugin binding");
    } finally {
      setRevokingKey(null);
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
            Manage your appearance and profile.
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
              Link this Obsidian plugin to your Hyvmind account so uploaded
              notes appear here.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-5">
            {/* Principal ID subsection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Your Principal ID</p>
              <p className="text-xs text-muted-foreground">
                Copy this into the Obsidian plugin so it can request binding.
              </p>
              {pluginSectionLoading && !myPrincipal ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <code
                    className="font-mono text-xs bg-muted px-2 py-1 rounded break-all"
                    data-ocid="settings.plugin_binding.principal_display"
                  >
                    {myPrincipal ?? "—"}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPrincipal}
                    disabled={!myPrincipal}
                    className="shrink-0"
                    data-ocid="settings.plugin_binding.copy_principal_button"
                  >
                    {principalCopied ? (
                      <Check className="h-4 w-4 text-foreground" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Binding status indicator */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Binding Status</p>
              {pluginSectionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : pluginBound ? (
                <p
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.55 0.15 145)" }}
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

            {/* Pending bindings subsection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Pending Plugin Requests</p>
              {pluginSectionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : pendingBindings.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-ocid="settings.plugin_binding.pending.empty_state"
                >
                  (no pending requests)
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
                      <code className="font-mono text-xs flex-1 truncate">
                        {key.slice(0, 20)}...
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approvingKey === key}
                        onClick={() => handleApproveBinding(key)}
                        data-ocid={`settings.plugin_binding.approve_button.${idx + 1}`}
                      >
                        {approvingKey === key ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          "Approve"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bound plugin keys subsection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Bound Plugin Keys</p>
              {pluginSectionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : boundPluginKeys.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-ocid="settings.plugin_binding.bound.empty_state"
                >
                  (no bound plugins)
                </p>
              ) : (
                <div
                  className="space-y-3"
                  data-ocid="settings.plugin_binding.bound_list"
                >
                  {boundPluginKeys.map((key, idx) => (
                    <div
                      key={key}
                      className="space-y-2"
                      data-ocid={`settings.plugin_binding.bound.item.${idx + 1}`}
                    >
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs flex-1 truncate">
                          {key.slice(0, 20)}...
                        </code>
                        {confirmRevokeKey !== key ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive hover:text-destructive shrink-0"
                            onClick={() => setConfirmRevokeKey(key)}
                            data-ocid={`settings.plugin_binding.revoke_button.${idx + 1}`}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Revoke
                          </Button>
                        ) : (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmRevokeKey(null)}
                              disabled={revokingKey === key}
                              data-ocid={`settings.plugin_binding.cancel_revoke_button.${idx + 1}`}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={revokingKey === key}
                              onClick={() => handleRevokeBinding(key)}
                              data-ocid={`settings.plugin_binding.confirm_revoke_button.${idx + 1}`}
                            >
                              {revokingKey === key ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Revoking...
                                </>
                              ) : (
                                "Confirm Revoke"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      {confirmRevokeKey === key && (
                        <p className="text-xs text-muted-foreground">
                          This will disconnect the plugin. It will need to
                          re-bind to send notes again.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

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
