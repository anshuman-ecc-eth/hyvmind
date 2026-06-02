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
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ContributionView,
  CreditedContribution,
  GraphData,
} from "../backend.d";
import {
  useBackendActor,
  useHasUserSavedGraph,
  useSavePublishedGraph,
} from "../hooks/useQueries";
import type { TrustBackendExtensions } from "../types/trustExtensions";
import { graphDataToEditorNodes } from "../utils/graphDataToEditorNodes";

const EMPTY_CONTRIBS: ContributionView[] = [];

interface SaveGraphDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graphName: string;
  graphData: GraphData;
  graphId: string;
}

interface TreeNodeData {
  id: string;
  name: string;
  nodeType: string;
  depth: number;
  parentId: string | null;
  childrenIds: string[];
}

function buildTree(data: GraphData): {
  nodes: Map<string, TreeNodeData>;
  rootIds: string[];
} {
  const nodes = new Map<string, TreeNodeData>();
  for (const c of data.curations) {
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      nodeType: "curation",
      depth: 0,
      parentId: null,
      childrenIds: [],
    });
  }
  for (const s of data.swarms) {
    nodes.set(s.id, {
      id: s.id,
      name: s.name,
      nodeType: "swarm",
      depth: 1,
      parentId: s.parentCurationId,
      childrenIds: [],
    });
    nodes.get(s.parentCurationId)?.childrenIds.push(s.id);
  }
  for (const l of data.locations) {
    nodes.set(l.id, {
      id: l.id,
      name: l.title,
      nodeType: "location",
      depth: 2,
      parentId: l.parentSwarmId,
      childrenIds: [],
    });
    nodes.get(l.parentSwarmId)?.childrenIds.push(l.id);
  }
  for (const lt of data.lawTokens) {
    nodes.set(lt.id, {
      id: lt.id,
      name: lt.tokenLabel,
      nodeType: "lawEntity",
      depth: 3,
      parentId: lt.parentLocationId,
      childrenIds: [],
    });
    nodes.get(lt.parentLocationId)?.childrenIds.push(lt.id);
  }
  for (const it of data.interpretationTokens) {
    nodes.set(it.id, {
      id: it.id,
      name: it.title,
      nodeType: "interpEntity",
      depth: 4,
      parentId: it.parentLawTokenId,
      childrenIds: [],
    });
    nodes.get(it.parentLawTokenId)?.childrenIds.push(it.id);
  }
  return { nodes, rootIds: data.curations.map((c) => c.id) };
}

interface ContributionRowProps {
  contribution: ContributionView;
  checked: boolean;
  onToggle: () => void;
}

function ContributionRow({
  contribution,
  checked,
  onToggle,
}: ContributionRowProps) {
  return (
    <div
      className="flex items-center gap-1.5 py-0.5 hover:bg-accent/50 rounded transition-colors duration-100 cursor-pointer"
      style={{ paddingLeft: 32 }}
      onClick={() => {
        if (!contribution.alreadyCredited) onToggle();
      }}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          !contribution.alreadyCredited
        )
          onToggle();
      }}
    >
      <Checkbox
        checked={checked}
        disabled={contribution.alreadyCredited}
        onCheckedChange={() => {
          if (!contribution.alreadyCredited) onToggle();
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-3 w-3 flex-shrink-0"
      />
      <span
        className={`truncate min-w-0 flex-1 text-[10px] font-mono ${contribution.alreadyCredited ? "text-muted-foreground" : "text-foreground"}`}
      >
        {contribution.description}
      </span>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {contribution.buzzAmount.toString()} Buzz
      </span>
    </div>
  );
}

interface TreeNodeCheckboxProps {
  id: string;
  nodes: Map<string, TreeNodeData>;
  contribsByNode: Map<string, ContributionView[]>;
  checkedContribIds: Set<string>;
  expandedIds: Set<string>;
  rootIds: string[];
  onToggleNode: (nodeId: string) => void;
  onToggleContribution: (contribId: string) => void;
  onToggleExpand: (id: string) => void;
}

