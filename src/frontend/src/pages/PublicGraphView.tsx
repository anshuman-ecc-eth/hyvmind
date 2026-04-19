import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData } from "../backend.d";
import FilterPanel from "../components/FilterPanel";
import PublicNodeDetailsPanel from "../components/PublicNodeDetailsPanel";
import SourceGraphDiagram from "../components/SourceGraphDiagram";
import type {
  ExtensionEntry,
  PublishedSourceGraphMeta,
} from "../hooks/usePublicGraphs";
import {
  usePublishedSourceGraph,
  usePublishedSourceGraphs,
} from "../hooks/usePublicGraphs";
import type { SourceNode } from "../types/sourceGraph";
import { graphDataToSourceGraph } from "../utils/graphDataConverter";

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

const ALL_NODE_TYPES = new Set([
  "curation",
  "swarm",
  "location",
  "lawEntity",
  "interpEntity",
]);

interface FilterState {
  searchText: string;
  visibleNodeTypes: Set<string>;
  isCollapsed: boolean;
}

const defaultFilterState = (): FilterState => ({
  searchText: "",
  visibleNodeTypes: new Set(ALL_NODE_TYPES),
  isCollapsed: false,
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-0">
      <div
        className="w-6 h-6 border-2 border-border border-t-foreground rounded-full"
        style={{ animation: "spin 0.8s linear infinite" }}
        aria-label="Loading"
      />
    </div>
  );
}

