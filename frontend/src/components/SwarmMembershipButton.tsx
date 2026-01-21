import { useGetGraphData, useRequestToJoinSwarm, useGetSwarmMembers } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { NodeId } from '../backend';

interface SwarmMembershipButtonProps {
  swarmId: NodeId;
}

export default function SwarmMembershipButton({ swarmId }: SwarmMembershipButtonProps) {
  const { identity } = useInternetIdentity();
  const { data: graphData } = useGetGraphData();
  const { data: members, isLoading: membersLoading } = useGetSwarmMembers(swarmId);
  const requestToJoin = useRequestToJoinSwarm();

  if (!identity || !graphData) return null;

  const swarm = graphData.swarms.find((s) => s.id === swarmId);
  if (!swarm) return null;

  const currentUserPrincipal = identity.getPrincipal();
  const isCreator = swarm.creator.toString() === currentUserPrincipal.toString();
  
  // Check if user is already a member
  const isMember = members?.some(
    (member) => member.toString() === currentUserPrincipal.toString()
  );

  const handleJoinRequest = async () => {
    try {
      await requestToJoin.mutateAsync(swarmId);
      toast.success('Join request sent successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already exists')) {
        toast.info('You have already requested to join this swarm');
      } else {
        toast.error(`Failed to send join request: ${errorMessage}`);
      }
    }
  };

  if (isCreator) {
    return (
      <Badge variant="outline" className="bg-muted text-foreground border-border">
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
      <Badge variant="outline" className="bg-muted text-foreground border-border">
        <Users className="h-3 w-3 mr-1" />
        Member
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleJoinRequest}
      disabled={requestToJoin.isPending}
      className="h-7 text-xs hover:bg-accent hover:text-accent-foreground"
    >
      {requestToJoin.isPending ? (
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

