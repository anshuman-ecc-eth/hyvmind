import { useEffect, useRef, useState, useCallback } from 'react';
import { useGetGraphData } from '../hooks/useQueries';
import type { GraphNode, GraphEdge } from '../backend';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import SwarmMembershipButton from '../components/SwarmMembershipButton';
import { useTheme } from 'next-themes';
import { useActor } from '../hooks/useActor';

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
}

interface LayoutLink {
  source: string;
  target: string;
  relationType?: string;
}

interface NodeTypeFilters {
  curation: boolean;
  swarm: boolean;
  location: boolean;
  lawToken: boolean;
  interpretationToken: boolean;
}

interface GraphViewProps {
  readOnly?: boolean;
  usePublicData?: boolean;
}

type LayoutType = 'grid' | 'circle' | 'concentric' | 'breadthfirst';

export default function GraphView({ readOnly = false }: GraphViewProps) {
  const { data: graphData, isLoading, error, isError, refetch, isFetching } = useGetGraphData();
  const { actor } = useActor();
  
  const { theme, resolvedTheme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [voteDataMap, setVoteDataMap] = useState<Map<string, { upvotes: number; downvotes: number }>>(new Map());
  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  
  // Panel collapse state
  const [isLegendsCollapsed, setIsLegendsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('graphViewLegendsCollapsed');
    return saved === 'true';
  });
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('graphViewControlsCollapsed');
    return saved === 'true';
  });

  // Visualization control state
  const [linkDistance, setLinkDistance] = useState(() => {
    const saved = sessionStorage.getItem('graphViewLinkDistance');
    return saved ? parseInt(saved, 10) : 120;
  });
  const [nodeSize, setNodeSize] = useState(() => {
    const saved = sessionStorage.getItem('graphViewNodeSize');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [edgeThickness, setEdgeThickness] = useState(() => {
    const saved = sessionStorage.getItem('graphViewEdgeThickness');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [layoutType, setLayoutType] = useState<LayoutType>(() => {
    const saved = sessionStorage.getItem('graphViewLayoutType');
    return (saved as LayoutType) || 'circle';
  });

  // Node dragging state
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [nodeTypeFilters, setNodeTypeFilters] = useState<NodeTypeFilters>(() => {
    const saved = sessionStorage.getItem('graphViewFilters');
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
    };
  });

  // Check if link distance should be disabled based on layout type
  const isLinkDistanceDisabled = layoutType === 'circle' || layoutType === 'breadthfirst';

  // Save panel collapse state to session storage
  useEffect(() => {
    sessionStorage.setItem('graphViewLegendsCollapsed', isLegendsCollapsed.toString());
  }, [isLegendsCollapsed]);

  useEffect(() => {
    sessionStorage.setItem('graphViewControlsCollapsed', isControlsCollapsed.toString());
  }, [isControlsCollapsed]);

  // Save control settings to session storage
  useEffect(() => {
    sessionStorage.setItem('graphViewLinkDistance', linkDistance.toString());
  }, [linkDistance]);

  useEffect(() => {
    sessionStorage.setItem('graphViewNodeSize', nodeSize.toString());
  }, [nodeSize]);

  useEffect(() => {
    sessionStorage.setItem('graphViewEdgeThickness', edgeThickness.toString());
  }, [edgeThickness]);

  useEffect(() => {
    sessionStorage.setItem('graphViewLayoutType', layoutType);
  }, [layoutType]);

  useEffect(() => {
    sessionStorage.setItem('graphViewFilters', JSON.stringify(nodeTypeFilters));
  }, [nodeTypeFilters]);

  const width = 1200;
  const height = 800;

  // Manual refresh handler
  const handleRefresh = () => {
    refetch();
  };

  // Fetch vote data for all nodes
  useEffect(() => {
    if (!graphData || !actor) return;

    const fetchVoteData = async () => {
      const newVoteDataMap = new Map<string, { upvotes: number; downvotes: number }>();
      
      const allNodeIds = [
        ...graphData.curations.map(c => c.id),
        ...graphData.swarms.map(s => s.id),
        ...graphData.locations.map(l => l.id),
        ...graphData.lawTokens.map(t => t.id),
        ...graphData.interpretationTokens.map(i => i.id),
      ];

      for (const nodeId of allNodeIds) {
        try {
          const voteData = await actor.getVoteData(nodeId);
          newVoteDataMap.set(nodeId, {
            upvotes: Number(voteData.upvotes),
            downvotes: Number(voteData.downvotes),
          });
        } catch (error) {
          // If vote data doesn't exist, default to 0/0
          newVoteDataMap.set(nodeId, { upvotes: 0, downvotes: 0 });
        }
      }

      setVoteDataMap(newVoteDataMap);
    };

    fetchVoteData();
  }, [graphData, actor]);

  // Apply layout algorithm
  const applyLayout = useCallback((layoutNodes: LayoutNode[], layoutType: LayoutType) => {
    const centerX = width / 2;
    const centerY = height / 2;

    switch (layoutType) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(layoutNodes.length));
        const spacing = linkDistance * 1.5;
        layoutNodes.forEach((node, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          node.x = centerX - (cols * spacing) / 2 + col * spacing;
          node.y = centerY - (Math.ceil(layoutNodes.length / cols) * spacing) / 2 + row * spacing;
        });
        break;
      }
      case 'circle': {
        const radius = Math.min(width, height) * 0.35;
        layoutNodes.forEach((node, i) => {
          const angle = (i / layoutNodes.length) * 2 * Math.PI;
          node.x = centerX + radius * Math.cos(angle);
          node.y = centerY + radius * Math.sin(angle);
        });
        break;
      }
      case 'concentric': {
        const levelGroups = new Map<number, LayoutNode[]>();
        layoutNodes.forEach(node => {
          if (!levelGroups.has(node.level)) {
            levelGroups.set(node.level, []);
          }
          levelGroups.get(node.level)!.push(node);
        });

        const maxLevel = Math.max(...Array.from(levelGroups.keys()));
        levelGroups.forEach((nodesInLevel, level) => {
          const radius = (level + 1) * (linkDistance * 0.8);
          nodesInLevel.forEach((node, i) => {
            const angle = (i / nodesInLevel.length) * 2 * Math.PI;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
          });
        });
        break;
      }
      case 'breadthfirst': {
        const levelGroups = new Map<number, LayoutNode[]>();
        layoutNodes.forEach(node => {
          if (!levelGroups.has(node.level)) {
            levelGroups.set(node.level, []);
          }
          levelGroups.get(node.level)!.push(node);
        });

        const maxLevel = Math.max(...Array.from(levelGroups.keys()));
        const verticalSpacing = height / (maxLevel + 2);

        levelGroups.forEach((nodesInLevel, level) => {
          const horizontalSpacing = width / (nodesInLevel.length + 1);
          nodesInLevel.forEach((node, i) => {
            node.x = horizontalSpacing * (i + 1);
            node.y = verticalSpacing * (level + 1);
          });
        });
        break;
      }
    }

    return layoutNodes;
  }, [width, height, linkDistance]);

  // Build nodes and links from graph data with layout application
  useEffect(() => {
    if (!graphData) return;

    const layoutNodes: LayoutNode[] = [];
    const layoutLinks: LayoutLink[] = [];
    const processedNodes = new Set<string>();
    const newNodesMap = new Map<string, LayoutNode>();

    // First pass: collect all nodes from the hierarchy
    const processNode = (node: GraphNode, level: number) => {
      if (processedNodes.has(node.id)) return;
      
      processedNodes.add(node.id);
      
      const voteData = voteDataMap.get(node.id) || { upvotes: 0, downvotes: 0 };
      
      // Skip nodes with more downvotes than upvotes
      if (voteData.downvotes > voteData.upvotes) {
        return;
      }

      // Get original token sequence for location nodes
      let originalTokenSequence: string | undefined;
      if (node.nodeType === 'location') {
        const location = graphData.locations.find(l => l.id === node.id);
        originalTokenSequence = location?.originalTokenSequence;
      }
      
      // Check if node exists in cache to preserve position
      const existingNode = nodesMapRef.current.get(node.id);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const randomRadius = 350;
      const angle = Math.random() * 2 * Math.PI;
      
      const layoutNode: LayoutNode = {
        id: node.id,
        label: node.tokenLabel,
        type: node.nodeType,
        level,
        x: existingNode?.x ?? (centerX + Math.cos(angle) * randomRadius * Math.random()),
        y: existingNode?.y ?? (centerY + Math.sin(angle) * randomRadius * Math.random()),
        upvotes: voteData.upvotes,
        downvotes: voteData.downvotes,
        originalTokenSequence,
      };

      layoutNodes.push(layoutNode);
      newNodesMap.set(node.id, layoutNode);

      // Process children for hierarchy edges
      node.children.forEach((child) => {
        const childVoteData = voteDataMap.get(child.id) || { upvotes: 0, downvotes: 0 };
        
        // Skip children with more downvotes than upvotes
        if (childVoteData.downvotes > childVoteData.upvotes) {
          return;
        }
        
        // Only add hierarchy edges for non-location-to-lawToken relationships
        if (!(node.nodeType === 'location' && child.nodeType === 'lawToken')) {
          let relationType: string | undefined;
          if (node.nodeType === 'lawToken' && child.nodeType === 'interpretationToken') {
            const interpretationToken = graphData.interpretationTokens.find(
              (interp) => interp.id === child.id
            );
            if (interpretationToken) {
              relationType = interpretationToken.fromRelationshipType;
            }
          }

          layoutLinks.push({
            source: node.id,
            target: child.id,
            relationType,
          });
        }
        processNode(child, level + 1);
      });
    };

    graphData.rootNodes.forEach((root) => processNode(root, 0));

    // Second pass: add all explicit edges from the edges array
    // This includes location-lawToken edges AND interpretation token "to" edges
    graphData.edges.forEach((edge: GraphEdge) => {
      // Verify both nodes exist and are not discarded
      const sourceVoteData = voteDataMap.get(edge.source) || { upvotes: 0, downvotes: 0 };
      const targetVoteData = voteDataMap.get(edge.target) || { upvotes: 0, downvotes: 0 };
      
      if (sourceVoteData.downvotes > sourceVoteData.upvotes || targetVoteData.downvotes > targetVoteData.upvotes) {
        return;
      }
      
      const sourceExists = layoutNodes.some(n => n.id === edge.source);
      const targetExists = layoutNodes.some(n => n.id === edge.target);
      
      if (sourceExists && targetExists) {
        // Check if this edge already exists
        const edgeExists = layoutLinks.some(
          link => link.source === edge.source && link.target === edge.target
        );
        
        if (!edgeExists) {
          // Check if this is an interpretation token "to" edge and add relationship type
          let relationType: string | undefined;
          const interpretationToken = graphData.interpretationTokens.find(
            (interp) => interp.id === edge.source
          );
          if (interpretationToken && edge.target === interpretationToken.toNodeId) {
            relationType = interpretationToken.toRelationshipType;
          }

          layoutLinks.push({
            source: edge.source,
            target: edge.target,
            relationType,
          });
        }
      }
    });

    // Apply layout algorithm
    const positionedNodes = applyLayout(layoutNodes, layoutType);

    // Update cache
    nodesMapRef.current = newNodesMap;
    
    setNodes(positionedNodes);
    setLinks(layoutLinks);
  }, [graphData, voteDataMap, layoutType, applyLayout, width, height]);

  // Filter nodes and links based on active filters
  const filteredNodes = nodes.filter(node => nodeTypeFilters[node.type as keyof NodeTypeFilters]);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = links.filter(link => 
    filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
  );

  const getNodeColor = (type: string) => {
    const currentTheme = resolvedTheme || theme || 'light';
    const isDark = currentTheme === 'dark';

    const lightColors = {
      curation: '#D32F2F',
      swarm: '#1976D2',
      location: '#388E3C',
      lawToken: '#7B1FA2',
      interpretationToken: '#F57C00',
    };

    const darkColors = {
      curation: '#FF7043',
      swarm: '#42A5F5',
      location: '#66BB6A',
      lawToken: '#BA68C8',
      interpretationToken: '#FFB74D',
    };

    const colors = isDark ? darkColors : lightColors;

    switch (type) {
      case 'curation':
        return colors.curation;
      case 'swarm':
        return colors.swarm;
      case 'location':
        return colors.location;
      case 'lawToken':
        return colors.lawToken;
      case 'interpretationToken':
        return colors.interpretationToken;
      default:
        return isDark ? '#888888' : '#666666';
    }
  };

  const getEdgeColor = () => {
    const currentTheme = resolvedTheme || theme || 'light';
    const isDark = currentTheme === 'dark';
    return isDark ? '#555555' : '#999999';
  };

  const getConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    connected.add(nodeId);
    
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setPan((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingNode && draggedNodeId) {
      const svg = svgRef.current;
      if (!svg) return;

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

      const worldX = (svgP.x - pan.x) / zoom;
      const worldY = (svgP.y - pan.y) / zoom;

      const deltaX = worldX - dragStart.x;
      const deltaY = worldY - dragStart.y;

      // Update dragged node position
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        const draggedNode = newNodes.find(n => n.id === draggedNodeId);
        if (!draggedNode) return prevNodes;

        // Get connected nodes
        const connectedNodeIds = getConnectedNodes(draggedNodeId);
        
        // Move dragged node
        draggedNode.x = worldX;
        draggedNode.y = worldY;

        // Move connected nodes to maintain link distance
        connectedNodeIds.forEach(connectedId => {
          if (connectedId === draggedNodeId) return;
          const connectedNode = newNodes.find(n => n.id === connectedId);
          if (connectedNode) {
            connectedNode.x += deltaX;
            connectedNode.y += deltaY;
          }
        });

        return newNodes;
      });

      setDragStart({ x: worldX, y: worldY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingNode(false);
    setDraggedNodeId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'g') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'g') {
      setFocusedNode(null);
    }
  };

  const handleNodeClick = useCallback((e: React.MouseEvent, node: LayoutNode) => {
    e.stopPropagation();
    setSelectedNode(node);
    setFocusedNode(node.id);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: LayoutNode) => {
    e.stopPropagation();
    setIsDraggingNode(true);
    setDraggedNodeId(node.id);

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const worldX = (svgP.x - pan.x) / zoom;
    const worldY = (svgP.y - pan.y) / zoom;

    setDragStart({ x: worldX, y: worldY });
  }, [pan, zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(4, prev * delta)));
  };

  const toggleNodeTypeFilter = (nodeType: keyof NodeTypeFilters) => {
    setNodeTypeFilters(prev => ({
      ...prev,
      [nodeType]: !prev[nodeType]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
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
              : "No nodes yet. Create your first curation to get started!"
            }
          </p>
        </div>
      </div>
    );
  }

  const selectedSwarmNode = selectedNode?.type === 'swarm' ? selectedNode : null;
  const selectedLocationNode = selectedNode?.type === 'location' ? selectedNode : null;

  const selectedLocation = selectedLocationNode 
    ? graphData.locations.find(a => a.id === selectedLocationNode.id)
    : null;

  const getNodeConnections = (nodeId: string) => {
    const incoming = filteredLinks.filter(l => l.target === nodeId).length;
    const outgoing = filteredLinks.filter(l => l.source === nodeId).length;
    return { incoming, outgoing, total: incoming + outgoing };
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden bg-background">
      <svg
        ref={svgRef}
        className="h-full w-full cursor-move"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
        onWheel={handleWheel}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g>
            {filteredLinks.map((link, i) => {
              const source = filteredNodes.find((n) => n.id === link.source);
              const target = filteredNodes.find((n) => n.id === link.target);
              if (!source || !target) return null;

              const isConnected = isLinkConnected(link);
              const opacity = isConnected ? 0.85 : 0.15;

              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={getEdgeColor()}
                  strokeWidth={edgeThickness}
                  strokeOpacity={opacity}
                  style={{ transition: 'stroke-opacity 0.3s ease' }}
                />
              );
            })}
          </g>

          <g>
            {filteredLinks.map((link, i) => {
              if (!link.relationType) return null;

              const source = filteredNodes.find((n) => n.id === link.source);
              const target = filteredNodes.find((n) => n.id === link.target);
              if (!source || !target) return null;

              const isConnected = isLinkConnected(link);
              const opacity = isConnected ? 0.85 : 0.15;

              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              
              const normalizedAngle = angle > 90 || angle < -90 ? angle + 180 : angle;

              return (
                <g key={`label-${i}`} style={{ transition: 'opacity 0.3s ease' }} opacity={opacity}>
                  <rect
                    x={midX - 30}
                    y={midY - 10}
                    width={60}
                    height={16}
                    fill="oklch(var(--background))"
                    fillOpacity={0.85}
                    rx={3}
                    className="pointer-events-none"
                  />
                  <text
                    x={midX}
                    y={midY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-[10px] font-medium pointer-events-none select-none"
                    style={{
                      transform: `rotate(${normalizedAngle}deg)`,
                      transformOrigin: `${midX}px ${midY}px`,
                    }}
                  >
                    {link.relationType}
                  </text>
                </g>
              );
            })}
          </g>

          <g>
            {filteredNodes.map((node) => {
              const nodeRadius = nodeSize - node.level * 2;
              const isConnected = isNodeConnected(node.id);
              const opacity = isConnected ? 1 : 0.2;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => handleNodeClick(e, node)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{ 
                    cursor: 'grab',
                    opacity,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <circle
                    r={nodeRadius}
                    fill={getNodeColor(node.type)}
                    stroke="oklch(var(--background))"
                    strokeWidth={2}
                    style={{ transition: 'fill 0.3s ease' }}
                  />
                  <text
                    y={nodeRadius + 15}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-medium pointer-events-none select-none"
                  >
                    {node.label.substring(0, 15)}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {selectedNode && !readOnly && (
        <Card className="absolute right-4 top-4 w-80 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
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
            {selectedLocation && selectedLocation.originalTokenSequence && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Law Token Sequence</p>
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
                <span className="font-semibold">Total: {getNodeConnections(selectedNode.id).total}</span>
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
        <Card className="absolute bottom-4 left-4 p-4 transition-all duration-300 ease-in-out">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Legend & Filters</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                  aria-label="Refresh graph data"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLegendsCollapsed(!isLegendsCollapsed)}
                  className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                  aria-label={isLegendsCollapsed ? "Expand legends panel" : "Collapse legends panel"}
                  aria-expanded={!isLegendsCollapsed}
                >
                  {isLegendsCollapsed ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div 
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isLegendsCollapsed ? '0' : '500px',
                opacity: isLegendsCollapsed ? 0 : 1,
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-curation"
                    checked={nodeTypeFilters.curation}
                    onCheckedChange={() => toggleNodeTypeFilter('curation')}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor('curation') }}
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
                    onCheckedChange={() => toggleNodeTypeFilter('swarm')}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor('swarm') }}
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
                    onCheckedChange={() => toggleNodeTypeFilter('location')}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor('location') }}
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
                    onCheckedChange={() => toggleNodeTypeFilter('lawToken')}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor('lawToken') }}
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
                    onCheckedChange={() => toggleNodeTypeFilter('interpretationToken')}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: getNodeColor('interpretationToken') }}
                  />
                  <label
                    htmlFor="filter-interpretationToken"
                    className="text-xs cursor-pointer select-none"
                  >
                    Interpretation Token
                  </label>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Drag canvas to pan • Scroll to zoom
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag node to move with connected nodes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click node to focus • Click background to reset
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nodes with more downvotes than upvotes are hidden
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!readOnly && (
        <Card className="absolute bottom-4 right-4 p-4 w-72 transition-all duration-300 ease-in-out">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Visualization Controls</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                aria-label={isControlsCollapsed ? "Expand controls panel" : "Collapse controls panel"}
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
                maxHeight: isControlsCollapsed ? '0' : '400px',
                opacity: isControlsCollapsed ? 0 : 1,
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="link-distance" 
                    className={`text-xs ${isLinkDistanceDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
                  >
                    Link Distance: {linkDistance}
                    {isLinkDistanceDisabled && ' (disabled for this layout)'}
                  </Label>
                  <Slider
                    id="link-distance"
                    min={50}
                    max={300}
                    step={10}
                    value={[linkDistance]}
                    onValueChange={(value) => setLinkDistance(value[0])}
                    disabled={isLinkDistanceDisabled}
                    className={`${isLinkDistanceDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="node-size" className="text-xs text-muted-foreground">
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
                  <Label htmlFor="edge-thickness" className="text-xs text-muted-foreground">
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

                <div className="space-y-2">
                  <Label htmlFor="layout-type" className="text-xs text-muted-foreground">
                    Layout
                  </Label>
                  <Select value={layoutType} onValueChange={(value) => setLayoutType(value as LayoutType)}>
                    <SelectTrigger id="layout-type" className="hover:bg-accent hover:text-accent-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="concentric">Concentric</SelectItem>
                      <SelectItem value="breadthfirst">Breadthfirst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
