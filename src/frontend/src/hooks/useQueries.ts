import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BuzzScore,
  ChatChannelSummary,
  ChatMessage,
  CollectibleEdition,
  Curation,
  GraphData,
  GraphNode,
  InterpretationToken,
  LawToken,
  Location,
  MintCollectibleRequest,
  MintSettings,
  NodeId,
  Swarm,
  backendInterface,
} from "../backend";
import { createActor } from "../backend";

// Typed wrapper to get a properly-typed backend actor
function useBackendActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const result = useActor(createActor as Parameters<typeof useActor>[0]);
  return {
    actor: result.actor as backendInterface | null,
    isFetching: result.isFetching,
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

const EMPTY_GRAPH_DATA: GraphData = {
  curations: [],
  swarms: [],
  locations: [],
  lawTokens: [],
  interpretationTokens: [],
  rootNodes: [],
  edges: [],
};

// Returns an empty graph — getOwnedData was removed from the backend.
// Callers that need graph data should use usePublishedSourceGraphs or
// usePublishedSourceGraph(id) from usePublicGraphs.ts instead.
export function useGetOwnedData() {
  return useQuery<GraphData>({
    queryKey: ["graphData", "deprecated"],
    queryFn: async () => EMPTY_GRAPH_DATA,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useGetArchivedNodeIds() {
  const { actor, isFetching } = useBackendActor();
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

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor, isFetching } = useBackendActor();

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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor } = useBackendActor();
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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor, isFetching } = useBackendActor();

  return useQuery<Swarm[]>({
    queryKey: ["swarmsByCreator"],
    queryFn: async () => {
      if (!actor) return [];
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSwarmUpdatesForUser(swarmId: string) {
  const { actor, isFetching } = useBackendActor();

  return useQuery<any[]>({
    queryKey: ["swarmUpdates", swarmId],
    queryFn: async () => {
      if (!actor) return [];
      return [];
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetUnvotedTokensForSwarm(swarmId: string) {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["unvotedTokens", swarmId, identity?.getPrincipal().toText()],
    queryFn: async () => {
      // getAllData removed — return empty; vote functionality is no longer active
      return { lawTokens: [], interpretationTokens: [] };
    },
    enabled: !!actor && !isFetching && !!swarmId && !!identity,
  });
}

export function useGetVoteData(nodeId: string) {
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

  return useQuery<any[]>({
    queryKey: ["buzzLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyBuzzBalance() {
  const { actor, isFetching } = useBackendActor();

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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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
  const { actor } = useBackendActor();
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
  const { actor, isFetching } = useBackendActor();

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

export function useGetUserLawTokens() {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<LawToken[]>({
    queryKey: [
      "userLawTokens",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      // getOwnedData removed — return empty
      return [];
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetUserInterpretationTokens() {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<InterpretationToken[]>({
    queryKey: [
      "userInterpretationTokens",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      // getOwnedData removed — return empty
      return [];
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

// Resets all application data (admin only)
export function useResetAllData() {
  const { actor } = useBackendActor();
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

// Publish source graph to backend (legacy hook — publishSourceGraph was removed;
// use usePublishGraph from hooks/usePublishGraph.ts which calls commitPublishSourceGraph)
export function usePublishSourceGraph() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Parameters<backendInterface["commitPublishSourceGraph"]>[0],
    ) => {
      if (!actor) throw new Error("Actor not available");
      return actor.commitPublishSourceGraph(input, []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });
}

// ─── Chat Hooks ───────────────────────────────────────────────────────────────

export function useGetChatChannels() {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<ChatChannelSummary[]>({
    queryKey: ["chatChannels"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChannels();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 3000,
  });
}

export function useGetChatMessages(channelId: string | null) {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<ChatMessage[]>({
    queryKey: ["chatMessages", channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      const result = await actor.getMessages(channelId);
      if ("ok" in result) return result.ok;
      return [];
    },
    enabled: !!actor && !isFetching && !!identity && !!channelId,
    refetchInterval: 3000,
  });
}

export function useSendChatMessage() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      text,
    }: {
      channelId: string;
      text: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendMessage(channelId, text);
    },
    onSuccess: (_data, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["chatChannels"] });
      queryClient.invalidateQueries({ queryKey: ["chatMessages", channelId] });
    },
  });
}
