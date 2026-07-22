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
import { Fragment, useEffect, useState } from "react";
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
import { copyText } from "../lib/clipboard";
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

function parseEntity(description: string): string {
  const createMatch = description.match(
    /^Created\s+(curation|swarm|location|law entity|interpretation)\s+'(.+)'$/,
  );
  if (createMatch) {
    return `${createMatch[1]}: ${createMatch[2]}`;
  }
  const crossRefMatch = description.match(
    /^Added\s+(\d+)\s+cross-reference[s]?\s+from\s+'(.+)'$/,
  );
  if (crossRefMatch) {
    return `cross-ref from ${crossRefMatch[2]} (×${crossRefMatch[1]})`;
  }
  return description;
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
  const [expandedTxs, setExpandedTxs] = useState<Set<string>>(new Set());

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
  const [skillPromptCopied, setSkillPromptCopied] = useState(false);
  const [selectedSection, setSelectedSection] =
    useState<string>("settings-profile");
  const [sectionNavCollapsed, setSectionNavCollapsed] = useState(false);

  const SAMPLE_PROMPT = `You have access to the Hyvmind knowledge graph retrieval API for legal knowledge.

Only use this API when the user explicitly mentions "Hyvmind" or "hyvmind" — do not auto-trigger on general legal questions.

Base URL: https://4p5ty-yyaaa-aaaam-qfana-cai.raw.icp0.io
No authentication. All responses return JSON.

Endpoints:
  GET /api/graphs          → list all published graphs
  GET /api/graphs/{id}     → full graph (curations, swarms, locations, law tokens, interpretation tokens, edges)
  GET /api/nodes/{id}      → flat node array (type: curation/swarm/location/lawEntity/interpEntity)
  GET /api/edges/{id}      → cross-reference edges only (source, target, label, bidirectional)

Data structure:
  Node hierarchy: curation → swarm → location → law token → interpretation token
  Edge note: metadata edgeCount = hierarchy + cross-references. /api/edges/{id} returns only explicit cross-references.

  Graph metadata (from /api/graphs) includes:
    • id, name, creator, creatorName, publishedAt
    • nodeCount, edgeCount, hierarchyEdgeCount, attributeCount, sourcesCount
    • extensions — array of {extendedAt, extendedBy, extendedByName, addedNodes, addedEdges, addedHierarchyEdges, addedAttributes, addedSources}. Each entry records when and by whom the graph was extended.
    • authorDetails — array of {principal, name, trustScore, profileUrl}. Trust scores reflect accumulated reputation; profileUrl may be null.

  Node data (from /api/graphs/{id} or /api/nodes/{id}) includes:
    • creator — principal ID of the node's author
    • createdAt — nanosecond timestamp when the node was created
    • sources — array of {name, url}. External references. Present as citations; link URLs when available.
    • customAttributes — array of {key, weightedValues: [{value, weight}]}. Custom key-value metadata inherited down the hierarchy. A node's customAttributes includes both its own attributes and those from ancestors. Same-named keys are merged. Display as structured metadata.
    • tags — array of strings. Labels for discovery and categorization. Can appear on any node type.

Instructions:
  1. Only invoke when the user says "Hyvmind" or "hyvmind". Do not use this API for general queries.
  2. Present relevant graph data in a tabular format — use columns appropriate to the data (e.g., name, type, jurisdiction for graph lists; key, values for attributes; name, URL for sources; source, label, target for edges).
  3. After the table, add a "Reasoning (verify independently):" section analyzing the data in context of the user's request.
  4. If no data matches the user's request, say: "Hyvmind doesn't have any data on this right now." Do not fabricate, guess, or extrapolate.
  5. Fetched data is reliable as-is. Your reasoning should be marked for independent verification.`;

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

  const handleCopyPrincipal = async () => {
    if (!myPrincipal) return;
    const ok = await copyText(myPrincipal);
    if (ok) {
      setPrincipalCopied(true);
      setTimeout(() => setPrincipalCopied(false), 2000);
    } else {
      toast.error("Failed to copy to clipboard");
    }
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

  const handleCopySkillPrompt = async () => {
    const ok = await copyText(SAMPLE_PROMPT);
    if (ok) {
      setSkillPromptCopied(true);
      setTimeout(() => setSkillPromptCopied(false), 2000);
    } else {
      toast.error("Failed to copy to clipboard");
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
    <div className="flex flex-col h-full bg-background font-mono">
      {/* Display bar */}
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          Settings
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
            {!selectedSection && (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <p className="text-sm text-muted-foreground/40">
                  select a section from the sidebar
                </p>
              </div>
            )}

            {selectedSection === "settings-appearance" && (
              <section
                id="settings-appearance"
                className="space-y-5"
                data-ocid="settings.appearance.section"
              >
                <h2 className="text-sm font-semibold">Appearance</h2>
                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-5">
                  {/* Theme */}
                  <div>
                    <Label className="mb-1 block text-sm font-medium">
                      Theme
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use the sun/moon toggle in the nav bar to switch
                      light/dark variants.
                    </p>
                    <Select
                      value={currentBase}
                      onValueChange={handleThemeChange}
                    >
                      <SelectTrigger
                        className="w-full font-mono text-sm"
                        data-ocid="settings.theme_select"
                      >
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent className="font-mono max-h-72">
                        {THEME_NAMES.map((slug) => (
                          <SelectItem
                            key={slug}
                            value={slug}
                            className="text-sm"
                          >
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
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-sm"
                          >
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
                      {(
                        [
                          "small",
                          "medium",
                          "large",
                          "huge",
                          "colossal",
                        ] as FontSize[]
                      ).map((size) => (
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
            )}

            {selectedSection === "settings-profile" && (
              <section
                id="settings-profile"
                className="space-y-5"
                data-ocid="settings.profile.section"
              >
                <h2 className="text-sm font-semibold">Profile</h2>
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
                    <Label htmlFor="settings-socialUrl">
                      Social URL (optional)
                    </Label>
                    <Input
                      id="settings-socialUrl"
                      value={socialUrl}
                      onChange={(e) => setSocialUrl(e.target.value)}
                      placeholder="https://example.com/@you"
                      disabled={profileLoading || saveProfile.isPending}
                      data-ocid="settings.profile.social_url_input"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={profileLoading || saveProfile.isPending}
                      data-ocid="settings.profile.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSave}
                      disabled={profileLoading || saveProfile.isPending}
                      data-ocid="settings.profile.save_button"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {selectedSection === "settings-obsidian" && (
              <section
                id="settings-obsidian"
                className="space-y-5"
                data-ocid="settings.plugin_binding.section"
              >
                <h2 className="text-sm font-semibold">Plugin Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Download and install 'Hyvmind Uploader' from Obsidian's
                  Community Plugins, or click{" "}
                  <a
                    href="https://community.obsidian.md/plugins/hyvmind-uploader"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    here
                  </a>
                  .
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-5">
                  {/* Principal ID subsection */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your Principal ID</p>
                    <p className="text-xs text-muted-foreground">
                      Copy this into the Obsidian plugin so it can request
                      binding.
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
                        <button
                          type="button"
                          onClick={handleCopyPrincipal}
                          disabled={!myPrincipal}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/80 px-2 py-1 rounded shrink-0 disabled:opacity-50"
                          data-ocid="settings.plugin_binding.copy_principal_button"
                        >
                          {principalCopied ? (
                            <>
                              <Check className="h-3 w-3" /> copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> copy
                            </>
                          )}
                        </button>
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
                    <p className="text-sm font-medium">
                      Pending Plugin Requests
                    </p>
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
            )}

            {selectedSection === "settings-wallet" && (
              <section
                id="settings-wallet"
                className="space-y-4"
                data-ocid="settings.wallet.section"
              >
                <h2 className="text-sm font-semibold">Wallet</h2>
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
                            className={`h-3 w-3${isTrustRefetching ? " animate-spin [animation-direction:reverse]" : ""}`}
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
            )}

            {selectedSection === "settings-skills" && (
              <section
                id="settings-skills"
                className="space-y-5"
                data-ocid="settings.skills.section"
              >
                <h2 className="text-sm font-semibold">Skill</h2>
                <p className="text-sm text-muted-foreground">
                  Give your AI agent access to Hyvmind's knowledge graphs.
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                  <p className="text-sm font-medium">What this is</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The Hyvmind graph API is a public, no-auth retrieval
                    endpoint. It returns published legal knowledge graphs —
                    curations of law tokens, interpretation tokens, and their
                    cross-references — as structured JSON.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                  <p className="text-sm font-medium">How to use</p>
                  <p className="text-xs text-muted-foreground">
                    Copy the prompt below and provide it to your AI agent. It
                    tells the agent everything it needs to use the Hyvmind graph
                    API.
                  </p>
                  <div className="relative">
                    <pre className="text-xs font-mono text-foreground bg-muted/40 p-4 rounded border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {SAMPLE_PROMPT}
                    </pre>
                    <button
                      type="button"
                      onClick={handleCopySkillPrompt}
                      className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/80 px-2 py-1 rounded"
                      data-ocid="settings.skills.copy_prompt"
                    >
                      {skillPromptCopied ? (
                        <>
                          <Check className="h-3 w-3" /> copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}

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
                          <TableHead className="w-8" />
                          <TableHead>Saver</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Trust Earned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trustTransactions.map((tx: TrustTransaction) => {
                          const txKey = `${String(tx.saver)}-${String(tx.savedAt)}`;
                          const isExpanded = expandedTxs.has(txKey);
                          const toggle = () => {
                            const next = new Set(expandedTxs);
                            if (isExpanded) {
                              next.delete(txKey);
                            } else {
                              next.add(txKey);
                            }
                            setExpandedTxs(next);
                          };
                          const fmtPrincipal = (p: typeof tx.saver) =>
                            typeof (p as { toText?: () => string }).toText ===
                            "function"
                              ? `${(p as { toText: () => string }).toText().slice(0, 10)}...`
                              : `${String(p).slice(0, 10)}...`;

                          const hasDetails =
                            tx.contributionDetails &&
                            tx.contributionDetails.length > 0;

                          return (
                            <Fragment key={txKey}>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={toggle}
                              >
                                <TableCell className="text-xs text-muted-foreground">
                                  {isExpanded ? "\u25bc" : "\u25b6"}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {fmtPrincipal(tx.saver)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(
                                    Number(tx.savedAt) / 1_000_000,
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {(Number(tx.earned) / 10_000_000).toFixed(7)}
                                </TableCell>
                              </TableRow>
                              {isExpanded && hasDetails && (
                                <>
                                  <TableRow className="border-b-0 hover:bg-transparent">
                                    <TableCell />
                                    <TableCell colSpan={3} className="py-0.5">
                                      <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium uppercase tracking-wider pl-4 py-0.5">
                                        <span className="col-span-8">
                                          Entity
                                        </span>
                                        <span className="col-span-2">
                                          Multiplier
                                        </span>
                                        <span className="col-span-2">
                                          Earned
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {tx.contributionDetails.map((detail) => (
                                    <TableRow
                                      key={`${txKey}-detail-${detail.contributionId}`}
                                      className="border-t-0 hover:bg-muted/30"
                                    >
                                      <TableCell />
                                      <TableCell colSpan={3} className="py-0.5">
                                        <div className="grid grid-cols-12 gap-1 text-xs pl-4">
                                          <span className="col-span-8 truncate">
                                            {parseEntity(detail.description)}
                                          </span>
                                          <span className="col-span-2">
                                            {"\u221a"}
                                            {detail.saveCount.toString()}
                                          </span>
                                          <span className="col-span-2">
                                            {(
                                              Number(detail.earned) / 10_000_000
                                            ).toFixed(7)}
                                          </span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              )}
                              {isExpanded && !hasDetails && (
                                <TableRow className="border-t-0 hover:bg-transparent">
                                  <TableCell />
                                  <TableCell
                                    colSpan={3}
                                    className="py-1 text-xs text-muted-foreground pl-4 italic"
                                  >
                                    (no per-contribution breakdown available)
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
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

        {/* ── Sidebar (right) ── */}
        <aside
          className={`${sectionNavCollapsed ? "w-fit max-w-[40px] min-w-0" : "w-fit max-w-[400px] min-w-[120px]"} shrink-0 border-l border-dashed border-border bg-card flex flex-col overflow-hidden transition-all duration-200`}
        >
          {sectionNavCollapsed ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="[writing-mode:vertical-rl] text-xs uppercase tracking-widest text-muted-foreground/50 select-none">
                SECTIONS
              </span>
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5 border-b border-dashed border-border shrink-0">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  sections
                </span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("settings-profile");
                    document
                      .getElementById("settings-profile")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors rounded ${
                    selectedSection === "settings-profile"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-ocid="settings.nav.profile"
                >
                  profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("settings-appearance");
                    document
                      .getElementById("settings-appearance")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors rounded ${
                    selectedSection === "settings-appearance"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-ocid="settings.nav.appearance"
                >
                  appearance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("settings-obsidian");
                    document
                      .getElementById("settings-obsidian")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors rounded ${
                    selectedSection === "settings-obsidian"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-ocid="settings.nav.obsidian"
                >
                  obsidian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("settings-skills");
                    document
                      .getElementById("settings-skills")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors rounded ${
                    selectedSection === "settings-skills"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-ocid="settings.nav.skills"
                >
                  skill
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection("settings-wallet");
                    document
                      .getElementById("settings-wallet")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors rounded ${
                    selectedSection === "settings-wallet"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-ocid="settings.nav.wallet"
                >
                  wallet
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setSectionNavCollapsed(!sectionNavCollapsed)}
            className="p-2 w-full text-center text-muted-foreground hover:text-foreground border-t border-dashed border-border shrink-0"
          >
            {sectionNavCollapsed ? "\u00AB" : "\u00BB"}
          </button>
        </aside>
      </div>
    </div>
  );
}
