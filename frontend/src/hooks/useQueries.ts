import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type {
  Curation,
  Swarm,
  Location,
  LawToken,
  InterpretationToken,
  GraphData,
  OwnedGraphData,
  CustomAttribute,
  Directionality,
  Tag,
  MembershipInfo,
  SwarmUpdate,
  BuzzLeaderboardEntry,
  MintSettings,
  MintCollectibleRequest,
  MintCollectibleResult,
  CollectibleEdition,
  BuzzScore,
  GraphNode,
  GraphEdge,
  NodeId,
} from '../backend';
import { SwarmUpdateStatus } from '../backend';

// Build a GraphData-compatible object from OwnedGraphData by constructing
// rootNodes and edges client-side from the flat owned arrays.
function buildGraphDataFromOwned(owned: OwnedGraphData): GraphData {
  const { curations, swarms, locations, lawTokens, interpretationTokens } = owned;

  const edges: GraphEdge[] = [];

  // Build location → lawToken edges inferred from parentLocationId on each lawToken
  for (const lawToken of lawTokens) {
    edges.push({ source: lawToken.parentLocationId, target: lawToken.id });
  }

  // Build swarm → location edges
  for (const location of locations) {
    edges.push({ source: location.parentSwarmId, target: location.id });
  }

  // Build curation → swarm edges
  for (const swarm of swarms) {
    edges.push({ source: swarm.parentCurationId, target: swarm.id });
  }

  // Build interpretation token edges (fromTokenId → interpretationToken → toNodeId)
  for (const it of interpretationTokens) {
    edges.push({ source: it.fromTokenId, target: it.id });
    edges.push({ source: it.id, target: it.toNodeId });
  }

  // Build rootNodes hierarchy
  function buildLawTokenNode(lt: LawToken): GraphNode {
    const children: GraphNode[] = interpretationTokens
      .filter(it => it.fromTokenId === lt.id)
      .map(it => ({
        id: it.id,
        nodeType: 'interpretationToken',
        tokenLabel: it.title,
        jurisdiction: undefined,
        parentId: lt.id,
        children: [],
      }));
    return {
      id: lt.id,
      nodeType: 'lawToken',
      tokenLabel: lt.tokenLabel,
      jurisdiction: undefined,
      parentId: lt.parentLocationId,
      children,
    };
  }

  function buildLocationNode(loc: Location): GraphNode {
    const children: GraphNode[] = lawTokens
      .filter(lt => lt.parentLocationId === loc.id)
      .map(lt => buildLawTokenNode(lt));
    return {
      id: loc.id,
      nodeType: 'location',
      tokenLabel: loc.title,
      jurisdiction: undefined,
      parentId: loc.parentSwarmId,
      children,
    };
  }

  function buildSwarmNode(swarm: Swarm): GraphNode {
    const children: GraphNode[] = locations
      .filter(loc => loc.parentSwarmId === swarm.id)
      .map(loc => buildLocationNode(loc));
    return {
      id: swarm.id,
      nodeType: 'swarm',
      tokenLabel: swarm.name,
      jurisdiction: undefined,
      parentId: swarm.parentCurationId,
      children,
    };
  }

  const rootNodes: GraphNode[] = curations.map(curation => {
    const children: GraphNode[] = swarms
      .filter(s => s.parentCurationId === curation.id)
      .map(s => buildSwarmNode(s));
    return {
      id: curation.id,
      nodeType: 'curation',
      tokenLabel: curation.name,
      jurisdiction: curation.jurisdiction,
      parentId: undefined,
      children,
    };
  });

  return {
    curations,
    swarms,
    locations,
    lawTokens,
    interpretationTokens,
    rootNodes,
    edges,
  };
}

// Helper to clear cached tree data (kept for backward compatibility with Header)
export function clearTreeCache() {
  try {
    localStorage.removeItem('hyvmind_tree_cache');
    localStorage.removeItem('hyvmind_tree_cache_timestamp');
  } catch {
    // ignore
  }
}

export function useGetGraphData() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<GraphData>({
    queryKey: ['graphData', identity?.getPrincipal().toText() ?? 'anonymous'],
    queryFn: async () => {
      if (!actor) return {
        curations: [],
        swarms: [],
        locations: [],
        lawTokens: [],
        interpretationTokens: [],
        rootNodes: [],
        edges: [],
      };
      const owned = await actor.getMyOwnedGraphData();
      return buildGraphDataFromOwned(owned);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetArchivedNodeIds() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<NodeId[]>({
    queryKey: ['archivedNodeIds', identity?.getPrincipal().toText() ?? 'anonymous'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getArchivedNodeIds();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useCreateCuration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, jurisdiction }: { name: string; jurisdiction: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCuration(name, jurisdiction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

export function useCreateSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, tags, parentCurationId }: { name: string; tags: Tag[]; parentCurationId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createSwarm(name, tags, parentCurationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

export function useCreateLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      originalTokenSequence,
      customAttributes,
      parentSwarmId,
    }: {
      title: string;
      content: string;
      originalTokenSequence: string;
      customAttributes: CustomAttribute[];
      parentSwarmId: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createLocation(title, content, originalTokenSequence, customAttributes, parentSwarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

export function useCreateInterpretationToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      context,
      fromTokenId,
      fromRelationshipType,
      fromDirectionality,
      toNodeId,
      toRelationshipType,
      toDirectionality,
      customAttributes,
    }: {
      title: string;
      context: string;
      fromTokenId: string;
      fromRelationshipType: string;
      fromDirectionality: Directionality;
      toNodeId: string;
      toRelationshipType: string;
      toDirectionality: Directionality;
      customAttributes: CustomAttribute[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInterpretationToken(
        title,
        context,
        fromTokenId,
        fromRelationshipType,
        fromDirectionality,
        toNodeId,
        toRelationshipType,
        toDirectionality,
        customAttributes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: { name: string; socialUrl?: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['listApprovals'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: any; status: any }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
    },
  });
}

export function useGetSwarmsByCreator() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['swarmsByCreator'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSwarmsByCreator();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRequestToJoinSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (swarmId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestToJoinSwarm(swarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests'] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembers'] });
    },
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ swarmId, member }: { swarmId: string; member: any }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveJoinRequest(swarmId, member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests'] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembers'] });
    },
  });
}

