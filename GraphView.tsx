import { useEffect, useRef, useState } from 'react';
import { useGetGraphData } from '../hooks/useQueries';
import { NodeType, RelationType } from '../backend';
import { Node, Relation } from '../types';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronUp, Filter, Download, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface GraphNode extends Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface ForceConfig {
  chargeStrength: number;
  linkDistance: number;
  collisionRadius: number;
  lineWidth: number;
  nodeSize: number;
}

interface NodeColors {
  [NodeType.curation]: string;
  [NodeType.swarm]: string;
  [NodeType.annotation]: string;
  [NodeType.token]: string;
}

interface FilterState {
  nodeTypes: Set<NodeType>;
  relationTypes: Set<RelationType>;
}

const DEFAULT_COLORS: NodeColors = {
  [NodeType.curation]: '#d4a017',    // Gold
  [NodeType.swarm]: '#10b981',       // Green
  [NodeType.annotation]: '#9b59b6',  // Purple
  [NodeType.token]: '#3b82f6',       // Distinct blue for tokens
};

// Relation colors - standardized to two types only
const RETRIEVAL_COLOR = '#d4a017'; // Gold for retrieval (solid lines)
const REASONING_COLOR = '#20b2aa'; // Teal for reasoning (dotted lines)

// Debounce delay for initial render stabilization (ms)
const INITIAL_RENDER_DELAY = 150;