function TreeNodeCheckbox({
  id,
  nodes,
  contribsByNode,
  checkedContribIds,
  expandedIds,
  rootIds,
  onToggleNode,
  onToggleContribution,
  onToggleExpand,
}: TreeNodeCheckboxProps) {
  const node = nodes.get(id);
  if (!node) return null;

  const isRoot = rootIds.includes(id);
  const isExpanded = expandedIds.has(id);
  const hasChildren = node.childrenIds.length > 0;
  const nodeContribs = contribsByNode.get(id) ?? [];
  const someChecked = nodeContribs.some(
    (c) => checkedContribIds.has(c.id) || c.alreadyCredited,
  );

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 hover:bg-accent/50 rounded transition-colors duration-100 cursor-pointer"
        style={{ paddingLeft: node.depth * 16 + 8 }}
        onClick={() => {
          if (!isRoot) onToggleNode(id);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isRoot) onToggleNode(id);
        }}
      >
        <span className="w-3 h-3 flex-shrink-0 text-muted-foreground">
          {hasChildren || nodeContribs.length > 0 ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(id);
              }}
              className="w-3 h-3 flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          ) : null}
        </span>

        <Checkbox
          checked={someChecked}
          disabled={isRoot}
          onCheckedChange={() => {
            if (!isRoot) onToggleNode(id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 flex-shrink-0"
        />

        <span className="truncate min-w-0 flex-1 text-xs font-mono text-foreground">
          {node.name}
        </span>
        {nodeContribs.length > 0 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mr-1">
            {nodeContribs.filter((c) => checkedContribIds.has(c.id)).length}/
            {nodeContribs.filter((c) => !c.alreadyCredited).length}
          </span>
        )}
      </div>

      {isExpanded && (
        <div>
          {nodeContribs.map((c) => (
            <ContributionRow
              key={c.id}
              contribution={c}
              checked={checkedContribIds.has(c.id)}
              onToggle={() => onToggleContribution(c.id)}
            />
          ))}
          {node.childrenIds.map((childId) => (
            <TreeNodeCheckbox
              key={childId}
              id={childId}
              nodes={nodes}
              contribsByNode={contribsByNode}
              checkedContribIds={checkedContribIds}
              expandedIds={expandedIds}
              rootIds={rootIds}
              onToggleNode={onToggleNode}
              onToggleContribution={onToggleContribution}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChecklistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graphName: string;
  rootIds: string[];
  treeNodes: Map<string, TreeNodeData>;
  contribsByNode: Map<string, ContributionView[]>;
  checkedContribIds: Set<string>;
  expandedIds: Set<string>;
  alreadySaved: boolean | undefined;
  selectableContributions: ContributionView[];
  selectedCount: number;
  hasNewSelections: boolean;
  handleSave: () => void;
  handleToggleNode: (nodeId: string) => void;
  handleToggleContribution: (contribId: string) => void;
  handleToggleExpand: (id: string) => void;
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
  rootIds,
  treeNodes,
  contribsByNode,
  checkedContribIds,
  expandedIds,
  alreadySaved,
  selectableContributions,
  selectedCount,
  hasNewSelections,
  handleSave,
  handleToggleNode,
  handleToggleContribution,
  handleToggleExpand,
  handleOpenChange,
  alertMode,
  resultData,
  onSaveConfirm,
  onDismissAlert,
}: ChecklistDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {!alertMode ? (
          <>
            <DialogHeader>
              <DialogTitle>Save Graph to Notes</DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-xs">
              Select contributions from{" "}
              <span className="text-foreground">{graphName}</span> to import
              into your Notes workspace.
            </DialogDescription>

            <div
              className={`max-h-96 overflow-y-auto border border-border rounded-sm bg-background/50 ${alreadySaved && selectableContributions.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
            >
              {rootIds.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No nodes found
                </div>
              ) : (
                rootIds.map((rootId) => (
                  <TreeNodeCheckbox
                    key={rootId}
                    id={rootId}
                    nodes={treeNodes}
                    contribsByNode={contribsByNode}
                    checkedContribIds={checkedContribIds}
                    expandedIds={expandedIds}
                    rootIds={rootIds}
                    onToggleNode={handleToggleNode}
                    onToggleContribution={handleToggleContribution}
                    onToggleExpand={handleToggleExpand}
                  />
                ))
              )}
            </div>

            {alreadySaved && selectableContributions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                You have already saved all contributions in this graph.
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!hasNewSelections || selectedCount === 0}
              >
                Save Selected ({selectedCount})
              </Button>
            </DialogFooter>
          </>
        ) : alertMode === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Save this graph?</DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-sm text-muted-foreground">
              The selected contributions will be imported into your Notes. This
              action cannot be undone.
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
                      +{c.earned.toString()} Trust · Save #
                      {c.saveCount.toString()} · {c.buzzAmount.toString()} Buzz
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

export default function SaveGraphDialog({
  isOpen,
  onClose,
  graphName,
  graphData,
  graphId,
}: SaveGraphDialogProps) {
  const savePublishedGraph = useSavePublishedGraph();
  const { actor } = useBackendActor();
  const { data: alreadySaved } = useHasUserSavedGraph(graphId);

  const { nodes: treeNodes, rootIds } = useMemo(
    () => buildTree(graphData),
    [graphData],
  );
  const allNodeIds = useMemo(() => Array.from(treeNodes.keys()), [treeNodes]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(allNodeIds),
  );
  const [checkedContribIds, setCheckedContribIds] = useState<Set<string>>(
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

  const contribsByNode = useMemo(() => {
    const map = new Map<string, ContributionView[]>();
    for (const c of contributions) {
      if (!map.has(c.nodeId)) map.set(c.nodeId, []);
      map.get(c.nodeId)!.push(c);
    }
    return map;
  }, [contributions]);

  const selectableContributions = useMemo(
    () => contributions.filter((c) => !c.alreadyCredited),
    [contributions],
  );

  useEffect(() => {
    const newIds = selectableContributions.map((c) => c.id);
    setCheckedContribIds((prev) => {
      if (prev.size === newIds.length && newIds.every((id) => prev.has(id))) {
        return prev;
      }
      return new Set(newIds);
    });
  }, [selectableContributions]);

  const handleToggleNode = useCallback(
    (nodeId: string) => {
      setCheckedContribIds((prev) => {
        const next = new Set(prev);
        const nodeContribs = contribsByNode.get(nodeId) ?? [];
        const allSelected = nodeContribs.every(
          (c) => c.alreadyCredited || next.has(c.id),
        );
        for (const c of nodeContribs) {
          if (c.alreadyCredited) continue;
          if (allSelected) next.delete(c.id);
          else next.add(c.id);
        }
        return next;
      });
    },
    [contribsByNode],
  );

  const handleToggleContribution = useCallback((contribId: string) => {
    setCheckedContribIds((prev) => {
      const next = new Set(prev);
      if (next.has(contribId)) next.delete(contribId);
      else next.add(contribId);
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => setAlertMode("confirm"), []);

  const handleConfirmSave = async () => {
    setAlertMode("loading");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const selectedNodeIds = new Set(
        contributions
          .filter((c) => checkedContribIds.has(c.id))
          .map((c) => c.nodeId),
      );
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

  const selectedCount = checkedContribIds.size;
  const hasNewSelections = selectableContributions.some((c) =>
    checkedContribIds.has(c.id),
  );

  return (
    <ChecklistDialogMemo
      isOpen={isOpen}
      onClose={onClose}
      graphName={graphName}
      rootIds={rootIds}
      treeNodes={treeNodes}
      contribsByNode={contribsByNode}
      checkedContribIds={checkedContribIds}
      expandedIds={expandedIds}
      alreadySaved={alreadySaved}
      selectableContributions={selectableContributions}
      selectedCount={selectedCount}
      hasNewSelections={hasNewSelections}
      handleSave={handleSave}
      handleToggleNode={handleToggleNode}
      handleToggleContribution={handleToggleContribution}
      handleToggleExpand={handleToggleExpand}
      handleOpenChange={handleOpenChange}
      alertMode={alertMode}
      resultData={resultData}
      onSaveConfirm={handleConfirmSave}
      onDismissAlert={handleDismissAlert}
    />
  );
}
