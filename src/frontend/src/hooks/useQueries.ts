import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BuzzScore,
  CollectibleEdition,
  Curation,
  CustomAttribute,
  Directionality,
  GraphData,
  GraphEdge,
  GraphNode,
  InterpretationToken,
  LawToken,
  Location,
  MintCollectibleRequest,
  MintSettings,
  NodeId,
  OwnedGraphData,
  Sublocation,
  Swarm,
  Tag,
} from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// Build a GraphData-compatible object from OwnedGraphData by constructing
// rootNodes and edges client-side from the flat owned arrays.
function buildGraphDataFromOwned(owned: OwnedGraphData): GraphData {
  const { curations, swarms, locations, lawTokens, interpretationTokens } =
    owned;

  const edges: GraphEdge[] = [];

  if (owned.edges && owned.edges.length > 0) {
    for (const edge of owned.edges) {
      edges.push(edge);
    }
  } else {
    for (const lawToken of lawTokens) {
      edges.push({ source: lawToken.parentLocationId, target: lawToken.id });
    }
  }
  for (const location of locations) {
    edges.push({ source: location.parentSwarmId, target: location.id });
  }
  for (const swarm of swarms) {
    edges.push({ source: swarm.parentCurationId, target: swarm.id });
  }
  for (const it of interpretationTokens) {
    edges.push({ source: it.fromTokenId, target: it.id });
    edges.push({ source: it.id, target: it.toNodeId });
  }

  function buildLawTokenNode(lt: LawToken): GraphNode {
    const children: GraphNode[] = interpretationTokens
      .filter((it) => it.fromTokenId === lt.id)
      .map((it) => ({
        id: it.id,
        nodeType: "interpretationToken",
        tokenLabel: it.title,
        jurisdiction: undefined,
        parentId: lt.id,
        children: [],
      }));
    return {
      id: lt.id,
      nodeType: "lawToken",
      tokenLabel: lt.tokenLabel,
      jurisdiction: undefined,
      parentId: lt.parentLocationId,
      children,
    };
  }

  function buildLocationNode(loc: Location): GraphNode {
    const children: GraphNode[] = lawTokens
      .filter((lt) => lt.parentLocationId === loc.id)
      .map((lt) => buildLawTokenNode(lt));
    return {
      id: loc.id,
      nodeType: "location",
      tokenLabel: loc.title,
      jurisdiction: undefined,
      parentId: loc.parentSwarmId,
      children,
    };
  }

  function buildSwarmNode(swarm: Swarm): GraphNode {
    const children: GraphNode[] = locations
      .filter((loc) => loc.parentSwarmId === swarm.id)
      .map((loc) => buildLocationNode(loc));
    return {
      id: swarm.id,
      nodeType: "swarm",
      tokenLabel: swarm.name,
      jurisdiction: undefined,
      parentId: swarm.parentCurationId,
      children,
    };
  }

  const rootNodes: GraphNode[] = curations.map((curation) => {
    const children: GraphNode[] = swarms
      .filter((s) => s.parentCurationId === curation.id)
      .map((s) => buildSwarmNode(s));
    return {
      id: curation.id,
      nodeType: "curation",
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
    sublocations: owned.sublocations ?? [],
    rootNodes,
    edges,
  };
}

// Helper to clear cached tree data (kept for backward compatibility with Header)
export function clearTreeCache() {
  try {
    localStorage.removeItem("hyvmind_tree_cache");
    localStorage.removeItem("hyvmind_tree_cache_timestamp");
  } catch {
    // ignore
  }
}

export function useGetOwnedData() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<GraphData>({
    queryKey: ["graphData", identity?.getPrincipal().toText() ?? "anonymous"],
    queryFn: async () => {
      if (!actor)
        return {
          curations: [],
          swarms: [],
          locations: [],
          lawTokens: [],
          interpretationTokens: [],
          sublocations: [],
          rootNodes: [],
          edges: [],
        };
      const owned = await actor.getOwnedData();
      return buildGraphDataFromOwned(owned);
    },
    enabled: !!actor && !isFetching,
  });
}

// Fetches all graph data (not just owned) — used for the Swarms tab
export function useGetAllData() {
  const { actor, isFetching } = useActor();

  return useQuery<GraphData>({
    queryKey: ["allGraphData"],
    queryFn: async () => {
      if (!actor)
        return {
          curations: [],
          swarms: [],
          locations: [],
          lawTokens: [],
          interpretationTokens: [],
          sublocations: [],
          rootNodes: [],
          edges: [],
        };
      return actor.getAllData();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetArchivedNodeIds() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<NodeId[]>({
    queryKey: [
      "archivedNodeIds",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
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
    mutationFn: async ({
      name,
      jurisdiction,
    }: { name: string; jurisdiction: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createCuration(name, jurisdiction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useCreateSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      tags,
      parentCurationId,
    }: { name: string; tags: Tag[]; parentCurationId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createSwarm(name, tags, parentCurationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
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
      if (!actor) throw new Error("Actor not available");
      return actor.createLocation(
        title,
        content,
        originalTokenSequence,
        customAttributes,
        parentSwarmId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useCreateSublocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      originalTokenSequence,
      parentLawTokenIds,
    }: {
      title: string;
      content: string;
      originalTokenSequence: string;
      parentLawTokenIds: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createSublocation(
        title,
        content,
        originalTokenSequence,
        parentLawTokenIds,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
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
      if (!actor) throw new Error("Actor not available");
      return actor.createInterpretationToken(
        title,
        context,
        fromTokenId,
        fromRelationshipType,
        fromDirectionality,
        toNodeId,
        toRelationshipType,
        toDirectionality,
        customAttributes,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useCreateLawTokenForLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meaning,
      customAttributes,
      parentLocationId,
    }: {
      meaning: string;
      customAttributes: CustomAttribute[];
      parentLocationId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const trimmedMeaning = meaning.trim();
      const wrappedContent = `{${trimmedMeaning}}`;
      return actor.createLocation(
        trimmedMeaning.slice(0, 80),
        wrappedContent,
        wrappedContent,
        customAttributes,
        parentLocationId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["isCallerApproved"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["listApprovals"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listApprovals"] });
    },
  });
}

export function useAssignCallerUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: any; role: any }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
    },
  });
}

export function useJoinSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (swarmId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.joinSwarm(swarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swarmMembers"] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
    },
  });
}

export function useGetSwarmForks(swarmId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["swarmForks", swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) return [];
      return actor.getSwarmForks(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function usePullFromSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<string, Error, { sourceSwarmId: string }>({
    mutationFn: async ({ sourceSwarmId }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.pullFromSwarm(sourceSwarmId);
    },
    onSuccess: (_, { sourceSwarmId }) => {
      queryClient.invalidateQueries({
        queryKey: ["swarmForks", sourceSwarmId],
      });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useGetSwarmMembers(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ["swarmMembers", swarmId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSwarmMembers(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useCreateSwarmFork() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (swarmId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createSwarmFork(swarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swarmForks"] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["hasFork"] });
    },
  });
}

export function useLeaveSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (swarmId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.leaveSwarm(swarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swarmMembers"] });
      queryClient.invalidateQueries({ queryKey: ["hasFork"] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
    },
  });
}

export function useHasFork(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["hasFork", swarmId],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasUserFork(swarmId);
    },
    enabled: !!actor && !!swarmId && !isFetching,
  });
}

export function useGetSwarmsByCreator() {
  const { actor, isFetching } = useActor();

  return useQuery<Swarm[]>({
    queryKey: ["swarmsByCreator"],
    queryFn: async () => {
      if (!actor) return [];
      return []; // method removed from backend
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSwarmUpdatesForUser(swarmId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ["swarmUpdates", swarmId],
    queryFn: async () => {
      if (!actor) return [];
      return []; // method removed from backend
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetUnvotedTokensForSwarm(swarmId: string) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["unvotedTokens", swarmId, identity?.getPrincipal().toText()],
    queryFn: async () => {
      if (!actor || !identity)
        return { lawTokens: [], interpretationTokens: [] };
      const graphData = await actor.getAllData();
      const swarmLocations = graphData.locations.filter(
        (l) => l.parentSwarmId === swarmId,
      );
      const locationIds = new Set(swarmLocations.map((l) => l.id));
      const swarmLawTokens = graphData.lawTokens.filter((lt) =>
        locationIds.has(lt.parentLocationId),
      );
      const lawTokenIds = new Set(swarmLawTokens.map((lt) => lt.id));
      const swarmInterpTokens = graphData.interpretationTokens.filter(
        (it) => lawTokenIds.has(it.fromTokenId) || lawTokenIds.has(it.toNodeId),
      );
      return {
        lawTokens: swarmLawTokens,
        interpretationTokens: swarmInterpTokens,
      };
    },
    enabled: !!actor && !isFetching && !!swarmId && !!identity,
  });
}

export function useGetVoteData(nodeId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["voteData", nodeId],
    queryFn: async () => {
      if (!actor) return { upvotes: BigInt(0), downvotes: BigInt(0) };
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
      if (!actor) throw new Error("Actor not available");
      return actor.upvoteNode(nodeId);
    },
    onSuccess: (_data, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ["voteData", nodeId] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useDownvoteNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.downvoteNode(nodeId);
    },
    onSuccess: (_data, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ["voteData", nodeId] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

export function useGetBuzzLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ["buzzLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return []; // method removed from backend
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyBuzzBalance() {
  const { actor, isFetching } = useActor();

  return useQuery<BuzzScore>({
    queryKey: ["myBuzzBalance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getMyBuzzBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMintSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<MintSettings>({
    queryKey: ["mintSettings"],
    queryFn: async () => {
      if (!actor) return { numCopies: BigInt(1) };
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
      if (!actor) throw new Error("Actor not available");
      return actor.setMintSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mintSettings"] });
    },
  });
}

export function useMintCollectible() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MintCollectibleRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.mintCollectible(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectibleEditions"] });
      queryClient.invalidateQueries({ queryKey: ["myBuzzBalance"] });
    },
  });
}

export function useGetCollectibleEditions(tokenId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<CollectibleEdition[]>({
    queryKey: ["collectibleEditions", tokenId],
    queryFn: async () => {
      if (!actor || !tokenId) return [];
      return actor.getCollectibleEditions(tokenId);
    },
    enabled: !!actor && !isFetching && !!tokenId,
  });
}

export function useArchiveNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.archiveNode(nodeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
      queryClient.invalidateQueries({ queryKey: ["archivedNodeIds"] });
    },
  });
}

export function useGetUserProfile(userPrincipal: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userProfile", userPrincipal],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      try {
        return await actor.getUserProfile(userPrincipal as any);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}

// Returns law tokens owned by the current caller (from their owned graph data)
export function useGetUserLawTokens() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<LawToken[]>({
    queryKey: [
      "userLawTokens",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor) return [];
      const owned = await actor.getOwnedData();
      return owned.lawTokens;
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

// Returns interpretation tokens owned by the current caller (from their owned graph data)
export function useGetUserInterpretationTokens() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<InterpretationToken[]>({
    queryKey: [
      "userInterpretationTokens",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor) return [];
      const owned = await actor.getOwnedData();
      return owned.interpretationTokens;
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

// Resets all application data (admin only)
export function useResetAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.resetAllData();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