function ExtensionHistory({ log }: { log: ExtensionEntry[] }) {
  const [open, setOpen] = useState(false);
  if (log.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1"
        data-ocid="extension_history.toggle"
      >
        <span className="text-[10px]">{open ? "▾" : "▸"}</span>
        Extension History ({log.length})
      </button>

      {open && (
        <ul className="mt-1 space-y-1 pl-3 border-l border-border">
          {log.map((entry, i) => {
            const ms = Number(entry.extendedAt) / 1_000_000;
            const date = new Date(ms).toLocaleDateString();
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: extension log entries are positional
              <li key={i} className="text-xs text-muted-foreground font-mono">
                <span className="text-foreground/70">{date}</span>
                {" — "}+{Number(entry.addedNodes)} nodes, +
                {Number(entry.addedEdges)} edges, +
                {Number(entry.addedAttributes)} attrs
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface GraphCardProps {
  graph: PublishedSourceGraphMeta;
  onView: (id: string) => void;
}

function GraphCard({ graph, onView }: GraphCardProps) {
  const ms = Number(graph.publishedAt) / 1_000_000;
  const date = new Date(ms).toLocaleDateString();

  return (
    <div
      className="border border-border bg-card p-4 flex flex-col gap-2"
      data-ocid="public_graph.card"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">
          {date}
        </span>
      </div>

      <div className="flex gap-4 font-mono text-xs text-muted-foreground">
        <span data-ocid="public_graph.node_count">
          {Number(graph.nodeCount)} nodes
        </span>
        <span data-ocid="public_graph.edge_count">
          {Number(graph.edgeCount)} edges
        </span>
        <span data-ocid="public_graph.attr_count">
          {Number(graph.attributeCount)} attrs
        </span>
      </div>

      <ExtensionHistory log={graph.extensionLog} />

      <button
        type="button"
        onClick={() => onView(graph.id)}
        className="mt-1 self-start border border-border px-3 py-1 font-mono text-xs text-foreground hover:bg-secondary transition-colors"
        data-ocid="public_graph.view_button"
      >
        View Graph
      </button>
    </div>
  );
}

interface CreatorAccordionProps {
  curationName: string;
  graphs: PublishedSourceGraphMeta[];
  expanded: boolean;
  onToggle: () => void;
  onView: (id: string) => void;
}

function CreatorAccordion({
  curationName,
  graphs,
  expanded,
  onToggle,
  onView,
}: CreatorAccordionProps) {
  return (
    <div className="border border-border" data-ocid="creator_accordion.section">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 font-mono text-sm text-foreground hover:bg-secondary/50 transition-colors"
        data-ocid="creator_accordion.toggle"
      >
        <span className="text-xs font-normal">{curationName}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {graphs.length} graph{graphs.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px]">{expanded ? "▾" : "▸"}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {graphs.map((g) => (
            <div key={g.id} className="px-4 py-3">
              <div className="mb-1 font-mono text-xs text-muted-foreground">
                {g.creatorName}
              </div>
              <GraphCard graph={g} onView={onView} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Graph detail view (shown when a graph is selected)
// ---------------------------------------------------------------------------

interface GraphDetailProps {
  selectedId: string;
  graphs: PublishedSourceGraphMeta[];
  onBack: () => void;
  filterStatesRef: React.MutableRefObject<Map<string, FilterState>>;
}

function GraphDetail({
  selectedId,
  graphs,
  onBack,
  filterStatesRef,
}: GraphDetailProps) {
  const { data: graphData, isLoading } = usePublishedSourceGraph(selectedId);
  const meta = graphs.find((g) => g.id === selectedId);
  const graphName = meta?.name ?? "Graph";
  const [selectedNode, setSelectedNode] = useState<SourceNode | null>(null);

  // Memoize converted graph to stabilize object reference
  const convertedGraph = useMemo(
    () =>
      graphData
        ? graphDataToSourceGraph(graphData as GraphData, graphName, selectedId)
        : null,
    // graphName changes when meta loads but selectedId is the real cache key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphData, graphName, selectedId],
  );

  // ---------------------------------------------------------------------------
  // Filter state — per-graph persistence
  // ---------------------------------------------------------------------------
  const [filterState, setFilterState] = useState<FilterState>(() => {
    return filterStatesRef.current.get(selectedId) ?? defaultFilterState();
  });

  // Keep ref always current for saving on unmount / id change
  const filterStateRef = useRef(filterState);
  useEffect(() => {
    filterStateRef.current = filterState;
  }, [filterState]);

  // Save state on unmount
  useEffect(() => {
    const ref = filterStatesRef;
    const id = selectedId;
    return () => {
      ref.current.set(id, filterStateRef.current);
    };
  }, [selectedId, filterStatesRef]);

  // ---------------------------------------------------------------------------
  // Fit-to-visible
  // ---------------------------------------------------------------------------
  const fitFnRef = useRef<(() => void) | null>(null);
  const handleFitToVisible = () => {
    fitFnRef.current?.();
  };
  const handleFitRegister = (fn: () => void) => {
    fitFnRef.current = fn;
  };

  // ---------------------------------------------------------------------------
  // Visible node count for FilterPanel
  // ---------------------------------------------------------------------------
  const visibleNodeCount = useMemo(() => {
    if (!convertedGraph) return 0;
    const search = filterState.searchText.trim().toLowerCase();
    const types = filterState.visibleNodeTypes;
    const allTypesVisible = types.size >= ALL_NODE_TYPES.size;
    const noSearch = search.length === 0;
    if (allTypesVisible && noSearch) return convertedGraph.nodes.length;
    return convertedGraph.nodes.filter((n) => {
      const typeOk = allTypesVisible || types.has(n.nodeType);
      const searchOk = noSearch || n.name.toLowerCase().includes(search);
      return typeOk && searchOk;
    }).length;
  }, [convertedGraph, filterState.searchText, filterState.visibleNodeTypes]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          data-ocid="public_graph.back_button"
        >
          ← Back to Graphs
        </button>
        <span className="font-mono text-sm text-foreground font-semibold">
          {graphName}
        </span>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && convertedGraph && (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 min-h-0">
            <SourceGraphDiagram
              graph={convertedGraph}
              graphId={selectedId}
              onNodeClick={setSelectedNode}
              searchText={filterState.searchText}
              visibleNodeTypes={filterState.visibleNodeTypes}
              onFitToVisible={handleFitRegister}
            />
          </div>
          <FilterPanel
            searchText={filterState.searchText}
            onSearchChange={(text) =>
              setFilterState((prev) => ({ ...prev, searchText: text }))
            }
            visibleNodeTypes={filterState.visibleNodeTypes}
            onNodeTypesChange={(types) =>
              setFilterState((prev) => ({ ...prev, visibleNodeTypes: types }))
            }
            totalNodes={convertedGraph.nodes.length}
            visibleNodes={visibleNodeCount}
            onReset={() => setFilterState(defaultFilterState())}
            onFitToVisible={handleFitToVisible}
            isCollapsed={filterState.isCollapsed}
            onToggleCollapsed={() =>
              setFilterState((prev) => ({
                ...prev,
                isCollapsed: !prev.isCollapsed,
              }))
            }
          />
        </div>
      )}

      {!isLoading && !convertedGraph && (
        <div className="flex flex-1 items-center justify-center">
          <span
            className="font-mono text-xs text-muted-foreground"
            data-ocid="public_graph.error_state"
          >
            Graph data unavailable.
          </span>
        </div>
      )}

      {selectedNode && (
        <PublicNodeDetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PublicGraphView({
  isLanding = false,
}: { isLanding?: boolean }) {
  const { data: graphs = [], isLoading, error } = usePublishedSourceGraphs();
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(
    new Set(),
  );

  // Per-graph filter state persistence — survives navigation between graphs
  const filterStatesRef = useRef<Map<string, FilterState>>(new Map());

  const toggleCreator = (name: string) => {
    setExpandedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ------------------------------------------------------------------
  // Loading / error states
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <div
        className={`flex flex-col min-h-0 ${isLanding ? "h-full" : "flex-1 h-full"}`}
        data-ocid="public_graphs.loading_state"
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        data-ocid="public_graphs.error_state"
      >
        <span className="font-mono text-xs text-destructive">
          Failed to load public graphs.
        </span>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Graph detail view
  // ------------------------------------------------------------------
  if (selectedGraphId) {
    return (
      <GraphDetail
        selectedId={selectedGraphId}
        graphs={graphs}
        onBack={() => setSelectedGraphId(null)}
        filterStatesRef={filterStatesRef}
      />
    );
  }

  // ------------------------------------------------------------------
  // List view — grouped by curation name
  // ------------------------------------------------------------------

  // Group graphs by curation name (graph.name)
  const byCreator = new Map<string, PublishedSourceGraphMeta[]>();
  for (const g of graphs) {
    const existing = byCreator.get(g.name) ?? [];
    existing.push(g);
    byCreator.set(g.name, existing);
  }

  // Sort curation names alphabetically
  const sortedCreators = [...byCreator.keys()].sort((a, b) =>
    a.localeCompare(b),
  );

  // Sort each curation's graphs by publishedAt descending (bigint)
  for (const [curationName, gs] of byCreator) {
    byCreator.set(
      curationName,
      [...gs].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
    );
  }

  const containerClass = isLanding
    ? "flex flex-col h-full min-h-0 overflow-auto"
    : "flex flex-col flex-1 min-h-0 overflow-auto";

  return (
    <div className={containerClass} data-ocid="public_graphs.page">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="font-mono text-sm text-foreground font-semibold">
          public graphs
        </h2>
        <p className="font-mono text-xs text-muted-foreground mt-0.5">
          extensible curations by the community
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
        {graphs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="public_graphs.empty_state"
          >
            <span className="font-mono text-xs text-muted-foreground">
              No published graphs yet.
            </span>
            <span className="font-mono text-xs text-muted-foreground mt-1">
              Publish a source graph from the Sources page to see it here.
            </span>
          </div>
        ) : (
          <div className="space-y-2" data-ocid="public_graphs.list">
            {sortedCreators.map((curationName) => {
              const creatorGraphs = byCreator.get(curationName) ?? [];
              return (
                <CreatorAccordion
                  key={curationName}
                  curationName={curationName}
                  graphs={creatorGraphs}
                  expanded={expandedCreators.has(curationName)}
                  onToggle={() => toggleCreator(curationName)}
                  onView={(id) => setSelectedGraphId(id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
