import { useEffect, useRef, useState } from 'react';
import type { Swarm, Annotation, Location } from '../backend';
import type { AnnotationFilter } from '../hooks/useQueries';
import type { GraphTheme } from '../pages/GraphView';
import { Network } from 'lucide-react';

interface D3GraphCanvasProps {
  swarms: Swarm[];
  annotations: Annotation[];
  locations: Location[];
  filters: AnnotationFilter[];
  theme: GraphTheme;
  appTheme: string | undefined;
  onEntityClick?: (entityLabel: string) => void;
  onSwarmClick?: (swarmId: string) => void;
  onLocationClick?: (locationId: string) => void;
  onAnnotationClick?: (annotationId: string) => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'entity' | 'location';
  label: string;
  swarmId: string;
  approvalScore?: number;
}

interface AnnotationCircle {
  id: string;
  annotationId: string;
  x: number;
  y: number;
  radius: number;
  swarmId: string;
  content: string;
  approvalScore: number;
}

interface SwarmBoundary {
  id: string;
  label: string;
  centerX: number;
  centerY: number;
  radius: number;
}

interface Edge {
  from: string;
  to: string;
  label: string;
  approvalScore: number;
  swarmId: string;
  type: 'relation' | 'location_link' | 'location_hierarchy';
}

interface ThemeColors {
  swarmFill: string;
  swarmBorder: string;
  swarmBorderHover: string;
  swarmLabel: string;
  edgeColor: string;
  edgeLabelColor: string;
  nodeColor: string;
  nodeBorder: string;
  nodeLabel: string;
  locationNodeColor: string;
  locationNodeBorder: string;
  locationEdgeColor: string;
  annotationCircleFill: string;
  annotationCircleBorder: string;
  selectedHighlight: string;
}

interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
  level: number;
  x: number;
  y: number;
}

const normalizeText = (text: string): string => {
  return text.trim().toLowerCase();
};

