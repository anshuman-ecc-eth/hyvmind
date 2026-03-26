import { Button } from "@/components/ui/button";
import { usePullFromSwarm } from "@/hooks/useQueries";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SwarmPullButtonProps {
  swarmId: string;
  forkSourceId: string;
  onNavigateToSwarm?: (swarmId: string) => void;
}

export default function SwarmPullButton({
  forkSourceId,
  onNavigateToSwarm,
}: SwarmPullButtonProps) {
  const pull = usePullFromSwarm();

  const handlePull = async () => {
    try {
      const newForkId = await pull.mutateAsync({ targetSwarmId: forkSourceId });
      toast.success("Fork refreshed from source.");
      if (onNavigateToSwarm && newForkId) {
        onNavigateToSwarm(newForkId);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Pull failed: ${msg}`);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePull}
      disabled={pull.isPending}
      className="h-6 text-xs font-mono border-dashed rounded-none px-2 hover:bg-accent hover:text-accent-foreground"
      data-ocid="swarm_detail.pull.button"
    >
      {pull.isPending ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        "[pull]"
      )}
    </Button>
  );
}
