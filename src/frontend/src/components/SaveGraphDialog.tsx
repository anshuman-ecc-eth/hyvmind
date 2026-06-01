import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function SaveResultDialog({
  contributions,
  noNewTrust,
  open,
  onClose,
}: {
  contributions?: CreditedContribution[];
  noNewTrust?: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Result</AlertDialogTitle>
        </AlertDialogHeader>
        {noNewTrust ? (
          <AlertDialogDescription>{noNewTrust}</AlertDialogDescription>
        ) : contributions && contributions.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {contributions.map((c) => (
              <div
                key={c.contributionId}
                className="text-xs border-b border-border pb-1"
              >
                <p className="text-foreground">{c.description}</p>
                <p className="text-muted-foreground">
                  +{c.earned.toString()} Trust · Save #{c.saveCount.toString()}{" "}
                  · {c.buzzAmount.toString()} Buzz
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    contributions?: CreditedContribution[];
    noNewTrust?: string;
  } | null>(null);

  const { data: contributions = [] } = useQuery({
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
    setCheckedContribIds(new Set(selectableContributions.map((c) => c.id)));
  }, [selectableContributions]);

  const handleToggleNode = useCallback(
    (nodeId: string) => {
      setCheckedContribIds((prev) => {
        const next = new Set(prev);
        const nodeContribs = contribsByNode.get(nodeId) ?? [];
        const unchecked = nodeContribs.filter(
          (c) => !c.alreadyCredited && !next.has(c.id),
        );
        if (unchecked.length > 0) {
          for (const c of nodeContribs) {
            if (!c.alreadyCredited) next.add(c.id);
          }
        } else {
          for (const c of nodeContribs) {
            next.delete(c.id);
          }
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

  const handleSave = () => setShowConfirm(true);

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      const result = await savePublishedGraph.mutateAsync({
        publishedGraphId: graphId,
        selectedContributionIds: Array.from(checkedContribIds),
      });
      if ("ok" in result) {
        setSaveResult({ contributions: result.ok.contributions });
        const selectedNodeIds = new Set(
          contributions
            .filter((c) => checkedContribIds.has(c.id))
            .map((c) => c.nodeId),
        );
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
        toast.success("Graph saved to Notes!");
        onClose();
      } else if ("noNewTrust" in result) {
        setSaveResult({ noNewTrust: result.noNewTrust.reason });
      } else {
        toast.error(result.err ?? "Failed to save graph");
      }
    } catch (err) {
      console.error("Failed to save graph:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save graph");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !saving) onClose();
  };

  const selectedCount = checkedContribIds.size;
  const hasNewSelections = selectableContributions.some((c) =>
    checkedContribIds.has(c.id),
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Graph to Notes</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Select contributions from{" "}
          <span className="text-foreground">{graphName}</span> to import into
          your Notes workspace.
        </p>

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
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasNewSelections || saving || selectedCount === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              `Save Selected (${selectedCount})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this graph?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected contributions will be imported into your Notes. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save to Notes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SaveResultDialog
        open={saveResult !== null}
        contributions={saveResult?.contributions}
        noNewTrust={saveResult?.noNewTrust}
        onClose={() => setSaveResult(null)}
      />
    </Dialog>
  );
}
