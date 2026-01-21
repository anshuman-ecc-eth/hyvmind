import { useGetGraphData, useGetVoteData } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Loader2, Plus, Link2, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { GraphNode, VoteData } from '../backend';
import SwarmMembershipButton from '../components/SwarmMembershipButton';
import CreateNodeDialog from '../components/CreateNodeDialog';
import VotingButtons from '../components/VotingButtons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface TreeNodeProps {
  node: GraphNode;
  level: number;
  sharedLawTokenIds: Set<string>;
  lawTokenLocationMap: Map<string, string[]>;
  locationLawTokenSequenceMap: Map<string, string>;
  curationNameMap: Map<string, string>;
}

function TreeNode({ node, level, sharedLawTokenIds, lawTokenLocationMap, locationLawTokenSequenceMap, curationNameMap }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSharedLawToken = node.nodeType === 'lawToken' && sharedLawTokenIds.has(node.id);
  const linkedLocations = node.nodeType === 'lawToken' ? lawTokenLocationMap.get(node.id) || [] : [];
  const lawTokenSequence = node.nodeType === 'location' ? locationLawTokenSequenceMap.get(node.id) || '' : '';
  const parentCurationName = node.nodeType === 'swarm' && node.parentId ? curationNameMap.get(node.parentId) : null;

  const getNodeColor = (type: string) => {
    // Monochrome badge styling
    switch (type) {
      case 'curation':
        return 'bg-muted text-foreground border-border';
      case 'swarm':
        return 'bg-muted text-foreground border-border';
      case 'location':
        return 'bg-muted text-foreground border-border';
      case 'lawToken':
        return 'bg-muted text-foreground border-border';
      case 'interpretationToken':
        return 'bg-muted text-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Determine if this node type should show a create button
  const getCreateConfig = () => {
    switch (node.nodeType) {
      case 'curation':
        return { show: true, nodeType: 'swarm' as const, parentId: node.id };
      case 'swarm':
        return { show: true, nodeType: 'location' as const, parentId: node.id };
      case 'lawToken':
        return { show: true, nodeType: 'interpretationToken' as const, parentId: node.id };
      default:
        return { show: false, nodeType: null, parentId: null };
    }
  };

  const createConfig = getCreateConfig();

  return (
    <div className="space-y-1">
      <div
        className={`flex flex-col gap-1 rounded-md p-2 hover:bg-muted transition-colors ${
          isSharedLawToken ? 'bg-muted/50 border-l-2 border-foreground' : ''
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="cursor-pointer flex items-center gap-2 flex-1"
            onClick={() => hasChildren && setExpanded(!expanded)}
          >
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )
            ) : (
              <div className="h-4 w-4 flex-shrink-0" />
            )}
            
            <Badge variant="outline" className={`${getNodeColor(node.nodeType)} text-xs`}>
              {node.nodeType}
            </Badge>
            
            <span className="text-sm font-medium truncate">{node.tokenLabel}</span>
            
            {node.nodeType === 'curation' && node.jurisdiction && (
              <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                {node.jurisdiction}
              </Badge>
            )}
            
            {node.nodeType === 'swarm' && parentCurationName && (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border" title={`Parent Curation: ${parentCurationName}`}>
                {parentCurationName}
              </Badge>
            )}
            
            {isSharedLawToken && (
              <Badge variant="default" className="text-xs flex items-center gap-1 bg-foreground text-background" title={`This law token is used by ${linkedLocations.length} locations`}>
                <Link2 className="h-3 w-3" />
                Use Count: {linkedLocations.length}
              </Badge>
            )}
            
            {hasChildren && (
              <span className="text-xs text-muted-foreground ml-auto">
                ({node.children.length})
              </span>
            )}
          </div>

          <VotingButtons nodeId={node.id} nodeType={node.nodeType} compact interactive />

          {node.nodeType === 'swarm' && (
            <SwarmMembershipButton swarmId={node.id} />
          )}

          {createConfig.show && createConfig.nodeType && (
            <CreateNodeDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              }
              defaultNodeType={createConfig.nodeType}
              defaultParentId={createConfig.parentId || undefined}
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
            />
          )}
        </div>

        {lawTokenSequence && (
          <div 
            className="text-xs text-muted-foreground font-mono ml-6"
            style={{ paddingLeft: `${level * 1.5}rem` }}
          >
            {lawTokenSequence}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1}
              sharedLawTokenIds={sharedLawTokenIds}
              lawTokenLocationMap={lawTokenLocationMap}
              locationLawTokenSequenceMap={locationLawTokenSequenceMap}
              curationNameMap={curationNameMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DiscardedNodeItemProps {
  nodeId: string;
  label: string;
  type: string;
}

function DiscardedNodeItem({ nodeId, label, type }: DiscardedNodeItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
      <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
        {type}
      </Badge>
      <span className="text-sm flex-1 truncate">{label}</span>
      <VotingButtons nodeId={nodeId} nodeType={type} compact interactive />
    </div>
  );
}

interface DiscardedNode {
  id: string;
  label: string;
  type: string;
}

// Hook to collect all node IDs from the tree (excluding curations)
function useAllNodeIds(rootNodes: GraphNode[]): string[] {
  return useMemo(() => {
    const nodeIds: string[] = [];
    
    const collectIds = (node: GraphNode) => {
      // Skip curations as they cannot be voted on
      if (node.nodeType !== 'curation') {
        nodeIds.push(node.id);
      }
      node.children.forEach(collectIds);
    };
    
    rootNodes.forEach(collectIds);
    return nodeIds;
  }, [rootNodes]);
}

// Hook to fetch all vote data for nodes
function useAllVoteData(nodeIds: string[]) {
  // Fetch vote data for all nodes
  const voteQueries = nodeIds.map(nodeId => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useGetVoteData(nodeId);
  });

  // Check if all queries are loaded
  const allLoaded = voteQueries.every(q => !q.isLoading);
  
  // Build a map of nodeId -> VoteData
  const voteDataMap = useMemo(() => {
    const map = new Map<string, VoteData>();
    nodeIds.forEach((nodeId, index) => {
      const voteData = voteQueries[index].data;
      if (voteData) {
        map.set(nodeId, voteData);
      }
    });
    return map;
  }, [nodeIds, voteQueries]);

  return { voteDataMap, allLoaded };
}

export default function TreeView() {
  const { data: graphData, isLoading } = useGetGraphData();
  const [discardedOpen, setDiscardedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Collect all node IDs (excluding curations)
  const allNodeIds = useAllNodeIds(graphData?.rootNodes || []);
  
  // Fetch all vote data
  const { voteDataMap, allLoaded: voteDataLoaded } = useAllVoteData(allNodeIds);

  // Build curation name map
  const curationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (graphData?.curations) {
      graphData.curations.forEach(curation => {
        map.set(curation.id, curation.name);
      });
    }
    return map;
  }, [graphData]);

  // Filter nodes based on vote data
  const { filteredRootNodes, discardedNodes } = useMemo(() => {
    if (!graphData || !voteDataLoaded) {
      return { filteredRootNodes: graphData?.rootNodes || [], discardedNodes: [] };
    }

    const discarded: DiscardedNode[] = [];

    // Helper to check if a node is discarded
    const isDiscarded = (nodeId: string, nodeType: string): boolean => {
      // Curations can never be discarded as they cannot be voted on
      if (nodeType === 'curation') return false;

      const voteData = voteDataMap.get(nodeId);
      if (!voteData) return false;
      
      const upvotes = Number(voteData.upvotes);
      const downvotes = Number(voteData.downvotes);
      
      // Node is discarded only if downvotes > upvotes (strictly more)
      return downvotes > upvotes;
    };

    // Recursively filter nodes and collect discarded ones
    const filterNode = (node: GraphNode): GraphNode | null => {
      // Check if this node is discarded
      if (isDiscarded(node.id, node.nodeType)) {
        discarded.push({
          id: node.id,
          label: node.tokenLabel,
          type: node.nodeType,
        });
        return null;
      }

      // Filter children recursively
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is GraphNode => child !== null);

      return {
        ...node,
        children: filteredChildren,
      };
    };

    // Filter all root nodes
    const filtered = graphData.rootNodes
      .map(node => filterNode(node))
      .filter((node): node is GraphNode => node !== null);

    return { filteredRootNodes: filtered, discardedNodes: discarded };
  }, [graphData, voteDataMap, voteDataLoaded]);

  const handleExport = async () => {
    if (!graphData) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const dataToExport = {
        curations: graphData.curations,
        swarms: graphData.swarms,
        locations: graphData.locations,
        lawTokens: graphData.lawTokens,
        interpretationTokens: graphData.interpretationTokens,
        edges: graphData.edges,
        exportDate: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hyvmind-tree-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Tree data exported successfully');
    } catch (error) {
      toast.error('Failed to export tree data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !voteDataLoaded) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!graphData || graphData.rootNodes.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No nodes yet. Create your first curation to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build a map of law token ID to all locations that reference it
  const lawTokenLocationMap = new Map<string, string[]>();
  graphData.edges.forEach(edge => {
    const location = graphData.locations.find(a => a.id === edge.source);
    const lawToken = graphData.lawTokens.find(t => t.id === edge.target);
    
    if (location && lawToken) {
      if (!lawTokenLocationMap.has(lawToken.id)) {
        lawTokenLocationMap.set(lawToken.id, []);
      }
      lawTokenLocationMap.get(lawToken.id)!.push(location.id);
    }
  });

  // Build a map of location ID to original law token sequence
  const locationLawTokenSequenceMap = new Map<string, string>();
  graphData.locations.forEach(location => {
    if (location.originalTokenSequence) {
      locationLawTokenSequenceMap.set(location.id, location.originalTokenSequence);
    }
  });

  // Identify shared law tokens (law tokens with multiple locations)
  const sharedLawTokenIds = new Set<string>();
  lawTokenLocationMap.forEach((locations, lawTokenId) => {
    if (locations.length > 1) {
      sharedLawTokenIds.add(lawTokenId);
    }
  });

  // Group discarded nodes by type (curations will never appear here)
  const discardedByType = discardedNodes.reduce((acc, node) => {
    if (!acc[node.type]) {
      acc[node.type] = [];
    }
    acc[node.type].push(node);
    return acc;
  }, {} as Record<string, DiscardedNode[]>);

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-8rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hierarchical View</CardTitle>
              {sharedLawTokenIds.size > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {sharedLawTokenIds.size} shared law token{sharedLawTokenIds.size !== 1 ? 's' : ''} detected (highlighted with border)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="hover:bg-accent hover:text-accent-foreground"
                title="Export tree data"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full tree-view-scroll">
              <div className="space-y-2 pr-4">
                {filteredRootNodes.map((node) => (
                  <TreeNode 
                    key={node.id} 
                    node={node} 
                    level={0}
                    sharedLawTokenIds={sharedLawTokenIds}
                    lawTokenLocationMap={lawTokenLocationMap}
                    locationLawTokenSequenceMap={locationLawTokenSequenceMap}
                    curationNameMap={curationNameMap}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {discardedNodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex-shrink-0">
              <Collapsible open={discardedOpen} onOpenChange={setDiscardedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between hover:bg-muted">
                    <span className="flex items-center gap-2">
                      {discardedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold">Discarded Nodes</span>
                      <Badge variant="outline" className="bg-muted text-foreground">
                        {discardedNodes.length}
                      </Badge>
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ScrollArea className="max-h-60">
                    <div className="space-y-3">
                      {['swarm', 'location', 'lawToken', 'interpretationToken'].map((type) => {
                        const nodesOfType = discardedByType[type] || [];

                        if (nodesOfType.length === 0) return null;

                        return (
                          <div key={type} className="space-y-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase">{type}</h4>
                            {nodesOfType.map(node => (
                              <DiscardedNodeItem
                                key={node.id}
                                nodeId={node.id}
                                label={node.label}
                                type={node.type}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
