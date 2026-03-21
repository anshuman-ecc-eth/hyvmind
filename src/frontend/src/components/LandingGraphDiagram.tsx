import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphData } from "../backend";
import { createActorWithConfig } from "../config";

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  nodeType: string;
  nodeName: string;
  radius: number;
}

interface Edge {
  source: string;
  target: string;
}

// Node type display names
const NODE_TYPE_NAMES: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawToken: "LawToken",
  interpretationToken: "InterpToken",
};

// Cache configuration
const CACHE_KEY = "hyvmind_voronoi_graph_data";
const CACHE_TIMESTAMP_KEY = "hyvmind_voronoi_cache_timestamp";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Theme-independent grey color for nodes and edges
const GRAPH_GREY = "#808080";

// Golden yellow highlight color (visible in both light and dark modes)
const HIGHLIGHT_COLOR = "#FFD700";

export default function LandingGraphDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [resizeKey, setResizeKey] = useState(0);
  const { resolvedTheme } = useTheme();

  // State for data management
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resize canvas to match container with high-DPI support
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size (CSS pixels)
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Set actual size in memory (scaled for high-DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
  }, []);

  // ResizeObserver: watch parent element for size changes
  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      resizeCanvas();
      setResizeKey((k) => k + 1);
    });

    observer.observe(parent);

    return () => {
      observer.disconnect();
    };
  }, [mounted, resizeCanvas]);

  // Load data with cache-first strategy
  useEffect(() => {
    if (!mounted) return;

    const loadData = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        // Step 1: Check localStorage for cached data
        const cachedDataStr = localStorage.getItem(CACHE_KEY);
        const cachedTimestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (cachedDataStr && cachedTimestampStr) {
          const cachedTimestamp = Number.parseInt(cachedTimestampStr, 10);
          const now = Date.now();
          const age = now - cachedTimestamp;

          // If cache is still valid (less than 24 hours old)
          if (age < CACHE_DURATION_MS) {
            try {
              const cachedData: GraphData = JSON.parse(cachedDataStr);
              setGraphData(cachedData);
              setIsFromCache(true);
              setIsLoading(false);
              console.log(
                `Loaded graph data from cache (age: ${Math.round(age / 1000 / 60 / 60)} hours)`,
              );
              return; // Use cached data, don't fetch
            } catch (parseError) {
              console.warn(
                "Failed to parse cached data, will fetch fresh data",
                parseError,
              );
              // Continue to fetch fresh data
            }
          } else {
            console.log(
              `Cache expired (age: ${Math.round(age / 1000 / 60 / 60)} hours), fetching fresh data`,
            );
          }
        }

        // Step 2: Cache is invalid or doesn't exist, fetch fresh data
        const anonymousActor = await createActorWithConfig();
        if (!anonymousActor) {
          throw new Error("Failed to create anonymous actor");
        }

        const freshData = await anonymousActor.getGraphData();

        // Step 3: Store fresh data in cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          console.log("Fetched and cached fresh graph data");
        } catch (storageError) {
          console.warn("Failed to cache data in localStorage", storageError);
          // Continue even if caching fails
        }

        setGraphData(freshData);
        setIsFromCache(false);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch graph data:", error);

        // Step 4: On error, try to use cached data as fallback (even if expired)
        const cachedDataStr = localStorage.getItem(CACHE_KEY);
        if (cachedDataStr) {
          try {
            const cachedData: GraphData = JSON.parse(cachedDataStr);
            setGraphData(cachedData);
            setIsFromCache(true);
            setIsLoading(false);
            setIsError(true);
            setErrorMessage("Using cached data (network unavailable)");
            console.log(
              "Using expired/fallback cached data due to fetch error",
            );
            return;
          } catch (parseError) {
            console.error("Failed to parse cached fallback data", parseError);
          }
        }

        // Step 5: No cached data available, show error
        setIsError(true);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load graph data",
        );
        setIsLoading(false);
      }
    };

    loadData();
  }, [mounted]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const anonymousActor = await createActorWithConfig();
      if (!anonymousActor) {
        throw new Error("Failed to create anonymous actor");
      }

      const freshData = await anonymousActor.getGraphData();

      // Update cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (storageError) {
        console.warn("Failed to cache data in localStorage", storageError);
      }

      setGraphData(freshData);
      setIsFromCache(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to refresh graph data:", error);
      setIsError(true);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refresh data",
      );
      setIsLoading(false);
    }
  };

  // Generate nodes and edges from graph data
  const { nodes, edges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];
    const nodeIdSet = new Set<string>();

    // Use a seeded random number generator for consistent initial positioning
    const seededRandom = (seed: string) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      // Convert to 0-1 range
      return (Math.abs(Math.sin(hash)) * 10000) % 1;
    };

    // Node radius based on type
    const getNodeRadius = (nodeType: string): number => {
      switch (nodeType) {
        case "curation":
          return 12;
        case "swarm":
          return 10;
        case "location":
          return 8;
        case "lawToken":
          return 6;
        case "interpretationToken":
          return 6;
        default:
          return 6;
      }
    };

    // Add curations
    if (graphData.curations) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.curations.forEach((curation) => {
        generatedNodes.push({
          id: curation.id,
          x: seededRandom(`${curation.id}_x`) * 800 + 100,
          y: seededRandom(`${curation.id}_y`) * 600 + 100,
          vx: 0,
          vy: 0,
          nodeType: "curation",
          nodeName: curation.name,
          radius: getNodeRadius("curation"),
        });
        nodeIdSet.add(curation.id);
      });
    }

    // Add swarms
    if (graphData.swarms) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.swarms.forEach((swarm) => {
        generatedNodes.push({
          id: swarm.id,
          x: seededRandom(`${swarm.id}_x`) * 800 + 100,
          y: seededRandom(`${swarm.id}_y`) * 600 + 100,
          vx: 0,
          vy: 0,
          nodeType: "swarm",
          nodeName: swarm.name,
          radius: getNodeRadius("swarm"),
        });
        nodeIdSet.add(swarm.id);
      });
    }

    // Add locations
    if (graphData.locations) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.locations.forEach((location) => {
        generatedNodes.push({
          id: location.id,
          x: seededRandom(`${location.id}_x`) * 800 + 100,
          y: seededRandom(`${location.id}_y`) * 600 + 100,
          vx: 0,
          vy: 0,
          nodeType: "location",
          nodeName: location.title,
          radius: getNodeRadius("location"),
        });
        nodeIdSet.add(location.id);
      });
    }

    // Add law tokens
    if (graphData.lawTokens) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.lawTokens.forEach((lawToken) => {
        generatedNodes.push({
          id: lawToken.id,
          x: seededRandom(`${lawToken.id}_x`) * 800 + 100,
          y: seededRandom(`${lawToken.id}_y`) * 600 + 100,
          vx: 0,
          vy: 0,
          nodeType: "lawToken",
          nodeName: lawToken.tokenLabel,
          radius: getNodeRadius("lawToken"),
        });
        nodeIdSet.add(lawToken.id);
      });
    }

    // Add interpretation tokens
    if (graphData.interpretationTokens) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.interpretationTokens.forEach((interpretationToken) => {
        generatedNodes.push({
          id: interpretationToken.id,
          x: seededRandom(`${interpretationToken.id}_x`) * 800 + 100,
          y: seededRandom(`${interpretationToken.id}_y`) * 600 + 100,
          vx: 0,
          vy: 0,
          nodeType: "interpretationToken",
          nodeName: interpretationToken.title,
          radius: getNodeRadius("interpretationToken"),
        });
        nodeIdSet.add(interpretationToken.id);
      });
    }

    // Add edges from GraphData.edges (includes existing edges from backend)
    if (graphData.edges) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.edges.forEach((edge) => {
        // Only add edge if both nodes exist
        if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
          generatedEdges.push({
            source: edge.source,
            target: edge.target,
          });
        }
      });
    }

    // Add hierarchy edges: curation → swarm
    if (graphData.swarms) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.swarms.forEach((swarm) => {
        if (nodeIdSet.has(swarm.parentCurationId) && nodeIdSet.has(swarm.id)) {
          // Check if edge already exists
          const edgeExists = generatedEdges.some(
            (e) =>
              (e.source === swarm.parentCurationId && e.target === swarm.id) ||
              (e.source === swarm.id && e.target === swarm.parentCurationId),
          );
          if (!edgeExists) {
            generatedEdges.push({
              source: swarm.parentCurationId,
              target: swarm.id,
            });
          }
        }
      });
    }

    // Add hierarchy edges: swarm → location
    if (graphData.locations) {
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      graphData.locations.forEach((location) => {
        if (
          nodeIdSet.has(location.parentSwarmId) &&
          nodeIdSet.has(location.id)
        ) {
          // Check if edge already exists
          const edgeExists = generatedEdges.some(
            (e) =>
              (e.source === location.parentSwarmId &&
                e.target === location.id) ||
              (e.source === location.id && e.target === location.parentSwarmId),
          );
          if (!edgeExists) {
            generatedEdges.push({
              source: location.parentSwarmId,
              target: location.id,
            });
          }
        }
      });
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [graphData]);

  // Build neighbor map for one-hop adjacency
  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    // Initialize empty sets for all nodes
    // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
    nodes.forEach((node) => {
      map.set(node.id, new Set<string>());
    });

    // Populate neighbors from edges (undirected)
    // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
    edges.forEach((edge) => {
      const sourceNeighbors = map.get(edge.source);
      const targetNeighbors = map.get(edge.target);

      if (sourceNeighbors) {
        sourceNeighbors.add(edge.target);
      }
      if (targetNeighbors) {
        targetNeighbors.add(edge.source);
      }
    });

    return map;
  }, [nodes, edges]);

  // Force-directed layout simulation with theme-aware background and hover highlighting
  // biome-ignore lint/correctness/useExhaustiveDependencies: resizeKey is an intentional re-run trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0 || !mounted) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationActive = true;

    // Initial resize on effect mount
    resizeCanvas();

    // Physics parameters
    const REPULSION_STRENGTH = 5000;
    const ATTRACTION_STRENGTH = 0.01;
    const DAMPING = 0.85;
    const MIN_DISTANCE = 30;

    // Create node lookup map
    const nodeMap = new Map<string, Node>();
    // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const simulate = () => {
      if (!animationActive) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Apply forces
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];

        // Repulsion between all nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < MIN_DISTANCE) continue;

          const force = REPULSION_STRENGTH / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          nodeA.vx -= fx;
          nodeA.vy -= fy;
          nodeB.vx += fx;
          nodeB.vy += fy;
        }

        // Attraction along edges
        // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
        edges.forEach((edge) => {
          if (edge.source === nodeA.id) {
            const nodeB = nodeMap.get(edge.target);
            if (nodeB) {
              const dx = nodeB.x - nodeA.x;
              const dy = nodeB.y - nodeA.y;
              const force = ATTRACTION_STRENGTH;
              nodeA.vx += dx * force;
              nodeA.vy += dy * force;
            }
          } else if (edge.target === nodeA.id) {
            const nodeB = nodeMap.get(edge.source);
            if (nodeB) {
              const dx = nodeB.x - nodeA.x;
              const dy = nodeB.y - nodeA.y;
              const force = ATTRACTION_STRENGTH;
              nodeA.vx += dx * force;
              nodeA.vy += dy * force;
            }
          }
        });

        // Center gravity
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - nodeA.x;
        const dy = centerY - nodeA.y;
        nodeA.vx += dx * 0.001;
        nodeA.vy += dy * 0.001;
      }

      // Update positions
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      nodes.forEach((node) => {
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;

        // Boundary constraints
        const margin = node.radius + 10;
        if (node.x < margin) {
          node.x = margin;
          node.vx = 0;
        }
        if (node.x > width - margin) {
          node.x = width - margin;
          node.vx = 0;
        }
        if (node.y < margin) {
          node.y = margin;
          node.vy = 0;
        }
        if (node.y > height - margin) {
          node.y = height - margin;
          node.vy = 0;
        }
      });

      // Theme-aware background color (white in light, black in dark)
      const isDark = resolvedTheme === "dark";
      const backgroundColor = isDark ? "#000000" : "#ffffff";

      // Draw
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Compute highlighted nodes and edges if hovering
      let highlightedNodeIds = new Set<string>();
      let highlightedEdges = new Set<string>();

      if (hoveredNode) {
        // Add hovered node
        highlightedNodeIds.add(hoveredNode.id);

        // Add one-hop neighbors
        const neighbors = neighborMap.get(hoveredNode.id);
        if (neighbors) {
          // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
          neighbors.forEach((neighborId) => {
            highlightedNodeIds.add(neighborId);
            // Mark edges between hovered node and neighbors
            highlightedEdges.add(`${hoveredNode.id}-${neighborId}`);
            highlightedEdges.add(`${neighborId}-${hoveredNode.id}`);
          });
        }
      }

      // Draw non-highlighted edges first
      ctx.strokeStyle = GRAPH_GREY;
      ctx.lineWidth = 1;
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      edges.forEach((edge) => {
        const edgeKey = `${edge.source}-${edge.target}`;
        if (!highlightedEdges.has(edgeKey)) {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (sourceNode && targetNode) {
            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.stroke();
          }
        }
      });

      // Draw highlighted edges on top
      if (highlightedEdges.size > 0) {
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 2.5;
        // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
        edges.forEach((edge) => {
          const edgeKey = `${edge.source}-${edge.target}`;
          if (highlightedEdges.has(edgeKey)) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode && targetNode) {
              ctx.beginPath();
              ctx.moveTo(sourceNode.x, sourceNode.y);
              ctx.lineTo(targetNode.x, targetNode.y);
              ctx.stroke();
            }
          }
        });
      }

      // Draw nodes with zoom effect for hovered node
      // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
      nodes.forEach((node) => {
        const isHighlighted = highlightedNodeIds.has(node.id);
        const isHovered = hoveredNode?.id === node.id;

        // Set opacity: dimmed (0.3) for non-highlighted nodes when hovering
        if (hoveredNode && !isHighlighted) {
          ctx.globalAlpha = 0.3;
        } else {
          ctx.globalAlpha = 1.0;
        }

        // Calculate zoom scale for hovered node (1.15x zoom)
        const scale = isHovered ? 1.15 : 1.0;
        const scaledRadius = node.radius * scale;

        // Node fill and stroke (keep existing colors)
        if (isHighlighted) {
          ctx.fillStyle = HIGHLIGHT_COLOR;
          ctx.strokeStyle = HIGHLIGHT_COLOR;
        } else {
          ctx.fillStyle = GRAPH_GREY;
          ctx.strokeStyle = GRAPH_GREY;
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, scaledRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Reset alpha for labels
        ctx.globalAlpha = 1.0;
      });

      // Draw labels for adjacent nodes only when hovering
      if (hoveredNode) {
        const neighbors = neighborMap.get(hoveredNode.id);
        if (neighbors) {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Theme-aware label color: black in light mode, white in dark mode
          const labelColor = isDark ? "#ffffff" : "#000000";
          ctx.fillStyle = labelColor;

          // biome-ignore lint/complexity/noForEach: D3 canvas imperative code
          neighbors.forEach((neighborId) => {
            const neighborNode = nodeMap.get(neighborId);
            if (neighborNode) {
              const labelY = neighborNode.y - neighborNode.radius - 8;
              ctx.fillText(neighborNode.nodeName, neighborNode.x, labelY);
            }
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      animationActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    nodes,
    edges,
    hoveredNode,
    neighborMap,
    resolvedTheme,
    mounted,
    resizeKey,
    resizeCanvas,
  ]);

  // Mouse move handler for hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find node under cursor
    let foundNode: Node | null = null;
    for (const node of nodes) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= node.radius * node.radius) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      setHoveredNode(foundNode);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredNode(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hoveredNode) return;

    if (e.key === "Escape") {
      setHoveredNode(null);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background font-mono">
        <span className="text-muted-foreground terminal-blink">Loading_</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background font-mono">
        <span className="text-muted-foreground terminal-blink">Loading_</span>
      </div>
    );
  }

  if (isError && !graphData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background p-8 font-mono">
        <span className="text-destructive font-bold">[ERROR]</span>
        <div className="text-center">
          <h3 className="text-sm font-semibold mb-2 font-mono">
            failed to load graph
          </h3>
          <p className="text-xs text-muted-foreground mb-4 font-mono">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="font-mono text-xs border border-dashed border-border px-3 py-1 hover:border-foreground hover:text-foreground text-muted-foreground bg-transparent transition-colors"
            data-ocid="landing.retry.button"
          >
            [retry]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col border border-dashed border-border font-mono"
      data-ocid="landing.canvas_target"
    >
      {/* Canvas area */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          className="w-full h-full cursor-pointer"
          style={{ display: "block" }}
          tabIndex={0}
          aria-label="Interactive force-directed graph visualization"
        />

        {/* Tooltip */}
        {hoveredNode && (
          <div
            ref={tooltipRef}
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

        {/* Error banner (when using cached data with error) */}
        {isError && graphData && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 px-4 py-1 text-xs bg-background border border-dashed border-destructive text-destructive font-mono flex items-center gap-2">
            [ERROR] {errorMessage}
          </div>
        )}
      </div>

      {/* Terminal Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-dashed border-border bg-background shrink-0">
        <span className="font-mono text-xs text-muted-foreground">
          {nodes.length} nodes · {edges.length} edges
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {isFromCache ? "[CACHED]" : "[LIVE]"}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="refresh"
            data-ocid="landing.button"
          >
            {isLoading ? "[...]" : "[R]"}
          </button>
        </div>
      </div>
    </div>
  );
}
