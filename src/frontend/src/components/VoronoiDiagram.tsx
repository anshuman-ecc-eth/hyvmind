import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData } from "../backend";
import { createActorWithConfig } from "../config";
import { getNodeTypeStyle } from "../utils/voronoiPalette";

interface Point {
  x: number;
  y: number;
  nodeType: string;
  nodeName: string;
  nodeId: string;
}

// Node type display names
const NODE_TYPE_NAMES: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawToken: "Law Token",
  interpretationToken: "Interpretation Token",
};

// Cache configuration
const CACHE_KEY = "hyvmind_voronoi_graph_data";
const CACHE_TIMESTAMP_KEY = "hyvmind_voronoi_cache_timestamp";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Voronoi cell computation using pixel-based approach with polygon extraction
interface VoronoiCell {
  pointIndex: number;
  polygon: Array<{ x: number; y: number }>;
}

function computeVoronoiCells(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
): VoronoiCell[] {
  if (points.length === 0) return [];

  const cells: VoronoiCell[] = [];
  const step = 3; // Sample every 3 pixels for balance between quality and performance

  // Create a map to track which point owns each pixel
  const cellMap = new Map<string, number>();

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let minDist = Number.POSITIVE_INFINITY;
      let closestIdx = 0;

      for (let i = 0; i < points.length; i++) {
        const dx = x - points[i].x;
        const dy = y - points[i].y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      cellMap.set(`${x},${y}`, closestIdx);
    }
  }

  // Extract approximate polygon boundaries for each cell
  for (let i = 0; i < points.length; i++) {
    const polygon: Array<{ x: number; y: number }> = [];
    const visited = new Set<string>();

    // Find boundary pixels for this cell
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const current = cellMap.get(`${x},${y}`);
        if (current !== i) continue;

        // Check if this pixel is on the boundary
        const neighbors = [
          cellMap.get(`${x + step},${y}`),
          cellMap.get(`${x - step},${y}`),
          cellMap.get(`${x},${y + step}`),
          cellMap.get(`${x},${y - step}`),
        ];

        const isBoundary = neighbors.some((n) => n !== undefined && n !== i);
        if (
          isBoundary ||
          x === 0 ||
          y === 0 ||
          x >= width - step ||
          y >= height - step
        ) {
          const key = `${x},${y}`;
          if (!visited.has(key)) {
            polygon.push({ x, y });
            visited.add(key);
          }
        }
      }
    }

    if (polygon.length > 0) {
      cells.push({ pointIndex: i, polygon });
    }
  }

  return cells;
}

