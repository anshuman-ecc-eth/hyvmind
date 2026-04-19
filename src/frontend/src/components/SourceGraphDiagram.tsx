// @ts-ignore – force-graph ships as a class; the .d.ts types it correctly
import ForceGraph from "force-graph";
import type { LinkObject, NodeObject } from "force-graph";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FGNode extends NodeObject {
  id: string;
  name: string;
  nodeType: string;
  jurisdiction?: string;
  tags?: string[];
  source?: string;
  content?: string;
  from?: string;
  to?: string;
  parentName?: string;
  attributes?: Record<string, string>;
}

interface FGLink extends LinkObject<FGNode> {
  label?: string;
}

// Use the class constructor signature directly — no unsafe cast needed
type FGInstance = InstanceType<typeof ForceGraph<FGNode, FGLink>>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<string, string> = {
  curation: "#4a9eff",
  swarm: "#ff7f50",
  location: "#90EE90",
  lawEntity: "#FFD700",
  interpEntity: "#DA70D6",
};

const BG_DARK = "#0a0a0a";
const BG_LIGHT = "#f5f5f5";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SourceGraphDiagramProps {
  graph: SourceGraph;
  width?: number;
  height?: number;
  onNodeClick?: (node: SourceNode) => void;
}

export function SourceGraphDiagram({
  graph,
  width,
  height,
  onNodeClick,
}: SourceGraphDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<FGInstance | null>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme !== "light";

  // Stable refs — carry updates without recreating the graph instance
  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
    // Push background color update to existing instance on theme change
    if (fgRef.current) {
      fgRef.current.backgroundColor(isDark ? BG_DARK : BG_LIGHT);
    }
  }, [isDark]);

  // Transform SourceGraph → force-graph data
  const graphData = useMemo(() => {
    const nodes: FGNode[] = graph.nodes.map((n) => {
      return {
        id: n.id ?? n.name,
        name: n.name,
        nodeType: n.nodeType,
        jurisdiction: n.jurisdiction,
        tags: n.tags,
        source: n.source,
        content: n.content,
        from: n.from,
        to: n.to,
        parentName: n.parentName,
        attributes: n.attributes,
      };
    });

    const nodeFullPaths = new Set(nodes.map((n) => n.id));

    const links: FGLink[] = graph.edges
      .filter((e) => {
        const ok = nodeFullPaths.has(e.source) && nodeFullPaths.has(e.target);
        if (!ok) {
          console.warn(
            `[SourceGraph] Dropping edge: source="${e.source}" target="${e.target}" — one or both not found in nodes.`,
          );
        }
        return ok;
      })
      .map((e) => ({
        source: e.source,
        target: e.target,
        label: e.label,
      }));

    if (nodes.length === 0) {
      console.error(
        "[SourceGraph] Graph has zero nodes — check parser output.",
        graph,
      );
    }

    return { nodes, links };
  }, [graph]);

  const graphDataRef = useRef(graphData);
  useEffect(() => {
    graphDataRef.current = graphData;
  }, [graphData]);

  // ------------------------------------------------------------------
  // Mount: create force-graph instance with correct `new` constructor
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // force-graph is a class — instantiate with `new`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fg: FGInstance = new (ForceGraph as any)(el);
    fgRef.current = fg;

    // Set background immediately so the canvas isn't transparent
    fg.backgroundColor(isDarkRef.current ? BG_DARK : BG_LIGHT);

    fg.nodeId("id")
      .nodeLabel("name")
      .linkLabel("label")
      .linkDirectionalArrowLength(6)
      .linkDirectionalArrowRelPos(1)
      .linkColor(() => "#888888")
      .linkDirectionalArrowColor(() => "#888888")
      .nodeColor((node) => NODE_COLORS[node.nodeType] ?? "#888888")
      .nodeCanvasObject((node, ctx, globalScale) => {
        const label = node.name ?? "";
        const r = 6;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
        ctx.fillStyle = NODE_COLORS[node.nodeType] ?? "#888888";
        ctx.fill();
        if (globalScale >= 0.6) {
          const fontSize = Math.max(10 / globalScale, 2);
          ctx.font = `${fontSize}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = isDarkRef.current
            ? "rgba(255,255,255,0.8)"
            : "rgba(0,0,0,0.8)";
          ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 2);
        }
      })
      .nodeCanvasObjectMode(() => "replace")
      .onNodeClick((node) => {
        if (onNodeClickRef.current) {
          const sourceNode: SourceNode = {
            id: node.id,
            name: node.name,
            nodeType: node.nodeType as SourceNode["nodeType"],
            jurisdiction: node.jurisdiction,
            tags: node.tags,
            source: node.source,
            content: node.content,
            from: node.from,
            to: node.to,
            parentName: node.parentName,
            attributes: node.attributes,
          };
          onNodeClickRef.current(sourceNode);
        }
      });

    // Set initial size before pushing data so the canvas has dimensions
    // (width/height props read at mount time only; ResizeObserver keeps them synced)
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) {
      fg.width(w).height(h);
    }

    // Push the current graph data
    fg.graphData(graphDataRef.current);

    return () => {
      fg._destructor();
      fgRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once — refs carry all updates

  // ------------------------------------------------------------------
  // Push graph data changes after mount
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.graphData(graphData);
  }, [graphData]);

  // ------------------------------------------------------------------
  // Sync dimensions
  // ------------------------------------------------------------------
  const updateSize = useCallback(() => {
    const el = containerRef.current;
    if (!el || !fgRef.current) return;
    const w = width ?? el.clientWidth;
    const h = height ?? el.clientHeight;
    if (w > 0 && h > 0) {
      fgRef.current.width(w).height(h);
    }
  }, [width, height]);

  useEffect(() => {
    updateSize();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateSize]);

  return (
    <div
      className="relative w-full h-full flex flex-col border border-dashed border-border font-mono"
      style={{ minHeight: 0 }}
    >
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ minHeight: 0, overflow: "hidden" }}
        aria-label="Source graph visualization"
      />
      <div className="flex items-center justify-between px-3 py-1 border-t border-dashed border-border bg-background shrink-0">
        <span className="font-mono text-xs text-muted-foreground">
          {graph.nodes.length} nodes · {graph.edges.length} edges
          {graphData.nodes.length !== graph.nodes.length && (
            <span className="text-destructive ml-2">
              ({graphData.nodes.length} rendered)
            </span>
          )}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {graph.name}
        </span>
      </div>
    </div>
  );
}

export default SourceGraphDiagram;
