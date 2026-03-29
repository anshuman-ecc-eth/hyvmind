import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
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

interface NodeTypeFilters {
  curation: boolean;
  swarm: boolean;
  location: boolean;
  lawToken: boolean;
  interpretationToken: boolean;
  sublocation: boolean;
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

const LEFT_PANEL_WIDTH = 352;
const RIGHT_PANEL_WIDTH = 352;
const BOTTOM_PANEL_HEIGHT = 220;
const FILL_RATIO = 0.8;

const _calculateAutoFitTransform = (
  nodes: LayoutNode[],
  viewportWidth: number,
  viewportHeight: number,
) => {
  if (nodes.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }
  const graphWidth = maxX - minX || 1;
  const graphHeight = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const usableWidth = viewportWidth - LEFT_PANEL_WIDTH - RIGHT_PANEL_WIDTH;
  const usableHeight = viewportHeight - BOTTOM_PANEL_HEIGHT;
  const viewportCenterX =
    (LEFT_PANEL_WIDTH + viewportWidth - RIGHT_PANEL_WIDTH) / 2;
  const viewportCenterY = usableHeight / 2;
  const scale = Math.min(
    (usableWidth * FILL_RATIO) / graphWidth,
    (usableHeight * FILL_RATIO) / graphHeight,
    1,
  );
  return {
    scale,
    offsetX: viewportCenterX - centerX * scale,
    offsetY: viewportCenterY - centerY * scale,
  };
};

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
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);

  // Unified layout state - shared between main graph and subgraph, persists across tab switches
  const unifiedLayoutRef = useRef<UnifiedLayoutState>(
    initializeUnifiedLayout(),
  );

  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  const layoutLockRef = useRef(true);
  const prevGraphDataRef = useRef<{
    nodeCount: number;
    edgeCount: number;
  } | null>(null);
  // Panel collapse state
  const [isLegendsCollapsed, setIsLegendsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem("graphViewLegendsCollapsed");
    return saved === "true";
  });
  const [nodeTypeFilters, setNodeTypeFilters] = useState<NodeTypeFilters>(
    () => {
      const saved = sessionStorage.getItem("graphViewFilters");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall through to defaults
        }
      }
      return {
        curation: true,
        swarm: true,
        location: true,
        lawToken: true,
        interpretationToken: true,
        sublocation: true,
      };
    },
  );

  // Helper function to build hierarchical path for a node
  const _buildNodePath = useCallback(
    (nodeId: string): string => {
      if (!graphData) return "";

      const pathParts: string[] = [];

      // Find the node and build path based on type
      const curation = graphData.curations.find((c) => c.id === nodeId);
      if (curation) {
        return ""; // Curations have no parent path
      }

      const swarm = graphData.swarms.find((s) => s.id === nodeId);
      if (swarm) {
        const parentCuration = graphData.curations.find(
          (c) => c.id === swarm.parentCurationId,
        );
        if (parentCuration) pathParts.push(parentCuration.name);
        return pathParts.join("/");
      }

      const location = graphData.locations.find((l) => l.id === nodeId);
      if (location) {
        const parentSwarm = graphData.swarms.find(
          (s) => s.id === location.parentSwarmId,
        );
        if (parentSwarm) {
          const parentCuration = graphData.curations.find(
            (c) => c.id === parentSwarm.parentCurationId,
          );
          if (parentCuration) pathParts.push(parentCuration.name);
          pathParts.push(parentSwarm.name);
        }
        return pathParts.join("/");
      }

      const lawToken = graphData.lawTokens.find((t) => t.id === nodeId);
      if (lawToken) {
        const parentLocation = graphData.locations.find(
          (l) => l.id === lawToken.parentLocationId,
        );
        if (parentLocation) {
          const parentSwarm = graphData.swarms.find(
            (s) => s.id === parentLocation.parentSwarmId,
          );
          if (parentSwarm) {
            const parentCuration = graphData.curations.find(
              (c) => c.id === parentSwarm.parentCurationId,
            );
            if (parentCuration) pathParts.push(parentCuration.name);
            pathParts.push(parentSwarm.name);
          }
          pathParts.push(parentLocation.title);
        }
        return pathParts.join("/");
      }

      const interpretationToken = graphData.interpretationTokens.find(
        (i) => i.id === nodeId,
      );
      if (interpretationToken) {
        // Build path from origin token
        const buildFromToken = (tokenId: string): void => {
          const originLocation = graphData.locations.find(
            (l) => l.id === tokenId,
          );
          if (originLocation) {
            const parentSwarm = graphData.swarms.find(
              (s) => s.id === originLocation.parentSwarmId,
            );
            if (parentSwarm) {
              const parentCuration = graphData.curations.find(
                (c) => c.id === parentSwarm.parentCurationId,
              );
              if (parentCuration) pathParts.push(parentCuration.name);
              pathParts.push(parentSwarm.name);
            }
            pathParts.push(originLocation.title);
          } else {
            const originLawToken = graphData.lawTokens.find(
              (t) => t.id === tokenId,
            );
            if (originLawToken) {
              const parentLocation = graphData.locations.find(
                (l) => l.id === originLawToken.parentLocationId,
              );
              if (parentLocation) {
                const parentSwarm = graphData.swarms.find(
                  (s) => s.id === parentLocation.parentSwarmId,
                );
                if (parentSwarm) {
                  const parentCuration = graphData.curations.find(
                    (c) => c.id === parentSwarm.parentCurationId,
                  );
                  if (parentCuration) pathParts.push(parentCuration.name);
                  pathParts.push(parentSwarm.name);
                }
                pathParts.push(parentLocation.title);
              }
              pathParts.push(originLawToken.tokenLabel);
            } else {
              const originInterpretationToken =
                graphData.interpretationTokens.find((i) => i.id === tokenId);
              if (originInterpretationToken) {
                buildFromToken(originInterpretationToken.fromTokenId);
                pathParts.push(originInterpretationToken.title);
              }
            }
          }
        };
        buildFromToken(interpretationToken.fromTokenId);
        return pathParts.join("/");
      }

      return "";
    },
    [graphData],
  );

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

  // Save panel collapse state to session storage
  useEffect(() => {
    sessionStorage.setItem(
      "graphViewLegendsCollapsed",
      isLegendsCollapsed.toString(),
    );
  }, [isLegendsCollapsed]);

  useEffect(() => {
    sessionStorage.setItem("graphViewFilters", JSON.stringify(nodeTypeFilters));
  }, [nodeTypeFilters]);

  const width = typeof window !== "undefined" ? window.innerWidth : 1200;
  const height = typeof window !== "undefined" ? window.innerHeight - 128 : 800;

  // Automatic layout engine - computes layout once during initial render
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

      // Inline force-directed layout (replaces d3-force dependency)
      // Initialize positions randomly around center
      for (const sn of simNodes) {
        if (sn.x === undefined || sn.x === 0)
          sn.x = centerX + (Math.random() - 0.5) * 200;
        if (sn.y === undefined || sn.y === 0)
          sn.y = centerY + (Math.random() - 0.5) * 200;
      }
      // Run force simulation ticks
      const alpha0 = 1;
      const alphaDecay = 0.02;
      const velocityDecay = 0.6;
      let alpha = alpha0;
      for (let tick = 0; tick < 300; tick++) {
        alpha *= 1 - alphaDecay;
        if (alpha < 0.001) break;
        // Many-body repulsion
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
        // Link forces
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
        // Centering force
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
        // Collision avoidance
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
        // Integrate
        for (const sn of simNodes) {
          sn.vx = (sn.vx ?? 0) * velocityDecay;
          sn.vy = (sn.vy ?? 0) * velocityDecay;
          sn.x = (sn.x ?? centerX) + sn.vx;
          sn.y = (sn.y ?? centerY) + sn.vy;
        }
      }

      // Write final positions back
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only when graphData changes; computeForceLayout/width/height are stable refs
  useEffect(() => {
    if (!graphData) return;

    const layoutNodes: LayoutNode[] = [];
    const layoutLinks: LayoutLink[] = [];
    const processedNodes = new Set<string>();
    const newNodesMap = new Map<string, LayoutNode>();

    // Process hierarchical nodes (excluding interpretation tokens from hierarchy)
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

      // Use unified layout state for node positions
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

      // Process children, but skip interpretation tokens in hierarchy
      // biome-ignore lint/complexity/noForEach: imperative code
      node.children.forEach((child) => {
        // Skip hierarchical edges for location->lawToken and lawToken->interpretationToken
        if (
          !(node.nodeType === "location" && child.nodeType === "lawToken") &&
          !(
            node.nodeType === "lawToken" &&
            child.nodeType === "interpretationToken"
          )
        ) {
          layoutLinks.push({
            source: node.id,
            target: child.id,
          });
        }

        // Don't process interpretation tokens as children in hierarchy
        if (child.nodeType !== "interpretationToken") {
          processNode(child, level + 1, newCurationId, newSwarmId);
        }
      });
    };

    // biome-ignore lint/complexity/noForEach: imperative code
    graphData.rootNodes.forEach((root) => processNode(root, 0));

    // Add interpretation tokens as independent nodes at their own level
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

        // Determine level based on origin token
        let level = 4; // Default level for interpretation tokens
        const originNode = newNodesMap.get(interpretationToken.fromTokenId);
        if (originNode) {
          level = originNode.level + 1;
        }

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

    // Add sublocations as independent nodes
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

    // Add edges from graph data (including interpretation token edges)
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

          // Check if this is an interpretation token "from" edge
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

          // Check if this is an interpretation token "to" edge
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

    // Performance safeguard: Skip layout if node/edge counts unchanged
    const currentNodeCount = layoutNodes.length;
    const currentEdgeCount = layoutLinks.length;

    // Layout lock: unlock only when new nodes/edges detected
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

    // Only run force simulation when topology actually changes AND lock is open
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

    // Always update state — fixes remount issue where React clears nodes[] on unmount
    // but cached positions exist in unifiedLayoutRef. Without this, the graph stays
    // blank after navigating away and back when topology hasn't changed.
    nodesMapRef.current = newNodesMap;
    setNodes(positionedNodes);
    setLinks(layoutLinks);
    prevGraphDataRef.current = {
      nodeCount: currentNodeCount,
      edgeCount: currentEdgeCount,
    };
  }, [graphData]);

  // Filter nodes and links (only for main graph)
  const filteredNodes = useMemo(
    () =>
      nodes.filter(
        (node) => nodeTypeFilters[node.type as keyof NodeTypeFilters],
      ),
    [nodes, nodeTypeFilters],
  );
  const filteredLinks = useMemo(() => {
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    return links.filter(
      (link) =>
        filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target),
    );
  }, [links, filteredNodes]);

  const getNodeColor = (type: string) => {
    const currentTheme = resolvedTheme || theme || "light";
    const isDark = currentTheme === "dark";

    const lightColors = {
      curation: "#D32F2F",
      swarm: "#1976D2",
      location: "#388E3C",
      lawToken: "#7B1FA2",
      interpretationToken: "#F57C00",
    };

    const darkColors = {
      curation: "#FF7043",
      swarm: "#42A5F5",
      location: "#66BB6A",
      lawToken: "#BA68C8",
      interpretationToken: "#FFB74D",
    };

    const colors = isDark ? darkColors : lightColors;

    switch (type) {
      case "curation":
        return colors.curation;
      case "swarm":
        return colors.swarm;
      case "location":
        return colors.location;
      case "lawToken":
        return colors.lawToken;
      case "interpretationToken":
        return colors.interpretationToken;
      case "sublocation":
        return isDark ? "#4DB6AC" : "#00897B";
      default:
        return isDark ? "#888888" : "#666666";
    }
  };

  const _getEdgeColor = () => {
    const currentTheme = resolvedTheme || theme || "light";
    const isDark = currentTheme === "dark";
    return isDark ? "#555555" : "#999999";
  };

  const _getConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    connected.add(nodeId);

    // biome-ignore lint/complexity/noForEach: imperative code
    filteredLinks.forEach((link) => {
      if (link.source === nodeId) {
        connected.add(link.target);
      }
      if (link.target === nodeId) {
        connected.add(link.source);
      }
    });

    return connected;
  };

  const toggleNodeTypeFilter = (nodeType: keyof NodeTypeFilters) => {
    setNodeTypeFilters((prev) => ({
      ...prev,
      [nodeType]: !prev[nodeType],
    }));
  };

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

  const selectedSwarmNode =
    selectedNode?.type === "swarm" ? selectedNode : null;
  const selectedLocationNode =
    selectedNode?.type === "location" ? selectedNode : null;

  const selectedLocation = selectedLocationNode
    ? graphData.locations.find((a) => a.id === selectedLocationNode.id)
    : null;

  const getNodeConnections = (nodeId: string) => {
    const incoming = filteredLinks.filter((l) => l.target === nodeId).length;
    const outgoing = filteredLinks.filter((l) => l.source === nodeId).length;
    return { incoming, outgoing, total: incoming + outgoing };
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-8rem)] overflow-hidden bg-background"
    >
      {/* 3D Graph Scene */}
      <div className="absolute inset-0 w-full h-full">
        <ForceGraph3D
          ref={forceGraphRef}
          filteredNodes={filteredNodes}
          filteredLinks={filteredLinks}
          dagMode="null"
          onNodeClick={(node) => setSelectedNode(node)}
        />
      </div>

      {selectedNode && !readOnly && (
        <Card className="absolute right-4 top-4 w-80 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto z-50 pointer-events-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Node Details</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedNode.type}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID</p>
              <p className="text-sm font-mono break-all">{selectedNode.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Label</p>
              <p className="text-sm">{selectedNode.label}</p>
            </div>
            {selectedLocation?.originalTokenSequence && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">
                  Law Token Sequence
                </p>
                <p className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors">
                  {selectedLocation.originalTokenSequence}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-sm">{selectedNode.level}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connections</p>
              <div className="flex gap-2 text-sm">
                <span>In: {getNodeConnections(selectedNode.id).incoming}</span>
                <span>Out: {getNodeConnections(selectedNode.id).outgoing}</span>
                <span className="font-semibold">
                  Total: {getNodeConnections(selectedNode.id).total}
                </span>
              </div>
            </div>
            {selectedSwarmNode && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Membership</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {!readOnly && (
        <Card className="absolute bottom-4 left-4 p-4 transition-all duration-300 ease-in-out z-50 pointer-events-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Legend & Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLegendsCollapsed(!isLegendsCollapsed)}
                className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                aria-label={
                  isLegendsCollapsed
                    ? "Expand legends panel"
                    : "Collapse legends panel"
                }
                aria-expanded={!isLegendsCollapsed}
              >
                {isLegendsCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isLegendsCollapsed ? "0" : "500px",
                opacity: isLegendsCollapsed ? 0 : 1,
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-curation"
                    checked={nodeTypeFilters.curation}
                    onCheckedChange={() => toggleNodeTypeFilter("curation")}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor("curation") }}
                  />
                  <label
                    htmlFor="filter-curation"
                    className="text-xs cursor-pointer select-none"
                  >
                    Curation
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-swarm"
                    checked={nodeTypeFilters.swarm}
                    onCheckedChange={() => toggleNodeTypeFilter("swarm")}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor("swarm") }}
                  />
                  <label
                    htmlFor="filter-swarm"
                    className="text-xs cursor-pointer select-none"
                  >
                    Swarm
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-location"
                    checked={nodeTypeFilters.location}
                    onCheckedChange={() => toggleNodeTypeFilter("location")}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor("location") }}
                  />
                  <label
                    htmlFor="filter-location"
                    className="text-xs cursor-pointer select-none"
                  >
                    Location
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-lawToken"
                    checked={nodeTypeFilters.lawToken}
                    onCheckedChange={() => toggleNodeTypeFilter("lawToken")}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor("lawToken") }}
                  />
                  <label
                    htmlFor="filter-lawToken"
                    className="text-xs cursor-pointer select-none"
                  >
                    Law Token
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-interpretationToken"
                    checked={nodeTypeFilters.interpretationToken}
                    onCheckedChange={() =>
                      toggleNodeTypeFilter("interpretationToken")
                    }
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor: getNodeColor("interpretationToken"),
                    }}
                  />
                  <label
                    htmlFor="filter-interpretationToken"
                    className="text-xs cursor-pointer select-none"
                  >
                    Interpretation Token
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-sublocation"
                    checked={nodeTypeFilters.sublocation}
                    onCheckedChange={() => toggleNodeTypeFilter("sublocation")}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor("sublocation") }}
                  />
                  <label
                    htmlFor="filter-sublocation"
                    className="text-xs cursor-pointer select-none"
                  >
                    Sublocation
                  </label>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Left click to focus • Right click to expand/collapse • Drag to
                  pan • Scroll to zoom
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dashed lines indicate interpretation token relationships
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