export default function GraphView() {
  const { data: graphData, isLoading, error } = useGetGraphData();
  const { theme, systemTheme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);
  const [forceControlsOpen, setForceControlsOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const animationRef = useRef<number | undefined>(undefined);
  const isDraggingNodeRef = useRef<GraphNode | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRenderReady, setIsRenderReady] = useState(false);
  const renderTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Determine if dark mode is active
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  // Default values set to 50% of slider range
  const [forceConfig, setForceConfig] = useState<ForceConfig>(() => {
    const saved = localStorage.getItem('graphForceConfig');
    return saved ? JSON.parse(saved) : {
      chargeStrength: -525, // 50% of range (50-1000)
      linkDistance: 175,    // 50% of range (50-300)
      collisionRadius: 55,  // 50% of range (10-100)
      lineWidth: 2,         // Default line width
      nodeSize: 8,          // Default node size
    };
  });

  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('graphFilters');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        nodeTypes: new Set(parsed.nodeTypes as NodeType[]),
        relationTypes: new Set(parsed.relationTypes as RelationType[]),
      };
    }
    return {
      nodeTypes: new Set<NodeType>([NodeType.curation, NodeType.swarm, NodeType.annotation, NodeType.token]),
      relationTypes: new Set<RelationType>([RelationType.retrieval, RelationType.reasoning]),
    };
  });

  const [nodeColors] = useState<NodeColors>(() => {
    const saved = localStorage.getItem('graphNodeColors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
  });

  useEffect(() => {
    localStorage.setItem('graphForceConfig', JSON.stringify(forceConfig));
  }, [forceConfig]);

  useEffect(() => {
    localStorage.setItem('graphFilters', JSON.stringify({
      nodeTypes: Array.from(filters.nodeTypes),
      relationTypes: Array.from(filters.relationTypes),
    }));
  }, [filters]);

  const toggleNodeTypeFilter = (nodeType: NodeType) => {
    setFilters(prev => {
      const newTypes = new Set(prev.nodeTypes);
      if (newTypes.has(nodeType)) {
        newTypes.delete(nodeType);
      } else {
        newTypes.add(nodeType);
      }
      return { ...prev, nodeTypes: newTypes };
    });
  };

  const toggleRelationTypeFilter = (relationType: RelationType) => {
    setFilters(prev => {
      const newTypes = new Set(prev.relationTypes);
      if (newTypes.has(relationType)) {
        newTypes.delete(relationType);
      } else {
        newTypes.add(relationType);
      }
      return { ...prev, relationTypes: newTypes };
    });
  };

  // Helper function to get node title with fallback
  const getNodeTitle = (node: Node): string => {
    if (node.title && node.title.trim() !== '') {
      return node.title;
    }
    // Fallback placeholder for missing titles
    return `[${node.nodeType}]`;
  };

  // Helper to determine relation type from backend data
  const getRelationType = (relation: Relation): RelationType => {
    // Use the relationType directly from the backend
    return relation.relationType;
  };

  // Deduplicate annotations: keep only highest-ranked annotation per name within each swarm
  const deduplicateAnnotations = (nodes: Node[]): { dedupedNodes: Node[]; duplicateMap: Map<bigint, bigint> } => {
    const dedupedNodes: Node[] = [];
    const duplicateMap = new Map<bigint, bigint>(); // Maps filtered-out annotation IDs to their visible representative
    
    // Group annotations by swarm and name
    const annotationsBySwarmAndName = new Map<string, Node[]>();
    
    nodes.forEach(node => {
      if (node.nodeType === NodeType.annotation && node.swarmId !== undefined) {
        const key = `${node.swarmId.toString()}_${node.title}`;
        if (!annotationsBySwarmAndName.has(key)) {
          annotationsBySwarmAndName.set(key, []);
        }
        annotationsBySwarmAndName.get(key)!.push(node);
      }
    });
    
    // For each group, sort by verification ratio and keep only the highest
    const visibleAnnotationIds = new Set<bigint>();
    
    annotationsBySwarmAndName.forEach((group) => {
      if (group.length > 1) {
        // Sort by verification ratio (descending)
        const sorted = group.sort((a, b) => {
          const ratioA = Number(a.downvotes) > 0 
            ? Number(a.upvotes) / Number(a.downvotes) 
            : Number(a.upvotes);
          const ratioB = Number(b.downvotes) > 0 
            ? Number(b.upvotes) / Number(b.downvotes) 
            : Number(b.upvotes);
          return ratioB - ratioA;
        });
        
        // Keep the highest-ranked annotation
        const representative = sorted[0];
        visibleAnnotationIds.add(representative.id);
        
        // Map all filtered-out duplicates to the representative
        for (let i = 1; i < sorted.length; i++) {
          duplicateMap.set(sorted[i].id, representative.id);
        }
      } else if (group.length === 1) {
        // Single annotation, no duplicates
        visibleAnnotationIds.add(group[0].id);
      }
    });
    
    // Build deduplicated node list
    nodes.forEach(node => {
      if (node.nodeType === NodeType.annotation) {
        // Only include annotations that are visible (not filtered out as duplicates)
        if (visibleAnnotationIds.has(node.id)) {
          dedupedNodes.push(node);
        }
      } else {
        // Include all non-annotation nodes
        dedupedNodes.push(node);
      }
    });
    
    return { dedupedNodes, duplicateMap };
  };

  // Redirect relations from filtered-out duplicates to their visible representatives
  const redirectRelations = (relations: Relation[], duplicateMap: Map<bigint, bigint>): Relation[] => {
    return relations.map(relation => {
      let sourceId = relation.sourceNodeId;
      let targetId = relation.targetNodeId;
      
      // Redirect source if it's a filtered-out duplicate
      if (duplicateMap.has(sourceId)) {
        sourceId = duplicateMap.get(sourceId)!;
      }
      
      // Redirect target if it's a filtered-out duplicate
      if (duplicateMap.has(targetId)) {
        targetId = duplicateMap.get(targetId)!;
      }
      
      // Return relation with potentially redirected IDs
      if (sourceId !== relation.sourceNodeId || targetId !== relation.targetNodeId) {
        return {
          ...relation,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
        };
      }
      
      return relation;
    });
  };

  // Export functions
  const exportToJSONLD = () => {
    if (!graphData) {
      toast.error('No graph data to export');
      return;
    }

    // Convert to JSON-LD format
    const jsonLD = {
      '@context': {
        '@vocab': 'http://schema.org/',
        'hyvmind': 'http://hyvmind.io/ontology/',
      },
      '@graph': [
        ...graphData.nodes.map(node => ({
          '@id': `hyvmind:node/${node.id}`,
          '@type': `hyvmind:${node.nodeType}`,
          'name': node.title,
          'bracketedTokenSequence': node.bracketedTokenSequence,
          'owner': node.owner.toString(),
          'createdAt': new Date(Number(node.createdAt) / 1000000).toISOString(),
          'immutable': node.immutable,
          ...(node.parentId !== undefined && { 'parentId': `hyvmind:node/${node.parentId}` }),
          ...(node.swarmId !== undefined && { 'swarmId': `hyvmind:node/${node.swarmId}` }),
        })),
        ...graphData.relations.map(relation => ({
          '@id': `hyvmind:relation/${relation.id}`,
          '@type': 'hyvmind:Relation',
          'sourceNode': `hyvmind:node/${relation.sourceNodeId}`,
          'targetNode': `hyvmind:node/${relation.targetNodeId}`,
          'relationType': relation.relationType,
          'owner': relation.owner.toString(),
          'createdAt': new Date(Number(relation.createdAt) / 1000000).toISOString(),
        })),
      ],
    };

    const dataStr = JSON.stringify(jsonLD, null, 2);
    const blob = new Blob([dataStr], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-data-${new Date().toISOString().split('T')[0]}.jsonld`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Graph data exported as JSON-LD');
  };

  const exportToCSV = () => {
    if (!graphData) {
      toast.error('No graph data to export');
      return;
    }

    // Export nodes
    const nodeHeaders = ['id', 'nodeType', 'title', 'bracketedTokenSequence', 'parentId', 'swarmId', 'owner', 'createdAt', 'immutable'];
    const nodeRows = graphData.nodes.map(node => [
      node.id.toString(),
      node.nodeType,
      `"${node.title.replace(/"/g, '""')}"`,
      `"${node.bracketedTokenSequence.replace(/"/g, '""')}"`,
      node.parentId !== undefined ? node.parentId.toString() : '',
      node.swarmId !== undefined ? node.swarmId.toString() : '',
      node.owner.toString(),
      new Date(Number(node.createdAt) / 1000000).toISOString(),
      node.immutable.toString(),
    ]);
    const nodesCsv = [nodeHeaders.join(','), ...nodeRows.map(row => row.join(','))].join('\n');

    // Export relations
    const relationHeaders = ['id', 'sourceNodeId', 'targetNodeId', 'relationType', 'owner', 'createdAt'];
    const relationRows = graphData.relations.map(relation => [
      relation.id.toString(),
      relation.sourceNodeId.toString(),
      relation.targetNodeId.toString(),
      relation.relationType,
      relation.owner.toString(),
      new Date(Number(relation.createdAt) / 1000000).toISOString(),
    ]);
    const relationsCsv = [relationHeaders.join(','), ...relationRows.map(row => row.join(','))].join('\n');

    // Combine both CSVs
    const combinedCsv = `# Nodes\n${nodesCsv}\n\n# Relations\n${relationsCsv}`;

    const blob = new Blob([combinedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Graph data exported as CSV');
  };

  // Import function
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.jsonld')) {
          const importedData = JSON.parse(content);
          
          // Handle JSON-LD format
          if (importedData['@graph']) {
            toast.info('JSON-LD import detected. Note: Data will be merged with existing graph visually only (backend import not implemented).');
            // Visual merge would happen here
          } else {
            toast.error('Invalid JSON-LD format. Expected @graph property.');
          }
        } else if (file.name.endsWith('.csv')) {
          toast.info('CSV import detected. Note: Data will be merged with existing graph visually only (backend import not implemented).');
          // CSV parsing would happen here
        } else {
          toast.error('Unsupported file format. Please use JSON-LD or CSV.');
        }
      } catch (error) {
        toast.error('Failed to parse file: ' + (error as Error).message);
      }
    };

    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  // Initialize graph nodes with stable pre-simulation and annotation deduplication
  useEffect(() => {
    if (!graphData?.nodes || graphData.nodes.length === 0) {
      setNodes([]);
      setIsInitialized(false);
      setIsRenderReady(false);
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    // Deduplicate annotations for Graph View
    const { dedupedNodes, duplicateMap } = deduplicateAnnotations(graphData.nodes);
    
    // Redirect relations to visible annotation representatives
    const redirectedRelations = redirectRelations(graphData.relations || [], duplicateMap);

    const graphNodes: GraphNode[] = dedupedNodes.map((node, i) => {
      const angle = (i / dedupedNodes.length) * 2 * Math.PI;
      const radius = 150;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    // Pre-run simulation for stable initialization
    let simulationNodes = graphNodes.map(n => ({ ...n }));
    
    for (let i = 0; i < 100; i++) {
      // Apply forces without rendering
      simulationNodes = applyForcesStatic(simulationNodes, redirectedRelations, centerX, centerY, forceConfig);
    }

    setNodes(simulationNodes);
    setIsInitialized(true);
    
    // Debounce render to ensure titles are ready
    setIsRenderReady(false);
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      setIsRenderReady(true);
    }, INITIAL_RENDER_DELAY);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [graphData]);

  // Static force application for pre-simulation
  const applyForcesStatic = (
    currentNodes: GraphNode[],
    relations: Relation[],
    centerX: number,
    centerY: number,
    config: ForceConfig
  ): GraphNode[] => {
    const newNodes = currentNodes.map((node) => ({ ...node }));

    // Center force
    newNodes.forEach((node) => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * 0.01;
      node.vy += dy * 0.01;
    });

    // Charge force (repulsion)
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const dx = newNodes[j].x - newNodes[i].x;
        const dy = newNodes[j].y - newNodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = config.chargeStrength / (distance * distance);

        newNodes[i].vx -= (dx / distance) * force;
        newNodes[i].vy -= (dy / distance) * force;
        newNodes[j].vx += (dx / distance) * force;
        newNodes[j].vy += (dy / distance) * force;
      }
    }

    // Link force
    relations.forEach((relation) => {
      const source = newNodes.find((n) => n.id === relation.sourceNodeId);
      const target = newNodes.find((n) => n.id === relation.targetNodeId);

      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDistance = config.linkDistance;
        const force = (distance - targetDistance) * 0.1;

        source.vx += (dx / distance) * force;
        source.vy += (dy / distance) * force;
        target.vx -= (dx / distance) * force;
        target.vy -= (dy / distance) * force;
      }
    });

    // Collision force
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const dx = newNodes[j].x - newNodes[i].x;
        const dy = newNodes[j].y - newNodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = config.collisionRadius * 2;

        if (distance < minDistance && distance > 0) {
          const force = (minDistance - distance) / distance * 0.5;
          newNodes[i].vx -= dx * force;
          newNodes[i].vy -= dy * force;
          newNodes[j].vx += dx * force;
          newNodes[j].vy += dy * force;
        }
      }
    }

    // Apply velocity and damping
    newNodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.9;
      node.vy *= 0.9;
    });

    return newNodes;
  };

  // Animation loop for force simulation
  useEffect(() => {
    if (nodes.length === 0 || !isInitialized || !graphData) return;

    // Get deduplicated and redirected relations for animation
    const { duplicateMap } = deduplicateAnnotations(graphData.nodes);
    const redirectedRelations = redirectRelations(graphData.relations || [], duplicateMap);

    const animate = () => {
      applyForces(redirectedRelations);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, graphData, forceConfig, isInitialized]);

  const applyForces = (relations: Relation[]) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    setNodes((prevNodes) => {
      const newNodes = prevNodes.map((node) => ({ ...node }));

      // Center force
      newNodes.forEach((node) => {
        if (node.fx === undefined) {
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.vx += dx * 0.01;
          node.vy += dy * 0.01;
        }
      });

      // Charge force (repulsion between nodes)
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const dx = newNodes[j].x - newNodes[i].x;
          const dy = newNodes[j].y - newNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = forceConfig.chargeStrength / (distance * distance);

          if (newNodes[i].fx === undefined) {
            newNodes[i].vx -= (dx / distance) * force;
            newNodes[i].vy -= (dy / distance) * force;
          }
          if (newNodes[j].fx === undefined) {
            newNodes[j].vx += (dx / distance) * force;
            newNodes[j].vy += (dy / distance) * force;
          }
        }
      }

      // Link force (attraction along edges)
      relations.forEach((relation) => {
        const source = newNodes.find((n) => n.id === relation.sourceNodeId);
        const target = newNodes.find((n) => n.id === relation.targetNodeId);

        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDistance = forceConfig.linkDistance;
          const force = (distance - targetDistance) * 0.1;

          if (source.fx === undefined) {
            source.vx += (dx / distance) * force;
            source.vy += (dy / distance) * force;
          }
          if (target.fx === undefined) {
            target.vx -= (dx / distance) * force;
            target.vy -= (dy / distance) * force;
          }
        }
      });

      // Collision force
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const dx = newNodes[j].x - newNodes[i].x;
          const dy = newNodes[j].y - newNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = forceConfig.collisionRadius * 2;

          if (distance < minDistance && distance > 0) {
            const force = (minDistance - distance) / distance * 0.5;
            if (newNodes[i].fx === undefined) {
              newNodes[i].vx -= dx * force;
              newNodes[i].vy -= dy * force;
            }
            if (newNodes[j].fx === undefined) {
              newNodes[j].vx += dx * force;
              newNodes[j].vy += dy * force;
            }
          }
        }
      }

      // Apply velocity and damping
      newNodes.forEach((node) => {
        if (node.fx === undefined) {
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.9;
          node.vy *= 0.9;
        } else {
          node.x = node.fx;
          node.y = node.fy!;
        }
      });

      return newNodes;
    });
  };

  const getConnectedNodeIds = (nodeId: bigint): Set<bigint> => {
    if (!graphData) return new Set();
    
    // Get deduplicated relations
    const { duplicateMap } = deduplicateAnnotations(graphData.nodes);
    const redirectedRelations = redirectRelations(graphData.relations || [], duplicateMap);
    
    const connected = new Set<bigint>();
    connected.add(nodeId);
    
    redirectedRelations.forEach(relation => {
      if (relation.sourceNodeId === nodeId) {
        connected.add(relation.targetNodeId);
      }
      if (relation.targetNodeId === nodeId) {
        connected.add(relation.sourceNodeId);
      }
    });
    
    return connected;
  };

  const isNodeVisible = (node: GraphNode): boolean => {
    return filters.nodeTypes.has(node.nodeType);
  };

  const isRelationVisible = (relation: Relation): boolean => {
    const relType = getRelationType(relation);
    return filters.relationTypes.has(relType);
  };

  const getRelationColor = (relation: Relation): string => {
    const relType = getRelationType(relation);
    return relType === RelationType.retrieval ? RETRIEVAL_COLOR : REASONING_COLOR;
  };

  const getNodeColor = (nodeType: NodeType): string => {
    return nodeColors[nodeType];
  };

  const screenToSVG = (screenX: number, screenY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (screenX - rect.left - transform.x) / transform.scale,
      y: (screenY - rect.top - transform.y) / transform.scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = screenToSVG(e.clientX, e.clientY);
    
    // Check if clicking on a node
    const clickedNode = nodes.find((node) => {
      if (!isNodeVisible(node)) return false;
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < forceConfig.nodeSize + 4;
    });

    if (clickedNode) {
      isDraggingNodeRef.current = clickedNode;
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === clickedNode.id ? { ...n, fx: n.x, fy: n.y } : n
        )
      );
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingNodeRef.current) {
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === isDraggingNodeRef.current!.id
            ? { ...n, x, y, fx: x, fy: y, vx: 0, vy: 0 }
            : n
        )
      );
    } else if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNodeRef.current) {
      const nodeId = isDraggingNodeRef.current.id;
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === nodeId) {
            const { fx, fy, ...rest } = n;
            return rest;
          }
          return n;
        })
      );
      isDraggingNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleNodeClick = (node: GraphNode) => {
    if (focusedNode?.id === node.id) {
      setFocusedNode(null);
      setSelectedNode(null);
    } else {
      setFocusedNode(node);
      setSelectedNode(node);
    }
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.3) }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setFocusedNode(null);
    setSelectedNode(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, prev.scale * delta)),
    }));
  };

  // Get theme-aware colors with improved contrast for light mode
  const canvasBackgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const nodeStrokeColor = isDarkMode ? '#ffffff' : '#000000';
  const nodeHoverStrokeColor = isDarkMode ? '#d4a017' : '#8b6914';
  const textStrokeColor = isDarkMode ? 'none' : '#ffffff';
  const textStrokeWidth = isDarkMode ? 0 : 1;

  // Determine cursor style based on interaction state
  const getCursorStyle = () => {
    if (isPanningRef.current) return 'grabbing';
    if (isDraggingNodeRef.current) return 'grabbing';
    return ''; // Will use CSS class for theme-aware crosshair
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#d4a017] border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 bg-background">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load graph data: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <Filter className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No Graph Data</h3>
            <p className="text-sm text-muted-foreground">
              Create curations, swarms, and annotations to see them visualized here with force-directed layout.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const connectedNodeIds = focusedNode ? getConnectedNodeIds(focusedNode.id) : null;
  const visibleNodes = nodes.filter(isNodeVisible);
  
  // Get deduplicated and redirected relations for rendering
  const { duplicateMap } = deduplicateAnnotations(graphData.nodes);
  const redirectedRelations = redirectRelations(graphData.relations || [], duplicateMap);
  const visibleRelations = redirectedRelations.filter(isRelationVisible);

  const retrievalCount = redirectedRelations.filter(r => getRelationType(r) === RelationType.retrieval).length;
  const reasoningCount = redirectedRelations.filter(r => getRelationType(r) === RelationType.reasoning).length;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ backgroundColor: canvasBackgroundColor }}>
      <svg
        ref={svgRef}
        className={`w-full h-full ${getCursorStyle() ? '' : 'theme-cursor-crosshair'}`}
        style={{ 
          cursor: getCursorStyle() || undefined,
          shapeRendering: 'crispEdges'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Render links - standardized to solid (retrieval) and dotted (reasoning) */}
          {isRenderReady && visibleRelations.map((relation, idx) => {
            const source = nodes.find((n) => n.id === relation.sourceNodeId);
            const target = nodes.find((n) => n.id === relation.targetNodeId);
            if (!source || !target) return null;
            if (!isNodeVisible(source) || !isNodeVisible(target)) return null;

            const relType = getRelationType(relation);
            const isConnected = connectedNodeIds 
              ? (connectedNodeIds.has(source.id) && connectedNodeIds.has(target.id))
              : true;
            const opacity = connectedNodeIds ? (isConnected ? 0.9 : 0.1) : 0.8;

            // Retrieval: solid lines, Reasoning: dotted lines
            const strokeDasharray = relType === RelationType.reasoning ? '4,4' : '0';

            return (
              <line
                key={`${relation.id.toString()}-${idx}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={getRelationColor(relation)}
                strokeWidth={forceConfig.lineWidth}
                strokeDasharray={strokeDasharray}
                opacity={opacity}
                style={{ shapeRendering: 'crispEdges' }}
              />
            );
          })}

          {/* Render nodes with crisp edges and proper contrast */}
          {visibleNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isFocused = focusedNode?.id === node.id;
            const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : true;
            const opacity = connectedNodeIds ? (isConnected ? 1 : 0.15) : 1;
            const radius = isSelected ? forceConfig.nodeSize + 4 : forceConfig.nodeSize;
            
            // Get node title
            const nodeTitle = getNodeTitle(node);

            return (
              <g
                key={node.id.toString()}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
                opacity={opacity}
              >
                <circle
                  r={radius}
                  fill={getNodeColor(node.nodeType)}
                  stroke={isFocused ? nodeHoverStrokeColor : nodeStrokeColor}
                  strokeWidth={isFocused ? 3 : 2}
                  style={{ shapeRendering: 'crispEdges' }}
                />
                {/* Text labels with minimal stroke for sharp rendering */}
                {isRenderReady && (
                  <text
                    y={radius + 15}
                    textAnchor="middle"
                    fontSize={isSelected ? '12px' : '11px'}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fill={textColor}
                    stroke={textStrokeColor}
                    strokeWidth={textStrokeWidth}
                    paintOrder="stroke"
                    style={{ shapeRendering: 'crispEdges' }}
                  >
                    {nodeTitle}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleReset} title="Reset view">
          <Maximize2 className="h-4 w-4" />
        </Button>
        
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" title="Export graph data">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToJSONLD}>
              Export as JSON-LD
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV}>
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import button */}
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={handleImportClick}
          title="Import graph data"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonld,.csv"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md bg-card border border-border rounded-lg p-4 shadow-lg z-10">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="bg-muted">{selectedNode.nodeType}</Badge>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-card-foreground">{getNodeTitle(selectedNode)}</h3>
              {selectedNode.bracketedTokenSequence && selectedNode.bracketedTokenSequence.trim() && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedNode.bracketedTokenSequence}</p>
              )}
              {focusedNode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Click again to clear focus
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control panels container */}
      <div className="absolute top-4 left-4 flex flex-col gap-3 w-72 z-10" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Force controls */}
        <Card className="shadow-lg flex-shrink-0">
          <Collapsible open={forceControlsOpen} onOpenChange={setForceControlsOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="text-sm font-semibold">Forces</CardTitle>
                  {forceControlsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label className="text-xs">Charge strength</Label>
                  <Slider
                    value={[Math.abs(forceConfig.chargeStrength)]}
                    onValueChange={([value]) => setForceConfig(prev => ({ ...prev, chargeStrength: -value }))}
                    min={50}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Link distance</Label>
                  <Slider
                    value={[forceConfig.linkDistance]}
                    onValueChange={([value]) => setForceConfig(prev => ({ ...prev, linkDistance: value }))}
                    min={50}
                    max={300}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Node collision radius</Label>
                  <Slider
                    value={[forceConfig.collisionRadius]}
                    onValueChange={([value]) => setForceConfig(prev => ({ ...prev, collisionRadius: value }))}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Relation line width</Label>
                  <Slider
                    value={[forceConfig.lineWidth]}
                    onValueChange={([value]) => setForceConfig(prev => ({ ...prev, lineWidth: value }))}
                    min={0.5}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Node size</Label>
                  <Slider
                    value={[forceConfig.nodeSize]}
                    onValueChange={([value]) => setForceConfig(prev => ({ ...prev, nodeSize: value }))}
                    min={4}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Filter controls */}
        <Card className="shadow-lg flex flex-col min-h-0 overflow-hidden">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CardHeader className="pb-3 flex-shrink-0">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <CardTitle className="text-sm font-semibold">Filters</CardTitle>
                  </div>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent className="flex-1 min-h-0">
              <ScrollArea className="h-full max-h-[40vh]">
                <CardContent className="space-y-4 pt-0 pr-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Node Types</Label>
                    {[NodeType.curation, NodeType.swarm, NodeType.annotation, NodeType.token].map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`node-${type}`}
                          checked={filters.nodeTypes.has(type)}
                          onCheckedChange={() => toggleNodeTypeFilter(type)}
                        />
                        <label
                          htmlFor={`node-${type}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                            style={{ backgroundColor: nodeColors[type] }}
                          />
                          <span className="capitalize">{type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Relation Types</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="relation-retrieval"
                        checked={filters.relationTypes.has(RelationType.retrieval)}
                        onCheckedChange={() => toggleRelationTypeFilter(RelationType.retrieval)}
                      />
                      <label
                        htmlFor="relation-retrieval"
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <div 
                          className="h-0.5 w-6 rounded flex-shrink-0" 
                          style={{ backgroundColor: RETRIEVAL_COLOR }}
                        />
                        <span>Retrieval ({retrievalCount})</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="relation-reasoning"
                        checked={filters.relationTypes.has(RelationType.reasoning)}
                        onCheckedChange={() => toggleRelationTypeFilter(RelationType.reasoning)}
                      />
                      <label
                        htmlFor="relation-reasoning"
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <svg width="24" height="2" className="flex-shrink-0">
                          <line 
                            x1="0" 
                            y1="1" 
                            x2="24" 
                            y2="1" 
                            stroke={REASONING_COLOR} 
                            strokeWidth="2" 
                            strokeDasharray="4,4"
                          />
                        </svg>
                        <span>Reasoning ({reasoningCount})</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
}
