import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Directionality, GraphEdge, GraphNode } from "../backend";
import ForceGraph3D from "../components/ForceGraph3D";
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

const calculateAutoFitTransform = (
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
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [focusedNode, _setFocusedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);

  // Unified layout state - shared between main graph and subgraph, persists across tab switches
  const unifiedLayoutRef = useRef<UnifiedLayoutState>(
    initializeUnifiedLayout(),
  );

  const [pan, setPan] = useState(unifiedLayoutRef.current.pan);
  const [zoom, setZoom] = useState(unifiedLayoutRef.current.zoom);
  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  // Subgraph viewport state
  const [subgraphMode, setSubgraphMode] = useState(false);
  const [subgraphCenterNode, setSubgraphCenterNode] =
    useState<LayoutNode | null>(null);
  const [subgraphDepth, setSubgraphDepth] = useState(1);
  const [subgraphNodes, setSubgraphNodes] = useState<LayoutNode[]>([]);
  const [subgraphLinks, setSubgraphLinks] = useState<LayoutLink[]>([]);

  // Transition state - only for fade effects
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [_isAnimating, _setIsAnimating] = useState(false);

  const _animateNodes = (
    from: LayoutNode[],
    to: LayoutNode[],
    onComplete: () => void,
  ) => {
    const fromMap = new Map(from.map((n) => [n.id, n]));
    const duration = 400;
    const startTime = performance.now();
    const easing = (t: number) => 1 - (1 - t) ** 3;
    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = easing(progress);
      const current = to.map((t) => {
        const f = fromMap.get(t.id);
        return {
          ...t,
          x: (f?.x ?? t.x) + (t.x - (f?.x ?? t.x)) * eased,
          y: (f?.y ?? t.y) + (t.y - (f?.y ?? t.y)) * eased,
        };
      });
      setSubgraphNodes(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  };

  // Subgraph selector search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNodeType, _setSearchNodeType] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<LayoutNode[]>([]);
  const [highlightedSearchIndex, setHighlightedSearchIndex] =
    useState<number>(-1);

  // Panel collapse state
  const [isLegendsCollapsed, setIsLegendsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem("graphViewLegendsCollapsed");
    return saved === "true";
  });
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem("graphViewControlsCollapsed");
    return saved === "true";
  });

  // Visualization control state (for both main graph and subgraph)
  const [nodeSize, setNodeSize] = useState(() => {
    const saved = sessionStorage.getItem("graphViewNodeSize");
    return saved ? Number.parseInt(saved, 10) : 20;
  });

  const [edgeThickness, setEdgeThickness] = useState(() => {
    const saved = sessionStorage.getItem("graphViewEdgeThickness");
    return saved ? Number.parseInt(saved, 10) : 2;
  });

  // Keyboard navigation state for subgraph
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<
    string | null
  >(null);

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
  const buildNodePath = useCallback(
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
    sessionStorage.setItem(
      "graphViewControlsCollapsed",
      isControlsCollapsed.toString(),
    );
  }, [isControlsCollapsed]);

  // Save control settings to session storage
  useEffect(() => {
    sessionStorage.setItem("graphViewNodeSize", nodeSize.toString());
  }, [nodeSize]);

  useEffect(() => {
    sessionStorage.setItem("graphViewEdgeThickness", edgeThickness.toString());
  }, [edgeThickness]);

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
        const collideRadius = nodeSize * 1.5;
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
    [nodeSize, saveLayoutCache],
  );

  const computeSubgraphLayout = (
    subNodes: LayoutNode[],
    subLinks: LayoutLink[],
    centerNode: LayoutNode,
    edgeDist: number,
  ) => {
    const positioned = computeForceLayout(
      subNodes,
      subLinks,
      centerNode.x,
      centerNode.y,
      edgeDist,
    );
    setSubgraphNodes(positioned);
    for (const n of positioned) {
      unifiedLayoutRef.current.nodes.set(n.id, { x: n.x, y: n.y });
    }
    saveLayoutCache();
  };
  // Build nodes and links from graph data
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
    const countsUnchanged =
      unifiedLayoutRef.current.nodeCount === currentNodeCount &&
      unifiedLayoutRef.current.edgeCount === currentEdgeCount;

    // Compute force layout on initial render or when graph topology changes
    if (!unifiedLayoutRef.current.layoutComputed || !countsUnchanged) {
      positionedNodes = computeForceLayout(
        layoutNodes,
        layoutLinks,
        width / 2,
        height / 2,
        100,
      );
      unifiedLayoutRef.current.nodeCount = currentNodeCount;
      unifiedLayoutRef.current.edgeCount = currentEdgeCount;
    }

    nodesMapRef.current = newNodesMap;

    setNodes(positionedNodes);
    setLinks(layoutLinks);
  }, [graphData, computeForceLayout, width, height]);

  // Build subgraph when center node or depth changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: animateNodes is stable within render cycle
  useEffect(() => {
    if (!subgraphCenterNode || !subgraphMode) return;

    const connectedNodeIds = new Set<string>();
    const connectedLinks: LayoutLink[] = [];

    // BFS to find nodes within depth
    const queue: Array<{ id: string; depth: number }> = [
      { id: subgraphCenterNode.id, depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth > subgraphDepth) continue;
      visited.add(id);
      connectedNodeIds.add(id);

      // Find connected nodes
      // biome-ignore lint/complexity/noForEach: imperative code
      links.forEach((link) => {
        if (link.source === id && !visited.has(link.target)) {
          queue.push({ id: link.target, depth: depth + 1 });
          if (depth < subgraphDepth) {
            connectedLinks.push(link);
          }
        }
        if (link.target === id && !visited.has(link.source)) {
          queue.push({ id: link.source, depth: depth + 1 });
          if (depth < subgraphDepth) {
            connectedLinks.push(link);
          }
        }
      });
    }

    // Get raw positions from unified layout
    const rawSubNodes = nodes
      .filter((n) => connectedNodeIds.has(n.id))
      .map((n) => {
        const unifiedPos = unifiedLayoutRef.current.nodes.get(n.id);
        return { ...n, x: unifiedPos?.x ?? n.x, y: unifiedPos?.y ?? n.y };
      });

    // Calculate auto-fit transform for usable viewport
    const { scale, offsetX, offsetY } = calculateAutoFitTransform(
      rawSubNodes,
      width,
      height,
    );

    // Apply transform to get fitted positions
    const fittedSubNodes = rawSubNodes.map((node) => ({
      ...node,
      x: node.x * scale + offsetX,
      y: node.y * scale + offsetY,
    }));

    // Set auto-fit positions immediately, then run force simulation from there (single animation)
    setSubgraphNodes(fittedSubNodes);
    setSubgraphLinks(connectedLinks);
    const fittedCenterNode =
      fittedSubNodes.find((n) => n.id === subgraphCenterNode.id) ??
      fittedSubNodes[0];
    if (fittedCenterNode) {
      computeSubgraphLayout(
        fittedSubNodes,
        connectedLinks,
        fittedCenterNode,
        100,
      );
    }

    // Reset zoom and pan for subgraph view
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    unifiedLayoutRef.current.zoom = 1.0;
    unifiedLayoutRef.current.pan = { x: 0, y: 0 };

    // Set initial keyboard focus to center node when entering subgraph
    if (rawSubNodes.length > 0) {
      setKeyboardFocusedNodeId(subgraphCenterNode.id);
    }
  }, [
    subgraphCenterNode,
    subgraphDepth,
    subgraphMode,
    nodes,
    links,
    width,
    height,
  ]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedSearchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = nodes.filter((node) => {
      const matchesQuery = node.label.toLowerCase().includes(query);
      const matchesType =
        searchNodeType === "all" || node.type === searchNodeType;
      return matchesQuery && matchesType;
    });

    setSearchResults(results.slice(0, 10)); // Limit to 10 results
    setHighlightedSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, searchNodeType, nodes]);

  // Filter nodes and links (only for main graph)
  const filteredNodes = nodes.filter(
    (node) => nodeTypeFilters[node.type as keyof NodeTypeFilters],
  );
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter(
    (link) =>
      filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target),
  );

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

  const getConnectedNodes = (nodeId: string): Set<string> => {
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

  const _isNodeConnected = (nodeId: string): boolean => {
    if (!focusedNode) return true;
    const connected = getConnectedNodes(focusedNode);
    return connected.has(nodeId);
  };

  const _isLinkConnected = (link: LayoutLink): boolean => {
    if (!focusedNode) return true;
    return link.source === focusedNode || link.target === focusedNode;
  };

  // Compute viewport bounds with buffer margin for culling
  // Viewport bounds check for off-screen node selections
  const isNodeInViewport = useCallback(
    (node: LayoutNode): boolean => {
      if (!containerRef.current) return true;

      const worldX = node.x * zoom + pan.x;
      const worldY = node.y * zoom + pan.y;

      const margin = 100; // Margin from viewport edges
      return (
        worldX >= margin &&
        worldX <= width - margin &&
        worldY >= margin &&
        worldY <= height - margin
      );
    },
    [zoom, pan, width, height],
  );

  // Smooth pan to bring off-screen node into view
  const panToNode = useCallback(
    (node: LayoutNode) => {
      if (isNodeInViewport(node)) return;

      const targetX = width / 2 - node.x * zoom;
      const targetY = height / 2 - node.y * zoom;

      // Smooth pan animation using requestAnimationFrame
      const startPan = { ...pan };
      const startTime = performance.now();
      const duration = 500; // 500ms animation

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeProgress = 1 - (1 - progress) ** 3;

        const newPan = {
          x: startPan.x + (targetX - startPan.x) * easeProgress,
          y: startPan.y + (targetY - startPan.y) * easeProgress,
        };

        setPan(newPan);
        unifiedLayoutRef.current.pan = newPan;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          saveLayoutCache();
        }
      };

      requestAnimationFrame(animate);
    },
    [pan, zoom, width, height, isNodeInViewport, saveLayoutCache],
  );

  // Find nearest node in a given direction
  const findNearestNodeInDirection = useCallback(
    (
      currentNodeId: string,
      direction: "up" | "down" | "left" | "right",
    ): LayoutNode | null => {
      const currentNode = subgraphNodes.find((n) => n.id === currentNodeId);
      if (!currentNode) return null;

      let candidates: LayoutNode[] = [];

      switch (direction) {
        case "up":
          candidates = subgraphNodes.filter((n) => n.y < currentNode.y);
          break;
        case "down":
          candidates = subgraphNodes.filter((n) => n.y > currentNode.y);
          break;
        case "left":
          candidates = subgraphNodes.filter((n) => n.x < currentNode.x);
          break;
        case "right":
          candidates = subgraphNodes.filter((n) => n.x > currentNode.x);
          break;
      }

      if (candidates.length === 0) return null;

      // Find the nearest candidate based on direction
      let nearest: LayoutNode | null = null;
      let minDistance = Number.POSITIVE_INFINITY;

      // biome-ignore lint/complexity/noForEach: imperative code
      candidates.forEach((candidate) => {
        let distance: number;

        if (direction === "up" || direction === "down") {
          // For vertical movement, prioritize y-axis distance
          const dy = Math.abs(candidate.y - currentNode.y);
          const dx = Math.abs(candidate.x - currentNode.x);
          distance = dy + dx * 0.5; // Weight x-axis less
        } else {
          // For horizontal movement, prioritize x-axis distance
          const dx = Math.abs(candidate.x - currentNode.x);
          const dy = Math.abs(candidate.y - currentNode.y);
          distance = dx + dy * 0.5; // Weight y-axis less
        }

        if (distance < minDistance) {
          minDistance = distance;
          nearest = candidate;
        }
      });

      return nearest;
    },
    [subgraphNodes],
  );

  // Keyboard navigation handler for subgraph
  useEffect(() => {
    if (!subgraphMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys in subgraph mode
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;

      e.preventDefault();

      if (!keyboardFocusedNodeId) {
        // If no node is focused, focus on center node
        if (subgraphCenterNode) {
          setKeyboardFocusedNodeId(subgraphCenterNode.id);
          panToNode(subgraphCenterNode);
        }
        return;
      }

      let direction: "up" | "down" | "left" | "right";
      switch (e.key) {
        case "ArrowUp":
          direction = "up";
          break;
        case "ArrowDown":
          direction = "down";
          break;
        case "ArrowLeft":
          direction = "left";
          break;
        case "ArrowRight":
          direction = "right";
          break;
        default:
          return;
      }

      const nextNode = findNearestNodeInDirection(
        keyboardFocusedNodeId,
        direction,
      );
      if (nextNode) {
        setKeyboardFocusedNodeId(nextNode.id);
        setSelectedNode(nextNode);
        panToNode(nextNode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    subgraphMode,
    keyboardFocusedNodeId,
    subgraphCenterNode,
    findNearestNodeInDirection,
    panToNode,
  ]);

  // Keyboard navigation handler for search results
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedSearchIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedSearchIndex >= 0 &&
        highlightedSearchIndex < searchResults.length
      ) {
        handleSearchResultClick(searchResults[highlightedSearchIndex]);
      }
    }
  };

  const toggleNodeTypeFilter = (nodeType: keyof NodeTypeFilters) => {
    setNodeTypeFilters((prev) => ({
      ...prev,
      [nodeType]: !prev[nodeType],
    }));
  };

  const closeSubgraph = () => {
    setFadeOpacity(0.3);
    setTimeout(() => {
      setSubgraphMode(false);
      setSubgraphCenterNode(null);
      setKeyboardFocusedNodeId(null);
      setTimeout(() => {
        setFadeOpacity(1);
      }, 200);
    }, 50);
  };

  const handleSearchResultClick = (node: LayoutNode) => {
    setSubgraphCenterNode(node);
    setSelectedNode(node);
    setSearchQuery("");
    setSearchResults([]);
    setHighlightedSearchIndex(-1);

    // Pan to node if off-screen
    if (!isNodeInViewport(node)) {
      panToNode(node);
    }

    // Start fade-out transition
    setFadeOpacity(0.3);

    setTimeout(() => {
      setSubgraphMode(true);
      setTimeout(() => {
        setFadeOpacity(1);
      }, 200);
    }, 50);
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
    const linksToUse = subgraphMode ? subgraphLinks : filteredLinks;
    const incoming = linksToUse.filter((l) => l.target === nodeId).length;
    const outgoing = linksToUse.filter((l) => l.source === nodeId).length;
    return { incoming, outgoing, total: incoming + outgoing };
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-8rem)] overflow-hidden bg-background"
    >
      {/* 3D Graph Scene */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: fadeOpacity,
          transition: "opacity 300ms ease-in-out",
        }}
      >
        <ForceGraph3D
          nodes={nodes}
          links={links}
          filteredNodes={filteredNodes}
          filteredLinks={filteredLinks}
          subgraphNodes={subgraphNodes}
          subgraphLinks={subgraphLinks}
          nodeSize={nodeSize}
          edgeThickness={edgeThickness}
          theme={theme}
          resolvedTheme={resolvedTheme}
          selectedNode={selectedNode}
          subgraphMode={subgraphMode}
          focusedNode={focusedNode}
        />
      </div>

      {/* Subgraph Selector Panel - with proper z-index and pointer-events */}
      <Card className="absolute top-4 left-4 p-4 w-80 z-50 max-h-[calc(100vh-10rem)] overflow-y-auto pointer-events-auto">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Subgraph Selector</h3>

          {/* Search interface */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search nodes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 text-sm"
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                {searchResults.map((node, index) => {
                  const hierarchicalPath = buildNodePath(node.id);
                  return (
                    <button
                      type="button"
                      key={node.id}
                      onClick={() => handleSearchResultClick(node)}
                      className={`w-full text-left px-3 py-2 transition-colors border-b border-border last:border-b-0 ${
                        index === highlightedSearchIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {node.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {node.type}
                            </Badge>
                          </div>
                          {hierarchicalPath && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {hierarchicalPath}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {subgraphMode && subgraphCenterNode ? (
            <>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Center Node
                </p>
                <p className="text-sm font-medium">
                  {subgraphCenterNode.label}
                </p>
                <Badge variant="outline" className="mt-1">
                  {subgraphCenterNode.type}
                </Badge>
              </div>
              <div>
                <Label
                  htmlFor="subgraph-depth"
                  className="text-xs text-muted-foreground"
                >
                  Relationship Depth: {subgraphDepth}
                </Label>
                <Slider
                  id="subgraph-depth"
                  min={1}
                  max={5}
                  step={1}
                  value={[subgraphDepth]}
                  onValueChange={(value) => setSubgraphDepth(value[0])}
                  className="cursor-pointer mt-2"
                />
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Use arrow keys to navigate between nodes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeSubgraph}
                className="w-full hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Exit Subgraph
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Search for a node or click any node on the graph to open its
              subgraph view
            </p>
          )}
        </div>
      </Card>

      {selectedNode && !readOnly && (
        <Card className="absolute right-4 top-4 w-80 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto z-50 pointer-events-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Node Details</h3>
              <Badge variant="outline">{selectedNode.type}</Badge>
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

      {!readOnly && (
        <Card className="absolute bottom-4 right-4 p-4 w-72 transition-all duration-300 ease-in-out z-50 pointer-events-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Visualization Controls</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                aria-label={
                  isControlsCollapsed
                    ? "Expand controls panel"
                    : "Collapse controls panel"
                }
                aria-expanded={!isControlsCollapsed}
              >
                {isControlsCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isControlsCollapsed ? "0" : "700px",
                opacity: isControlsCollapsed ? 0 : 1,
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="node-size"
                    className="text-xs text-muted-foreground"
                  >
                    Node Size: {nodeSize}
                  </Label>
                  <Slider
                    id="node-size"
                    min={10}
                    max={40}
                    step={2}
                    value={[nodeSize]}
                    onValueChange={(value) => setNodeSize(value[0])}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edge-thickness"
                    className="text-xs text-muted-foreground"
                  >
                    Edge Thickness: {edgeThickness}
                  </Label>
                  <Slider
                    id="edge-thickness"
                    min={1}
                    max={6}
                    step={1}
                    value={[edgeThickness]}
                    onValueChange={(value) => setEdgeThickness(value[0])}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
