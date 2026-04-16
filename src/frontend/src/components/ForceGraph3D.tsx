import { useTheme } from "next-themes";
import React, {
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
  curationId?: string;
  swarmId?: string;
  opacity?: number;
}

interface LayoutLink {
  source: string;
  target: string;
  edgeLabel: string;
  bidirectional: boolean;
}

interface ForceGraph3DProps {
  filteredNodes: LayoutNode[];
  filteredLinks: LayoutLink[];
  dagMode?: string;
}

export interface ForceGraph3DHandle {
  focusNode: (x: number, y: number, z: number) => void;
}

// Base type colors (unchanged for both themes)
const NODE_COLORS: Record<string, string> = {
  curation: "#4a9eff",
  swarm: "#ff7f50",
  location: "#90EE90",
  lawToken: "#FFD700",
  interpretationToken: "#DA70D6",
};

// Theme-aware colors
const BG_COLORS = { light: "#f5f5f5", dark: "#0a0a0a" };
const LINK_COLORS = { light: "#888888", dark: "#555555" };
const LINK_HIGHLIGHT_LIGHT = "#bbbbbb";
const LINK_DIM_LIGHT = "rgba(120,120,120,0.25)";
const LABEL_COLORS = {
  light: "rgba(0,0,0,0.85)",
  dark: "rgba(255,255,255,0.85)",
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] ?? "#9CA3AF";
}

/**
 * Brightens a hex color by blending it toward white by the given factor (0–1).
 */
function brightenColor(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  const br = Math.round(r + (255 - r) * factor);
  const bg = Math.round(g + (255 - g) * factor);
  const bb = Math.round(b + (255 - b) * factor);
  return `rgb(${br},${bg},${bb})`;
}

/**
 * Returns a dimmed rgba string for a hex color (for non-highlighted nodes).
 */
function dimColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},0.15)`;
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

export const ForceGraph3D = React.memo(
  forwardRef<ForceGraph3DHandle, ForceGraph3DProps>(function ForceGraph3D(
    { filteredNodes, filteredLinks, dagMode },
    ref,
  ) {
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
      new Set(),
    );

    const { theme } = useTheme();
    const isLight = theme === "light";

    // Highlight state — use refs to avoid re-render feedback loops
    const highlightNodesRef = useRef<Set<string>>(new Set());
    const highlightLinksRef = useRef<Set<string>>(new Set());
    const hoveredNodeRef = useRef<any>(null);

    // Debounce timeout ref for updateScene
    const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Adjacency maps, rebuilt whenever pruned graph changes
    const neighborsMapRef = useRef<Map<string, Set<string>>>(new Map());
    const linkIdMapRef = useRef<Map<string, Set<string>>>(new Map());

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
      return () => {
        ro.disconnect();
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      };
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

    // Rebuild adjacency maps whenever pruned graph changes
    const graphData = React.useMemo(() => {
      const newNeighbors = new Map<string, Set<string>>();
      const newLinkIds = new Map<string, Set<string>>();

      const gNodes = pruned.nodes.map((n) => ({
        ...n,
        name: n.label,
        nodeType: n.type,
      }));

      const gLinks = pruned.links.map((l, i) => {
        const src =
          typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgt =
          typeof l.target === "object" ? (l.target as any).id : l.target;
        const linkId = `link-${i}-${src}-${tgt}`;

        // Populate neighbor map
        if (!newNeighbors.has(src)) newNeighbors.set(src, new Set());
        if (!newNeighbors.has(tgt)) newNeighbors.set(tgt, new Set());
        newNeighbors.get(src)!.add(tgt);
        newNeighbors.get(tgt)!.add(src);

        // Populate link id map (per node)
        if (!newLinkIds.has(src)) newLinkIds.set(src, new Set());
        if (!newLinkIds.has(tgt)) newLinkIds.set(tgt, new Set());
        newLinkIds.get(src)!.add(linkId);
        newLinkIds.get(tgt)!.add(linkId);

        return { ...l, __id: linkId };
      });

      neighborsMapRef.current = newNeighbors;
      linkIdMapRef.current = newLinkIds;

      return { nodes: gNodes, links: gLinks };
    }, [pruned]);

    // Forces the library to re-evaluate node/link visual properties
    const updateScene = useCallback(() => {
      graphRef.current?.refresh();
    }, []);

    const handleNodeClick = useCallback((node: any) => {
      const distance = 40;
      const distRatio =
        1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1);
      graphRef.current?.cameraPosition(
        {
          x: node.x * distRatio,
          y: node.y * distRatio,
          z: node.z * distRatio,
        },
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

    const handleNodeHover = useCallback(
      (node: any) => {
        // No change
        if (node === hoveredNodeRef.current) return;
        if (!node && hoveredNodeRef.current === null) return;

        highlightNodesRef.current.clear();
        highlightLinksRef.current.clear();

        if (node) {
          highlightNodesRef.current.add(node.id);
          const neighbors = neighborsMapRef.current.get(node.id);
          if (neighbors) {
            for (const nId of neighbors) highlightNodesRef.current.add(nId);
          }
          const linkIds = linkIdMapRef.current.get(node.id);
          if (linkIds) {
            for (const lId of linkIds) highlightLinksRef.current.add(lId);
          }
        }

        hoveredNodeRef.current = node || null;
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(updateScene, 16);
      },
      [updateScene],
    );

    const handleLinkHover = useCallback(
      (link: any) => {
        highlightNodesRef.current.clear();
        highlightLinksRef.current.clear();

        if (link) {
          highlightLinksRef.current.add(link.__id);
          const src =
            typeof link.source === "object" ? link.source.id : link.source;
          const tgt =
            typeof link.target === "object" ? link.target.id : link.target;
          highlightNodesRef.current.add(src);
          highlightNodesRef.current.add(tgt);
        }

        hoveredNodeRef.current = null;
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(updateScene, 16);
      },
      [updateScene],
    );

    const nodeColor = useCallback((node: any): string => {
      const base = getNodeColor(node.nodeType ?? node.type);
      const isHighlighting = highlightNodesRef.current.size > 0;
      if (!isHighlighting) return base;

      if (!highlightNodesRef.current.has(node.id)) {
        return dimColor(base);
      }
      // Directly hovered node — brighten strongly toward white
      if (hoveredNodeRef.current && hoveredNodeRef.current.id === node.id) {
        return brightenColor(base, 0.75);
      }
      // Neighbor — brighten moderately
      return brightenColor(base, 0.4);
    }, []);

    const linkColor = useCallback(
      (_link: any): string => {
        const isHighlighting = highlightLinksRef.current.size > 0;
        if (!isHighlighting) {
          return isLight ? LINK_COLORS.light : LINK_COLORS.dark;
        }
        if (highlightLinksRef.current.has(_link.__id)) {
          return isLight ? LINK_HIGHLIGHT_LIGHT : "#aaaaaa";
        }
        return isLight ? LINK_DIM_LIGHT : "rgba(80,80,80,0.15)";
      },
      [isLight],
    );

    const linkWidth = useCallback((link: any): number => {
      return highlightLinksRef.current.has(link.__id) ? 3 : 1;
    }, []);

    const linkDirectionalParticles = useCallback((link: any): number => {
      return highlightLinksRef.current.has(link.__id) ? 4 : 0;
    }, []);

    const nodeThreeObject = useCallback(
      (node: any) => {
        const label = node.label ?? node.name ?? "";
        const isCollapsed = collapsedNodeIds.has(node.id);
        const sprite = new SpriteText(isCollapsed ? `${label} [+]` : label);
        sprite.color = isCollapsed
          ? "#FFD700"
          : isLight
            ? LABEL_COLORS.light
            : LABEL_COLORS.dark;
        sprite.textHeight = 3;
        sprite.position.y = 8;
        return sprite;
      },
      [collapsedNodeIds, isLight],
    );

    const linkLabel = useCallback((link: any): string => {
      return link.edgeLabel || "";
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
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.01}
          backgroundColor={isLight ? BG_COLORS.light : BG_COLORS.dark}
          showNavInfo={false}
          dagMode={dagMode === "null" ? undefined : (dagMode as any)}
          dagLevelDistance={100}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeHover={handleNodeHover}
          onLinkHover={handleLinkHover}
        />
      </div>
    );
  }),
);

export default ForceGraph3D;
