import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BuzzLeaderboardEntry,
  BuzzScore,
  ChatChannelSummary,
  ChatMessage,
  GraphData,
  NodeId,
  backendInterface,
} from "../backend";
import { createActor as createBaseActor } from "../backend";
import type { CreateActorOptions, ExternalBlob } from "../backend";

function createActorWithDefaults(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateActorOptions = {},
) {
  return createBaseActor(canisterId, _uploadFile, _downloadFile, {
    ...options,
    agentOptions: {
      ...options.agentOptions,
      retryTimes: 1,
    },
  });
}

// Typed wrapper to get a properly-typed backend actor
export function useBackendActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const result = useActor(
    createActorWithDefaults as unknown as Parameters<typeof useActor>[0],
  );
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
  sources: [],
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

export function useGetBuzzLeaderboard() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<BuzzLeaderboardEntry[]>({
    queryKey: ["buzzLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBuzzLeaderboard(BigInt(10));
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

import type { BuzzBackendExtensions } from "../types/buzzExtensions.d";
import type {
  TrustBackendExtensions,
  TrustTransaction,
} from "../types/trustExtensions.d";

type BuzzActor = backendInterface & BuzzBackendExtensions;

export function useGenerateBuzzSecret() {
  const { actor } = useBackendActor();

  return useMutation({
    mutationFn: async (score: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as unknown as BuzzActor).generateBuzzSecret(score);
    },
  });
}

export function useRedeemBuzzSecret() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secret: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as unknown as BuzzActor).redeemBuzzSecret(secret);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myBuzzBalance"] });
    },
  });
}

export function useGetMyTrustBalance() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<bigint>({
    queryKey: ["myTrustBalance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return (actor as unknown as TrustBackendExtensions).getMyTrustBalance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

export function useSavePublishedGraph() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      publishedGraphId,
      selectedContributionIds,
    }: {
      publishedGraphId: string;
      selectedContributionIds: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return await (
        actor as unknown as TrustBackendExtensions
      ).savePublishedGraph(publishedGraphId, selectedContributionIds);
    },
    onSuccess: (data) => {
      if ("ok" in data) {
        queryClient.invalidateQueries({ queryKey: ["myTrustBalance"] });
        queryClient.invalidateQueries({ queryKey: ["hasUserSavedGraph"] });
        queryClient.invalidateQueries({ queryKey: ["graphContributions"] });
      }
    },
  });
}

export function useHasUserSavedGraph(publishedGraphId: string | null) {
  const { actor } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: [
      "hasUserSavedGraph",
      publishedGraphId,
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor || !publishedGraphId) return false;
      return (actor as unknown as TrustBackendExtensions).hasUserSavedGraph(
        publishedGraphId,
      );
    },
    enabled: !!actor && !!publishedGraphId && !!identity,
  });
}

export function useGetMyTrustTransactions() {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();

  return useQuery<TrustTransaction[]>({
    queryKey: [
      "myTrustTransactions",
      identity?.getPrincipal().toText() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor) return [];
      return (
        actor as unknown as TrustBackendExtensions
      ).getMyTrustTransactions();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

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
    refetchInterval: 10000,
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
