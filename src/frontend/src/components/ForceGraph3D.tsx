import { useCallback, useEffect, useRef, useState } from "react";
// @ts-ignore
import ForceGraph3DLib from "react-force-graph-3d";
// @ts-ignore
import SpriteText from "three-spritetext";

interface LayoutNode {
  id: string;
  label: string;
  type: string;
  level: number;
  x: number;
  y: number;
  upvotes: number;
  downvotes: number;
  originalTokenSequence?: string;
  curationId?: string;
  swarmId?: string;
  opacity?: number;
}

interface LayoutLink {
  source: string;
  target: string;
  relationType?: string;
  isInterpretationTokenEdge?: boolean;
  edgeType?: "from" | "to";
}

interface ForceGraph3DProps {
  nodes: LayoutNode[];
  links: LayoutLink[];
  filteredNodes: LayoutNode[];
  filteredLinks: LayoutLink[];
  subgraphNodes: LayoutNode[];
  subgraphLinks: LayoutLink[];
  nodeSize: number;
  edgeThickness: number;
  theme: string | undefined;
  resolvedTheme: string | undefined;
  hoveredNode: LayoutNode | null;
  selectedNode: LayoutNode | null;
  subgraphMode: boolean;
  focusedNode: string | null;
  onNodeClick: (node: LayoutNode) => void;
  onNodeHover: (node: LayoutNode | null) => void;
}

const NODE_COLORS: Record<string, string> = {
  curation: "#FF7043",
  swarm: "#42A5F5",
  location: "#66BB6A",
  lawToken: "#BA68C8",
  interpretationToken: "#FFB74D",
  sublocation: "#4DB6AC",
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] ?? "#9CA3AF";
}

export function ForceGraph3D({
  filteredNodes,
  filteredLinks,
  subgraphNodes,
  subgraphLinks,
  subgraphMode,
  selectedNode,
  onNodeClick,
  onNodeHover,
}: ForceGraph3DProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Track hovered node id for highlighting
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ResizeObserver for container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // Fit graph when subgraph mode changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit(1000, 50);
    }, 300);
    return () => clearTimeout(timer);
  }, [subgraphMode]);

  const activeNodes = subgraphMode ? subgraphNodes : filteredNodes;
  const activeLinks = subgraphMode ? subgraphLinks : filteredLinks;

  // Build connected node set for hover highlighting
  const connectedIds = useCallback(
    (nodeId: string): Set<string> => {
      const set = new Set<string>([nodeId]);
      for (const link of activeLinks) {
        const src =
          typeof link.source === "object"
            ? (link.source as any).id
            : link.source;
        const tgt =
          typeof link.target === "object"
            ? (link.target as any).id
            : link.target;
        if (src === nodeId) set.add(tgt);
        if (tgt === nodeId) set.add(src);
      }
      return set;
    },
    [activeLinks],
  );

  const graphData = {
    nodes: activeNodes.map((n) => ({ ...n, name: n.label, nodeType: n.type })),
    links: activeLinks.map((l) => ({ ...l })),
  };

  const handleNodeClick = useCallback(
    (node: any) => {
      graphRef.current?.centerAt(node.x, node.y, node.z, 1000);
      graphRef.current?.zoom(5, 1000);
      onNodeClick(node as LayoutNode);
    },
    [onNodeClick],
  );

  const handleNodeHover = useCallback(
    (node: any) => {
      const id = node ? node.id : null;
      setHoveredId(id);
      onNodeHover(node ? (node as LayoutNode) : null);
    },
    [onNodeHover],
  );

  const connected = hoveredId
    ? connectedIds(hoveredId)
    : selectedNode
      ? connectedIds(selectedNode.id)
      : null;

  const nodeColor = useCallback(
    (node: any): string => {
      const baseColor = getNodeColor(node.nodeType ?? node.type);
      if (connected && !connected.has(node.id)) {
        return `${baseColor}33`;
      }
      return baseColor;
    },
    [connected],
  );

  const linkColor = useCallback(
    (link: any): string => {
      if (!connected) return "#555555";
      const src =
        typeof link.source === "object" ? link.source.id : link.source;
      const tgt =
        typeof link.target === "object" ? link.target.id : link.target;
      if (connected.has(src) && connected.has(tgt)) return "#aaaaaa";
      return "#333333";
    },
    [connected],
  );

  const linkWidth = useCallback((link: any): number => {
    return link.isInterpretationTokenEdge ? 2 : 1;
  }, []);

  const nodeThreeObject = useCallback((node: any) => {
    const sprite = new SpriteText(node.label ?? node.name ?? "");
    sprite.color = "rgba(255,255,255,0.85)";
    sprite.textHeight = 3;
    sprite.position.y = 8;
    return sprite;
  }, []);

  const linkLabel = useCallback((link: any): string => {
    if (link.isInterpretationTokenEdge && link.relationType) {
      return link.relationType;
    }
    return "";
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ForceGraph3DLib
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={nodeColor}
        nodeRelSize={4}
        nodeResolution={16}
        nodeOpacity={0.9}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={true}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.3}
        linkLabel={linkLabel}
        backgroundColor="#0a0a0a"
        showNavInfo={false}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
      />
    </div>
  );
}

export default ForceGraph3D;