export function useGetSwarmMembershipRequests(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['swarmMembershipRequests', swarmId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSwarmMembershipRequests(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetSwarmMembers(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['swarmMembers', swarmId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSwarmMembers(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetSwarmUpdatesForUser(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['swarmUpdates', swarmId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSwarmUpdatesForUser(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetBuzzLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<BuzzLeaderboardEntry[]>({
    queryKey: ['buzzLeaderboard'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBuzzLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetVoteData(nodeId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['voteData', nodeId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getVoteData(nodeId);
    },
    enabled: !!actor && !isFetching && !!nodeId,
  });
}

export function useUpvoteNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.upvoteNode(nodeId);
    },
    onSuccess: (_, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ['voteData', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

export function useDownvoteNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.downvoteNode(nodeId);
    },
    onSuccess: (_, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ['voteData', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

export function useResetAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.resetAllData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

export function useGetMintSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<MintSettings>({
    queryKey: ['mintSettings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMintSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetMintSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: MintSettings) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setMintSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mintSettings'] });
    },
  });
}

export function useMintCollectible() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MintCollectibleResult, Error, MintCollectibleRequest>({
    mutationFn: async (request: MintCollectibleRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.mintCollectible(request);
    },
    onSuccess: (_, request) => {
      queryClient.invalidateQueries({ queryKey: ['collectibleEditions', request.tokenId] });
      queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
    },
  });
}

export function useGetCollectibleEditions(tokenId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<CollectibleEdition[]>({
    queryKey: ['collectibleEditions', tokenId],
    queryFn: async () => {
      if (!actor || !tokenId) throw new Error('Actor or tokenId not available');
      return actor.getCollectibleEditions(tokenId);
    },
    enabled: !!actor && !isFetching && !!tokenId,
  });
}

export function useGetMyBuzzBalance() {
  const { actor, isFetching } = useActor();

  return useQuery<BuzzScore>({
    queryKey: ['myBuzzBalance'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMyBuzzBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

// NFT Gallery hooks — derive user's tokens from owned graph data
export function useGetUserLawTokens() {
  const { data: graphData, isLoading } = useGetGraphData();

  return {
    data: graphData?.lawTokens ?? [],
    isLoading,
  };
}

export function useGetUserInterpretationTokens() {
  const { data: graphData, isLoading } = useGetGraphData();

  return {
    data: graphData?.interpretationTokens ?? [],
    isLoading,
  };
}

export function useGetUnvotedTokensForSwarm(swarmId: string) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['unvotedTokens', swarmId, identity?.getPrincipal().toText()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');

      const [graphData, swarmUpdates] = await Promise.all([
        actor.getGraphData(),
        actor.getSwarmUpdatesForUser(swarmId),
      ]);

      const callerPrincipal = identity?.getPrincipal().toString() ?? '';

      // Get all tokens in this swarm
      const swarmLocations = graphData.locations.filter(l => l.parentSwarmId === swarmId);
      const swarmLocationIds = new Set(swarmLocations.map(l => l.id));
      const swarmLawTokens = graphData.lawTokens.filter(lt => swarmLocationIds.has(lt.parentLocationId));
      const swarmLawTokenIds = new Set(swarmLawTokens.map(lt => lt.id));

      const swarmInterpretationTokens = graphData.interpretationTokens.filter(it =>
        swarmLawTokenIds.has(it.fromTokenId) || swarmLawTokenIds.has(it.toNodeId)
      );

      // Get acted-upon token IDs from swarm updates
      const actedTokenIds = new Set(
        swarmUpdates
          .filter(u => u.status === SwarmUpdateStatus.acted)
          .map(u => u.tokenId)
      );

      // Filter out tokens created by the caller and already acted upon
      const unvotedLawTokens = swarmLawTokens.filter(lt =>
        lt.creator.toString() !== callerPrincipal && !actedTokenIds.has(lt.id)
      );

      const unvotedInterpretationTokens = swarmInterpretationTokens.filter(it =>
        it.creator.toString() !== callerPrincipal && !actedTokenIds.has(it.id)
      );

      return {
        lawTokens: unvotedLawTokens,
        interpretationTokens: unvotedInterpretationTokens,
      };
    },
    enabled: !!actor && !isFetching && !!swarmId && !!identity,
  });
}

export function useMarkSwarmUpdateActed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({ nodeId, isUpvote }: { nodeId: string; isUpvote: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      if (isUpvote) {
        return actor.upvoteNode(nodeId);
      } else {
        return actor.downvoteNode(nodeId);
      }
    },
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['unvotedTokens'] });
      queryClient.invalidateQueries({ queryKey: ['voteData', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}