export default function VoronoiDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // State for data management
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [_isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

        const freshData = await anonymousActor.getAllData();

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

      const freshData = await anonymousActor.getAllData();

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

  // Generate stable coordinates from graph data using useMemo
  const points = useMemo(() => {
    if (!graphData) return [];

    const generatedPoints: Point[] = [];

    // Use a seeded random number generator for consistent positioning
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

    // Add curations
    if (graphData.curations) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.curations.forEach((curation) => {
        generatedPoints.push({
          x: seededRandom(`${curation.id}_x`),
          y: seededRandom(`${curation.id}_y`),
          nodeType: "curation",
          nodeName: curation.name,
          nodeId: curation.id,
        });
      });
    }

    // Add swarms
    if (graphData.swarms) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.swarms.forEach((swarm) => {
        generatedPoints.push({
          x: seededRandom(`${swarm.id}_x`),
          y: seededRandom(`${swarm.id}_y`),
          nodeType: "swarm",
          nodeName: swarm.name,
          nodeId: swarm.id,
        });
      });
    }

    // Add locations
    if (graphData.locations) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.locations.forEach((location) => {
        generatedPoints.push({
          x: seededRandom(`${location.id}_x`),
          y: seededRandom(`${location.id}_y`),
          nodeType: "location",
          nodeName: location.title,
          nodeId: location.id,
        });
      });
    }

    // Add law tokens
    if (graphData.lawTokens) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.lawTokens.forEach((lawToken) => {
        generatedPoints.push({
          x: seededRandom(`${lawToken.id}_x`),
          y: seededRandom(`${lawToken.id}_y`),
          nodeType: "lawToken",
          nodeName: lawToken.tokenLabel,
          nodeId: lawToken.id,
        });
      });
    }

    // Add interpretation tokens
    if (graphData.interpretationTokens) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.interpretationTokens.forEach((interpretationToken) => {
        generatedPoints.push({
          x: seededRandom(`${interpretationToken.id}_x`),
          y: seededRandom(`${interpretationToken.id}_y`),
          nodeType: "interpretationToken",
          nodeName: interpretationToken.title,
          nodeId: interpretationToken.id,
        });
      });
    }

    return generatedPoints;
  }, [graphData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0 || !mounted) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container with high-DPI support
    const resizeCanvas = () => {
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

      drawVoronoi();
    };

    const drawVoronoi = () => {
      // Use CSS pixel dimensions for drawing
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      if (width === 0 || height === 0) return;

      // Fixed background color (theme-independent)
      const bgColor = "#ffffff";

      // Clear canvas with fixed background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Scale normalized coordinates (0-1) to canvas dimensions
      const scaledPoints = points.map((p) => ({
        ...p,
        x: p.x * width,
        y: p.y * height,
      }));

      // Compute Voronoi cells
      const cells = computeVoronoiCells(scaledPoints, width, height);

      // Draw filled Voronoi cells with node-type colors
      for (const cell of cells) {
        const point = scaledPoints[cell.pointIndex];
        const style = getNodeTypeStyle(point.nodeType);

        if (cell.polygon.length < 3) continue;

        ctx.fillStyle = style.fill;
        ctx.beginPath();
        ctx.moveTo(cell.polygon[0].x, cell.polygon[0].y);
        for (let i = 1; i < cell.polygon.length; i++) {
          ctx.lineTo(cell.polygon[i].x, cell.polygon[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Draw seed points as simple solid black dots
      for (const point of scaledPoints) {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resizeCanvas();

    // Throttle resize events to avoid performance issues
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [points, mounted]);

  // Handle mouse move for tooltip (using CSS pixel coordinates)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Scale points to CSS pixel dimensions for hit detection
    const width = rect.width;
    const height = rect.height;
    const scaledPoints = points.map((p) => ({
      ...p,
      x: p.x * width,
      y: p.y * height,
    }));

    // Find if mouse is near any point
    let foundPoint: Point | null = null;
    const hoverRadius = 10; // CSS pixels

    for (const point of scaledPoints) {
      const dx = mouseX - point.x;
      const dy = mouseY - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= hoverRadius) {
        foundPoint = point;
        break;
      }
    }

    if (foundPoint) {
      setHoveredPoint(foundPoint);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  if (!mounted) {
    return (
      <div className="relative h-full w-full flex items-center justify-center voronoi-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative h-full w-full flex items-center justify-center voronoi-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-transparent" />
          <p className="text-muted-foreground">Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (isError && !graphData) {
    return (
      <div className="relative h-full w-full flex items-center justify-center voronoi-error">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Failed to Load Graph Data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {errorMessage || "An unknown error occurred"}
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="relative h-full w-full flex items-center justify-center voronoi-empty">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <p className="text-muted-foreground">
            No data available to visualize
          </p>
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full voronoi-diagram-container">
      <canvas
        ref={canvasRef}
        className="voronoi-canvas w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          ref={tooltipRef}
          className="voronoi-tooltip-content"
          style={{
            position: "fixed",
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y + 12,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <div className="text-xs font-medium">{hoveredPoint.nodeName}</div>
          <div className="text-xs text-muted-foreground">
            {NODE_TYPE_NAMES[hoveredPoint.nodeType] || hoveredPoint.nodeType}
          </div>
        </div>
      )}

      {/* Refresh button - fixed in bottom-right corner */}
      <Button
        onClick={handleRefresh}
        disabled={isLoading}
        variant="outline"
        size="icon"
        className="absolute bottom-4 right-4 rounded-full shadow-lg"
        aria-label="Refresh graph data"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
