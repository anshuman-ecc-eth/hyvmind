import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import type { InterpretationToken } from '../backend';

interface SchemaBuilderFilterModalProps {
  interpretationTokens: InterpretationToken[];
  nodeNameMap: Map<string, string>;
  onOpenTokenModal: (token: InterpretationToken) => void;
}

type SortOption = 'name' | 'creationDate' | 'contextLength';

interface InterpretationTokenItemProps {
  token: InterpretationToken;
  fromNodeName: string;
  toNodeName: string;
  onOpenModal: () => void;
}

function InterpretationTokenItem({ token, fromNodeName, toNodeName, onOpenModal }: InterpretationTokenItemProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md p-3 hover:bg-muted transition-colors cursor-pointer border border-border"
      onClick={onOpenModal}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-muted text-foreground border-border text-xs">
          interpretationToken
        </Badge>
        <span className="text-sm font-medium">{token.title}</span>
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1 ml-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">From:</span>
          <span>{fromNodeName}</span>
          <Badge variant="outline" className="text-xs">{token.fromRelationshipType}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">To:</span>
          <span>{toNodeName}</span>
          <Badge variant="outline" className="text-xs">{token.toRelationshipType}</Badge>
        </div>
      </div>

      {token.context && (
        <div className="text-xs text-muted-foreground ml-2 line-clamp-2">
          {token.context}
        </div>
      )}

      {token.customAttributes.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-2">
          {token.customAttributes.map((attr, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {attr.key}: {attr.value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaBuilderFilterModal({
  interpretationTokens,
  nodeNameMap,
  onOpenTokenModal,
}: SchemaBuilderFilterModalProps) {
  const [open, setOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedFromNodes, setSelectedFromNodes] = useState<Set<string>>(new Set());
  const [selectedToNodes, setSelectedToNodes] = useState<Set<string>>(new Set());

  // Reset filters when modal reopens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSortOption('name');
      setSelectedTags(new Set());
      setSelectedFromNodes(new Set());
      setSelectedToNodes(new Set());
    }
    setOpen(newOpen);
  };

  const handleResetFilters = () => {
    setSortOption('name');
    setSelectedTags(new Set());
    setSelectedFromNodes(new Set());
    setSelectedToNodes(new Set());
  };

  const handleTagToggle = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const handleFromNodeToggle = (nodeId: string) => {
    const newNodes = new Set(selectedFromNodes);
    if (newNodes.has(nodeId)) {
      newNodes.delete(nodeId);
    } else {
      newNodes.add(nodeId);
    }
    setSelectedFromNodes(newNodes);
  };

  const handleToNodeToggle = (nodeId: string) => {
    const newNodes = new Set(selectedToNodes);
    if (newNodes.has(nodeId)) {
      newNodes.delete(nodeId);
    } else {
      newNodes.add(nodeId);
    }
    setSelectedToNodes(newNodes);
  };

  // Extract all unique tags and node connections
  const { allTags, allFromNodes, allToNodes } = useMemo(() => {
    const tags = new Set<string>();
    const fromNodes = new Map<string, string>();
    const toNodes = new Map<string, string>();

    interpretationTokens.forEach(token => {
      token.customAttributes.forEach(attr => {
        if (attr.key.toLowerCase() === 'tag' || attr.key.toLowerCase() === 'tags') {
          tags.add(attr.value);
        }
      });

      fromNodes.set(token.fromTokenId, nodeNameMap.get(token.fromTokenId) || 'Unknown');
      toNodes.set(token.toNodeId, nodeNameMap.get(token.toNodeId) || 'Unknown');
    });

    return {
      allTags: Array.from(tags).sort(),
      allFromNodes: Array.from(fromNodes.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      allToNodes: Array.from(toNodes.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [interpretationTokens, nodeNameMap]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = [...interpretationTokens];

    // Apply tag filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter(token => {
        const tokenTags = token.customAttributes
          .filter(attr => attr.key.toLowerCase() === 'tag' || attr.key.toLowerCase() === 'tags')
          .map(attr => attr.value);
        return Array.from(selectedTags).every(selectedTag => tokenTags.includes(selectedTag));
      });
    }

    // Apply from node filter
    if (selectedFromNodes.size > 0) {
      filtered = filtered.filter(token => selectedFromNodes.has(token.fromTokenId));
    }

    // Apply to node filter
    if (selectedToNodes.size > 0) {
      filtered = filtered.filter(token => selectedToNodes.has(token.toNodeId));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'creationDate':
          // Assuming newer tokens have higher IDs (timestamp-based)
          return b.id.localeCompare(a.id);
        case 'contextLength':
          return (b.context?.length || 0) - (a.context?.length || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [interpretationTokens, selectedTags, selectedFromNodes, selectedToNodes, sortOption]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filter & Sort</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Filter & Sort Schema Builder</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Reset Filters
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sort By</label>
            <div className="flex gap-2">
              <Button
                variant={sortOption === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('name')}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Name
              </Button>
              <Button
                variant={sortOption === 'creationDate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('creationDate')}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Creation Date
              </Button>
              <Button
                variant={sortOption === 'contextLength' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('contextLength')}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Context Length
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Filter by Tags (select multiple - tokens must have ALL selected tags)
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags available</p>
              ) : (
                allTags.map(tag => (
                  <div key={tag} className="flex items-center gap-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={selectedTags.has(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <label
                      htmlFor={`tag-${tag}`}
                      className="text-sm cursor-pointer hover:text-accent-foreground"
                    >
                      {tag}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Filter by From Node
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allFromNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No from nodes available</p>
              ) : (
                allFromNodes.map(([nodeId, nodeName]) => (
                  <div key={nodeId} className="flex items-center gap-2">
                    <Checkbox
                      id={`from-${nodeId}`}
                      checked={selectedFromNodes.has(nodeId)}
                      onCheckedChange={() => handleFromNodeToggle(nodeId)}
                    />
                    <label
                      htmlFor={`from-${nodeId}`}
                      className="text-sm cursor-pointer hover:text-accent-foreground"
                    >
                      {nodeName}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Filter by To Node
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allToNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No to nodes available</p>
              ) : (
                allToNodes.map(([nodeId, nodeName]) => (
                  <div key={nodeId} className="flex items-center gap-2">
                    <Checkbox
                      id={`to-${nodeId}`}
                      checked={selectedToNodes.has(nodeId)}
                      onCheckedChange={() => handleToNodeToggle(nodeId)}
                    />
                    <label
                      htmlFor={`to-${nodeId}`}
                      className="text-sm cursor-pointer hover:text-accent-foreground"
                    >
                      {nodeName}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {filteredAndSortedTokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No interpretation tokens match the current filters
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing {filteredAndSortedTokens.length} interpretation token{filteredAndSortedTokens.length !== 1 ? 's' : ''}
                  </div>
                  {filteredAndSortedTokens.map((token) => (
                    <InterpretationTokenItem
                      key={token.id}
                      token={token}
                      fromNodeName={nodeNameMap.get(token.fromTokenId) || 'Unknown'}
                      toNodeName={nodeNameMap.get(token.toNodeId) || 'Unknown'}
                      onOpenModal={() => {
                        setOpen(false);
                        onOpenTokenModal(token);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
