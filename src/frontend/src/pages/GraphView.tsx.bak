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
import SwarmMembershipButton from "../components/SwarmMembershipButton";
import { useGetGraphData } from "../hooks/useQueries";

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

// Simple spatial index for hierarchical culling
interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface SpatialBucket {
  nodes: LayoutNode[];
  bounds: BoundingBox;
}

class SpatialIndex {
  private bucketSize: number;
  private buckets: Map<string, SpatialBucket>;

  constructor(bucketSize = 200) {
    this.bucketSize = bucketSize;
    this.buckets = new Map();
  }

  private getBucketKey(x: number, y: number): string {
    const bx = Math.floor(x / this.bucketSize);
    const by = Math.floor(y / this.bucketSize);
    return `${bx},${by}`;
  }

  clear() {
    this.buckets.clear();
  }

  addNode(node: LayoutNode) {
    const key = this.getBucketKey(node.x, node.y);

    if (!this.buckets.has(key)) {
      const bx = Math.floor(node.x / this.bucketSize);
      const by = Math.floor(node.y / this.bucketSize);
      this.buckets.set(key, {
        nodes: [],
        bounds: {
          minX: bx * this.bucketSize,
          minY: by * this.bucketSize,
          maxX: (bx + 1) * this.bucketSize,
          maxY: (by + 1) * this.bucketSize,
        },
      });
    }

    this.buckets.get(key)!.nodes.push(node);
  }

  queryViewport(viewport: BoundingBox): LayoutNode[] {
    const visibleNodes: LayoutNode[] = [];
    const minBucketX = Math.floor(viewport.minX / this.bucketSize);
    const minBucketY = Math.floor(viewport.minY / this.bucketSize);
    const maxBucketX = Math.floor(viewport.maxX / this.bucketSize);
    const maxBucketY = Math.floor(viewport.maxY / this.bucketSize);

    for (let bx = minBucketX; bx <= maxBucketX; bx++) {
      for (let by = minBucketY; by <= maxBucketY; by++) {
        const key = `${bx},${by}`;
        const bucket = this.buckets.get(key);

        if (bucket) {
          // Add all nodes from buckets that intersect viewport
          visibleNodes.push(...bucket.nodes);
        }
      }
    }

    return visibleNodes;
  }
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
  const { data: graphData, isLoading, error, isError } = useGetGraphData();

