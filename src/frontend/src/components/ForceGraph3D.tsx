import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  filteredNodes: LayoutNode[];
  filteredLinks: LayoutLink[];
  dagMode?: string;
}

export interface ForceGraph3DHandle {
  focusNode: (x: number, y: number, z: number) => void;
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

/**
 * Given a flat list of nodes and links, returns only the nodes/links
 * reachable from root nodes (no incoming links) without traversing
 * through collapsed nodes — matching vasturiano's expandable-nodes pattern.
 */
function getPrunedData(
  nodes: LayoutNode[],
  links: LayoutLink[],
  collapsedNodeIds: Set<string>,
): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const childrenMap = new Map<string, string[]>();
  const hasIncoming = new Set<string>();

  for (const link of links) {
    const src =
      typeof link.source === "object" ? (link.source as any).id : link.source;
    const tgt =
      typeof link.target === "object" ? (link.target as any).id : link.target;
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
    hasIncoming.add(tgt);
    if (!childrenMap.has(src)) childrenMap.set(src, []);
    childrenMap.get(src)!.push(tgt);
  }

  const roots = nodes.filter((n) => !hasIncoming.has(n.id));

  const visibleIds = new Set<string>();
  const queue = roots.map((n) => n.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visibleIds.has(id)) continue;
    visibleIds.add(id);
    if (!collapsedNodeIds.has(id)) {
      const children = childrenMap.get(id) ?? [];
      for (const childId of children) {
        if (!visibleIds.has(childId)) queue.push(childId);
      }
    }
  }

  const prunedNodes = nodes.filter((n) => visibleIds.has(n.id));
  const prunedLinks = links.filter((l) => {
    const src = typeof l.source === "object" ? (l.source as any).id : l.source;
    const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
    return visibleIds.has(src) && visibleIds.has(tgt);
  });

  return { nodes: prunedNodes, links: prunedLinks };
}

export const ForceGraph3D = forwardRef<ForceGraph3DHandle, ForceGraph3DProps>(
  function ForceGraph3D({ filteredNodes, filteredLinks, dagMode }, ref) {
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
      new Set(),
    );

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

    const focusNode = useCallback((x: number, y: number, z: number) => {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(x ?? 1, y ?? 1, z ?? 1);
      graphRef.current?.cameraPosition(
        { x: x * distRatio, y: y * distRatio, z: z * distRatio },
        { x, y, z },
        1000,
      );
    }, []);

    useImperativeHandle(ref, () => ({ focusNode }), [focusNode]);

    const pruned = getPrunedData(
      filteredNodes,
      filteredLinks,
      collapsedNodeIds,
    );

    const graphData = {
      nodes: pruned.nodes.map((n) => ({
        ...n,
        name: n.label,
        nodeType: n.type,
      })),
      links: pruned.links.map((l) => ({ ...l })),
    };

    const handleNodeClick = useCallback((node: any) => {
      const distance = 40;
      const distRatio =
        1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1);
      graphRef.current?.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        { x: node.x, y: node.y, z: node.z },
        1000,
      );
    }, []);

    const handleNodeRightClick = useCallback((node: any) => {
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }, []);

    const nodeColor = useCallback((node: any): string => {
      return getNodeColor(node.nodeType ?? node.type);
    }, []);

    const linkColor = useCallback((_link: any): string => "#555555", []);

    const linkWidth = useCallback((link: any): number => {
      return link.isInterpretationTokenEdge ? 2 : 1;
    }, []);

    const nodeThreeObject = useCallback(
      (node: any) => {
        const label = node.label ?? node.name ?? "";
        const isCollapsed = collapsedNodeIds.has(node.id);
        const sprite = new SpriteText(isCollapsed ? `${label} [+]` : label);
        sprite.color = isCollapsed ? "#FFD700" : "rgba(255,255,255,0.85)";
        sprite.textHeight = 3;
        sprite.position.y = 8;
        return sprite;
      },
      [collapsedNodeIds],
    );

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
          dagMode={dagMode === "null" ? undefined : (dagMode as any)}
          dagLevelDistance={100}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
        />
      </div>
    );
  },
);

export default ForceGraph3D;
