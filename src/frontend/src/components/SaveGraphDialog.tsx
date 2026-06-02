import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ContributionView,
  CreditedContribution,
  GraphData,
} from "../backend.d";
import type { PublishedSourceGraphMeta } from "../hooks/usePublicGraphs";
import { useBackendActor, useSavePublishedGraph } from "../hooks/useQueries";
import type { TrustBackendExtensions } from "../types/trustExtensions";
import { graphDataToSourceGraph } from "../utils/graphDataConverter";
import { graphDataToEditorNodes } from "../utils/graphDataToEditorNodes";
import SourceGraphDiagram from "./SourceGraphDiagram";

const EMPTY_CONTRIBS: ContributionView[] = [];

interface SaveGraphDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graphName: string;
  graphData: GraphData;
  graphId: string;
  meta: PublishedSourceGraphMeta;
}

function filterGraphDataByNodeIds(
  graphData: GraphData,
  nodeIds: Set<string>,
): GraphData {
  return {
    curations: graphData.curations.filter((c) => nodeIds.has(c.id)),
    swarms: graphData.swarms.filter((s) => nodeIds.has(s.id)),
    locations: graphData.locations.filter((l) => nodeIds.has(l.id)),
    lawTokens: graphData.lawTokens.filter((lt) => nodeIds.has(lt.id)),
    interpretationTokens: graphData.interpretationTokens.filter((it) =>
      nodeIds.has(it.id),
    ),
    rootNodes: graphData.rootNodes.filter((r) => nodeIds.has(r.id)),
    edges: graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    ),
    sources: graphData.sources,
  };
}

interface ChecklistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graphName: string;
  graphId: string;
  graphData: GraphData;
  meta: PublishedSourceGraphMeta;
  coreLabel: string;
  coreStatLabel: string;
  extEntries: Array<{
    index: number;
    label: string;
    statLabel: string;
  }>;
  checkedExtensions: Set<number>;
  extNodeIdsByIndex: Map<number, Set<string>>;
  coreNodeIds: Set<string>;
  allCoreCredited: boolean;
  selectedExtCount: number;
  canSave: boolean;
  handleToggleExtension: (index: number) => void;
  handleSave: () => void;
  handleOpenChange: (open: boolean) => void;
  alertMode: null | "confirm" | "loading" | "result";
  resultData: {
    contributions?: CreditedContribution[];
    noNewTrust?: string;
  } | null;
  onSaveConfirm: () => void;
  onDismissAlert: () => void;
}

