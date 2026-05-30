import { SourceGraphDiagram } from "@/components/SourceGraphDiagram";
import type { SourceGraph, SourceNode } from "@/types/sourceGraph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphPanelProps {
  graph: SourceGraph | null;
  onNodeClick: (node: SourceNode) => void;
}

// ---------------------------------------------------------------------------
// GraphPanel
// ---------------------------------------------------------------------------

export function GraphPanel({ graph, onNodeClick }: GraphPanelProps) {
  if (!graph) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-background"
        data-ocid="graph_panel.empty_state"
      >
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            No graph data available
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Save your curation to generate a graph preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 relative bg-background"
      data-ocid="graph_panel.panel"
    >
      {/* Read-only overlay — blocks direct edit interactions but allows
          bubbling click events for zoom via onNodeClick */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      />
      <SourceGraphDiagram graph={graph} onNodeClick={onNodeClick} />
    </div>
  );
}
