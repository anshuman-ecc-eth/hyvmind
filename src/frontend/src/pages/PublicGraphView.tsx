import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData } from "../backend.d";
import ArtworkModal from "../components/ArtworkModal";
import FilterPanel from "../components/FilterPanel";
import GraphFuzzyFinder, {
  type SearchableItem,
} from "../components/GraphFuzzyFinder";
import OntologyModal from "../components/OntologyModal";
import PublicNodeDetailsPanel from "../components/PublicNodeDetailsPanel";
import SaveGraphDialog from "../components/SaveGraphDialog";
import SourceGraphDiagram from "../components/SourceGraphDiagram";
import type { PublishedSourceGraphMeta as BasePublishedSourceGraphMeta } from "../hooks/usePublicGraphs";
import {
  usePublishedGraphData,
  usePublishedGraphMetas,
} from "../hooks/usePublicGraphs";
import type { SourceNode } from "../types/sourceGraph";
import { graphDataToSourceGraph } from "../utils/graphDataConverter";
import { generateFullSourceGraphTurtle } from "../utils/sourceGraphOntologyTurtle";

// artworkDataUrl is included in the generated bindings as string | undefined
type PublishedSourceGraphMeta = BasePublishedSourceGraphMeta;

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

interface GraphCardWithSaveProps {
  curationName: string;
  meta: PublishedSourceGraphMeta;
  onView: (id: string) => void;
  onSave?: (graphId: string) => void;
}