export default function D3GraphCanvas({
  swarms,
  annotations,
  locations,
  filters,
  theme,
  appTheme,
  onEntityClick,
  onSwarmClick,
  onLocationClick,
  onAnnotationClick,
}: D3GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [annotationCircles, setAnnotationCircles] = useState<AnnotationCircle[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [swarmBoundaries, setSwarmBoundaries] = useState<SwarmBoundary[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredSwarm, setHoveredSwarm] = useState<SwarmBoundary | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<AnnotationCircle | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationCircle | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  const getThemeColors = (): ThemeColors => {
    const isDark = appTheme === 'dark';
    
    const getUnifiedNodeColor = () => {
      switch (theme) {
        case 'warm':
          return isDark ? 'rgba(251, 146, 60, 0.85)' : 'rgba(249, 115, 22, 0.85)';
        case 'cool':
          return isDark ? 'rgba(99, 102, 241, 0.85)' : 'rgba(79, 70, 229, 0.85)';
        case 'neutral':
        default:
          return isDark ? 'rgba(234, 179, 8, 0.85)' : 'rgba(202, 138, 4, 0.85)';
      }
    };

    const getUnifiedNodeBorder = () => {
      switch (theme) {
        case 'warm':
          return isDark ? 'rgba(251, 191, 36, 0.5)' : 'rgba(245, 158, 11, 0.5)';
        case 'cool':
          return isDark ? 'rgba(129, 140, 248, 0.5)' : 'rgba(99, 102, 241, 0.5)';
        case 'neutral':
        default:
          return isDark ? 'rgba(250, 204, 21, 0.5)' : 'rgba(234, 179, 8, 0.5)';
      }
    };

    const getNodeLabel = () => {
      return isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)';
    };

    const getAnnotationCircleFill = () => {
      switch (theme) {
        case 'warm':
          return isDark ? 'rgba(251, 146, 60, 0.12)' : 'rgba(249, 115, 22, 0.12)';
        case 'cool':
          return isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.12)';
        case 'neutral':
        default:
          return isDark ? 'rgba(234, 179, 8, 0.12)' : 'rgba(202, 138, 4, 0.12)';
      }
    };

    const getAnnotationCircleBorder = () => {
      switch (theme) {
        case 'warm':
          return isDark ? 'rgba(251, 146, 60, 0.4)' : 'rgba(249, 115, 22, 0.4)';
        case 'cool':
          return isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.4)';
        case 'neutral':
        default:
          return isDark ? 'rgba(234, 179, 8, 0.4)' : 'rgba(202, 138, 4, 0.4)';
      }
    };

    const getSelectedHighlight = () => {
      switch (theme) {
        case 'warm':
          return isDark ? 'rgba(251, 191, 36, 0.9)' : 'rgba(245, 158, 11, 0.9)';
        case 'cool':
          return isDark ? 'rgba(129, 140, 248, 0.9)' : 'rgba(99, 102, 241, 0.9)';
        case 'neutral':
        default:
          return isDark ? 'rgba(250, 204, 21, 0.9)' : 'rgba(234, 179, 8, 0.9)';
      }
    };
    
    switch (theme) {
      case 'warm':
        return {
          swarmFill: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          swarmBorder: isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(245, 158, 11, 0.4)',
          swarmBorderHover: isDark ? 'rgba(251, 191, 36, 0.7)' : 'rgba(245, 158, 11, 0.7)',
          swarmLabel: isDark ? 'rgba(251, 191, 36, 0.9)' : 'rgba(180, 83, 9, 0.9)',
          edgeColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.25)',
          edgeLabelColor: isDark ? 'rgba(251, 191, 36, 0.6)' : 'rgba(180, 83, 9, 0.6)',
          nodeColor: getUnifiedNodeColor(),
          nodeBorder: getUnifiedNodeBorder(),
          nodeLabel: getNodeLabel(),
          locationNodeColor: getUnifiedNodeColor(),
          locationNodeBorder: getUnifiedNodeBorder(),
          locationEdgeColor: isDark ? 'rgba(192, 132, 252, 0.3)' : 'rgba(168, 85, 247, 0.3)',
          annotationCircleFill: getAnnotationCircleFill(),
          annotationCircleBorder: getAnnotationCircleBorder(),
          selectedHighlight: getSelectedHighlight(),
        };
      case 'cool':
        return {
          swarmFill: isDark ? 'rgba(45, 212, 191, 0.08)' : 'rgba(20, 184, 166, 0.08)',
          swarmBorder: isDark ? 'rgba(45, 212, 191, 0.4)' : 'rgba(20, 184, 166, 0.4)',
          swarmBorderHover: isDark ? 'rgba(45, 212, 191, 0.7)' : 'rgba(20, 184, 166, 0.7)',
          swarmLabel: isDark ? 'rgba(94, 234, 212, 0.9)' : 'rgba(19, 78, 74, 0.9)',
          edgeColor: isDark ? 'rgba(45, 212, 191, 0.25)' : 'rgba(20, 184, 166, 0.25)',
          edgeLabelColor: isDark ? 'rgba(94, 234, 212, 0.6)' : 'rgba(19, 78, 74, 0.6)',
          nodeColor: getUnifiedNodeColor(),
          nodeBorder: getUnifiedNodeBorder(),
          nodeLabel: getNodeLabel(),
          locationNodeColor: getUnifiedNodeColor(),
          locationNodeBorder: getUnifiedNodeBorder(),
          locationEdgeColor: isDark ? 'rgba(244, 114, 182, 0.3)' : 'rgba(236, 72, 153, 0.3)',
          annotationCircleFill: getAnnotationCircleFill(),
          annotationCircleBorder: getAnnotationCircleBorder(),
          selectedHighlight: getSelectedHighlight(),
        };
      case 'neutral':
      default:
        return {
          swarmFill: isDark ? 'rgba(156, 163, 175, 0.08)' : 'rgba(107, 114, 128, 0.08)',
          swarmBorder: isDark ? 'rgba(156, 163, 175, 0.4)' : 'rgba(107, 114, 128, 0.4)',
          swarmBorderHover: isDark ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)',
          swarmLabel: isDark ? 'rgba(229, 231, 235, 0.9)' : 'rgba(55, 65, 81, 0.9)',
          edgeColor: isDark ? 'rgba(156, 163, 175, 0.25)' : 'rgba(107, 114, 128, 0.25)',
          edgeLabelColor: isDark ? 'rgba(209, 213, 219, 0.6)' : 'rgba(75, 85, 99, 0.6)',
          nodeColor: getUnifiedNodeColor(),
          nodeBorder: getUnifiedNodeBorder(),
          nodeLabel: getNodeLabel(),
          locationNodeColor: getUnifiedNodeColor(),
          locationNodeBorder: getUnifiedNodeBorder(),
          locationEdgeColor: isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(139, 92, 246, 0.3)',
          annotationCircleFill: getAnnotationCircleFill(),
          annotationCircleBorder: getAnnotationCircleBorder(),
          selectedHighlight: getSelectedHighlight(),
        };
    }
  };

  const themeColors = getThemeColors();

  // Build hierarchical tree structure for locations
  const buildLocationTree = (
    locations: Location[],
    width: number,
    height: number,
    minRadius: number
  ): { nodes: Node[]; edges: Edge[] } => {
    if (locations.length === 0) {
      return { nodes: [], edges: [] };
    }

    const locationMap = new Map<string, Location>();
    locations.forEach(loc => locationMap.set(loc.id.toString(), loc));

    // Build parent-child relationships with sibling consistency
    const allParents = new Map<string, Set<string>>();
    const allChildren = new Map<string, Set<string>>();
    
    locations.forEach(loc => {
      const locId = loc.id.toString();
      
      // Initialize sets
      if (!allParents.has(locId)) allParents.set(locId, new Set());
      if (!allChildren.has(locId)) allChildren.set(locId, new Set());
      
      // Add explicit parent relationships
      loc.parentIds.forEach(parentId => {
        const parentIdStr = parentId.toString();
        allParents.get(locId)!.add(parentIdStr);
        if (!allChildren.has(parentIdStr)) allChildren.set(parentIdStr, new Set());
        allChildren.get(parentIdStr)!.add(locId);
      });
      
      // Add explicit child relationships
      loc.childIds.forEach(childId => {
        const childIdStr = childId.toString();
        allChildren.get(locId)!.add(childIdStr);
        if (!allParents.has(childIdStr)) allParents.set(childIdStr, new Set());
        allParents.get(childIdStr)!.add(locId);
      });
    });

    // Enforce sibling consistency
    locations.forEach(loc => {
      const locId = loc.id.toString();
      loc.siblingIds.forEach(siblingId => {
        const siblingIdStr = siblingId.toString();
        const siblingLoc = locationMap.get(siblingIdStr);
        if (siblingLoc) {
          const locParents = allParents.get(locId) || new Set();
          const siblingParents = allParents.get(siblingIdStr) || new Set();
          
          const combinedParents = new Set([...locParents, ...siblingParents]);
          allParents.set(locId, combinedParents);
          allParents.set(siblingIdStr, combinedParents);
          
          combinedParents.forEach(parentId => {
            if (!allChildren.has(parentId)) allChildren.set(parentId, new Set());
            allChildren.get(parentId)!.add(locId);
            allChildren.get(parentId)!.add(siblingIdStr);
          });
        }
      });
    });

    // Find root locations
    const rootLocations = locations.filter(loc => {
      const parents = allParents.get(loc.id.toString());
      return !parents || parents.size === 0;
    });

    // Build tree structure
    const buildTree = (locationId: string, level: number, visited: Set<string>): LocationTreeNode | null => {
      if (visited.has(locationId)) return null;
      visited.add(locationId);
      
      const location = locationMap.get(locationId);
      if (!location) return null;

      const childIds = allChildren.get(locationId) || new Set();
      const children: LocationTreeNode[] = [];
      
      childIds.forEach(childId => {
        const childNode = buildTree(childId, level + 1, visited);
        if (childNode) children.push(childNode);
      });

      return {
        location,
        children,
        level,
        x: 0,
        y: 0,
      };
    };

    const trees: LocationTreeNode[] = [];
    const visited = new Set<string>();
    
    rootLocations.forEach(root => {
      const tree = buildTree(root.id.toString(), 0, visited);
      if (tree) trees.push(tree);
    });

    locations.forEach(loc => {
      const locId = loc.id.toString();
      if (!visited.has(locId)) {
        const tree = buildTree(locId, 0, visited);
        if (tree) trees.push(tree);
      }
    });

    // Calculate tree layout
    const levelHeight = 80;
    const startY = height * 0.15;
    
    const countNodesAtLevel = (node: LocationTreeNode, levelCounts: Map<number, number>) => {
      const currentCount = levelCounts.get(node.level) || 0;
      levelCounts.set(node.level, currentCount + 1);
      node.children.forEach(child => countNodesAtLevel(child, levelCounts));
    };

    const levelCounts = new Map<number, number>();
    trees.forEach(tree => countNodesAtLevel(tree, levelCounts));

    const positionTree = (
      node: LocationTreeNode,
      xStart: number,
      xEnd: number,
      levelPositions: Map<number, number>
    ) => {
      const xCenter = (xStart + xEnd) / 2;
      const y = startY + node.level * levelHeight + minRadius;
      
      node.x = xCenter;
      node.y = y;

      if (node.children.length > 0) {
        const childWidth = (xEnd - xStart) / node.children.length;
        node.children.forEach((child, index) => {
          const childXStart = xStart + index * childWidth;
          const childXEnd = xStart + (index + 1) * childWidth;
          positionTree(child, childXStart, childXEnd, levelPositions);
        });
      }
    };

    const treeWidth = width * 0.8;
    const treeStartX = width * 0.1;
    const widthPerTree = trees.length > 0 ? treeWidth / trees.length : treeWidth;

    const levelPositions = new Map<number, number>();
    trees.forEach((tree, index) => {
      const xStart = treeStartX + index * widthPerTree;
      const xEnd = xStart + widthPerTree;
      positionTree(tree, xStart, xEnd, levelPositions);
    });

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const processedEdges = new Set<string>();

    const extractNodesAndEdges = (node: LocationTreeNode) => {
      const locationId = node.location.id.toString();
      
      newNodes.push({
        id: `location-${locationId}`,
        x: node.x,
        y: node.y,
        vx: 0,
        vy: 0,
        type: 'location',
        label: node.location.title,
        swarmId: '',
        approvalScore: 0,
      });

      node.children.forEach(child => {
        const childId = child.location.id.toString();
        const edgeKey = `${locationId}-${childId}`;
        
        if (!processedEdges.has(edgeKey)) {
          newEdges.push({
            from: `location-${locationId}`,
            to: `location-${childId}`,
            label: 'includes',
            approvalScore: 0,
            swarmId: '',
            type: 'location_hierarchy',
          });
          processedEdges.add(edgeKey);
        }
        
        extractNodesAndEdges(child);
      });
    };

    trees.forEach(tree => extractNodesAndEdges(tree));

    return { nodes: newNodes, edges: newEdges };
  };

  // Filter annotations
  useEffect(() => {
    const filteredAnnotations = filters.length > 0
      ? annotations.filter(annotation => {
          return filters.every(filter => {
            // Token filtering would go here when implemented
            
            let jurisdictionMatch = true;
            if (filter.jurisdiction) {
              const swarm = swarms.find(s => s.id === annotation.swarmId);
              jurisdictionMatch = swarm ? swarm.jurisdiction === filter.jurisdiction : false;
            }
            
            let propertyKeyMatch = true;
            if (filter.propertyKey) {
              const normalizedFilterKey = normalizeText(filter.propertyKey);
              propertyKeyMatch = annotation.properties.some(([key, _]) => normalizeText(key) === normalizedFilterKey);
            }
            
            let propertyValueMatch = true;
            if (filter.propertyValue) {
              const normalizedFilterValue = normalizeText(filter.propertyValue);
              propertyValueMatch = annotation.properties.some(([_, value]) => normalizeText(value) === normalizedFilterValue);
            }

            let locationMatch = true;
            if (filter.locationId !== undefined) {
              locationMatch = annotation.linkedLocationIds.some(locId => locId === filter.locationId);
            }
            
            return jurisdictionMatch && propertyKeyMatch && propertyValueMatch && locationMatch;
          });
        })
      : annotations;

    const swarmsWithAnnotations = new Set(filteredAnnotations.map(a => a.swarmId.toString()));
    const filteredSwarms = swarms.filter(swarm => 
      swarmsWithAnnotations.has(swarm.id.toString()) || filteredAnnotations.length === 0
    );

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const newEdges: Edge[] = [];
    const newSwarmBoundaries: SwarmBoundary[] = [];
    const newAnnotationCircles: AnnotationCircle[] = [];

    const swarmOrbitRadius = Math.min(width, height) * 0.28;

    filteredSwarms.forEach((swarm, swarmIndex) => {
      const swarmId = swarm.id.toString();
      const swarmAnnotations = filteredAnnotations.filter(a => a.swarmId.toString() === swarmId);
      
      const angle = (swarmIndex / filteredSwarms.length) * Math.PI * 2;
      const centerX = width / 2 + Math.cos(angle) * swarmOrbitRadius;
      const centerY = height / 2 + Math.sin(angle) * swarmOrbitRadius;

      if (swarmAnnotations.length === 0) {
        newSwarmBoundaries.push({
          id: swarmId,
          label: swarm.title,
          centerX,
          centerY,
          radius: 40,
        });
        return;
      }

      const annotationCount = swarmAnnotations.length;
      const baseRadius = 80;
      const radiusPerAnnotation = 20;
      const swarmRadius = Math.max(baseRadius, baseRadius + Math.sqrt(annotationCount) * radiusPerAnnotation);

      newSwarmBoundaries.push({
        id: swarmId,
        label: swarm.title,
        centerX,
        centerY,
        radius: swarmRadius,
      });

      swarmAnnotations.forEach((annotation, annotationIndex) => {
        const annotationAngle = (annotationIndex / swarmAnnotations.length) * Math.PI * 2;
        const annotationRadius = swarmRadius * 0.5;
        const annotationX = centerX + Math.cos(annotationAngle) * annotationRadius;
        const annotationY = centerY + Math.sin(annotationAngle) * annotationRadius;
        
        const circleRadius = 25;

        newAnnotationCircles.push({
          id: `annotation-${annotation.id}`,
          annotationId: annotation.id.toString(),
          x: annotationX,
          y: annotationY,
          radius: circleRadius,
          swarmId,
          content: annotation.content,
          approvalScore: Number(annotation.approvalScore),
        });
      });
    });

    let maxSwarmExtent = 0;
    newSwarmBoundaries.forEach(swarm => {
      const distFromCenter = Math.sqrt(
        Math.pow(swarm.centerX - width / 2, 2) + 
        Math.pow(swarm.centerY - height / 2, 2)
      );
      const swarmExtent = distFromCenter + swarm.radius;
      maxSwarmExtent = Math.max(maxSwarmExtent, swarmExtent);
    });

    const locationMargin = 50;
    const minLocationRadius = maxSwarmExtent + locationMargin;

    const { nodes: locationNodes, edges: locationEdges } = buildLocationTree(
      locations,
      width,
      height,
      minLocationRadius
    );

    filteredAnnotations.forEach((annotation) => {
      annotation.linkedLocationIds.forEach((locId) => {
        const annotationCircle = newAnnotationCircles.find(ac => ac.annotationId === annotation.id.toString());
        if (annotationCircle) {
          newEdges.push({
            from: annotationCircle.id,
            to: `location-${locId.toString()}`,
            label: 'linked_to',
            approvalScore: Number(annotation.approvalScore),
            swarmId: annotation.swarmId.toString(),
            type: 'location_link',
          });
        }
      });
    });

    setSwarmBoundaries(newSwarmBoundaries);
    setNodes(locationNodes);
    setAnnotationCircles(newAnnotationCircles);
    setEdges([...newEdges, ...locationEdges]);
  }, [swarms, annotations, locations, filters]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const hasNoData = swarmBoundaries.length === 0 && nodes.length === 0 && locations.length === 0;

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (hasNoData) return;

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);

    // Draw swarm boundaries
    swarmBoundaries.forEach(swarm => {
      const isHovered = hoveredSwarm?.id === swarm.id;
      
      ctx.beginPath();
      ctx.arc(swarm.centerX, swarm.centerY, swarm.radius, 0, Math.PI * 2);
      
      ctx.fillStyle = themeColors.swarmFill;
      ctx.fill();
      
      ctx.strokeStyle = isHovered ? themeColors.swarmBorderHover : themeColors.swarmBorder;
      ctx.lineWidth = isHovered ? 2 : 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = themeColors.swarmLabel;
      ctx.font = isHovered ? 'bold 13px Inter, sans-serif' : '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const truncated = swarm.label.length > 20 ? swarm.label.substring(0, 20) + '...' : swarm.label;
      ctx.fillText(truncated, swarm.centerX, swarm.centerY - swarm.radius - 15);
    });

    // Draw edges
    edges.forEach(edge => {
      let fromX = 0, fromY = 0, toX = 0, toY = 0;

      const fromAnnotation = annotationCircles.find(ac => ac.id === edge.from);
      const toAnnotation = annotationCircles.find(ac => ac.id === edge.to);
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (fromAnnotation) {
        fromX = fromAnnotation.x;
        fromY = fromAnnotation.y;
      } else if (fromNode) {
        fromX = fromNode.x;
        fromY = fromNode.y;
      } else {
        return;
      }

      if (toAnnotation) {
        toX = toAnnotation.x;
        toY = toAnnotation.y;
      } else if (toNode) {
        toX = toNode.x;
        toY = toNode.y;
      } else {
        return;
      }

      if (edge.type === 'location_link') {
        ctx.strokeStyle = themeColors.locationEdgeColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
      } else if (edge.type === 'location_hierarchy') {
        ctx.strokeStyle = themeColors.locationEdgeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      } else {
        const thickness = Math.max(1, Math.min(5, edge.approvalScore / 2));
        ctx.strokeStyle = themeColors.edgeColor;
        ctx.lineWidth = thickness;
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (edge.type === 'location_hierarchy') {
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        ctx.fillStyle = themeColors.locationEdgeColor;
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('includes', midX, midY);
      }
    });

    // Draw annotation circles
    annotationCircles.forEach(annotation => {
      const isSelected = selectedAnnotation?.id === annotation.id;
      const isHovered = hoveredAnnotation?.id === annotation.id;
      
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
      
      ctx.fillStyle = themeColors.annotationCircleFill;
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = themeColors.selectedHighlight;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = themeColors.annotationCircleBorder;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.setLineDash([2, 2]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = themeColors.nodeLabel;
      ctx.font = '7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const contentTrunc = annotation.content.length > 20 ? annotation.content.substring(0, 20) + '...' : annotation.content;
      ctx.fillText(contentTrunc, annotation.x, annotation.y);
    });

    // Draw location nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      
      const baseRadius = 12;
      const radius = baseRadius;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      
      ctx.fillStyle = themeColors.locationNodeColor;
      
      if (isHovered || isSelected) {
        ctx.shadowColor = themeColors.locationNodeBorder;
        ctx.shadowBlur = 10;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isSelected) {
        ctx.strokeStyle = themeColors.selectedHighlight;
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = themeColors.locationNodeBorder;
        ctx.lineWidth = isHovered ? 2.5 : 2;
      }
      ctx.stroke();

      ctx.fillStyle = themeColors.nodeLabel;
      ctx.font = (isHovered || isSelected) 
        ? 'bold 11px Inter, sans-serif'
        : '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const truncated = node.label.length > 18 ? node.label.substring(0, 18) + '...' : node.label;
      ctx.fillText(truncated, node.x, node.y + radius + 5, 120);
    });

    ctx.restore();
  }, [nodes, annotationCircles, edges, swarmBoundaries, hoveredNode, hoveredSwarm, hoveredAnnotation, selectedNode, selectedAnnotation, themeColors, scale, panOffset, locations.length]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) {
      return;
    }
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(4, prev * delta)));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / scale;
    const y = (e.clientY - rect.top - panOffset.y) / scale;
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggedNode) {
      return;
    }

    const hoveredAnnotationFound = annotationCircles.find(annotation => {
      const dx = annotation.x - x;
      const dy = annotation.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= annotation.radius;
    });

    setHoveredAnnotation(hoveredAnnotationFound || null);

    if (!hoveredAnnotationFound) {
      const hoveredNodeFound = nodes.find(node => {
        const baseRadius = 12;
        const dx = node.x - x;
        const dy = node.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= baseRadius;
      });

      setHoveredNode(hoveredNodeFound || null);

      if (!hoveredNodeFound) {
        const hoveredSwarmFound = swarmBoundaries.find(swarm => {
          const dx = swarm.centerX - x;
          const dy = swarm.centerY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist <= swarm.radius && dist >= swarm.radius - 20;
        });
        setHoveredSwarm(hoveredSwarmFound || null);
      } else {
        setHoveredSwarm(null);
      }
    } else {
      setHoveredNode(null);
      setHoveredSwarm(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  const handleClick = () => {
    if (draggedNode || isPanning) return;
    
    if (hoveredAnnotation && onAnnotationClick) {
      setSelectedAnnotation(hoveredAnnotation);
      setSelectedNode(null);
      onAnnotationClick(hoveredAnnotation.annotationId);
    } else if (hoveredNode) {
      setSelectedNode(hoveredNode);
      setSelectedAnnotation(null);
      
      if (hoveredNode.type === 'location' && onLocationClick) {
        const locationId = hoveredNode.id.replace('location-', '');
        onLocationClick(locationId);
      } else if (onEntityClick) {
        onEntityClick(hoveredNode.label);
      }
    } else if (hoveredSwarm && onSwarmClick) {
      setSelectedNode(null);
      setSelectedAnnotation(null);
      onSwarmClick(hoveredSwarm.id);
    } else {
      setSelectedNode(null);
      setSelectedAnnotation(null);
    }
  };

  const hasNoData = swarmBoundaries.length === 0 && nodes.length === 0 && locations.length === 0;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${hasNoData ? 'cursor-default' : isPanning ? 'cursor-grabbing' : 'cursor-pointer'}`}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNode(null);
          setHoveredSwarm(null);
          setHoveredAnnotation(null);
          setDraggedNode(null);
          setIsPanning(false);
        }}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {hasNoData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
          <Network className="h-16 w-16 mb-4 opacity-20 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 text-foreground">No data to visualize yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create your first notebook and annotations to see them visualized in the graph
          </p>
        </div>
      )}
      
      {hoveredAnnotation && !hasNoData && (
        <div
          className="absolute pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm max-w-xs z-50"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredAnnotation.content}
          </div>
          <div className="text-xs text-muted-foreground">
            Annotation (click to view details)
          </div>
          {hoveredAnnotation.approvalScore > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              👍 {hoveredAnnotation.approvalScore} approval score
            </div>
          )}
        </div>
      )}

      {hoveredNode && !hoveredAnnotation && !hasNoData && (
        <div
          className="absolute pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm max-w-xs z-50"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="font-semibold mb-1">{hoveredNode.label}</div>
          <div className="text-xs text-muted-foreground">
            Location (click to view details)
          </div>
        </div>
      )}

      {hoveredSwarm && !hoveredNode && !hoveredAnnotation && !hasNoData && (
        <div
          className="absolute pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm max-w-xs z-50"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="font-semibold mb-1">{hoveredSwarm.label}</div>
          <div className="text-xs text-muted-foreground">Swarm (click to view details)</div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded">
        Shift+Scroll to zoom • Shift+drag to pan • Click to select
      </div>
    </div>
  );
}
