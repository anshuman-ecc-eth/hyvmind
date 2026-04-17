import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Link2,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { GraphNode, InterpretationToken } from "../backend";
import FilterSortModal from "../components/FilterSortModal";
import SchemaBuilderFilterModal from "../components/SchemaBuilderFilterModal";
import { useGetOwnedData } from "../hooks/useQueries";

interface TreeNodeProps {
  node: GraphNode;
  level: number;
  sharedLawTokenIds: Set<string>;
  lawTokenLocationMap: Map<string, string[]>;
  locationLawTokenSequenceMap: Map<string, string>;
  curationNameMap: Map<string, string>;
}

function TreeNode({
  node,
  level,
  sharedLawTokenIds,
  lawTokenLocationMap,
  locationLawTokenSequenceMap,
  curationNameMap,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;
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
    <div className="space-y-1">
      <div
        className={`flex flex-col gap-1 rounded-md p-2 hover:bg-muted transition-colors ${
          isSharedLawToken ? "bg-muted/50 border-l-2 border-foreground" : ""
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center gap-2">
          <div
            // biome-ignore lint/a11y/useSemanticElements: preserving layout structure
            role="button"
            tabIndex={0}
            className="cursor-pointer flex items-center gap-2 flex-1"
            onClick={() => hasChildren && setExpanded(!expanded)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              hasChildren &&
              setExpanded(!expanded)
            }
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

            <Badge
              variant="outline"
              className={`${getNodeColor(node.nodeType)} text-xs`}
            >
              {node.nodeType}
            </Badge>

            <span className="text-sm font-medium truncate">
              {node.tokenLabel}
            </span>

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
                title={`This law token is used by ${linkedLocations.length} locations`}
              >
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

interface InterpretationTokenItemProps {
  token: InterpretationToken;
  onOpenModal: () => void;
}

function InterpretationTokenItem({
  token,
  onOpenModal,
}: InterpretationTokenItemProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md p-3 hover:bg-muted transition-colors cursor-pointer border border-border"
      onClick={onOpenModal}
      onKeyDown={(e) => e.key === "Enter" && onOpenModal()}
      // biome-ignore lint/a11y/useSemanticElements: preserving layout structure
      role="button"
      tabIndex={0}
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

      {token.customAttributes.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-2">
          {token.customAttributes.map((attr) => (
            <Badge key={attr.key} variant="secondary" className="text-xs">
              {attr.key}: {attr.weightedValues.map((wv) => wv.value).join(", ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView() {
  const { data: graphData, isLoading: graphLoading } = useGetOwnedData();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedToken, setSelectedToken] =
    useState<InterpretationToken | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // Build curation name map
  const curationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (graphData?.curations) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.curations.forEach((curation) => {
        map.set(curation.id, curation.name);
      });
    }
    return map;
  }, [graphData]);

  // Build node name map for all nodes
  const nodeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (graphData) {
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.curations.forEach((c) => map.set(c.id, c.name));
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.swarms.forEach((s) => map.set(s.id, s.name));
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.locations.forEach((l) => map.set(l.id, l.title));
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.lawTokens.forEach((t) => map.set(t.id, t.tokenLabel));
      // biome-ignore lint/complexity/noForEach: imperative code
      graphData.interpretationTokens.forEach((t) => map.set(t.id, t.title));
    }
    return map;
  }, [graphData]);

  const filteredRootNodes = graphData?.rootNodes || [];

  const handleExport = async () => {
    if (!graphData) {
      toast.error("No data to export");
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
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hyvmind-tree-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Tree data exported successfully");
    } catch (error) {
      toast.error("Failed to export tree data");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenTokenModal = (token: InterpretationToken) => {
    setSelectedToken(token);
    setTokenModalOpen(true);
  };

  if (graphLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">Loading tree data...</p>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.rootNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No nodes yet. Publish a source graph from the Sources tab to get
              started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build a map of law token ID to all locations that reference it
  const lawTokenLocationMap = new Map<string, string[]>();
  // biome-ignore lint/complexity/noForEach: imperative code
  graphData.edges.forEach((edge) => {
    const location = graphData.locations.find((a) => a.id === edge.source);
    const lawToken = graphData.lawTokens.find((t) => t.id === edge.target);

    if (location && lawToken) {
      if (!lawTokenLocationMap.has(lawToken.id)) {
        lawTokenLocationMap.set(lawToken.id, []);
      }
      lawTokenLocationMap.get(lawToken.id)!.push(location.id);
    }
  });

  // Build a map of location ID to original law token sequence (legacy, no-op)
  const locationLawTokenSequenceMap = new Map<string, string>();

  // Identify shared law tokens (law tokens with multiple locations)
  const sharedLawTokenIds = new Set<string>();
  lawTokenLocationMap.forEach((locations, lawTokenId) => {
    if (locations.length > 1) {
      sharedLawTokenIds.add(lawTokenId);
    }
  });

  return (
    <div className="container mx-auto p-6 h-full flex flex-col min-h-0">
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Law Tokens */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Law Tokens</CardTitle>
                {sharedLawTokenIds.size > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {sharedLawTokenIds.size} shared law token
                    {sharedLawTokenIds.size !== 1 ? "s" : ""} detected
                    (highlighted with border)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FilterSortModal
                  graphData={graphData}
                  sharedLawTokenIds={sharedLawTokenIds}
                  lawTokenLocationMap={lawTokenLocationMap}
                  locationLawTokenSequenceMap={locationLawTokenSequenceMap}
                  curationNameMap={curationNameMap}
                />
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
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full px-6 pb-6">
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
          </CardContent>
        </Card>

        {/* Interpretation Tokens Section */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interpretation Tokens</CardTitle>
              </div>
              <SchemaBuilderFilterModal
                interpretationTokens={graphData.interpretationTokens}
                nodeNameMap={nodeNameMap}
                onOpenTokenModal={handleOpenTokenModal}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-2 pr-4">
                {graphData.interpretationTokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No interpretation tokens yet. Publish a source graph to get
                    started.
                  </div>
                ) : (
                  graphData.interpretationTokens.map((token) => (
                    <InterpretationTokenItem
                      key={token.id}
                      token={token}
                      onOpenModal={() => handleOpenTokenModal(token)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Token Detail Modal */}
      {selectedToken && (
        <div
          // biome-ignore lint/a11y/useSemanticElements: preserving layout structure
          role="button"
          tabIndex={0}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm ${
            tokenModalOpen ? "block" : "hidden"
          }`}
          onClick={() => setTokenModalOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setTokenModalOpen(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{selectedToken.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedToken.customAttributes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Custom Attributes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedToken.customAttributes.map((attr) => (
                      <Badge
                        key={attr.key}
                        variant="secondary"
                        className="text-xs"
                      >
                        {attr.key}:{" "}
                        {attr.weightedValues.map((wv) => wv.value).join(", ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setTokenModalOpen(false)}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
