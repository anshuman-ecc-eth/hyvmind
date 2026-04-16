import type { CustomAttribute } from "@/backend";
import LawTokenCard from "@/components/LawTokenCard";
import { Button } from "@/components/ui/button";
import { useGetAllData, useGetOwnedData } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ArrowLeft, Lock } from "lucide-react";

interface SwarmDetailViewProps {
  swarmId: string;
  onBack: () => void;
  onSelectSwarm?: (swarmId: string) => void;
}

export default function SwarmDetailView({
  swarmId,
  onBack,
}: SwarmDetailViewProps) {
  const { data: graphData } = useGetOwnedData();
  const { data: allGraphData } = useGetAllData();
  const { identity } = useInternetIdentity();

  // Swarm from owned data (creator can see/write)
  const swarm =
    graphData?.swarms.find((s) => s.id === swarmId) ??
    allGraphData?.swarms.find((s) => s.id === swarmId);

  const parentCuration = swarm
    ? (graphData?.curations.find((c) => c.id === swarm.parentCurationId) ??
      allGraphData?.curations.find((c) => c.id === swarm.parentCurationId))
    : undefined;

  // Fix isFork: Candid Opt deserialises as [] (None) or ["id"] (Some)
  const forkSourceRaw = swarm?.forkSource as unknown;
  const isFork =
    Array.isArray(forkSourceRaw) && (forkSourceRaw as string[]).length > 0;
  const forkSourceId = isFork ? (forkSourceRaw as string[])[0] : undefined;

  const forkSourceSwarm = forkSourceId
    ? (graphData?.swarms.find((s) => s.id === forkSourceId) ??
      allGraphData?.swarms.find((s) => s.id === forkSourceId))
    : undefined;

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const isCreator =
    !!swarm &&
    !!currentUserPrincipal &&
    swarm.creator.toString() === currentUserPrincipal;

  const locations =
    graphData?.locations.filter((l) => l.parentSwarmId === swarmId) || [];

  // Find Yes/No locations by customAttribute side
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

  const allLawTokens = graphData?.lawTokens || [];
  const yesLocationIds = yesLocations.map((l) => l.id);
  const noLocationIds = noLocations.map((l) => l.id);
  const yesLawTokens = allLawTokens.filter((lt) =>
    yesLocationIds.includes(lt.parentLocationId),
  );
  const noLawTokens = allLawTokens.filter((lt) =>
    noLocationIds.includes(lt.parentLocationId),
  );

  // Non-creator: show empty workspace state
  if (!isCreator) {
    return (
      <div className="flex flex-col h-full">
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
            <p className="text-sm font-medium truncate">My Workspace</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center px-6">
          <Lock className="h-8 w-8 text-muted-foreground mb-4 opacity-40" />
          <p className="text-sm text-muted-foreground font-mono">
            You haven't created any questions of law yet.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Publish a source graph from the{" "}
            <span className="text-foreground">Sources</span> tab, or join a
            swarm and fork it from the Swarms tab.
          </p>
        </div>
      </div>
    );
  }

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

        {/* Fork lineage info for creator's forks */}
        {isFork && forkSourceId && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            fork of:{" "}
            <span className="text-foreground">
              {forkSourceSwarm?.name ?? forkSourceId}
            </span>
          </span>
        )}
      </div>

      {/* Split panel */}
      <div className="flex flex-1 min-h-0 divide-x divide-border">
        {/* Yes panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center px-4 py-2 border-b border-border">
            <span className="text-sm text-foreground">Yes</span>
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
                <LawTokenCard key={lt.id} lawToken={lt} locations={locations} />
              ))
            )}
          </div>
        </div>

        {/* No panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center px-4 py-2 border-b border-border">
            <span className="text-sm text-foreground">No</span>
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
                <LawTokenCard key={lt.id} lawToken={lt} locations={locations} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
