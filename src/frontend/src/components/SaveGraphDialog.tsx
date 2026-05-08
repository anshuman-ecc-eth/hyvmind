import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { GraphData } from "../backend.d";
import { useSavePublishedGraph } from "../hooks/useQueries";
import { graphDataToEditorNodes } from "../utils/graphDataToEditorNodes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SaveGraphDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graphName: string;
  graphData: GraphData;
  graphId: string;
}

// ---------------------------------------------------------------------------
// Internal tree types
// ---------------------------------------------------------------------------

type NodeType =
  | "curation"
  | "swarm"
  | "location"
  | "lawEntity"
  | "interpEntity";

interface TreeNodeData {
  id: string;
  name: string;
  nodeType: NodeType;
  depth: number;
  parentId: string | null;
  childrenIds: string[];
}

// ---------------------------------------------------------------------------
// Colors matching FileTree.tsx
// ---------------------------------------------------------------------------

const nodeTypeColors: Record<NodeType, string> = {
  curation: "text-blue-400",
  swarm: "text-orange-400",
  location: "text-green-400",
  lawEntity: "text-red-400",
  interpEntity: "text-purple-400",
};

// ---------------------------------------------------------------------------
// Build flat tree from GraphData
// ---------------------------------------------------------------------------

function buildTree(data: GraphData): {
  nodes: Map<string, TreeNodeData>;
  rootIds: string[];
} {
  const nodes = new Map<string, TreeNodeData>();

  // curations — depth 0
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

  // swarms — depth 1
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

  // locations — depth 2
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

  // lawTokens — depth 3
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

  // interpretationTokens — depth 4
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

  const rootIds = data.curations.map((c) => c.id);
  return { nodes, rootIds };
}

// ---------------------------------------------------------------------------
// Collect all descendant IDs (recursive)
// ---------------------------------------------------------------------------

function collectDescendants(
  id: string,
  nodes: Map<string, TreeNodeData>,
): string[] {
  const node = nodes.get(id);
  if (!node) return [];
  const result: string[] = [];
  for (const childId of node.childrenIds) {
    result.push(childId);
    result.push(...collectDescendants(childId, nodes));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Single tree node row (recursive)
// ---------------------------------------------------------------------------

interface TreeNodeCheckboxProps {
  id: string;
  nodes: Map<string, TreeNodeData>;
  checkedIds: Set<string>;
  expandedIds: Set<string>;
  rootIds: string[];
  onToggleCheck: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

function TreeNodeCheckbox({
  id,
  nodes,
  checkedIds,
  expandedIds,
  rootIds,
  onToggleCheck,
  onToggleExpand,
}: TreeNodeCheckboxProps) {
  const node = nodes.get(id);
  if (!node) return null;

  const isRoot = rootIds.includes(id);
  const isExpanded = expandedIds.has(id);
  const isChecked = checkedIds.has(id);
  const hasChildren = node.childrenIds.length > 0;
  const colorClass = nodeTypeColors[node.nodeType];

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 hover:bg-accent/50 rounded transition-colors duration-100 cursor-pointer"
        style={{ paddingLeft: node.depth * 16 + 8 }}
        data-ocid={`save_graph.item.${id}`}
        onClick={() => {
          if (!isRoot) onToggleCheck(id);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isRoot)
            onToggleCheck(id);
        }}
      >
        {/* Expand chevron */}
        <span className="w-3 h-3 flex-shrink-0 text-muted-foreground">
          {hasChildren ? (
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

        {/* Checkbox */}
        <Checkbox
          checked={isChecked}
          disabled={isRoot}
          onCheckedChange={() => {
            if (!isRoot) onToggleCheck(id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 flex-shrink-0"
          data-ocid={`save_graph.checkbox.${id}`}
        />

        {/* Label */}
        <span
          className={`truncate min-w-0 flex-1 text-xs font-mono ${colorClass}`}
        >
          {node.name}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.childrenIds.map((childId) => (
            <TreeNodeCheckbox
              key={childId}
              id={childId}
              nodes={nodes}
              checkedIds={checkedIds}
              expandedIds={expandedIds}
              rootIds={rootIds}
              onToggleCheck={onToggleCheck}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SaveGraphDialog
// ---------------------------------------------------------------------------

export default function SaveGraphDialog({
  isOpen,
  onClose,
  graphName,
  graphData,
  graphId,
}: SaveGraphDialogProps) {
  const savePublishedGraph = useSavePublishedGraph();

  const { nodes: treeNodes, rootIds } = useMemo(
    () => buildTree(graphData),
    [graphData],
  );

  const allIds = useMemo(() => Array.from(treeNodes.keys()), [treeNodes]);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(allIds),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(allIds),
  );
  const [saving, setSaving] = useState(false);

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Uncheck this node and all descendants
        next.delete(id);
        for (const descId of collectDescendants(id, treeNodes)) {
          next.delete(descId);
        }
      } else {
        // Check this node and all descendants
        next.add(id);
        for (const descId of collectDescendants(id, treeNodes)) {
          next.add(descId);
        }
      }
      return next;
    });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePublishedGraph.mutateAsync({
        publishedGraphId: graphId,
        selectedNodes: Array.from(checkedIds),
      });
      const { nodes, rootIds: importRootIds } = graphDataToEditorNodes(
        graphData,
        checkedIds,
        graphName,
      );
      window.dispatchEvent(
        new CustomEvent("hyvmind:import-nodes", {
          detail: { nodes, rootIds: importRootIds },
        }),
      );
      toast.success("Graph saved to Notes!");
      onClose();
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

  const selectedCount = checkedIds.size;
  const totalCount = allIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-ocid="save_graph.dialog">
        <DialogHeader>
          <DialogTitle>Save Graph to Notes</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Select nodes from <span className="text-foreground">{graphName}</span>{" "}
          to import into your Notes workspace.
        </p>

        {/* Scrollable tree */}
        <div
          className="max-h-96 overflow-y-auto border border-border rounded-sm bg-background/50"
          data-ocid="save_graph.list"
        >
          {rootIds.length === 0 ? (
            <div
              className="py-8 text-center text-xs text-muted-foreground"
              data-ocid="save_graph.empty_state"
            >
              No nodes found
            </div>
          ) : (
            rootIds.map((rootId) => (
              <TreeNodeCheckbox
                key={rootId}
                id={rootId}
                nodes={treeNodes}
                checkedIds={checkedIds}
                expandedIds={expandedIds}
                rootIds={rootIds}
                onToggleCheck={handleToggleCheck}
                onToggleExpand={handleToggleExpand}
              />
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="save_graph.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            data-ocid="save_graph.submit_button"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              `Save (${selectedCount}/${totalCount})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
