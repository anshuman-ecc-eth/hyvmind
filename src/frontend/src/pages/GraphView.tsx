import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Directionality, GraphEdge, GraphNode } from "../backend";
import ForceGraph3D, {
  type ForceGraph3DHandle,
} from "../components/ForceGraph3D";
import { useGetOwnedData } from "../hooks/useQueries";

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
  fromDirectionality?: Directionality;
  toDirectionality?: Directionality;
  isInterpretationTokenEdge?: boolean;
  edgeType?: "from" | "to";
}

interface GraphViewProps {
  readOnly?: boolean;
  usePublicData?: boolean;
}

// Unified layout state that persists across view switches and tab changes
interface UnifiedLayoutState {
  nodes: Map<string, { x: number; y: number }>;
  zoom: number;
  pan: { x: number; y: number };
  layoutComputed: boolean;
  nodeCount: number;
  edgeCount: number;
}

// Cache key for layout persistence
const LAYOUT_CACHE_KEY = "graphViewLayoutCache";

// Initialize unified layout state from cache or defaults
function initializeUnifiedLayout(): UnifiedLayoutState {
  const cached = sessionStorage.getItem(LAYOUT_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        nodes: new Map(parsed.nodes),
        zoom: parsed.zoom || 1.0,
        pan: parsed.pan || { x: 0, y: 0 },
        layoutComputed: parsed.layoutComputed || false,
        nodeCount: parsed.nodeCount || 0,
        edgeCount: parsed.edgeCount || 0,
      };
    } catch {
      // Fall through to default
    }
  }
  return {
    nodes: new Map(),
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    layoutComputed: false,
    nodeCount: 0,
    edgeCount: 0,
  };
}