  const { theme, resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subgraphCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [focusedNode, _setFocusedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);

  // Spatial index for culling
  const spatialIndexRef = useRef<SpatialIndex>(new SpatialIndex(200));
  const subgraphSpatialIndexRef = useRef<SpatialIndex>(new SpatialIndex(200));

  // Unified layout state - shared between main graph and subgraph, persists across tab switches
  const unifiedLayoutRef = useRef<UnifiedLayoutState>(
    initializeUnifiedLayout(),
  );

  const [pan, setPan] = useState(unifiedLayoutRef.current.pan);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(unifiedLayoutRef.current.zoom);
  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Subgraph viewport state
  const [subgraphMode, setSubgraphMode] = useState(false);
  const [subgraphCenterNode, setSubgraphCenterNode] =
    useState<LayoutNode | null>(null);
  const [subgraphDepth, setSubgraphDepth] = useState(1);
  const [subgraphNodes, setSubgraphNodes] = useState<LayoutNode[]>([]);
  const [subgraphLinks, setSubgraphLinks] = useState<LayoutLink[]>([]);

  // Transition state - only for fade effects
  const [fadeOpacity, setFadeOpacity] = useState(1);

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

  // Node dragging state (only for subgraph)
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<LayoutNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
  const computeAutomaticLayout = useCallback(
    (layoutNodes: LayoutNode[], linkDistance: number) => {
      const centerX = width / 2;
      const centerY = height / 2;

      // Improved node spacing to prevent overlapping
      const minNodeSpacing = nodeSize * 3;

      // Use concentric layout as the automatic layout algorithm
      const levelGroups = new Map<number, LayoutNode[]>();
      // biome-ignore lint/complexity/noForEach: imperative code
      layoutNodes.forEach((node) => {
        if (!levelGroups.has(node.level)) {
          levelGroups.set(node.level, []);
        }
        levelGroups.get(node.level)!.push(node);
      });

      levelGroups.forEach((nodesInLevel, level) => {
        const nodesCount = nodesInLevel.length;
        const circumference = nodesCount * minNodeSpacing;
        const minRadius = circumference / (2 * Math.PI);
        const radius = Math.max((level + 1) * (linkDistance * 0.8), minRadius);

        nodesInLevel.forEach((node, i) => {
          const angle = (i / nodesInLevel.length) * 2 * Math.PI;
          node.x = centerX + radius * Math.cos(angle);
          node.y = centerY + radius * Math.sin(angle);
        });
      });

      // Freeze coordinates immediately after computation
      // biome-ignore lint/complexity/noForEach: imperative code
      layoutNodes.forEach((node) => {
        unifiedLayoutRef.current.nodes.set(node.id, { x: node.x, y: node.y });
      });

      unifiedLayoutRef.current.layoutComputed = true;
      saveLayoutCache();

      return layoutNodes;
    },
    [width, height, nodeSize, saveLayoutCache],
  );

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

    // Compute layout only once during initial render or when counts change
    if (!unifiedLayoutRef.current.layoutComputed || !countsUnchanged) {
      // Use default edge distance for layout computation
      const defaultEdgeDistance = 120;
      positionedNodes = computeAutomaticLayout(
        layoutNodes,
        defaultEdgeDistance,
      );
      unifiedLayoutRef.current.nodeCount = currentNodeCount;
      unifiedLayoutRef.current.edgeCount = currentEdgeCount;
    }

    nodesMapRef.current = newNodesMap;

    setNodes(positionedNodes);
    setLinks(layoutLinks);
  }, [graphData, computeAutomaticLayout, width, height]);

  // Build subgraph when center node or depth changes
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

    // Use unified layout positions for subgraph nodes
    const subNodes = nodes
      .filter((n) => connectedNodeIds.has(n.id))
      .map((n) => {
        const unifiedPos = unifiedLayoutRef.current.nodes.get(n.id);
        return {
          ...n,
          x: unifiedPos?.x ?? n.x,
          y: unifiedPos?.y ?? n.y,
        };
      });

    setSubgraphNodes(subNodes);
    setSubgraphLinks(connectedLinks);

    // Set initial keyboard focus to center node when entering subgraph
    if (subNodes.length > 0) {
      setKeyboardFocusedNodeId(subgraphCenterNode.id);
    }
  }, [subgraphCenterNode, subgraphDepth, subgraphMode, nodes, links]);

  // Build spatial indices when nodes change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    // Build main graph spatial index
    spatialIndexRef.current.clear();
    // biome-ignore lint/complexity/noForEach: imperative code
    filteredNodes.forEach((node) => {
      spatialIndexRef.current.addNode(node);
    });
  }, [nodes, nodeTypeFilters]);

  useEffect(() => {
    // Build subgraph spatial index
    subgraphSpatialIndexRef.current.clear();
    // biome-ignore lint/complexity/noForEach: imperative code
    subgraphNodes.forEach((node) => {
      subgraphSpatialIndexRef.current.addNode(node);
    });
  }, [subgraphNodes]);

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

  const getEdgeColor = () => {
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

  const isNodeConnected = (nodeId: string): boolean => {
    if (!focusedNode) return true;
    const connected = getConnectedNodes(focusedNode);
    return connected.has(nodeId);
  };

  const isLinkConnected = (link: LayoutLink): boolean => {
    if (!focusedNode) return true;
    return link.source === focusedNode || link.target === focusedNode;
  };

  // Compute viewport bounds with buffer margin for culling
  const getViewportBounds = useCallback(
    (bufferMargin = 100): BoundingBox => {
      const minX = -pan.x / zoom - bufferMargin;
      const minY = -pan.y / zoom - bufferMargin;
      const maxX = (width - pan.x) / zoom + bufferMargin;
      const maxY = (height - pan.y) / zoom + bufferMargin;

      return { minX, minY, maxX, maxY };
    },
    [pan, zoom, width, height],
  );

  // Check if edge crosses viewport (for edges with endpoints outside viewport)
  const edgeCrossesViewport = useCallback(
    (
      sourceNode: LayoutNode,
      targetNode: LayoutNode,
      viewport: BoundingBox,
    ): boolean => {
      // Check if line segment intersects viewport rectangle
      const lineIntersectsRect = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        rectMinX: number,
        rectMinY: number,
        rectMaxX: number,
        rectMaxY: number,
      ): boolean => {
        // Check if either endpoint is inside viewport
        if (
          (x1 >= rectMinX &&
            x1 <= rectMaxX &&
            y1 >= rectMinY &&
            y1 <= rectMaxY) ||
          (x2 >= rectMinX && x2 <= rectMaxX && y2 >= rectMinY && y2 <= rectMaxY)
        ) {
          return true;
        }

        // Check line-rectangle intersection using Cohen-Sutherland algorithm
        const INSIDE = 0;
        const LEFT = 1;
        const RIGHT = 2;
        const BOTTOM = 4;
        const TOP = 8;

        const computeCode = (x: number, y: number): number => {
          let code = INSIDE;
          if (x < rectMinX) code |= LEFT;
          else if (x > rectMaxX) code |= RIGHT;
          if (y < rectMinY) code |= BOTTOM;
          else if (y > rectMaxY) code |= TOP;
          return code;
        };

        let code1 = computeCode(x1, y1);
        let code2 = computeCode(x2, y2);

        while (true) {
          if ((code1 | code2) === 0) {
            // Both endpoints inside
            return true;
          }
          if ((code1 & code2) !== 0) {
            // Both endpoints on same side outside
            return false;
          }
          // Line crosses viewport
          return true;
        }
      };

      return lineIntersectsRect(
        sourceNode.x,
        sourceNode.y,
        targetNode.x,
        targetNode.y,
        viewport.minX,
        viewport.minY,
        viewport.maxX,
        viewport.maxY,
      );
    },
    [],
  );

  // Viewport bounds check for off-screen node selections
  const isNodeInViewport = useCallback(
    (node: LayoutNode): boolean => {
      const canvas = subgraphMode
        ? subgraphCanvasRef.current
        : canvasRef.current;
      if (!canvas) return true;

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
    [zoom, pan, width, height, subgraphMode],
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

  // Canvas rendering function for main graph with hierarchical culling
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to full viewport
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transformations using unified layout state
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const edgeColor = getEdgeColor();

    // Apply fade opacity
    ctx.globalAlpha = fadeOpacity;

    // Compute viewport bounds with buffer margin for culling
    const viewport = getViewportBounds(150);

    // Query visible nodes using spatial index
    const visibleNodes = spatialIndexRef.current.queryViewport(viewport);
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    // Filter edges: include if both endpoints visible OR edge crosses viewport
    const visibleLinks = filteredLinks.filter((link) => {
      const sourceVisible = visibleNodeIds.has(link.source);
      const targetVisible = visibleNodeIds.has(link.target);

      // If both endpoints visible, include edge
      if (sourceVisible && targetVisible) return true;

      // If one or both endpoints outside viewport, check if edge crosses viewport
      const sourceNode = filteredNodes.find((n) => n.id === link.source);
      const targetNode = filteredNodes.find((n) => n.id === link.target);

      if (sourceNode && targetNode) {
        return edgeCrossesViewport(sourceNode, targetNode, viewport);
      }

      return false;
    });

    // Draw edges
    // biome-ignore lint/complexity/noForEach: imperative code
    visibleLinks.forEach((link) => {
      const source = filteredNodes.find((n) => n.id === link.source);
      const target = filteredNodes.find((n) => n.id === link.target);
      if (!source || !target) return;

      const isConnected = isLinkConnected(link);
      const opacity = isConnected ? 0.85 : 0.15;

      ctx.globalAlpha = opacity * fadeOpacity;
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = edgeThickness;

      // Use dashed lines for interpretation token edges
      if (link.isInterpretationTokenEdge) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      const sourceRadius = nodeSize - source.level * 2;
      const targetRadius = nodeSize - target.level * 2;
      const avgRadius = (sourceRadius + targetRadius) / 2;
      const offset = 12;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const ux = dx / distance;
        const uy = dy / distance;

        const x1 = source.x + ux * (avgRadius + offset);
        const y1 = source.y + uy * (avgRadius + offset);
        const x2 = target.x - ux * (avgRadius + offset);
        const y2 = target.y - uy * (avgRadius + offset);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw arrows for interpretation token edges
        if (link.isInterpretationTokenEdge) {
          let directionality: Directionality | undefined;

          if (link.edgeType === "from") {
            directionality = link.fromDirectionality;
          } else if (link.edgeType === "to") {
            directionality = link.toDirectionality;
          }

          const arrowSize = 8;
          const angle = Math.atan2(dy, dx);

          ctx.fillStyle = edgeColor;

          // Draw target arrow (pointing to target)
          if (
            directionality === "unidirectional" ||
            directionality === "bidirectional"
          ) {
            ctx.save();
            ctx.translate(x2, y2);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Draw source arrow (pointing to source)
          if (directionality === "bidirectional") {
            ctx.save();
            ctx.translate(x1, y1);
            ctx.rotate(angle + Math.PI);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Reset line dash
      ctx.setLineDash([]);
    });

    // Draw visible nodes only
    // biome-ignore lint/complexity/noForEach: imperative code
    visibleNodes.forEach((node) => {
      const nodeRadius = nodeSize - node.level * 2;
      const opacity = isNodeConnected(node.id) ? 1 : 0.2;

      ctx.globalAlpha = opacity * fadeOpacity;

      // Draw node circle
      ctx.fillStyle = getNodeColor(node.type);
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw node label
      const currentTheme = resolvedTheme || theme || "light";
      const isDark = currentTheme === "dark";
      ctx.fillStyle = isDark ? "#ffffff" : "#000000";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        node.label.substring(0, 15),
        node.x,
        node.y + nodeRadius + 5,
      );
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [
    filteredNodes,
    filteredLinks,
    pan,
    zoom,
    focusedNode,
    theme,
    resolvedTheme,
    width,
    height,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    getNodeColor,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    getEdgeColor,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    isNodeConnected,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    isLinkConnected,
    nodeSize,
    edgeThickness,
    fadeOpacity,
    getViewportBounds,
    edgeCrossesViewport,
  ]);

  // Canvas rendering function for subgraph with hierarchical culling
  const renderSubgraphCanvas = useCallback(() => {
    const canvas = subgraphCanvasRef.current;
    if (!canvas || !subgraphMode) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to full viewport
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transformations using unified layout state
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const edgeColor = getEdgeColor();
    const currentTheme = resolvedTheme || theme || "light";
    const isDark = currentTheme === "dark";
    const bgColor = isDark ? "#000000" : "#ffffff";
    const accentColor = isDark ? "#FFD700" : "#B8860B";

    // Apply fade opacity
    ctx.globalAlpha = fadeOpacity;

    // Compute viewport bounds with buffer margin for culling
    const viewport = getViewportBounds(150);

    // Query visible nodes using spatial index
    const visibleNodes =
      subgraphSpatialIndexRef.current.queryViewport(viewport);
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    // Filter edges: include if both endpoints visible OR edge crosses viewport
    const visibleLinks = subgraphLinks.filter((link) => {
      const sourceVisible = visibleNodeIds.has(link.source);
      const targetVisible = visibleNodeIds.has(link.target);

      // If both endpoints visible, include edge
      if (sourceVisible && targetVisible) return true;

      // If one or both endpoints outside viewport, check if edge crosses viewport
      const sourceNode = subgraphNodes.find((n) => n.id === link.source);
      const targetNode = subgraphNodes.find((n) => n.id === link.target);

      if (sourceNode && targetNode) {
        return edgeCrossesViewport(sourceNode, targetNode, viewport);
      }

      return false;
    });

    // Draw edges
    // biome-ignore lint/complexity/noForEach: imperative code
    visibleLinks.forEach((link) => {
      const source = subgraphNodes.find((n) => n.id === link.source);
      const target = subgraphNodes.find((n) => n.id === link.target);
      if (!source || !target) return;

      ctx.globalAlpha = 0.85 * fadeOpacity;
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = edgeThickness;

      // Use dashed lines for interpretation token edges
      if (link.isInterpretationTokenEdge) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      const sourceRadius = nodeSize - source.level * 2;
      const targetRadius = nodeSize - target.level * 2;
      const avgRadius = (sourceRadius + targetRadius) / 2;
      const offset = 12;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const ux = dx / distance;
        const uy = dy / distance;

        const x1 = source.x + ux * (avgRadius + offset);
        const y1 = source.y + uy * (avgRadius + offset);
        const x2 = target.x - ux * (avgRadius + offset);
        const y2 = target.y - uy * (avgRadius + offset);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw arrows for interpretation token edges
        if (link.isInterpretationTokenEdge) {
          let directionality: Directionality | undefined;

          if (link.edgeType === "from") {
            directionality = link.fromDirectionality;
          } else if (link.edgeType === "to") {
            directionality = link.toDirectionality;
          }

          const arrowSize = 8;
          const angle = Math.atan2(dy, dx);

          ctx.fillStyle = edgeColor;

          // Draw target arrow (pointing to target)
          if (
            directionality === "unidirectional" ||
            directionality === "bidirectional"
          ) {
            ctx.save();
            ctx.translate(x2, y2);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Draw source arrow (pointing to source)
          if (directionality === "bidirectional") {
            ctx.save();
            ctx.translate(x1, y1);
            ctx.rotate(angle + Math.PI);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Reset line dash
      ctx.setLineDash([]);
    });

    // Draw edge labels with canvas background (only for visible edges)
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // biome-ignore lint/complexity/noForEach: imperative code
    visibleLinks.forEach((link) => {
      if (!link.relationType) return;

      const source = subgraphNodes.find((n) => n.id === link.source);
      const target = subgraphNodes.find((n) => n.id === link.target);
      if (!source || !target) return;

      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;

      ctx.globalAlpha = 0.85 * fadeOpacity;
      ctx.fillStyle = bgColor;
      ctx.fillRect(midX - 30, midY - 8, 60, 16);

      ctx.fillStyle = isDark ? "#888888" : "#666666";
      ctx.fillText(link.relationType, midX, midY);
    });

    // Draw visible nodes only
    // biome-ignore lint/complexity/noForEach: imperative code
    visibleNodes.forEach((node) => {
      const nodeRadius = nodeSize - node.level * 2;
      const isKeyboardFocused = node.id === keyboardFocusedNodeId;

      ctx.globalAlpha = fadeOpacity;

      // Draw keyboard focus halo
      if (isKeyboardFocused) {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 6, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw node circle
      ctx.fillStyle = getNodeColor(node.type);
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw node label
      ctx.fillStyle = isDark ? "#ffffff" : "#000000";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        node.label.substring(0, 15),
        node.x,
        node.y + nodeRadius + 5,
      );
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [
    subgraphNodes,
    subgraphLinks,
    pan,
    zoom,
    nodeSize,
    edgeThickness,
    theme,
    resolvedTheme,
    width,
    height,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    getNodeColor,
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    getEdgeColor,
    subgraphMode,
    fadeOpacity,
    keyboardFocusedNodeId,
    getViewportBounds,
    edgeCrossesViewport,
  ]);

  // Render canvas on changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      renderCanvas();
      renderSubgraphCanvas();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas, renderSubgraphCanvas]);

  // Convert canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = subgraphMode
        ? subgraphCanvasRef.current
        : canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const worldX = (canvasX - pan.x) / zoom;
      const worldY = (canvasY - pan.y) / zoom;

      return { x: worldX, y: worldY };
    },
    [pan, zoom, subgraphMode],
  );

  // Find node at position
  const findNodeAtPosition = useCallback(
    (worldX: number, worldY: number, isSubgraph = false): LayoutNode | null => {
      const nodesToSearch = isSubgraph ? subgraphNodes : filteredNodes;
      const currentNodeSize = nodeSize;

      for (const node of nodesToSearch) {
        const nodeRadius = currentNodeSize - node.level * 2;
        const dx = worldX - node.x;
        const dy = worldY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= nodeRadius) {
          return node;
        }
      }
      return null;
    },
    [filteredNodes, subgraphNodes, nodeSize],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = canvasToWorld(e.clientX, e.clientY);
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      const newPan = {
        x: pan.x + deltaX,
        y: pan.y + deltaY,
      };

      setPan(newPan);
      unifiedLayoutRef.current.pan = newPan;
      saveLayoutCache();

      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingNode && draggedNodeId) {
      const deltaX = world.x - dragStart.x;
      const deltaY = world.y - dragStart.y;

      setSubgraphNodes((prevNodes) => {
        const newNodes = [...prevNodes];
        const draggedNode = newNodes.find((n) => n.id === draggedNodeId);
        if (!draggedNode) return prevNodes;

        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(draggedNodeId);

        // biome-ignore lint/complexity/noForEach: imperative code
        subgraphLinks.forEach((link) => {
          if (link.source === draggedNodeId) connectedNodeIds.add(link.target);
          if (link.target === draggedNodeId) connectedNodeIds.add(link.source);
        });

        draggedNode.x = world.x;
        draggedNode.y = world.y;

        // Update unified layout state with manual repositioning
        unifiedLayoutRef.current.nodes.set(draggedNodeId, {
          x: world.x,
          y: world.y,
        });

        // biome-ignore lint/complexity/noForEach: imperative code
        connectedNodeIds.forEach((connectedId) => {
          if (connectedId === draggedNodeId) return;
          const connectedNode = newNodes.find((n) => n.id === connectedId);
          if (connectedNode) {
            connectedNode.x += deltaX;
            connectedNode.y += deltaY;
            // Update unified layout state with manual repositioning
            unifiedLayoutRef.current.nodes.set(connectedId, {
              x: connectedNode.x,
              y: connectedNode.y,
            });
          }
        });

        saveLayoutCache();
        return newNodes;
      });

      setDragStart({ x: world.x, y: world.y });
    } else {
      // Update hovered node
      const node = findNodeAtPosition(world.x, world.y, subgraphMode);
      setHoveredNode(node);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingNode(false);
    setDraggedNodeId(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const world = canvasToWorld(e.clientX, e.clientY);
    const node = findNodeAtPosition(world.x, world.y, subgraphMode);

    if (node) {
      if (subgraphMode) {
        // Re-center on clicked node and check if off-screen
        setSubgraphCenterNode(node);
        setSelectedNode(node);
        setKeyboardFocusedNodeId(node.id);

        // Pan to node if off-screen
        if (!isNodeInViewport(node)) {
          panToNode(node);
        }

        setIsDraggingNode(true);
        setDraggedNodeId(node.id);
        setDragStart({ x: world.x, y: world.y });
      } else {
        // Enter subgraph mode with smooth fade transition
        setSubgraphCenterNode(node);
        setSelectedNode(node);

        // Pan to node if off-screen before entering subgraph
        if (!isNodeInViewport(node)) {
          panToNode(node);
        }

        // Start fade-out transition
        setFadeOpacity(0.3);

        setTimeout(() => {
          // Switch to subgraph mode
          setSubgraphMode(true);

          // Fade in subgraph
          setTimeout(() => {
            setFadeOpacity(1);
          }, 50);
        }, 300);
      }
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(4, zoom * delta));
    setZoom(newZoom);
    unifiedLayoutRef.current.zoom = newZoom;
    saveLayoutCache();
  };

  const toggleNodeTypeFilter = (nodeType: keyof NodeTypeFilters) => {
    setNodeTypeFilters((prev) => ({
      ...prev,
      [nodeType]: !prev[nodeType],
    }));
  };

  const closeSubgraph = () => {
    // Start fade-out transition
    setFadeOpacity(0.3);

    setTimeout(() => {
      // Exit subgraph mode
      setSubgraphMode(false);
      setSubgraphCenterNode(null);
      setKeyboardFocusedNodeId(null);

      // Fade in main graph
      setTimeout(() => {
        setFadeOpacity(1);
      }, 50);
    }, 300);
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
      // Switch to subgraph mode
      setSubgraphMode(true);

      // Fade in subgraph
      setTimeout(() => {
        setFadeOpacity(1);
      }, 50);
    }, 300);
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
      {/* Main graph canvas - extended to full viewport width and height */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: subgraphMode ? 0 : 1,
          transition: "opacity 300ms ease-in-out",
        }}
      >
        <canvas
          ref={canvasRef}
          className={subgraphMode ? "invisible" : "cursor-move"}
          style={{ width: "100%", height: "100%" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Subgraph viewport overlay - full viewport */}
      {subgraphMode && (
        <div
          className="absolute inset-0 w-full h-full bg-background z-40"
          style={{
            opacity: 1,
            transition: "opacity 300ms ease-in-out",
          }}
        >
          <canvas
            ref={subgraphCanvasRef}
            className="cursor-move"
            style={{ width: "100%", height: "100%" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
      )}

      {hoveredNode?.originalTokenSequence && (
        <div
          className="absolute pointer-events-none bg-background border border-border rounded px-2 py-1 text-xs shadow-lg z-50"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y + 10,
          }}
        >
          <p className="font-mono text-foreground">
            {hoveredNode.originalTokenSequence}
          </p>
        </div>
      )}

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
                <SwarmMembershipButton swarmId={selectedSwarmNode.id} />
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
                  Click node to open subgraph • Drag to pan • Scroll to zoom
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
