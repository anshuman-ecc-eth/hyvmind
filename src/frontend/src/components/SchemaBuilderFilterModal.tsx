import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { InterpretationToken } from "../backend";

interface SchemaBuilderFilterModalProps {
  interpretationTokens: InterpretationToken[];
  nodeNameMap: Map<string, string>;
  onOpenTokenModal: (token: InterpretationToken) => void;
}

type SortOption = "name" | "creationDate" | "contentLength";

interface InterpretationTokenItemProps {
  token: InterpretationToken;
  parentLawTokenName: string;
  onOpenModal: () => void;
}

function InterpretationTokenItem({
  token,
  parentLawTokenName,
  onOpenModal,
}: InterpretationTokenItemProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: interactive element
    <div
      className="flex flex-col gap-2 rounded-md p-3 hover:bg-muted transition-colors cursor-pointer border border-border"
      onClick={onOpenModal}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border text-xs"
        >
          interpretationToken
        </Badge>
        <span className="text-sm font-medium">{token.title}</span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 ml-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Parent Law Token:</span>
          <span>{parentLawTokenName}</span>
        </div>
      </div>

      {token.content && (
        <div className="text-xs text-muted-foreground ml-2 line-clamp-2">
          {token.content}
        </div>
      )}

      {token.customAttributes.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-2">
          {token.customAttributes.map((attr) => (
            <Badge
              key={`${attr.key}-${attr.value}`}
              variant="secondary"
              className="text-xs"
            >
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
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedParentNodes, setSelectedParentNodes] = useState<Set<string>>(
    new Set(),
  );

  // Reset filters when modal reopens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSortOption("name");
      setSelectedTags(new Set());
      setSelectedParentNodes(new Set());
    }
    setOpen(newOpen);
  };

  const handleResetFilters = () => {
    setSortOption("name");
    setSelectedTags(new Set());
    setSelectedParentNodes(new Set());
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

  const handleParentNodeToggle = (nodeId: string) => {
    const newNodes = new Set(selectedParentNodes);
    if (newNodes.has(nodeId)) {
      newNodes.delete(nodeId);
    } else {
      newNodes.add(nodeId);
    }
    setSelectedParentNodes(newNodes);
  };

  // Extract all unique tags and parent law tokens
  const { allTags, allParentNodes } = useMemo(() => {
    const tags = new Set<string>();
    const parentNodes = new Map<string, string>();

    // biome-ignore lint/complexity/noForEach: imperative code
    interpretationTokens.forEach((token) => {
      // biome-ignore lint/complexity/noForEach: imperative code
      token.customAttributes.forEach((attr) => {
        if (
          attr.key.toLowerCase() === "tag" ||
          attr.key.toLowerCase() === "tags"
        ) {
          tags.add(attr.value);
        }
      });

      parentNodes.set(
        token.parentLawTokenId,
        nodeNameMap.get(token.parentLawTokenId) || "Unknown",
      );
    });

    return {
      allTags: Array.from(tags).sort(),
      allParentNodes: Array.from(parentNodes.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    };
  }, [interpretationTokens, nodeNameMap]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = [...interpretationTokens];

    // Apply tag filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter((token) => {
        const tokenTags = token.customAttributes
          .filter(
            (attr) =>
              attr.key.toLowerCase() === "tag" ||
              attr.key.toLowerCase() === "tags",
          )
          .map((attr) => attr.value);
        return Array.from(selectedTags).every((selectedTag) =>
          tokenTags.includes(selectedTag),
        );
      });
    }

    // Apply parent node filter
    if (selectedParentNodes.size > 0) {
      filtered = filtered.filter((token) =>
        selectedParentNodes.has(token.parentLawTokenId),
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name":
          return a.title.localeCompare(b.title);
        case "creationDate":
          return b.id.localeCompare(a.id);
        case "contentLength":
          return (b.content?.length || 0) - (a.content?.length || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [interpretationTokens, selectedTags, selectedParentNodes, sortOption]);

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
            <span className="text-xs font-medium text-muted-foreground">
              Sort By
            </span>
            <div className="flex gap-2">
              <Button
                variant={sortOption === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("name")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Name
              </Button>
              <Button
                variant={sortOption === "creationDate" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("creationDate")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Creation Date
              </Button>
              <Button
                variant={sortOption === "contentLength" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("contentLength")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Content Length
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by Tags (select multiple - tokens must have ALL selected
              tags)
            </span>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tags available
                </p>
              ) : (
                allTags.map((tag) => (
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
            <span className="text-xs font-medium text-muted-foreground">
              Filter by Parent Law Token
            </span>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allParentNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No parent law tokens available
                </p>
              ) : (
                allParentNodes.map(([nodeId, nodeName]) => (
                  <div key={nodeId} className="flex items-center gap-2">
                    <Checkbox
                      id={`parent-${nodeId}`}
                      checked={selectedParentNodes.has(nodeId)}
                      onCheckedChange={() => handleParentNodeToggle(nodeId)}
                    />
                    <label
                      htmlFor={`parent-${nodeId}`}
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
                    Showing {filteredAndSortedTokens.length} interpretation
                    token{filteredAndSortedTokens.length !== 1 ? "s" : ""}
                  </div>
                  {filteredAndSortedTokens.map((token) => (
                    <InterpretationTokenItem
                      key={token.id}
                      token={token}
                      parentLawTokenName={
                        nodeNameMap.get(token.parentLawTokenId) || "Unknown"
                      }
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
