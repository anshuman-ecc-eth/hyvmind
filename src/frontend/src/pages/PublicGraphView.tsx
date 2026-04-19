import { useState } from "react";
import type { GraphData } from "../backend.d";
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
        <span className="font-mono text-sm text-foreground font-semibold leading-tight">
          {graph.name}
        </span>
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
  creatorName: string;
  graphs: PublishedSourceGraphMeta[];
  expanded: boolean;
  onToggle: () => void;
  onView: (id: string) => void;
}

function CreatorAccordion({
  creatorName,
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
        <span className="font-semibold">{creatorName}</span>
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
}

function GraphDetail({ selectedId, graphs, onBack }: GraphDetailProps) {
  const { data: graphData, isLoading } = usePublishedSourceGraph(selectedId);
  const meta = graphs.find((g) => g.id === selectedId);
  const graphName = meta?.name ?? "Graph";
  const [selectedNode, setSelectedNode] = useState<SourceNode | null>(null);

  const convertedGraph = graphData
    ? graphDataToSourceGraph(graphData as GraphData, graphName, selectedId)
    : null;

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
        <div className="flex-1 min-h-0">
          <SourceGraphDiagram
            graph={convertedGraph}
            graphId={selectedId}
            onNodeClick={setSelectedNode}
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
      />
    );
  }

  // ------------------------------------------------------------------
  // List view — grouped by creator
  // ------------------------------------------------------------------

  // Group graphs by creatorName
  const byCreator = new Map<string, PublishedSourceGraphMeta[]>();
  for (const g of graphs) {
    const existing = byCreator.get(g.creatorName) ?? [];
    existing.push(g);
    byCreator.set(g.creatorName, existing);
  }

  // Sort creator names alphabetically
  const sortedCreators = [...byCreator.keys()].sort((a, b) =>
    a.localeCompare(b),
  );

  // Sort each creator's graphs by publishedAt descending (bigint)
  for (const [creator, gs] of byCreator) {
    byCreator.set(
      creator,
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
          Public Graphs
        </h2>
        <p className="font-mono text-xs text-muted-foreground mt-0.5">
          Published source graphs from the community
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
            {sortedCreators.map((creatorName) => {
              const creatorGraphs = byCreator.get(creatorName) ?? [];
              return (
                <CreatorAccordion
                  key={creatorName}
                  creatorName={creatorName}
                  graphs={creatorGraphs}
                  expanded={expandedCreators.has(creatorName)}
                  onToggle={() => toggleCreator(creatorName)}
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
