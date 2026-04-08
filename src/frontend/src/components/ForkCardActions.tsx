import { Button } from "@/components/ui/button";
import {
  useCreateSwarmFork,
  useGetAllData,
  useGetSwarmMembers,
  useHasFork,
  usePullFromSwarm,
} from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { GitFork, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ForkCardActionsProps {
  /** ID of the fork being displayed */
  forkId: string;
  /** ID of the root original swarm (for membership check) */
  originalSwarmId: string;
  onNavigateToSwarm?: (swarmId: string) => void;
}

export default function ForkCardActions({
  forkId,
  originalSwarmId,
  onNavigateToSwarm,
}: ForkCardActionsProps) {
  const { identity } = useInternetIdentity();
  const { data: graphData } = useGetAllData();
  const { data: members, isLoading: membersLoading } =
    useGetSwarmMembers(originalSwarmId);
  const { data: hasFork, isLoading: hasForkLoading } = useHasFork(forkId);
  const createFork = useCreateSwarmFork();
  const pull = usePullFromSwarm();

  if (!identity || !graphData) return null;

  const fork = graphData.swarms.find((s) => s.id === forkId);
  if (!fork) return null;

  const currentUser = identity.getPrincipal().toString();
  const isOwnFork = fork.creator.toString() === currentUser;

  // Don't show actions on the user's own fork — they manage it via SwarmDetailView
  if (isOwnFork) return null;

  if (membersLoading || hasForkLoading) {
    return (
      <span className="font-mono text-xs border border-dashed border-border px-2 py-0.5 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin inline" />
      </span>
    );
  }

  const isMember = members?.some((m) => m.toString() === currentUser);
  if (!isMember) return null;

  if (!hasFork) {
    // Member without a fork of this fork → show Fork button
    const handleFork = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const newForkId = await createFork.mutateAsync(forkId);
        toast.success("Fork created.");
        if (onNavigateToSwarm && newForkId) onNavigateToSwarm(newForkId);
      } catch (err) {
        toast.error(
          `Fork failed: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    };
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleFork}
        disabled={createFork.isPending}
        className="h-6 text-xs font-mono border-dashed rounded-none px-2"
        data-ocid="fork_card.fork.button"
      >
        {createFork.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <GitFork className="h-3 w-3 mr-1" />
            fork
          </>
        )}
      </Button>
    );
  }

  // Member with a fork of this fork → show Pull button
  const handlePull = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pull.mutateAsync({ sourceSwarmId: forkId });
      toast.success("Fork updated from source.");
    } catch (err) {
      toast.error(
        `Pull failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePull}
      disabled={pull.isPending}
      className="h-6 text-xs font-mono border-dashed rounded-none px-2"
      data-ocid="fork_card.pull.button"
    >
      {pull.isPending ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        "[pull]"
      )}
    </Button>
  );
}
