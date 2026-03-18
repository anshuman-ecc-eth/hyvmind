import type { CustomAttribute, Directionality, NodeId } from "@/backend";
import { Directionality as DirectionalityEnum } from "@/backend";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCuration,
  useCreateInterpretationToken,
  useCreateLocation,
  useCreateSwarm,
  useGetAllGraphData,
  useGetGraphData,
} from "@/hooks/useQueries";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type NodeType = "curation" | "swarm" | "location" | "interpretationToken";

interface CreateNodeDialogProps {
  trigger?: React.ReactNode;
  defaultNodeType?: NodeType;
  defaultParentId?: NodeId;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefillTitle?: string;
  prefillCustomAttributes?: CustomAttribute[];
}

function extractLawTokenSequence(content: string): string {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return "";
  return matches.join("");
}

export default function CreateNodeDialog({
  trigger,
  defaultNodeType,
  defaultParentId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  prefillTitle,
  prefillCustomAttributes,
}: CreateNodeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [nodeType, setNodeType] = useState<NodeType>(
    defaultNodeType || "location",
  );

  // Curation fields
  const [curationName, setCurationName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  // Swarm fields
  const [swarmName, setSwarmName] = useState("");
  const [swarmTags, setSwarmTags] = useState("");
  const [swarmParentCurationId, setSwarmParentCurationId] = useState("");

  // Location fields
  const [locationTitle, setLocationTitle] = useState(prefillTitle || "");
  const [locationContent, setLocationContent] = useState("");
  const [locationParentSwarmId, setLocationParentSwarmId] = useState(
    defaultParentId || "",
  );
  const [locationAttributes, setLocationAttributes] = useState<
    CustomAttribute[]
  >(prefillCustomAttributes || []);

  // Interpretation Token fields
  const [itTitle, setItTitle] = useState("");
  const [itContext, setItContext] = useState("");
  const [itFromTokenId, setItFromTokenId] = useState(defaultParentId || "");
  const [itFromRelType, setItFromRelType] = useState("");
  const [itFromDir, setItFromDir] = useState<Directionality>(
    DirectionalityEnum.none,
  );
  const [itToNodeId, setItToNodeId] = useState("");
  const [itToRelType, setItToRelType] = useState("");
  const [itToDir, setItToDir] = useState<Directionality>(
    DirectionalityEnum.none,
  );
  const [itAttributes, setItAttributes] = useState<CustomAttribute[]>([]);

  const { data: ownedGraphData } = useGetGraphData();
  const { data: allGraphData } = useGetAllGraphData();

  const createCuration = useCreateCuration();
  const createSwarm = useCreateSwarm();
  const createLocation = useCreateLocation();
  const createInterpretationToken = useCreateInterpretationToken();

  const isLoading =
    createCuration.isPending ||
    createSwarm.isPending ||
    createLocation.isPending ||
    createInterpretationToken.isPending;

  // Detect if the swarm being created is a question-of-law swarm
  const normalizedTags = swarmTags
    .split(",")
    .map((t) => t.trim().toLowerCase());
  const isQuestionOfLaw =
    nodeType === "swarm" &&
    (normalizedTags.includes("question-of-law") ||
      normalizedTags.includes("qol"));

  // Sync props into state when dialog opens
  useEffect(() => {
    if (open) {
      setLocationTitle(prefillTitle || "");
      if (defaultNodeType) setNodeType(defaultNodeType);
      if (defaultParentId) {
        setLocationParentSwarmId(defaultParentId);
        setItFromTokenId(defaultParentId);
      }
      if (prefillCustomAttributes) {
        setLocationAttributes(prefillCustomAttributes);
      }
    }
  }, [
    open,
    prefillTitle,
    defaultNodeType,
    defaultParentId,
    prefillCustomAttributes,
  ]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurationName("");
      setJurisdiction("");
      setSwarmName("");
      setSwarmTags("");
      setSwarmParentCurationId("");
      setLocationTitle(prefillTitle || "");
      setLocationContent("");
      setLocationParentSwarmId(defaultParentId || "");
      setLocationAttributes(prefillCustomAttributes || []);
      setItTitle("");
      setItContext("");
      setItFromTokenId(defaultParentId || "");
      setItFromRelType("");
      setItFromDir(DirectionalityEnum.none);
      setItToNodeId("");
      setItToRelType("");
      setItToDir(DirectionalityEnum.none);
      setItAttributes([]);
    }
  }, [open, prefillTitle, defaultParentId, prefillCustomAttributes]);

  const handleSubmit = async () => {
    try {
      if (nodeType === "curation") {
        await createCuration.mutateAsync({ name: curationName, jurisdiction });
      } else if (nodeType === "swarm") {
        const tags = swarmTags
          .split(",")
          .map((t) => {
            const trimmed = t.trim();
            return trimmed.toLowerCase() === "qol"
              ? "question-of-law"
              : trimmed;
          })
          .filter(Boolean);
        await createSwarm.mutateAsync({
          name: swarmName,
          tags,
          parentCurationId: swarmParentCurationId,
        });
      } else if (nodeType === "location") {
        const originalTokenSequence = extractLawTokenSequence(locationContent);
        await createLocation.mutateAsync({
          title: locationTitle,
          content: locationContent,
          originalTokenSequence,
          customAttributes: locationAttributes,
          parentSwarmId: locationParentSwarmId,
        });
      } else if (nodeType === "interpretationToken") {
        await createInterpretationToken.mutateAsync({
          title: itTitle,
          context: itContext,
          fromTokenId: itFromTokenId,
          fromRelationshipType: itFromRelType,
          fromDirectionality: itFromDir,
          toNodeId: itToNodeId,
          toRelationshipType: itToRelType,
          toDirectionality: itToDir,
          customAttributes: itAttributes,
        });
      }
      setOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const addAttribute = (
    setter: React.Dispatch<React.SetStateAction<CustomAttribute[]>>,
    locked?: CustomAttribute[],
  ) => {
    setter((prev) => {
      const lockedCount = locked?.length ?? 0;
      const unlocked = prev.slice(lockedCount);
      return [
        ...prev.slice(0, lockedCount),
        ...unlocked,
        { key: "", value: "" },
      ];
    });
  };

  const updateAttribute = (
    index: number,
    field: "key" | "value",
    value: string,
    setter: React.Dispatch<React.SetStateAction<CustomAttribute[]>>,
    lockedCount = 0,
  ) => {
    if (index < lockedCount) return; // locked rows are read-only
    setter((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr)),
    );
  };

  const removeAttribute = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<CustomAttribute[]>>,
    lockedCount = 0,
  ) => {
    if (index < lockedCount) return; // locked rows cannot be removed
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const curations = ownedGraphData?.curations || allGraphData?.curations || [];
  const swarms = allGraphData?.swarms || ownedGraphData?.swarms || [];
  const locations = allGraphData?.locations || ownedGraphData?.locations || [];
  const lawTokens = allGraphData?.lawTokens || ownedGraphData?.lawTokens || [];
  const interpretationTokens =
    allGraphData?.interpretationTokens ||
    ownedGraphData?.interpretationTokens ||
    [];

  const fromNodeOptions = [
    ...locations.map((l) => ({ id: l.id, label: `[Location] ${l.title}` })),
    ...lawTokens.map((lt) => ({
      id: lt.id,
      label: `[Law Token] ${lt.tokenLabel}`,
    })),
    ...interpretationTokens.map((it) => ({
      id: it.id,
      label: `[Interp. Token] ${it.title}`,
    })),
  ];

  const toNodeOptions = fromNodeOptions;

  const dirOptions: { value: Directionality; label: string }[] = [
    { value: DirectionalityEnum.none, label: "None" },
    { value: DirectionalityEnum.unidirectional, label: "Unidirectional" },
    { value: DirectionalityEnum.bidirectional, label: "Bidirectional" },
  ];

  const lockedCount = prefillCustomAttributes?.length ?? 0;

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Node</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Node Type Selector — hide if defaultNodeType is set */}
        {!defaultNodeType && (
          <div className="space-y-1">
            <Label>Node Type</Label>
            <Select
              value={nodeType}
              onValueChange={(v) => setNodeType(v as NodeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="curation">Curation</SelectItem>
                <SelectItem value="swarm">Swarm</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="interpretationToken">
                  Interpretation Token
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Curation Form */}
        {nodeType === "curation" && (
          <>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={curationName}
                onChange={(e) => setCurationName(e.target.value)}
                placeholder="Curation name"
              />
            </div>
            <div className="space-y-1">
              <Label>Jurisdiction</Label>
              <Input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. EU, US, Global"
              />
            </div>
          </>
        )}

        {/* Swarm Form */}
        {nodeType === "swarm" && (
          <>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={swarmName}
                onChange={(e) => setSwarmName(e.target.value)}
                placeholder="Swarm name"
              />
            </div>
            <div className="space-y-1">
              <Label>Tag (comma-separated)</Label>
              <Input
                value={swarmTags}
                onChange={(e) => setSwarmTags(e.target.value)}
                placeholder="e.g. question-of-law"
              />
            </div>

            {/* Question of Law informational note */}
            {isQuestionOfLaw && (
              <Alert className="border-border bg-muted/50">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">
                    Question of Law
                  </span>{" "}
                  — Users can add custom locations with{" "}
                  <span className="font-medium text-foreground">side: yes</span>{" "}
                  or{" "}
                  <span className="font-medium text-foreground">side: no</span>{" "}
                  attributes inside this swarm.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label>Parent Curation</Label>
              <Select
                value={swarmParentCurationId}
                onValueChange={setSwarmParentCurationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select curation" />
                </SelectTrigger>
                <SelectContent>
                  {curations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Location Form */}
        {nodeType === "location" && (
          <>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={locationTitle}
                onChange={(e) => {
                  if (!prefillTitle) setLocationTitle(e.target.value);
                }}
                placeholder="Location title"
                disabled={!!prefillTitle}
                className={
                  prefillTitle ? "opacity-50 cursor-not-allowed bg-muted" : ""
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <Textarea
                value={locationContent}
                onChange={(e) => setLocationContent(e.target.value)}
                placeholder="Content with {law tokens} in curly braces"
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label>Parent Swarm</Label>
              <Select
                value={locationParentSwarmId}
                onValueChange={setLocationParentSwarmId}
                disabled={!!defaultParentId}
              >
                <SelectTrigger
                  className={
                    defaultParentId
                      ? "opacity-50 cursor-not-allowed bg-muted"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select swarm" />
                </SelectTrigger>
                <SelectContent>
                  {swarms.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Attributes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    addAttribute(setLocationAttributes, prefillCustomAttributes)
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {locationAttributes.map((attr, i) => {
                const isLocked = i < lockedCount;
                return (
                  <div key={`${attr.key}-${attr.value}`} className="flex gap-2">
                    <Input
                      value={attr.key}
                      onChange={(e) =>
                        updateAttribute(
                          i,
                          "key",
                          e.target.value,
                          setLocationAttributes,
                          lockedCount,
                        )
                      }
                      placeholder="Key"
                      className={`flex-1${
                        isLocked
                          ? " opacity-50 cursor-not-allowed bg-muted"
                          : ""
                      }`}
                      disabled={isLocked}
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) =>
                        updateAttribute(
                          i,
                          "value",
                          e.target.value,
                          setLocationAttributes,
                          lockedCount,
                        )
                      }
                      placeholder="Value"
                      className={`flex-1${
                        isLocked
                          ? " opacity-50 cursor-not-allowed bg-muted"
                          : ""
                      }`}
                      disabled={isLocked}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeAttribute(i, setLocationAttributes, lockedCount)
                      }
                      disabled={isLocked}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Interpretation Token Form */}
        {nodeType === "interpretationToken" && (
          <>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={itTitle}
                onChange={(e) => setItTitle(e.target.value)}
                placeholder="Interpretation token title"
              />
            </div>
            <div className="space-y-1">
              <Label>Context</Label>
              <Textarea
                value={itContext}
                onChange={(e) => setItContext(e.target.value)}
                placeholder="Context or description"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>From Node</Label>
              <Select value={itFromTokenId} onValueChange={setItFromTokenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from node" />
                </SelectTrigger>
                <SelectContent>
                  {fromNodeOptions.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From Relationship Type</Label>
              <Input
                value={itFromRelType}
                onChange={(e) => setItFromRelType(e.target.value)}
                placeholder="e.g. interprets, extends"
              />
            </div>
            <div className="space-y-1">
              <Label>From Directionality</Label>
              <Select
                value={itFromDir}
                onValueChange={(v) => setItFromDir(v as Directionality)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dirOptions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>To Node</Label>
              <Select value={itToNodeId} onValueChange={setItToNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select to node" />
                </SelectTrigger>
                <SelectContent>
                  {toNodeOptions.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>To Relationship Type</Label>
              <Input
                value={itToRelType}
                onChange={(e) => setItToRelType(e.target.value)}
                placeholder="e.g. references, contradicts"
              />
            </div>
            <div className="space-y-1">
              <Label>To Directionality</Label>
              <Select
                value={itToDir}
                onValueChange={(v) => setItToDir(v as Directionality)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dirOptions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Attributes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addAttribute(setItAttributes)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {itAttributes.map((attr, i) => (
                <div key={`${attr.key}-${attr.value}`} className="flex gap-2">
                  <Input
                    value={attr.key}
                    onChange={(e) =>
                      updateAttribute(i, "key", e.target.value, setItAttributes)
                    }
                    placeholder="Key"
                    className="flex-1"
                  />
                  <Input
                    value={attr.value}
                    onChange={(e) =>
                      updateAttribute(
                        i,
                        "value",
                        e.target.value,
                        setItAttributes,
                      )
                    }
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttribute(i, setItAttributes)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
