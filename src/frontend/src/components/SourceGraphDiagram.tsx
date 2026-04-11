import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CanvasNode {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  nodeType: string;
  nodeName: string;
  radius: number;
}

interface CanvasEdge {
  source: string;
  target: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPE_NAMES: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawToken: "LawToken",
  interpretationToken: "InterpToken",
};

const GRAPH_GREY = "#808080";
const HIGHLIGHT_COLOR = "#FFD700";

const NODE_RADIUS: Record<string, number> = {
  curation: 12,
  swarm: 10,
  location: 8,
  lawToken: 6,
  interpretationToken: 6,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return (Math.abs(Math.sin(hash)) * 10000) % 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SourceGraphDiagramProps {
  graph: SourceGraph;
  width?: number;
  height?: number;
  onNodeClick?: (node: SourceNode) => void;
}

export default function SourceGraphDiagram({
  graph,
  onNodeClick,
}: SourceGraphDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<CanvasNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<CanvasEdge | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [resizeKey, setResizeKey] = useState(0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // High-DPI resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const parent = canvasRef.current.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      setResizeKey((k) => k + 1);
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [mounted, resizeCanvas]);

  // Build canvas nodes and edges from SourceGraph
  const { nodes, edges } = useMemo(() => {
    const canvasNodes: CanvasNode[] = graph.nodes.map((n) => ({
      name: n.name,
      x: seededRandom(`${n.name}_x`) * 800 + 100,
      y: seededRandom(`${n.name}_y`) * 600 + 100,
      vx: 0,
      vy: 0,
      nodeType: n.nodeType,
      nodeName: n.name,
      radius: NODE_RADIUS[n.nodeType] ?? 6,
    }));

    // No filtering — edges use filename strings that directly match node names
    const canvasEdges: CanvasEdge[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    }));

    return { nodes: canvasNodes, edges: canvasEdges };
  }, [graph]);

  // Neighbor map for hover highlighting
  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    // biome-ignore lint/complexity/noForEach: canvas imperative code
    nodes.forEach((n) => map.set(n.name, new Set()));
    // biome-ignore lint/complexity/noForEach: canvas imperative code
    edges.forEach((e) => {
      map.get(e.source)?.add(e.target);
      map.get(e.target)?.add(e.source);
    });
    return map;
  }, [nodes, edges]);

  // Force-directed simulation
  // biome-ignore lint/correctness/useExhaustiveDependencies: resizeKey is intentional
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0 || !mounted) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let active = true;
    resizeCanvas();

    const REPULSION = 5000;
    const ATTRACTION = 0.01;
    const DAMPING = 0.85;
    const MIN_DIST = 30;

    const nodeMap = new Map<string, CanvasNode>();
    // biome-ignore lint/complexity/noForEach: canvas imperative code
    nodes.forEach((n) => nodeMap.set(n.name, n));

    const simulate = () => {
      if (!active) return;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Apply repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < MIN_DIST) continue;
          const force = REPULSION / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }

        // Edge attraction
        // biome-ignore lint/complexity/noForEach: canvas imperative code
        edges.forEach((e) => {
          let other: CanvasNode | undefined;
          if (e.source === a.name) other = nodeMap.get(e.target);
          else if (e.target === a.name) other = nodeMap.get(e.source);
          if (other) {
            a.vx += (other.x - a.x) * ATTRACTION;
            a.vy += (other.y - a.y) * ATTRACTION;
          }
        });

        // Center gravity
        a.vx += (w / 2 - a.x) * 0.001;
        a.vy += (h / 2 - a.y) * 0.001;
      }

      // Integrate
      // biome-ignore lint/complexity/noForEach: canvas imperative code
      nodes.forEach((n) => {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        const m = n.radius + 10;
        if (n.x < m) {
          n.x = m;
          n.vx = 0;
        }
        if (n.x > w - m) {
          n.x = w - m;
          n.vx = 0;
        }
        if (n.y < m) {
          n.y = m;
          n.vy = 0;
        }
        if (n.y > h - m) {
          n.y = h - m;
          n.vy = 0;
        }
      });

      // Draw
      const isDark = resolvedTheme === "dark";
      ctx.fillStyle = isDark ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const highlightedNodes = new Set<string>();
      const highlightedEdges = new Set<string>();

      if (hoveredNode) {
        highlightedNodes.add(hoveredNode.name);
        const neighbors = neighborMap.get(hoveredNode.name);
        if (neighbors) {
          // biome-ignore lint/complexity/noForEach: canvas imperative code
          neighbors.forEach((nname) => {
            highlightedNodes.add(nname);
            highlightedEdges.add(`${hoveredNode.name}-${nname}`);
            highlightedEdges.add(`${nname}-${hoveredNode.name}`);
          });
        }
      }

      // Edges (non-highlighted)
      ctx.strokeStyle = GRAPH_GREY;
      ctx.lineWidth = 1;
      // biome-ignore lint/complexity/noForEach: canvas imperative code
      edges.forEach((e) => {
        if (highlightedEdges.has(`${e.source}-${e.target}`)) return;
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // Edges (highlighted)
      if (highlightedEdges.size > 0) {
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 2.5;
        // biome-ignore lint/complexity/noForEach: canvas imperative code
        edges.forEach((e) => {
          if (!highlightedEdges.has(`${e.source}-${e.target}`)) return;
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) return;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        });
      }

      // Nodes
      // biome-ignore lint/complexity/noForEach: canvas imperative code
      nodes.forEach((n) => {
        const isHighlighted = highlightedNodes.has(n.name);
        const isHovered = hoveredNode?.name === n.name;
        ctx.globalAlpha = hoveredNode && !isHighlighted ? 0.3 : 1.0;
        const r = n.radius * (isHovered ? 1.15 : 1.0);
        ctx.fillStyle = isHighlighted ? HIGHLIGHT_COLOR : GRAPH_GREY;
        ctx.strokeStyle = isHighlighted ? HIGHLIGHT_COLOR : GRAPH_GREY;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Labels for hovered neighbors
      if (hoveredNode) {
        const neighbors = neighborMap.get(hoveredNode.name);
        if (neighbors) {
          ctx.font = "12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isDark ? "#ffffff" : "#000000";
          // biome-ignore lint/complexity/noForEach: canvas imperative code
          neighbors.forEach((nname) => {
            const nn = nodeMap.get(nname);
            if (nn) ctx.fillText(nn.nodeName, nn.x, nn.y - nn.radius - 8);
          });
          // Also label the hovered node itself
          ctx.fillText(
            hoveredNode.nodeName,
            hoveredNode.x,
            hoveredNode.y - hoveredNode.radius - 8,
          );
        }
      }

      // Edge label for hovered edge
      if (hoveredEdge?.label) {
        const s = nodeMap.get(hoveredEdge.source);
        const t = nodeMap.get(hoveredEdge.target);
        if (s && t) {
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2 + 4;
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(150,200,255,0.9)";
          ctx.fillText(hoveredEdge.label, mx, my);
        }
      }

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      active = false;
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    nodes,
    edges,
    hoveredNode,
    hoveredEdge,
    neighborMap,
    resolvedTheme,
    mounted,
    resizeKey,
    resizeCanvas,
  ]);

  // Shared hit-detection helper
  const findNodeAt = useCallback(
    (mx: number, my: number): CanvasNode | null => {
      for (const n of nodes) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy <= n.radius * n.radius) return n;
      }
      return null;
    },
    [nodes],
  );

  // Edge proximity detection (point-to-segment distance)
  const findEdgeAt = useCallback(
    (mx: number, my: number): CanvasEdge | null => {
      const THRESHOLD = 8;
      const nodeMap = new Map<string, CanvasNode>();
      for (const n of nodes) nodeMap.set(n.name, n);
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        const t_ = Math.max(
          0,
          Math.min(1, ((mx - s.x) * dx + (my - s.y) * dy) / lenSq),
        );
        const nearX = s.x + t_ * dx;
        const nearY = s.y + t_ * dy;
        const distSq = (mx - nearX) ** 2 + (my - nearY) ** 2;
        if (distSq <= THRESHOLD * THRESHOLD) return e;
      }
      return null;
    },
    [nodes, edges],
  );

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const foundNode = findNodeAt(mx, my);
    setHoveredNode(foundNode);
    if (foundNode) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
      setHoveredEdge(null);
    } else {
      setHoveredEdge(findEdgeAt(mx, my));
    }
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setHoveredEdge(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const foundCanvasNode = findNodeAt(mx, my);
    if (!foundCanvasNode) return;
    const sourceNode = graph.nodes.find((n) => n.name === foundCanvasNode.name);
    if (sourceNode) onNodeClick(sourceNode);
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background font-mono">
        <span className="text-muted-foreground terminal-blink">Loading_</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col border border-dashed border-border font-mono">
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handleClick(e as unknown as React.MouseEvent<HTMLCanvasElement>);
          }}
          className="w-full h-full cursor-pointer"
          style={{ display: "block" }}
          tabIndex={0}
          aria-label="Source graph visualization"
        />
        {hoveredNode && (
          <div
            className="fixed z-50 px-3 py-2 text-xs bg-popover text-popover-foreground border border-dashed border-border shadow-md pointer-events-none font-mono"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
            }}
          >
            {hoveredNode.nodeName} [
            {NODE_TYPE_NAMES[hoveredNode.nodeType] ?? hoveredNode.nodeType}]
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-dashed border-border bg-background shrink-0">
        <span className="font-mono text-xs text-muted-foreground">
          {nodes.length} nodes · {edges.length} edges
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {graph.name}
        </span>
      </div>
    </div>
  );
}