function GraphCardWithSave({ meta, onView, onSave }: GraphCardWithSaveProps) {
  const ms = Number(meta.publishedAt) / 1_000_000;
  const date = new Date(ms).toLocaleDateString();
  const [showArtworkModal, setShowArtworkModal] = useState(false);
  const artworkUrl = meta.artworkDataUrl;
  const crossRefEdges =
    Number(meta.edgeCount) - Number(meta.hierarchyEdgeCount ?? 0n);
  const hierarchyEdges = Number(meta.hierarchyEdgeCount ?? 0n);

  return (
    <div
      className="border border-border bg-card p-4 rounded-sm mb-2"
      data-ocid="public_graph.card"
    >
      {/* Core line */}
      <div className="font-mono text-xs text-muted-foreground mb-1">
        Core &mdash; {meta.creatorName} &mdash; {date}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 font-mono text-xs text-muted-foreground mb-2">
        <span data-ocid="public_graph.node_count">
          {Number(meta.nodeCount)} nodes
        </span>
        <span data-ocid="public_graph.edge_count">
          {crossRefEdges} cross-ref, {hierarchyEdges} hierarchy
        </span>
        <span data-ocid="public_graph.attr_count">
          {Number(meta.attributeCount)} attrs
        </span>
        <span data-ocid="public_graph.source_count">
          {Number(meta.sourcesCount ?? 0n)} sources
        </span>
      </div>

      {/* Extensions */}
      {meta.extensionLog.length > 0 && (
        <ul className="mb-2 space-y-0.5 pl-2 border-l border-border">
          {meta.extensionLog.map((entry, i) => {
            const extMs = Number(entry.extendedAt) / 1_000_000;
            const extDate = new Date(extMs).toLocaleDateString();
            const byName = entry.extendedByName || "Unknown";
            return (
              <li
                key={String(entry.extendedAt)}
                className="font-mono text-xs text-muted-foreground"
              >
                Ext #{i + 1} &mdash; {byName} &mdash; {extDate} &mdash; +
                {Number(entry.addedNodes)} nodes, +{Number(entry.addedEdges)}{" "}
                edges, +{Number(entry.addedAttributes)} attrs
              </li>
            );
          })}
        </ul>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => setShowArtworkModal(true)}
          disabled={!artworkUrl}
          className="border border-border px-2 py-1 font-mono text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-ocid="public_graph.artwork_thumbnail"
          aria-label={
            artworkUrl ? `View terrain for ${meta.name}` : "Terrain generating"
          }
        >
          {artworkUrl ? "Terrain" : "Generating."}
        </button>
        <button
          type="button"
          onClick={() => onView(meta.id)}
          className="border border-border px-3 py-1 font-mono text-xs text-foreground hover:bg-secondary transition-colors"
          data-ocid="public_graph.view_button"
        >
          View Graph
        </button>
        {onSave && (
          <button
            type="button"
            onClick={() => onSave(meta.id)}
            className="border border-primary bg-primary/10 px-3 py-1 font-mono text-xs text-primary hover:bg-primary/20 transition-colors"
            data-ocid="public_graph.save_button"
          >
            Save
          </button>
        )}
      </div>

      {showArtworkModal && artworkUrl && (
        <ArtworkModal
          artworkUrl={artworkUrl}
          graphName={meta.name}
          onClose={() => setShowArtworkModal(false)}
        />
      )}
    </div>
  );
}

interface GraphCardGroupProps {
  curationName: string;
  graphs: PublishedSourceGraphMeta[];
  onView: (id: string) => void;
  onSave?: (graphId: string) => void;
}

function GraphCardGroup({
  curationName,
  graphs,
  onView,
  onSave,
}: GraphCardGroupProps) {
  return (
    <div data-ocid="graph_card_group.section">
      <h3 className="text-sm font-bold text-foreground mb-2 mt-4 font-mono">
        {curationName}
      </h3>
      {graphs.map((g) => (
        <GraphCardWithSave
          key={g.id}
          curationName={curationName}
          meta={g}
          onView={onView}
          onSave={onSave}
        />
      ))}
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
  const { data: graphData, isLoading } = usePublishedGraphData(selectedId);
  const meta = graphs.find((g) => g.id === selectedId);
  const graphName = meta?.name ?? "Graph";
  const [selectedNode, setSelectedNode] = useState<SourceNode | null>(null);
  const [ontologyTurtle, setOntologyTurtle] = useState<string | null>(null);
  const [copiedOntology, setCopiedOntology] = useState(false);

  const handleOntology = () => {
    if (!convertedGraph) return;
    const turtle = generateFullSourceGraphTurtle(convertedGraph);
    setOntologyTurtle(turtle);
    setCopiedOntology(false);
  };

  const handleCopyOntology = () => {
    if (!ontologyTurtle) return;
    navigator.clipboard.writeText(ontologyTurtle);
    setCopiedOntology(true);
    setTimeout(() => setCopiedOntology(false), 2000);
  };

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
    <div className="flex flex-col h-full bg-background font-mono">
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
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
            onOntology={handleOntology}
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

      {ontologyTurtle && (
        <OntologyModal
          turtle={ontologyTurtle}
          onClose={() => setOntologyTurtle(null)}
          onCopy={handleCopyOntology}
          copied={copiedOntology}
          graphName={graphName}
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
  const { data: graphs = [], isLoading, error } = usePublishedGraphMetas();
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [savingGraphId, setSavingGraphId] = useState<string | null>(null);

  // Per-graph filter state persistence — survives navigation between graphs
  const filterStatesRef = useRef<Map<string, FilterState>>(new Map());

  const handleFuzzySelect = (item: SearchableItem) => {
    setSelectedGraphId(item.graphId);
  };

  const savingGraphData = usePublishedGraphData(savingGraphId);
  const savingMeta = graphs.find((g) => g.id === savingGraphId);

  // ------------------------------------------------------------------
  // Loading / error states
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <div
        className="flex flex-col h-full bg-background font-mono"
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

  const containerClass = "flex flex-col h-full bg-background font-mono";

  return (
    <div className={containerClass} data-ocid="public_graphs.page">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          Public Graphs
        </span>
        <GraphFuzzyFinder onSelect={handleFuzzySelect} />
      </div>

      {/* Save dialog */}
      {savingGraphId && savingGraphData.data && savingMeta && (
        <SaveGraphDialog
          isOpen={true}
          onClose={() => setSavingGraphId(null)}
          graphName={savingMeta.name}
          graphData={savingGraphData.data}
          graphId={savingGraphId}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
        {graphs.length === 0 ? (
          <div data-ocid="public_graphs.empty_state" />
        ) : (
          <div className="space-y-1" data-ocid="public_graphs.list">
            {sortedCreators.map((curationName) => {
              const gs = byCreator.get(curationName) ?? [];
              return (
                <GraphCardGroup
                  key={curationName}
                  curationName={curationName}
                  graphs={gs}
                  onView={(id) => setSelectedGraphId(id)}
                  onSave={isLanding ? undefined : (id) => setSavingGraphId(id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
