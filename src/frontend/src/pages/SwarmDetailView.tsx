import type { CustomAttribute } from "@/backend";
import CreateNodeDialog from "@/components/CreateNodeDialog";
import LawTokenCard from "@/components/LawTokenCard";
import PublishCollectibleModal from "@/components/PublishCollectibleModal";
import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetAllGraphData } from "@/hooks/useQueries";
import { ArrowLeft, BookMarked, Plus } from "lucide-react";
import { useState } from "react";

interface SwarmDetailViewProps {
  swarmId: string;
  onBack: () => void;
}

export default function SwarmDetailView({
  swarmId,
  onBack,
}: SwarmDetailViewProps) {
  const { data: graphData } = useGetAllGraphData();
  const { identity } = useInternetIdentity();

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [locationDialogSide, setLocationDialogSide] = useState<
    "yes" | "no" | null
  >(null);

  const swarm = graphData?.swarms.find((s) => s.id === swarmId);
  const parentCuration = swarm
    ? graphData?.curations.find((c) => c.id === swarm.parentCurationId)
    : undefined;

  const locations =
    graphData?.locations.filter((l) => l.parentSwarmId === swarmId) || [];

  // Find all Yes/No locations by customAttribute side
  const yesLocations = locations.filter((l) =>
    l.customAttributes?.some(
      (attr: CustomAttribute) =>
        attr.key === "side" && attr.value.toLowerCase() === "yes",
    ),
  );
  const noLocations = locations.filter((l) =>
    l.customAttributes?.some(
      (attr: CustomAttribute) =>
        attr.key === "side" && attr.value.toLowerCase() === "no",
    ),
  );

  // Law tokens for each side — collect across all matching locations
  const allLawTokens = graphData?.lawTokens || [];
  const yesLocationIds = yesLocations.map((l) => l.id);
  const noLocationIds = noLocations.map((l) => l.id);
  const yesLawTokens = allLawTokens.filter((lt) =>
    yesLocationIds.includes(lt.parentLocationId),
  );
  const noLawTokens = allLawTokens.filter((lt) =>
    noLocationIds.includes(lt.parentLocationId),
  );

  // Build sublocation lookup: lawTokenId → Sublocation[]
  const allSublocations = graphData?.sublocations ?? [];
  const edges = graphData?.edges ?? [];
  const sublocationIds = new Set(allSublocations.map((sl) => sl.id));

  const sublocationsByLawTokenId: Record<string, typeof allSublocations> = {};
  for (const edge of edges) {
    // edge.source = sublocationId, edge.target = lawTokenId
    if (sublocationIds.has(edge.source)) {
      const lawTokenId = edge.target;
      if (!sublocationsByLawTokenId[lawTokenId]) {
        sublocationsByLawTokenId[lawTokenId] = [];
      }
      const sl = allSublocations.find((s) => s.id === edge.source);
      if (sl) sublocationsByLawTokenId[lawTokenId].push(sl);
    }
  }

  const isAuthenticated = !!identity;

  const isCreator =
    isAuthenticated &&
    !!swarm &&
    swarm.creator.toString() === identity!.getPrincipal().toString();

  const prefillAttributesForSide = (side: "yes" | "no"): CustomAttribute[] => [
    { key: "side", value: side },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
          data-ocid="swarm_detail.back_button"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-normal">
            Questions of Law
          </p>
          {swarm && (
            <p className="text-sm font-medium truncate">{swarm.name}</p>
          )}
          {parentCuration && (
            <p className="text-xs text-muted-foreground truncate">
              {parentCuration.name}
            </p>
          )}
        </div>

        {/* Publish as Collectible — creator only */}
        {isCreator && swarm && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => setPublishModalOpen(true)}
            data-ocid="swarm_detail.publish_collectible.open_modal_button"
          >
            <BookMarked className="h-3.5 w-3.5" />
            Publish as Collectible
          </Button>
        )}
      </div>

      {/* Split panel */}
      <div className="flex flex-1 min-h-0 divide-x divide-border">
        {/* Yes panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm text-foreground">Yes</span>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setLocationDialogSide("yes")}
                title="Add location to Yes"
                data-ocid="swarm_detail.yes.add.button"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {yesLawTokens.length === 0 ? (
              <p
                className="text-xs text-muted-foreground"
                data-ocid="swarm_detail.yes.empty_state"
              >
                No law tokens yet.
              </p>
            ) : (
              yesLawTokens.map((lt) => (
                <LawTokenCard
                  key={lt.id}
                  lawToken={lt}
                  locations={locations}
                  sublocations={sublocationsByLawTokenId[lt.id] ?? []}
                />
              ))
            )}
          </div>
        </div>

        {/* No panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm text-foreground">No</span>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setLocationDialogSide("no")}
                title="Add location to No"
                data-ocid="swarm_detail.no.add.button"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {noLawTokens.length === 0 ? (
              <p
                className="text-xs text-muted-foreground"
                data-ocid="swarm_detail.no.empty_state"
              >
                No law tokens yet.
              </p>
            ) : (
              noLawTokens.map((lt) => (
                <LawTokenCard
                  key={lt.id}
                  lawToken={lt}
                  locations={locations}
                  sublocations={sublocationsByLawTokenId[lt.id] ?? []}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Location Dialog — pre-filled with side attribute */}
      <CreateNodeDialog
        defaultNodeType="location"
        defaultParentId={swarmId}
        open={locationDialogSide !== null}
        onOpenChange={(open) => {
          if (!open) setLocationDialogSide(null);
        }}
        prefillCustomAttributes={
          locationDialogSide !== null
            ? prefillAttributesForSide(locationDialogSide)
            : undefined
        }
      />

      {/* Publish as Collectible Modal */}
      {swarm && (
        <PublishCollectibleModal
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          swarmName={swarm.name}
          swarmTags={swarm.tags}
        />
      )}
    </div>
  );
}
