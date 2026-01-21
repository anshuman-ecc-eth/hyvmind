/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { createActorWithConfig } from '../config';
import type { GraphData } from '../backend';

interface Point {
  x: number;
  y: number;
  nodeType: string;
  nodeName: string;
  nodeId: string;
}

// Node type colors matching the specification
const NODE_COLORS = {
  light: {
    curation: '#D32F2F',
    swarm: '#1976D2',
    location: '#388E3C',
    lawToken: '#7B1FA2',
    interpretationToken: '#F57C00',
  },
  dark: {
    curation: '#FF7043',
    swarm: '#42A5F5',
    location: '#66BB6A',
    lawToken: '#BA68C8',
    interpretationToken: '#FFB74D',
  },
};

// Node type display names
const NODE_TYPE_NAMES: Record<string, string> = {
  curation: 'Curation',
  swarm: 'Swarm',
  location: 'Location',
  lawToken: 'Law Token',
  interpretationToken: 'Interpretation Token',
};

// Cache configuration
const CACHE_KEY = 'hyvmind_voronoi_graph_data';
const CACHE_TIMESTAMP_KEY = 'hyvmind_voronoi_cache_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  data: GraphData;
  timestamp: number;
}

export default function VoronoiDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // State for data management
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFromCache, setIsFromCache] = useState(false);

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
          const cachedTimestamp = parseInt(cachedTimestampStr, 10);
          const now = Date.now();
          const age = now - cachedTimestamp;

          // If cache is still valid (less than 24 hours old)
          if (age < CACHE_DURATION_MS) {
            try {
              const cachedData: GraphData = JSON.parse(cachedDataStr);
              setGraphData(cachedData);
              setIsFromCache(true);
              setIsLoading(false);
              console.log('Loaded graph data from cache (age: ' + Math.round(age / 1000 / 60 / 60) + ' hours)');
              return; // Use cached data, don't fetch
            } catch (parseError) {
              console.warn('Failed to parse cached data, will fetch fresh data', parseError);
              // Continue to fetch fresh data
            }
          } else {
            console.log('Cache expired (age: ' + Math.round(age / 1000 / 60 / 60) + ' hours), fetching fresh data');
          }
        }

        // Step 2: Cache is invalid or doesn't exist, fetch fresh data
        const anonymousActor = await createActorWithConfig();
        if (!anonymousActor) {
          throw new Error('Failed to create anonymous actor');
        }

        const freshData = await anonymousActor.getGraphData();
        
        // Step 3: Store fresh data in cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          console.log('Fetched and cached fresh graph data');
        } catch (storageError) {
          console.warn('Failed to cache data in localStorage', storageError);
          // Continue even if caching fails
        }

        setGraphData(freshData);
        setIsFromCache(false);
        setIsLoading(false);

      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        
        // Step 4: On error, try to use cached data as fallback (even if expired)
        const cachedDataStr = localStorage.getItem(CACHE_KEY);
        if (cachedDataStr) {
          try {
            const cachedData: GraphData = JSON.parse(cachedDataStr);
            setGraphData(cachedData);
            setIsFromCache(true);
            setIsLoading(false);
            setIsError(true);
            setErrorMessage('Using cached data (network unavailable)');
            console.log('Using expired/fallback cached data due to fetch error');
            return;
          } catch (parseError) {
            console.error('Failed to parse cached fallback data', parseError);
          }
        }

        // Step 5: No cached data available, show error
        setIsError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load graph data');
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
        throw new Error('Failed to create anonymous actor');
      }

      const freshData = await anonymousActor.getGraphData();
      
      // Update cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to cache data in localStorage', storageError);
      }

      setGraphData(freshData);
      setIsFromCache(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to refresh graph data:', error);
      setIsError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to refresh data');
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
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      // Convert to 0-1 range
      return Math.abs(Math.sin(hash)) * 10000 % 1;
    };

    // Add curations
    if (graphData.curations) {
      graphData.curations.forEach((curation) => {
        generatedPoints.push({
          x: seededRandom(curation.id + '_x'),
          y: seededRandom(curation.id + '_y'),
          nodeType: 'curation',
          nodeName: curation.name,
          nodeId: curation.id,
        });
      });
    }

    // Add swarms
    if (graphData.swarms) {
      graphData.swarms.forEach((swarm) => {
        generatedPoints.push({
          x: seededRandom(swarm.id + '_x'),
          y: seededRandom(swarm.id + '_y'),
          nodeType: 'swarm',
          nodeName: swarm.name,
          nodeId: swarm.id,
        });
      });
    }

    // Add locations
    if (graphData.locations) {
      graphData.locations.forEach((location) => {
        generatedPoints.push({
          x: seededRandom(location.id + '_x'),
          y: seededRandom(location.id + '_y'),
          nodeType: 'location',
          nodeName: location.title,
          nodeId: location.id,
        });
      });
    }

    // Add law tokens
    if (graphData.lawTokens) {
      graphData.lawTokens.forEach((lawToken) => {
        generatedPoints.push({
          x: seededRandom(lawToken.id + '_x'),
          y: seededRandom(lawToken.id + '_y'),
          nodeType: 'lawToken',
          nodeName: lawToken.tokenLabel,
          nodeId: lawToken.id,
        });
      });
    }

    // Add interpretation tokens
    if (graphData.interpretationTokens) {
      graphData.interpretationTokens.forEach((interpretationToken) => {
        generatedPoints.push({
          x: seededRandom(interpretationToken.id + '_x'),
          y: seededRandom(interpretationToken.id + '_y'),
          nodeType: 'interpretationToken',
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

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawVoronoi();
    };

    const drawVoronoi = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (width === 0 || height === 0) return;

      // Determine current theme
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const isDark = currentTheme === 'dark';
      const colors = isDark ? NODE_COLORS.dark : NODE_COLORS.light;

      // Clear canvas
      ctx.fillStyle = isDark ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Scale normalized coordinates (0-1) to canvas dimensions
      const scaledPoints = points.map(p => ({
        ...p,
        x: p.x * width,
        y: p.y * height,
      }));

      // Draw Voronoi diagram using pixel-by-pixel approach with antialiasing
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // For each pixel, find the closest point
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let minDist = Infinity;
          let closestPoint = 0;

          // Find closest seed point
          for (let i = 0; i < scaledPoints.length; i++) {
            const dx = x - scaledPoints[i].x;
            const dy = y - scaledPoints[i].y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
              minDist = dist;
              closestPoint = i;
            }
          }

          // Check if this pixel is on a boundary with antialiasing
          let edgeStrength = 0;
          
          // Sample multiple sub-pixel positions for antialiasing
          const samples = [
            { dx: 0, dy: 0 },
            { dx: 0.5, dy: 0 },
            { dx: -0.5, dy: 0 },
            { dx: 0, dy: 0.5 },
            { dx: 0, dy: -0.5 },
          ];

          for (const sample of samples) {
            const sx = x + sample.dx;
            const sy = y + sample.dy;

            let sampleClosest = 0;
            let sampleMinDist = Infinity;

            for (let i = 0; i < scaledPoints.length; i++) {
              const dx = sx - scaledPoints[i].x;
              const dy = sy - scaledPoints[i].y;
              const dist = dx * dx + dy * dy;
              if (dist < sampleMinDist) {
                sampleMinDist = dist;
                sampleClosest = i;
              }
            }

            if (sampleClosest !== closestPoint) {
              edgeStrength += 1;
            }
          }

          const pixelIndex = (y * width + x) * 4;

          if (edgeStrength > 0) {
            // Draw edge with node type color and antialiasing
            const nodeType = scaledPoints[closestPoint].nodeType as keyof typeof colors;
            const color = colors[nodeType] || (isDark ? '#404040' : '#d0d0d0');
            const rgb = hexToRgb(color);
            
            // Calculate alpha based on edge strength for antialiasing
            const alpha = Math.min(255, (edgeStrength / samples.length) * 255);
            
            // Blend with background
            const bgColor = isDark ? 0 : 255;
            const blendFactor = alpha / 255;
            
            data[pixelIndex] = Math.round(rgb.r * blendFactor + bgColor * (1 - blendFactor));
            data[pixelIndex + 1] = Math.round(rgb.g * blendFactor + bgColor * (1 - blendFactor));
            data[pixelIndex + 2] = Math.round(rgb.b * blendFactor + bgColor * (1 - blendFactor));
            data[pixelIndex + 3] = 255;
          } else {
            // Fill with background color
            if (isDark) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              data[pixelIndex] = 255;
              data[pixelIndex + 1] = 255;
              data[pixelIndex + 2] = 255;
            }
            data[pixelIndex + 3] = 255;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Draw seed points with node type colors
      for (const point of scaledPoints) {
        const nodeType = point.nodeType as keyof typeof colors;
        ctx.fillStyle = colors[nodeType] || (isDark ? '#404040' : '#d0d0d0');
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [theme, systemTheme, points, mounted]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Scale points to canvas dimensions for hit detection
    const width = canvas.width;
    const height = canvas.height;
    const scaledPoints = points.map(p => ({
      ...p,
      x: p.x * width,
      y: p.y * height,
    }));

    // Find if mouse is near any point
    let foundPoint: Point | null = null;
    const hoverRadius = 10; // Pixels

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

  // Helper function to convert hex color to RGB
  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 128, g: 128, b: 128 };
  }

  if (!mounted) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-transparent" />
          <p className="text-muted-foreground">Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (isError && !graphData) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Failed to Load Graph Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {errorMessage || 'An unknown error occurred'}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <p className="text-muted-foreground">No graph data available</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-background voronoi-diagram-container">
      <canvas
        ref={canvasRef}
        className="w-full h-full voronoi-canvas"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Error banner when using cached data as fallback */}
      {isError && graphData && (
        <div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md shadow-sm border text-xs flex items-center gap-2"
          style={{
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#fbbf24' : '#b45309',
            color: isDark ? '#fbbf24' : '#b45309',
          }}
        >
          <AlertCircle className="h-3 w-3" />
          <span>{errorMessage}</span>
        </div>
      )}
      
      {/* Tooltip */}
      {hoveredPoint && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-md shadow-lg border transition-opacity"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#404040' : '#e0e0e0',
            color: isDark ? '#ffffff' : '#000000',
          }}
        >
          <div className="text-sm font-medium mb-1">{hoveredPoint.nodeName}</div>
          <div 
            className="text-xs"
            style={{
              color: isDark ? '#fbbf24' : '#b45309',
            }}
          >
            {NODE_TYPE_NAMES[hoveredPoint.nodeType] || hoveredPoint.nodeType}
          </div>
        </div>
      )}
    </div>
  );
}
