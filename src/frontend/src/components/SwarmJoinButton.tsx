import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { NodeId } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllData,
  useGetSwarmMembers,
  useJoinSwarm,
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
  const joinSwarm = useJoinSwarm();

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
      const forkId = await joinSwarm.mutateAsync(swarmId);
      toast.success("Joined — your fork is ready.");
      if (onNavigateToSwarm && forkId) {
        onNavigateToSwarm(forkId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to join swarm: ${errorMessage}`);
    }
  };

  if (isCreator) {
    return (
      <Badge
        variant="outline"
        className="bg-muted text-foreground border-border"
      >
        <Users className="h-3 w-3 mr-1" />
        Creator
      </Badge>
    );
  }

  if (membersLoading) {
    return (
      <Badge variant="outline" className="bg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Badge>
    );
  }

  if (isMember) {
    return (
      <Badge
        variant="outline"
        className="bg-muted text-foreground border-border"
      >
        <Users className="h-3 w-3 mr-1" />
        Member
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleJoin}
      disabled={joinSwarm.isPending}
      className="h-7 text-xs hover:bg-accent hover:text-accent-foreground"
      data-ocid="swarm_detail.join.button"
    >
      {joinSwarm.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <UserPlus className="h-3 w-3 mr-1" />
          Join
        </>
      )}
    </Button>
  );
}