export default function GraphView({ readOnly = false }: GraphViewProps) {
  const { data: graphData, isLoading, error, isError } = useGetOwnedData();

  const { theme, resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const forceGraphRef = useRef<ForceGraph3DHandle | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);

  // Unified layout state - persists across tab switches
  const unifiedLayoutRef = useRef<UnifiedLayoutState>(
    initializeUnifiedLayout(),
  );

  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  const layoutLockRef = useRef(true);
  const prevGraphDataRef = useRef<{
    nodeCount: number;
    edgeCount: number;
  } | null>(null);

  // Save unified layout state to sessionStorage
  const saveLayoutCache = useCallback(() => {
    const cacheData = {
      nodes: Array.from(unifiedLayoutRef.current.nodes.entries()),
      zoom: unifiedLayoutRef.current.zoom,
      pan: unifiedLayoutRef.current.pan,
      layoutComputed: unifiedLayoutRef.current.layoutComputed,
      nodeCount: unifiedLayoutRef.current.nodeCount,
      edgeCount: unifiedLayoutRef.current.edgeCount,
    };
    sessionStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(cacheData));
  }, []);

  const width = typeof window !== "undefined" ? window.innerWidth : 1200;
  const height = typeof window !== "undefined" ? window.innerHeight - 128 : 800;

  // Automatic layout engine
  const computeForceLayout = useCallback(
    (
      layoutNodes: LayoutNode[],
      layoutLinks: LayoutLink[],
      centerX: number,
      centerY: number,
      edgeDist: number,
    ): LayoutNode[] => {
      if (layoutNodes.length === 0) return layoutNodes;

      type SimNode = LayoutNode & { index?: number; vx?: number; vy?: number };
      const simNodes: SimNode[] = layoutNodes.map((n) => ({ ...n }));
      const nodeById = new Map(simNodes.map((n) => [n.id, n]));

      type SimLink = { source: SimNode; target: SimNode };
      const simLinks: SimLink[] = layoutLinks
        .filter((l) => nodeById.has(l.source) && nodeById.has(l.target))
        .map((l) => ({
          source: nodeById.get(l.source)!,
          target: nodeById.get(l.target)!,
        }));

      for (const sn of simNodes) {
        if (sn.x === undefined || sn.x === 0)
          sn.x = centerX + (Math.random() - 0.5) * 200;
        if (sn.y === undefined || sn.y === 0)
          sn.y = centerY + (Math.random() - 0.5) * 200;
      }
      const alpha0 = 1;
      const alphaDecay = 0.02;
      const velocityDecay = 0.6;
      let alpha = alpha0;
      for (let tick = 0; tick < 300; tick++) {
        alpha *= 1 - alphaDecay;
        if (alpha < 0.001) break;
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i];
            const b = simNodes[j];
            const dx = (b.x ?? centerX) - (a.x ?? centerX);
            const dy = (b.y ?? centerY) - (a.y ?? centerY);
            const dist2 = dx * dx + dy * dy + 1;
            const strength = (-300 * alpha) / dist2;
            if (!a.vx) a.vx = 0;
            if (!a.vy) a.vy = 0;
            if (!b.vx) b.vx = 0;
            if (!b.vy) b.vy = 0;
            a.vx -= dx * strength;
            a.vy -= dy * strength;
            b.vx += dx * strength;
            b.vy += dy * strength;
          }
        }
        for (const link of simLinks) {
          const s = link.source;
          const t = link.target;
          const dx = (t.x ?? centerX) - (s.x ?? centerX);
          const dy = (t.y ?? centerY) - (s.y ?? centerY);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = ((dist - edgeDist) / dist) * 0.5 * alpha;
          if (!s.vx) s.vx = 0;
          if (!s.vy) s.vy = 0;
          if (!t.vx) t.vx = 0;
          if (!t.vy) t.vy = 0;
          s.vx += dx * diff;
          s.vy += dy * diff;
          t.vx -= dx * diff;
          t.vy -= dy * diff;
        }
        const cx =
          simNodes.reduce((s, n) => s + (n.x ?? 0), 0) / (simNodes.length || 1);
        const cy =
          simNodes.reduce((s, n) => s + (n.y ?? 0), 0) / (simNodes.length || 1);
        for (const sn of simNodes) {
          if (!sn.vx) sn.vx = 0;
          if (!sn.vy) sn.vy = 0;
          sn.vx += (centerX - cx) * alpha;
          sn.vy += (centerY - cy) * alpha;
        }
        const collideRadius = 20 * 1.5;
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i];
            const b = simNodes[j];
            const dx = (b.x ?? centerX) - (a.x ?? centerX);
            const dy = (b.y ?? centerY) - (a.y ?? centerY);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < collideRadius * 2) {
              const overlap = ((collideRadius * 2 - dist) / dist) * 0.5;
              if (!a.vx) a.vx = 0;
              if (!a.vy) a.vy = 0;
              if (!b.vx) b.vx = 0;
              if (!b.vy) b.vy = 0;
              a.vx -= dx * overlap;
              a.vy -= dy * overlap;
              b.vx += dx * overlap;
              b.vy += dy * overlap;
            }
          }
        }
        for (const sn of simNodes) {
          sn.vx = (sn.vx ?? 0) * velocityDecay;
          sn.vy = (sn.vy ?? 0) * velocityDecay;
          sn.x = (sn.x ?? centerX) + sn.vx;
          sn.y = (sn.y ?? centerY) + sn.vy;
        }
      }

      for (const sn of simNodes) {
        unifiedLayoutRef.current.nodes.set(sn.id, { x: sn.x, y: sn.y });
      }
      unifiedLayoutRef.current.layoutComputed = true;
      saveLayoutCache();

      return layoutNodes.map((n) => {
        const sn = nodeById.get(n.id);
        return sn ? { ...n, x: sn.x, y: sn.y } : n;
      });
    },
    [saveLayoutCache],
  );

  // Build nodes and links from graph data
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only when graphData changes
  useEffect(() => {
    if (!graphData) return;

    const layoutNodes: LayoutNode[] = [];
    const layoutLinks: LayoutLink[] = [];
    const processedNodes = new Set<string>();
    const newNodesMap = new Map<string, LayoutNode>();

    const processNode = (
      node: GraphNode,
      level: number,
      curationId?: string,
      swarmId?: string,
    ) => {
      if (processedNodes.has(node.id)) return;
      processedNodes.add(node.id);

      let originalTokenSequence: string | undefined;
      if (node.nodeType === "location") {
        const location = graphData.locations.find((l) => l.id === node.id);
        originalTokenSequence = location?.originalTokenSequence;
      }

      const unifiedPos = unifiedLayoutRef.current.nodes.get(node.id);
      const centerX = width / 2;
      const centerY = height / 2;
      const randomRadius = 350;
      const angle = Math.random() * 2 * Math.PI;

      const layoutNode: LayoutNode = {
        id: node.id,
        label: node.tokenLabel,
        type: node.nodeType,
        level,
        x:
          unifiedPos?.x ??
          centerX + Math.cos(angle) * randomRadius * Math.random(),
        y:
          unifiedPos?.y ??
          centerY + Math.sin(angle) * randomRadius * Math.random(),
        upvotes: 0,
        downvotes: 0,
        originalTokenSequence,
        curationId: node.nodeType === "curation" ? node.id : curationId,
        swarmId: node.nodeType === "swarm" ? node.id : swarmId,
        opacity: 1,
      };

      layoutNodes.push(layoutNode);
      newNodesMap.set(node.id, layoutNode);

      const newCurationId = node.nodeType === "curation" ? node.id : curationId;
      const newSwarmId = node.nodeType === "swarm" ? node.id : swarmId;

      // biome-ignore lint/complexity/noForEach: imperative code
      node.children.forEach((child) => {
        if (
          !(node.nodeType === "location" && child.nodeType === "lawToken") &&
          !(
            node.nodeType === "lawToken" &&
            child.nodeType === "interpretationToken"
          )
        ) {
          layoutLinks.push({ source: node.id, target: child.id });
        }
        if (child.nodeType !== "interpretationToken") {
          processNode(child, level + 1, newCurationId, newSwarmId);
        }
      });
    };

    // biome-ignore lint/complexity/noForEach: imperative code
    graphData.rootNodes.forEach((root) => processNode(root, 0));

    // biome-ignore lint/complexity/noForEach: imperative code
    graphData.interpretationTokens.forEach((interpretationToken) => {
      if (!processedNodes.has(interpretationToken.id)) {
        processedNodes.add(interpretationToken.id);
        const unifiedPos = unifiedLayoutRef.current.nodes.get(
          interpretationToken.id,
        );
        const centerX = width / 2;
        const centerY = height / 2;
        const randomRadius = 350;
        const angle = Math.random() * 2 * Math.PI;
        let level = 4;
        const originNode = newNodesMap.get(interpretationToken.fromTokenId);
        if (originNode) level = originNode.level + 1;
        const layoutNode: LayoutNode = {
          id: interpretationToken.id,
          label: interpretationToken.title,
          type: "interpretationToken",
          level,
          x:
            unifiedPos?.x ??
            centerX + Math.cos(angle) * randomRadius * Math.random(),
          y:
            unifiedPos?.y ??
            centerY + Math.sin(angle) * randomRadius * Math.random(),
          upvotes: 0,
          downvotes: 0,
          opacity: 1,
        };
        layoutNodes.push(layoutNode);
        newNodesMap.set(interpretationToken.id, layoutNode);
      }
    });

    if (graphData.sublocations) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.sublocations.forEach((sublocation) => {
        if (!processedNodes.has(sublocation.id)) {
          processedNodes.add(sublocation.id);
          const unifiedPos = unifiedLayoutRef.current.nodes.get(sublocation.id);
          const centerX = width / 2;
          const centerY = height / 2;
          const randomRadius = 300;
          const angle = Math.random() * 2 * Math.PI;
          const layoutNode: LayoutNode = {
            id: sublocation.id,
            label: sublocation.title,
            type: "sublocation",
            level: 4,
            x:
              unifiedPos?.x ??
              centerX + Math.cos(angle) * randomRadius * Math.random(),
            y:
              unifiedPos?.y ??
              centerY + Math.sin(angle) * randomRadius * Math.random(),
            upvotes: 0,
            downvotes: 0,
            opacity: 1,
          };
          layoutNodes.push(layoutNode);
          newNodesMap.set(sublocation.id, layoutNode);
        }
      });
    }

    // biome-ignore lint/complexity/noForEach: imperative code
    graphData.edges.forEach((edge: GraphEdge) => {
      const sourceExists = layoutNodes.some((n) => n.id === edge.source);
      const targetExists = layoutNodes.some((n) => n.id === edge.target);
      if (sourceExists && targetExists) {
        const edgeExists = layoutLinks.some(
          (link) => link.source === edge.source && link.target === edge.target,
        );
        if (!edgeExists) {
          let relationType: string | undefined;
          let fromDirectionality: Directionality | undefined;
          let toDirectionality: Directionality | undefined;
          let isInterpretationTokenEdge = false;
          let edgeType: "from" | "to" | undefined;

          const interpretationTokenFrom = graphData.interpretationTokens.find(
            (interp) =>
              interp.fromTokenId === edge.source && interp.id === edge.target,
          );
          if (interpretationTokenFrom) {
            relationType = interpretationTokenFrom.fromRelationshipType;
            fromDirectionality = interpretationTokenFrom.fromDirectionality;
            isInterpretationTokenEdge = true;
            edgeType = "from";
          }

          const interpretationTokenTo = graphData.interpretationTokens.find(
            (interp) =>
              interp.id === edge.source && interp.toNodeId === edge.target,
          );
          if (interpretationTokenTo) {
            relationType = interpretationTokenTo.toRelationshipType;
            toDirectionality = interpretationTokenTo.toDirectionality;
            isInterpretationTokenEdge = true;
            edgeType = "to";
          }

          layoutLinks.push({
            source: edge.source,
            target: edge.target,
            relationType,
            fromDirectionality,
            toDirectionality,
            isInterpretationTokenEdge,
            edgeType,
          });
        }
      }
    });

    let positionedNodes = layoutNodes;

    const currentNodeCount = layoutNodes.length;
    const currentEdgeCount = layoutLinks.length;

    const prevData = prevGraphDataRef.current;
    const hasNewData =
      !prevData ||
      prevData.nodeCount !== currentNodeCount ||
      prevData.edgeCount !== currentEdgeCount;
    if (hasNewData) {
      layoutLockRef.current = true;
    }

    const topologyChanged =
      !unifiedLayoutRef.current.layoutComputed ||
      unifiedLayoutRef.current.nodeCount !== currentNodeCount ||
      unifiedLayoutRef.current.edgeCount !== currentEdgeCount;

    if (layoutLockRef.current && topologyChanged) {
      positionedNodes = computeForceLayout(
        layoutNodes,
        layoutLinks,
        width / 2,
        height / 2,
        100,
      );
      unifiedLayoutRef.current.nodeCount = currentNodeCount;
      unifiedLayoutRef.current.edgeCount = currentEdgeCount;
      layoutLockRef.current = false;
    }

    if (hasNewData) {
      nodesMapRef.current = newNodesMap;
      setNodes(positionedNodes);
      setLinks(layoutLinks);
    }
    prevGraphDataRef.current = {
      nodeCount: currentNodeCount,
      edgeCount: currentEdgeCount,
    };
  }, [graphData]);

  // All nodes/links pass through — no type filters
  const filteredNodes = useMemo(() => nodes, [nodes]);
  const filteredLinks = useMemo(() => links, [links]);

  // theme/resolvedTheme kept for potential future use
  const _theme = theme;
  const _resolvedTheme = resolvedTheme;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold">Failed to load graph data</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
              <p className="text-sm text-muted-foreground">
                Please try refreshing the page or check your connection.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!graphData || nodes.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {readOnly
              ? "No data available yet. Log in to start building your knowledge graph!"
              : "No nodes yet. Create your first curation to get started!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-8rem)] overflow-hidden bg-background"
    >
      <div className="absolute inset-0 w-full h-full">
        <ForceGraph3D
          ref={forceGraphRef}
          filteredNodes={filteredNodes}
          filteredLinks={filteredLinks}
          dagMode="null"
        />
      </div>
    </div>
  );
}
