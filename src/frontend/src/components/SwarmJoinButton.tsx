import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { GitFork, Loader2, LogOut, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { NodeId } from "../backend";
import {
  useCreateSwarmFork,
  useGetAllData,
  useGetSwarmMembers,
  useHasFork,
  useJoinSwarm,
  useLeaveSwarm,
} from "../hooks/useQueries";

interface SwarmJoinButtonProps {
  swarmId: NodeId;
  onNavigateToSwarm?: (swarmId: string) => void;
}

export default function SwarmJoinButton({
  swarmId,
  onNavigateToSwarm,
}: SwarmJoinButtonProps) {
  const { identity } = useInternetIdentity();
  const { data: graphData } = useGetAllData();
  const { data: members, isLoading: membersLoading } =
    useGetSwarmMembers(swarmId);
  const { data: hasFork, isLoading: hasForkLoading } = useHasFork(swarmId);
  const joinSwarm = useJoinSwarm();
  const createSwarmFork = useCreateSwarmFork();
  const leaveSwarm = useLeaveSwarm();

  if (!identity || !graphData) return null;

  const swarm = graphData.swarms.find((s) => s.id === swarmId);
  if (!swarm) return null;

  const currentUserPrincipal = identity.getPrincipal();
  const isCreator =
    swarm.creator.toString() === currentUserPrincipal.toString();

  const isMember = members?.some(
    (member) => member.toString() === currentUserPrincipal.toString(),
  );

  const handleJoin = async () => {
    try {
      await joinSwarm.mutateAsync(swarmId);
      toast.success("Joined swarm.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to join: ${errorMessage}`);
    }
  };

  const handleFork = async () => {
    try {
      const forkId = await createSwarmFork.mutateAsync(swarmId);
      toast.success("Fork created.");
      if (onNavigateToSwarm && forkId) {
        onNavigateToSwarm(forkId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to fork: ${errorMessage}`);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveSwarm.mutateAsync(swarmId);
      toast.success("Left swarm.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to leave: ${errorMessage}`);
    }
  };

  // Creator badge
  if (isCreator) {
    return (
      <span className="font-mono text-xs border border-dashed border-border px-2 py-0.5 text-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" />
        creator
      </span>
    );
  }

  // Loading state
  if (membersLoading || hasForkLoading) {
    return (
      <span className="font-mono text-xs border border-dashed border-border px-2 py-0.5 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin inline" />
      </span>
    );
  }

  // Non-member: show Join button
  if (!isMember) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleJoin}
        disabled={joinSwarm.isPending}
        className="h-7 text-xs font-mono border-dashed"
        data-ocid="swarm_detail.join.button"
      >
        {joinSwarm.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-3 w-3 mr-1" />
            join
          </>
        )}
      </Button>
    );
  }

  // Member without fork: show Fork + Leave buttons
  if (!hasFork) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleFork}
          disabled={createSwarmFork.isPending}
          className="h-7 text-xs font-mono border-dashed"
          data-ocid="swarm_detail.fork.button"
        >
          {createSwarmFork.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <GitFork className="h-3 w-3 mr-1" />
              fork
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLeave}
          disabled={leaveSwarm.isPending}
          className="h-7 text-xs font-mono text-muted-foreground hover:text-destructive"
          data-ocid="swarm_detail.leave.button"
        >
          {leaveSwarm.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <LogOut className="h-3 w-3 mr-1" />
              leave
            </>
          )}
        </Button>
      </div>
    );
  }

  // Member with fork: show Leave button only (Pull handled by SwarmPullButton)
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLeave}
      disabled={leaveSwarm.isPending}
      className="h-7 text-xs font-mono text-muted-foreground hover:text-destructive"
      data-ocid="swarm_detail.leave.button"
    >
      {leaveSwarm.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <LogOut className="h-3 w-3 mr-1" />
          leave
        </>
      )}
    </Button>
  );
}
