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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Filter, Link2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { GraphData } from "../backend";

interface FilterSortModalProps {
  graphData: GraphData | undefined;
  sharedLawTokenIds: Set<string>;
  lawTokenLocationMap: Map<string, string[]>;
  locationLawTokenSequenceMap: Map<string, string>;
  curationNameMap: Map<string, string>;
}

type NodeType =
  | "all"
  | "curation"
  | "swarm"
  | "location"
  | "lawToken"
  | "interpretationToken";
type SortOption = "alphabetical" | "creationDate" | "modificationDate";

interface FlatNode {
  id: string;
  nodeType: string;
  tokenLabel: string;
  jurisdiction?: string;
  parentId?: string;
  createdAt?: number;
  modifiedAt?: number;
  tags?: string[];
  attributes?: Array<{ key: string; value: string }>;
  parentCurationName?: string;
  lawTokenSequence?: string;
  isSharedLawToken?: boolean;
  linkedLocationsCount?: number;
}

function FlatNodeItem({
  node,
  sharedLawTokenIds,
  lawTokenLocationMap,
  locationLawTokenSequenceMap,
  curationNameMap,
}: {
  node: FlatNode;
  sharedLawTokenIds: Set<string>;
  lawTokenLocationMap: Map<string, string[]>;
  locationLawTokenSequenceMap: Map<string, string>;
  curationNameMap: Map<string, string>;
}) {
  const isSharedLawToken =
    node.nodeType === "lawToken" && sharedLawTokenIds.has(node.id);
  const linkedLocations =
    node.nodeType === "lawToken" ? lawTokenLocationMap.get(node.id) || [] : [];
  const lawTokenSequence =
    node.nodeType === "location"
      ? locationLawTokenSequenceMap.get(node.id) || ""
      : "";
  const parentCurationName =
    node.nodeType === "swarm" && node.parentId
      ? curationNameMap.get(node.parentId)
      : null;

  const getNodeColor = (type: string) => {
    switch (type) {
      case "curation":
      case "swarm":
      case "location":
      case "lawToken":
      case "interpretationToken":
        return "bg-muted text-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 rounded-md p-3 hover:bg-muted transition-colors ${
        isSharedLawToken ? "bg-muted/50 border-l-2 border-foreground" : ""
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={`${getNodeColor(node.nodeType)} text-xs`}
        >
          {node.nodeType}
        </Badge>

        <span className="text-sm font-medium">{node.tokenLabel}</span>

        {node.nodeType === "curation" && node.jurisdiction && (
          <Badge
            variant="outline"
            className="text-xs bg-muted text-foreground border-border"
          >
            {node.jurisdiction}
          </Badge>
        )}

        {node.nodeType === "swarm" && parentCurationName && (
          <Badge
            variant="outline"
            className="text-xs bg-muted text-muted-foreground border-border"
            title={`Parent Curation: ${parentCurationName}`}
          >
            {parentCurationName}
          </Badge>
        )}

        {isSharedLawToken && (
          <Badge
            variant="default"
            className="text-xs flex items-center gap-1 bg-foreground text-background"
          >
            <Link2 className="h-3 w-3" />
            Use Count: {linkedLocations.length}
          </Badge>
        )}
      </div>

      {lawTokenSequence && (
        <div className="text-xs text-muted-foreground font-mono ml-2 mt-1">
          {lawTokenSequence}
        </div>
      )}
    </div>
  );
}

export default function FilterSortModal({
  graphData,
  sharedLawTokenIds,
  lawTokenLocationMap,
  locationLawTokenSequenceMap,
  curationNameMap,
}: FilterSortModalProps) {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NodeType>("all");
  const [attributeKey, setAttributeKey] = useState<string>("all");
  const [attributeValue, setAttributeValue] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  // Reset filters when modal reopens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTypeFilter("all");
      setAttributeKey("all");
      setAttributeValue("all");
      setSelectedTags(new Set());
      setSortOption("alphabetical");
    }
    setOpen(newOpen);
  };

  const handleResetFilters = () => {
    setTypeFilter("all");
    setAttributeKey("all");
    setAttributeValue("all");
    setSelectedTags(new Set());
    setSortOption("alphabetical");
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

  // Extract all unique attribute keys and values
  const { attributeKeys, attributeValuesByKey, allTags } = useMemo(() => {
    const keys = new Set<string>();
    const valuesByKey = new Map<string, Set<string>>();
    const tags = new Set<string>();

    if (graphData) {
      for (const loc of graphData.locations) {
        for (const attr of loc.customAttributes) {
          keys.add(attr.key);
          if (!valuesByKey.has(attr.key)) {
            valuesByKey.set(attr.key, new Set());
          }
          valuesByKey.get(attr.key)!.add(attr.value);
        }
      }

      for (const token of graphData.interpretationTokens) {
        for (const attr of token.customAttributes) {
          keys.add(attr.key);
          if (!valuesByKey.has(attr.key)) {
            valuesByKey.set(attr.key, new Set());
          }
          valuesByKey.get(attr.key)!.add(attr.value);
        }
      }

      for (const swarm of graphData.swarms) {
        for (const tag of swarm.tags) tags.add(tag);
      }
    }

    return {
      attributeKeys: Array.from(keys).sort(),
      attributeValuesByKey: valuesByKey,
      allTags: Array.from(tags).sort(),
    };
  }, [graphData]);

  // Get available values for selected attribute key
  const availableAttributeValues = useMemo(() => {
    if (attributeKey === "all") return [];
    return Array.from(attributeValuesByKey.get(attributeKey) || []).sort();
  }, [attributeKey, attributeValuesByKey]);

  // Flatten all nodes from the graph data
  const allFlatNodes = useMemo(() => {
    if (!graphData) return [];

    const nodes: FlatNode[] = [];

    // Add curations
    for (const curation of graphData.curations) {
      nodes.push({
        id: curation.id,
        nodeType: "curation",
        tokenLabel: curation.name,
        jurisdiction: curation.jurisdiction,
        createdAt: Date.now(),
      });
    }

    // Add swarms
    for (const swarm of graphData.swarms) {
      nodes.push({
        id: swarm.id,
        nodeType: "swarm",
        tokenLabel: swarm.name,
        parentId: swarm.parentCurationId,
        tags: swarm.tags,
        createdAt: Date.now(),
      });
    }

    // Add locations
    for (const location of graphData.locations) {
      nodes.push({
        id: location.id,
        nodeType: "location",
        tokenLabel: location.title,
        parentId: location.parentSwarmId,
        attributes: location.customAttributes,
        createdAt: Date.now(),
      });
    }

    // Add law tokens
    for (const lawToken of graphData.lawTokens) {
      nodes.push({
        id: lawToken.id,
        nodeType: "lawToken",
        tokenLabel: lawToken.tokenLabel,
        parentId: lawToken.parentLocationId,
        createdAt: Date.now(),
      });
    }

    // Add interpretation tokens
    for (const token of graphData.interpretationTokens) {
      nodes.push({
        id: token.id,
        nodeType: "interpretationToken",
        tokenLabel: token.title,
        parentId: token.fromTokenId,
        attributes: token.customAttributes,
        createdAt: Date.now(),
      });
    }

    return nodes;
  }, [graphData]);

  // Filter and sort nodes - generate flat list when filters are applied
  const filteredAndSortedNodes = useMemo(() => {
    if (!graphData) return [];

    let filtered = [...allFlatNodes];

    // Check if any filters are active
    const hasActiveFilters =
      typeFilter !== "all" ||
      (attributeKey !== "all" && attributeValue !== "all") ||
      selectedTags.size > 0;

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((node) => node.nodeType === typeFilter);
    }

    // Apply attribute filter
    if (attributeKey !== "all" && attributeValue !== "all") {
      filtered = filtered.filter((node) => {
        if (!node.attributes) return false;
        return node.attributes.some(
          (attr) => attr.key === attributeKey && attr.value === attributeValue,
        );
      });
    }

    // Apply tag filter (multiple tags - node must have ALL selected tags)
    if (selectedTags.size > 0) {
      filtered = filtered.filter((node) => {
        if (!node.tags || node.tags.length === 0) return false;
        // Check if node has all selected tags
        return Array.from(selectedTags).every((selectedTag) =>
          node.tags!.includes(selectedTag),
        );
      });
    }

    // When filters are active, exclude parent nodes if they don't match the filter
    // This creates a flat list of only matching nodes
    if (hasActiveFilters) {
      // Remove parent nodes (Curations, Swarms) when filtering for lower-level nodes
      if (
        typeFilter === "location" ||
        typeFilter === "lawToken" ||
        typeFilter === "interpretationToken"
      ) {
        filtered = filtered.filter((node) => node.nodeType === typeFilter);
      }
      // When filtering by attributes, only show nodes with attributes (locations and interpretation tokens)
      if (attributeKey !== "all" && attributeValue !== "all") {
        filtered = filtered.filter(
          (node) =>
            node.nodeType === "location" ||
            node.nodeType === "interpretationToken",
        );
      }
      // When filtering by tags, only show swarms
      if (selectedTags.size > 0) {
        filtered = filtered.filter((node) => node.nodeType === "swarm");
      }
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "alphabetical":
          return a.tokenLabel.localeCompare(b.tokenLabel);
        case "creationDate":
          return (b.createdAt || 0) - (a.createdAt || 0);
        case "modificationDate":
          return (
            (b.modifiedAt || b.createdAt || 0) -
            (a.modifiedAt || a.createdAt || 0)
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    allFlatNodes,
    typeFilter,
    attributeKey,
    attributeValue,
    selectedTags,
    sortOption,
    graphData,
  ]);

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
            <p>Filter and Sort</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Filter & Sort</DialogTitle>
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

        <div className="flex-shrink-0 grid grid-cols-3 gap-3 py-4">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Type
            </span>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as NodeType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="curation">Curation</SelectItem>
                <SelectItem value="swarm">Swarm</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="lawToken">Law Token</SelectItem>
                <SelectItem value="interpretationToken">
                  Interpretation Token
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Attribute Key
            </span>
            <Select
              value={attributeKey}
              onValueChange={(value) => {
                setAttributeKey(value);
                setAttributeValue("all");
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                {attributeKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Attribute Value
            </span>
            <Select
              value={attributeValue}
              onValueChange={setAttributeValue}
              disabled={attributeKey === "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Values</SelectItem>
                {availableAttributeValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Tags (select multiple - nodes must have ALL selected tags)
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
            {selectedTags.size > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground">Selected:</span>
                {Array.from(selectedTags).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pb-4 border-b">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Sort By
            </span>
            <div className="flex gap-2">
              <Button
                variant={sortOption === "alphabetical" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOption("alphabetical")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Alphabetical
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
                variant={
                  sortOption === "modificationDate" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSortOption("modificationDate")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Modification Date
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {filteredAndSortedNodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No nodes match the current filters
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing {filteredAndSortedNodes.length} matching node
                    {filteredAndSortedNodes.length !== 1 ? "s" : ""}
                  </div>
                  {filteredAndSortedNodes.map((node) => (
                    <FlatNodeItem
                      key={node.id}
                      node={node}
                      sharedLawTokenIds={sharedLawTokenIds}
                      lawTokenLocationMap={lawTokenLocationMap}
                      locationLawTokenSequenceMap={locationLawTokenSequenceMap}
                      curationNameMap={curationNameMap}
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