function ChecklistDialog({
  isOpen,
  onClose,
  graphName,
  graphId,
  graphData,
  meta,
  coreLabel,
  coreStatLabel,
  extEntries,
  checkedExtensions,
  extNodeIdsByIndex,
  coreNodeIds,
  allCoreCredited,
  selectedExtCount,
  canSave,
  handleToggleExtension,
  handleSave,
  handleOpenChange,
  alertMode,
  resultData,
  onSaveConfirm,
  onDismissAlert,
}: ChecklistDialogProps) {
  const [previewPhase, setPreviewPhase] = useState<
    { kind: "core" } | { kind: "extension"; index: number } | null
  >(null);

  const previewNodeIds = useMemo(() => {
    if (!previewPhase) return null;
    if (previewPhase.kind === "core") return coreNodeIds;
    return extNodeIdsByIndex.get(previewPhase.index) ?? new Set<string>();
  }, [previewPhase, coreNodeIds, extNodeIdsByIndex]);

  const previewGraph = useMemo(() => {
    if (!previewNodeIds || previewNodeIds.size === 0) return null;
    const filtered = filterGraphDataByNodeIds(graphData, previewNodeIds);
    const previewId =
      previewPhase?.kind === "core"
        ? `${graphId}-core`
        : `${graphId}-ext${previewPhase?.index ?? 0}`;
    const previewName =
      previewPhase?.kind === "core"
        ? `${coreLabel}`
        : `${extEntries.find((e) => e.index === (previewPhase as { index: number }).index)?.label ?? ""}`;
    return graphDataToSourceGraph(filtered, previewName, previewId);
  }, [previewNodeIds, graphData, previewPhase, graphId, coreLabel, extEntries]);

  const handleRowClick = useCallback(
    (phase: { kind: "core" } | { kind: "extension"; index: number }) => {
      setPreviewPhase((prev) =>
        prev?.kind === phase.kind &&
        (phase.kind === "core" ||
          prev.kind === "core" ||
          (prev as { index: number }).index ===
            (phase as { index: number }).index)
          ? null
          : phase,
      );
    },
    [],
  );

  const showPreview = previewGraph !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={showPreview ? "sm:max-w-4xl" : "sm:max-w-lg"}
        showCloseButton={!alertMode || alertMode === "result"}
      >
        {!alertMode ? (
          <>
            <DialogHeader>
              <DialogTitle>Save Graph to Notes</DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-xs">
              Select extensions from{" "}
              <span className="text-foreground">{graphName}</span> to import
              into your Notes workspace. Core contributions are always imported.
            </DialogDescription>

            <div className="space-y-3">
              <div className="rounded-sm border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    className="text-xs font-semibold text-left hover:underline"
                    onClick={() => handleRowClick({ kind: "core" })}
                  >
                    Core
                  </button>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    always imported{allCoreCredited ? " (already saved)" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-full text-left text-[11px] text-muted-foreground leading-relaxed hover:underline"
                  onClick={() => handleRowClick({ kind: "core" })}
                >
                  {coreLabel}
                </button>
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                  {coreStatLabel}
                </p>
              </div>

              {extEntries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2">Extensions</p>
                  <div className="space-y-2">
                    {extEntries.map((ext) => (
                      <div
                        key={ext.index}
                        className="rounded-sm border border-border p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Checkbox
                            checked={checkedExtensions.has(ext.index)}
                            onCheckedChange={() =>
                              handleToggleExtension(ext.index)
                            }
                            className="h-3.5 w-3.5 flex-shrink-0"
                          />
                          <button
                            type="button"
                            className="text-xs text-left hover:underline flex-1"
                            onClick={() =>
                              handleRowClick({
                                kind: "extension",
                                index: ext.index,
                              })
                            }
                          >
                            {ext.label}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 font-mono ml-6">
                          {ext.statLabel}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showPreview && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold mb-2">
                  {previewPhase?.kind === "core"
                    ? coreLabel
                    : extEntries.find(
                        (e) =>
                          e.index ===
                          (previewPhase as { index: number })?.index,
                      )?.label}
                </p>
                <div className="h-[350px] rounded-sm border border-border bg-background">
                  <SourceGraphDiagram graph={previewGraph} />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                Save
                {extEntries.length > 0
                  ? ` (core${selectedExtCount > 0 ? ` + ${selectedExtCount}` : ""})`
                  : allCoreCredited
                    ? " (none)"
                    : ""}
              </Button>
            </DialogFooter>
          </>
        ) : alertMode === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Save this graph?</DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-sm text-muted-foreground">
              Core by {meta.creatorName}
              {extEntries.length > 0 &&
                selectedExtCount > 0 &&
                ` + ${selectedExtCount} extension${selectedExtCount !== 1 ? "s" : ""} selected`}{" "}
              will be imported into your Notes.
            </DialogDescription>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onDismissAlert}>
                Cancel
              </Button>
              <Button type="button" onClick={onSaveConfirm}>
                Save to Notes
              </Button>
            </DialogFooter>
          </>
        ) : alertMode === "loading" ? (
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <DialogHeader>
              <DialogTitle>Saving...</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
              Please wait while your graph is being saved.
            </p>
          </div>
        ) : resultData ? (
          <>
            <DialogHeader>
              <DialogTitle>Save Result</DialogTitle>
            </DialogHeader>
            {resultData.noNewTrust ? (
              <DialogDescription className="text-sm">
                {resultData.noNewTrust}
              </DialogDescription>
            ) : resultData.contributions &&
              resultData.contributions.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {resultData.contributions.map((c) => (
                  <div
                    key={c.contributionId}
                    className="text-xs border-b border-border pb-1"
                  >
                    <p className="text-foreground">{c.description}</p>
                    <p className="text-muted-foreground">
                      +{(Number(c.earned) / 10_000_000).toFixed(7)} Trust · Save
                      #{c.saveCount.toString()} ·{" "}
                      {(Number(c.buzzAmount) / 10).toFixed(1)} Buzz
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const ChecklistDialogMemo = memo(ChecklistDialog);

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatLabel(
  nodeCount: bigint | number,
  edgeCount: bigint | number,
  attrCount: bigint | number,
): string {
  const n = Number(nodeCount);
  const e = Number(edgeCount);
  const a = Number(attrCount);
  return `${n} node${n !== 1 ? "s" : ""} · ${e} edge${e !== 1 ? "s" : ""} · ${a} attr${a !== 1 ? "s" : ""}`;
}

export default function SaveGraphDialog({
  isOpen,
  onClose,
  graphName,
  graphData,
  graphId,
  meta,
}: SaveGraphDialogProps) {
  const savePublishedGraph = useSavePublishedGraph();
  const { actor } = useBackendActor();

  const [checkedExtensions, setCheckedExtensions] = useState<Set<number>>(
    new Set(),
  );
  const [alertMode, setAlertMode] = useState<
    null | "confirm" | "loading" | "result"
  >(null);
  const [resultData, setResultData] = useState<{
    contributions?: CreditedContribution[];
    noNewTrust?: string;
  } | null>(null);

  const { data: contributions = EMPTY_CONTRIBS } = useQuery({
    queryKey: ["graphContributions", graphId],
    queryFn: async () => {
      const ext = actor as unknown as TrustBackendExtensions;
      const result = await ext.getGraphContributions(graphId);
      return result ?? [];
    },
    enabled: isOpen && !!graphId && !!actor,
  });

  const ensureMigration = useMutation({
    mutationFn: async () => {
      const ext = actor as unknown as TrustBackendExtensions;
      await ext.ensureContributionsMigrated(graphId);
    },
  });

  useEffect(() => {
    if (isOpen && graphId) {
      ensureMigration.mutate();
    }
  }, [isOpen, graphId, ensureMigration]);

  const coreContribs = useMemo(
    () => contributions.filter((c) => !c.isFromExtension),
    [contributions],
  );

  const extContribsByIndex = useMemo(() => {
    const map = new Map<number, ContributionView[]>();
    for (const c of contributions) {
      if (!c.isFromExtension || c.extensionIndex == null) continue;
      const idx = Number(c.extensionIndex);
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(c);
    }
    return map;
  }, [contributions]);

  const coreNodeIds = useMemo(
    () => new Set(coreContribs.map((c) => c.nodeId)),
    [coreContribs],
  );

  const extNodeIdsByIndex = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const [idx, contribs] of extContribsByIndex) {
      map.set(idx, new Set(contribs.map((c) => c.nodeId)));
    }
    return map;
  }, [extContribsByIndex]);

  const allCoreCredited = useMemo(
    () =>
      coreContribs.length > 0 && coreContribs.every((c) => c.alreadyCredited),
    [coreContribs],
  );

  const coreStatLabel = useMemo(
    () => formatStatLabel(meta.nodeCount, meta.edgeCount, meta.attributeCount),
    [meta],
  );

  const coreLabel = useMemo(() => {
    const pubMs = Number(meta.publishedAt) / 1_000_000;
    return `by ${meta.creatorName} · ${formatDate(pubMs)}`;
  }, [meta]);

  const extEntries = useMemo(() => {
    return meta.extensionLog.map((entry, i) => {
      const idx = i;
      const extendedMs = Number(entry.extendedAt) / 1_000_000;
      const label = `by ${entry.extendedByName} · ${formatDate(extendedMs)}`;
      const statLabel = `+${Number(entry.addedNodes)} node${Number(entry.addedNodes) !== 1 ? "s" : ""} · +${Number(entry.addedEdges)} edge${Number(entry.addedEdges) !== 1 ? "s" : ""} · +${Number(entry.addedAttributes)} attr${Number(entry.addedAttributes) !== 1 ? "s" : ""}`;
      return { index: idx, label, statLabel };
    });
  }, [meta]);

  const selectedExtCount = checkedExtensions.size;

  const canSave = useMemo(() => {
    if (!allCoreCredited) return true;
    return selectedExtCount > 0;
  }, [allCoreCredited, selectedExtCount]);

  const handleToggleExtension = useCallback((index: number) => {
    setCheckedExtensions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => setAlertMode("confirm"), []);

  const handleConfirmSave = async () => {
    setAlertMode("loading");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const selectedNodeIds = new Set(coreNodeIds);
      for (const extIdx of checkedExtensions) {
        const extIds = extNodeIdsByIndex.get(extIdx);
        if (extIds) {
          for (const nodeId of extIds) {
            selectedNodeIds.add(nodeId);
          }
        }
      }
      const result = await savePublishedGraph.mutateAsync({
        publishedGraphId: graphId,
        selectedContributionIds: Array.from(selectedNodeIds),
      });
      if ("ok" in result) {
        const { nodes, rootIds: importRootIds } = graphDataToEditorNodes(
          graphData,
          selectedNodeIds,
          graphName,
        );
        window.dispatchEvent(
          new CustomEvent("hyvmind:import-nodes", {
            detail: { nodes, rootIds: importRootIds },
          }),
        );
        setResultData({ contributions: result.ok.contributions });
        setAlertMode("result");
        toast.success("Graph saved to Notes!");
      } else if ("noNewTrust" in result) {
        setResultData({ noNewTrust: result.noNewTrust.reason });
        setAlertMode("result");
      } else {
        setAlertMode(null);
        toast.error(result.err ?? "Failed to save graph");
      }
    } catch (err) {
      setAlertMode(null);
      console.error("Failed to save graph:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save graph");
    }
  };

  const handleDismissAlert = () => {
    if (alertMode === "loading") return;
    setAlertMode(null);
    setResultData(null);
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (alertMode === "loading") return;
        if (alertMode !== null) {
          setAlertMode(null);
          setResultData(null);
          return;
        }
        onClose();
      }
    },
    [onClose, alertMode],
  );

  return (
    <ChecklistDialogMemo
      isOpen={isOpen}
      onClose={onClose}
      graphName={graphName}
      graphId={graphId}
      graphData={graphData}
      meta={meta}
      coreLabel={coreLabel}
      coreStatLabel={coreStatLabel}
      extEntries={extEntries}
      checkedExtensions={checkedExtensions}
      extNodeIdsByIndex={extNodeIdsByIndex}
      coreNodeIds={coreNodeIds}
      allCoreCredited={allCoreCredited}
      selectedExtCount={selectedExtCount}
      canSave={canSave}
      handleToggleExtension={handleToggleExtension}
      handleSave={handleSave}
      handleOpenChange={handleOpenChange}
      alertMode={alertMode}
      resultData={resultData}
      onSaveConfirm={handleConfirmSave}
      onDismissAlert={handleDismissAlert}
    />
  );
}
