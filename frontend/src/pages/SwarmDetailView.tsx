import { useState } from 'react';
import { ArrowLeft, BookMarked, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetAllGraphData } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import PublishCollectibleModal from '@/components/PublishCollectibleModal';
import CreateLawTokenDialog from '@/components/CreateLawTokenDialog';
import LawTokenCard from '@/components/LawTokenCard';
import type { Location } from '@/backend';

interface SwarmDetailViewProps {
  swarmId: string;
  onBack: () => void;
}

export default function SwarmDetailView({ swarmId, onBack }: SwarmDetailViewProps) {
  const { data: graphData } = useGetAllGraphData();
  const { identity } = useInternetIdentity();

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [lawTokenDialogSide, setLawTokenDialogSide] = useState<'yes' | 'no' | null>(null);

  const swarm = graphData?.swarms.find((s) => s.id === swarmId);
  const parentCuration = swarm
    ? graphData?.curations.find((c) => c.id === swarm.parentCurationId)
    : undefined;

  const locations = graphData?.locations.filter((l) => l.parentSwarmId === swarmId) || [];

  const yesLocation: Location | undefined = locations.find(
    (l) => l.title.trim().toLowerCase() === 'yes'
  );
  const noLocation: Location | undefined = locations.find(
    (l) => l.title.trim().toLowerCase() === 'no'
  );

  // Law tokens for each side
  const allLawTokens = graphData?.lawTokens || [];
  const yesLawTokens = yesLocation
    ? allLawTokens.filter((lt) => lt.parentLocationId === yesLocation.id)
    : [];
  const noLawTokens = noLocation
    ? allLawTokens.filter((lt) => lt.parentLocationId === noLocation.id)
    : [];

  const isAuthenticated = !!identity;

  const isCreator =
    isAuthenticated &&
    !!swarm &&
    swarm.creator.toString() === identity!.getPrincipal().toString();

  const activeParentLocation =
    lawTokenDialogSide === 'yes' ? yesLocation ?? null : noLocation ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-normal">Questions of Law</p>
          {swarm && (
            <p className="text-sm font-medium truncate">{swarm.name}</p>
          )}
          {parentCuration && (
            <p className="text-xs text-muted-foreground truncate">{parentCuration.name}</p>
          )}
        </div>

        {/* Publish as Collectible — creator only */}
        {isCreator && swarm && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => setPublishModalOpen(true)}
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
            <span className="text-sm font-semibold text-foreground">Yes</span>
            {isAuthenticated && yesLocation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setLawTokenDialogSide('yes')}
                title="Add Law Token to Yes"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {yesLawTokens.length === 0 ? (
              <p className="text-xs text-muted-foreground">No law tokens yet.</p>
            ) : (
              yesLawTokens.map((lt) => (
                <LawTokenCard key={lt.id} lawToken={lt} />
              ))
            )}
          </div>
        </div>

        {/* No panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">No</span>
            {isAuthenticated && noLocation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setLawTokenDialogSide('no')}
                title="Add Law Token to No"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {noLawTokens.length === 0 ? (
              <p className="text-xs text-muted-foreground">No law tokens yet.</p>
            ) : (
              noLawTokens.map((lt) => (
                <LawTokenCard key={lt.id} lawToken={lt} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Law Token Dialog */}
      <CreateLawTokenDialog
        open={lawTokenDialogSide !== null}
        onOpenChange={(open) => {
          if (!open) setLawTokenDialogSide(null);
        }}
        parentLocation={activeParentLocation}
        side={lawTokenDialogSide ?? 'yes'}
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
