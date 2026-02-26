import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { GraphData, UserProfile, NodeId, MembershipInfo, Swarm, CustomAttribute, Tag, BuzzLeaderboardEntry, Directionality, BuzzScore, LawToken, InterpretationToken, MintSettings, CollectibleEdition, MintCollectibleRequest, MintCollectibleResult } from '../backend';
import { Variant_lawToken_interpretationToken } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { createActorWithConfig } from '../config';
import { useState, useEffect } from 'react';

// Cache key for localStorage
const TREE_CACHE_KEY = 'hyvmind_tree_cache';
const TREE_CACHE_TIMESTAMP_KEY = 'hyvmind_tree_cache_timestamp';

// Helper to get cached tree data from localStorage
function getCachedTreeData(): GraphData | null {
  try {
    const cached = localStorage.getItem(TREE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error('Failed to load cached tree data:', error);
    return null;
  }
}

// Helper to save tree data to localStorage
function saveCachedTreeData(data: GraphData) {
  try {
    localStorage.setItem(TREE_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(TREE_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to save tree data to cache:', error);
  }
}

// Helper to clear cached tree data
export function clearTreeCache() {
  try {
    localStorage.removeItem(TREE_CACHE_KEY);
    localStorage.removeItem(TREE_CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear tree cache:', error);
  }
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
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

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', user?.toString()],
    queryFn: async () => {
      if (!actor || !user) throw new Error('Actor or user not available');
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
    retry: false,
    staleTime: 300000, // 5 minutes - profiles don't change often
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
    },
  });
}

// Admin Check Query
export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 300000, // 5 minutes - admin status doesn't change often
  });
}

// Direct BUZZ balance query using getMyBuzzBalance() — single source of truth for wallet display
export function useGetMyBuzzBalance() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<BuzzScore>({
    queryKey: ['myBuzzBalance'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMyBuzzBalance();
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// NFT Gallery Queries - fetch user's Law Tokens and Interpretation Tokens
export function useGetUserLawTokens() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<LawToken[]>({
    queryKey: ['userLawTokens'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      
      const currentPrincipal = identity.getPrincipal().toString();
      const graphData = await actor.getGraphData();
      
      // Filter law tokens created by current user
      return graphData.lawTokens.filter(
        (token) => token.creator.toString() === currentPrincipal
      );
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 60000, // 1 minute
  });
}

export function useGetUserInterpretationTokens() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<InterpretationToken[]>({
    queryKey: ['userInterpretationTokens'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      
      const currentPrincipal = identity.getPrincipal().toString();
      const graphData = await actor.getGraphData();
      
      // Filter interpretation tokens created by current user
      return graphData.interpretationTokens.filter(
        (token) => token.creator.toString() === currentPrincipal
      );
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 60000, // 1 minute
  });
}

// Mint Settings Queries
export function useGetMintSettings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MintSettings>({
    queryKey: ['mintSettings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMintSettings();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 300000, // 5 minutes
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

// Collectible Editions Query
export function useGetCollectibleEditions(tokenId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<CollectibleEdition[]>({
    queryKey: ['collectibleEditions', tokenId],
    queryFn: async () => {
      if (!actor || !tokenId) throw new Error('Actor or tokenId not available');
      return actor.getCollectibleEditions(tokenId);
    },
    enabled: !!actor && !actorFetching && !!tokenId,
    staleTime: 30000, // 30 seconds
  });
}

// Mint Collectible Mutation
export function useMintCollectible() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MintCollectibleRequest): Promise<MintCollectibleResult> => {
      if (!actor) throw new Error('Actor not available');
      return actor.mintCollectible(request);
    },
    onSuccess: (_data, variables) => {
      // Invalidate editions for this specific token
      queryClient.invalidateQueries({ queryKey: ['collectibleEditions', variables.tokenId] });
      // Invalidate BUZZ balance since BUZZ was deducted
      queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

// Graph Data Query with incremental loading and persistent caching
export function useGetGraphData() {
  const { actor, isFetching } = useActor();
  const [cachedData, setCachedData] = useState<GraphData | null>(null);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);

  // Load cached data immediately on mount
  useEffect(() => {
    const cached = getCachedTreeData();
    if (cached) {
      setCachedData(cached);
    }
    setIsLoadingFromCache(false);
  }, []);

  const query = useQuery<GraphData>({
    queryKey: ['graphData'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const freshData = await actor.getGraphData();
      
      // Save fresh data to cache
      saveCachedTreeData(freshData);
      
      return freshData;
    },
    enabled: !!actor && !isFetching,
    staleTime: 120000, // 2 minutes
    gcTime: Infinity, // Keep data in cache indefinitely
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchInterval: false, // Disable polling
    initialData: cachedData || undefined, // Use cached data as initial data
  });

  // Return cached data immediately if available, then fresh data when loaded
  return {
    ...query,
    data: query.data || cachedData || undefined,
    isLoading: isLoadingFromCache || (query.isLoading && !cachedData),
    isFetching: query.isFetching,
  };
}

// Public Graph Data Query (no authentication required, uses anonymous actor)
export function useGetPublicGraphData() {
  return useQuery<GraphData>({
    queryKey: ['publicGraphData'],
    queryFn: async () => {
      // Create an anonymous actor (no identity)
      const anonymousActor = await createActorWithConfig();
      if (!anonymousActor) {
        throw new Error('Failed to create anonymous actor');
      }
      return anonymousActor.getGraphData();
    },
    staleTime: 60000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
  });
}

// Helper function to extract original law token sequence from content
function extractLawTokenSequence(content: string): string {
  const matches = content.match(/\{[^}]+\}/g);
  return matches ? matches.join('') : '';
}

// Helper function to validate law token content
function validateLawTokenContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: true }; // Empty content is valid (no tokens)
  }

  // Check for unmatched opening braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    return { 
      valid: false, 
      error: `Unmatched curly braces: found ${openBraces} opening and ${closeBraces} closing braces. Each '{' must have a matching '}'.` 
    };
  }

  // Check for nested braces (not supported)
  let depth = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
      if (depth > 1) {
        return { 
          valid: false, 
          error: 'Nested curly braces are not supported. Each token should be wrapped in a single pair of braces like {token}.' 
        };
      }
    } else if (content[i] === '}') {
      depth--;
      if (depth < 0) {
        return { 
          valid: false, 
          error: 'Invalid brace sequence: closing brace without matching opening brace.' 
        };
      }
    }
  }

  // Check for empty tokens
  const emptyTokenPattern = /\{\s*\}/;
  if (emptyTokenPattern.test(content)) {
    return { 
      valid: false, 
      error: 'Empty tokens are not allowed. Each token must contain at least one non-whitespace character.' 
    };
  }

  return { valid: true };
}

// Node Creation Mutations
export function useCreateCuration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; jurisdiction: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCuration(data.name, data.jurisdiction);
    },
    onSuccess: async () => {
      // Fetch fresh data and update cache
      await queryClient.invalidateQueries({ queryKey: ['graphData'] });
      await queryClient.refetchQueries({ queryKey: ['graphData'] });
      queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
    },
  });
}

export function useCreateSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      tags: Tag[];
      parentCurationId: NodeId;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createSwarm(data.name, data.tags, data.parentCurationId);
    },
    onSuccess: async () => {
      // Fetch fresh data and update cache
      await queryClient.invalidateQueries({ queryKey: ['graphData'] });
      await queryClient.refetchQueries({ queryKey: ['graphData'] });
      queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
      queryClient.invalidateQueries({ queryKey: ['swarmsByCreator'] });
    },
  });
}

export function useCreateLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      customAttributes: CustomAttribute[];
      parentSwarmId: NodeId;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate content before sending to backend
      const validation = validateLawTokenContent(data.content);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid token content');
      }

      const originalTokenSequence = extractLawTokenSequence(data.content);
      
      try {
        const locationId = await actor.createLocation(
          data.title,
          data.content,
          originalTokenSequence,
          data.customAttributes,
          data.parentSwarmId
        );
        
        // Wait a bit for law tokens to be created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return locationId;
      } catch (error) {
        // Enhanced error handling for backend traps
        if (error instanceof Error) {
          // Check for common backend error patterns
          if (error.message.includes('trap')) {
            throw new Error('Failed to create location. Please check your input and try again.');
          }
          if (error.message.includes('Unauthorized')) {
            throw new Error('You do not have permission to create locations in this swarm.');
          }
          if (error.message.includes('Parent swarm does not exist')) {
            throw new Error('The selected swarm no longer exists.');
          }
        }
        throw error;
      }
    },
    onSuccess: async () => {
      // Fetch fresh data and update cache
      await queryClient.invalidateQueries({ queryKey: ['graphData'] });
      await queryClient.refetchQueries({ queryKey: ['graphData'] });
      await queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
      await queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['userLawTokens'] });
    },
    onError: (error) => {
      console.error('Location creation error:', error);
    },
  });
}

export function useCreateInterpretationToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      context: string;
      fromTokenId: NodeId;
      fromRelationshipType: string;
      fromDirectionality: Directionality;
      toNodeId: NodeId;
      toRelationshipType: string;
      toDirectionality: Directionality;
      customAttributes: CustomAttribute[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInterpretationToken(
        data.title,
        data.context,
        data.fromTokenId,
        data.fromRelationshipType,
        data.fromDirectionality,
        data.toNodeId,
        data.toRelationshipType,
        data.toDirectionality,
        data.customAttributes
      );
    },
    onSuccess: async () => {
      // Fetch fresh data and update cache
      await queryClient.invalidateQueries({ queryKey: ['graphData'] });
      await queryClient.refetchQueries({ queryKey: ['graphData'] });
      await queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
      await queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['userInterpretationTokens'] });
    },
  });
}

// Voting Mutations
export function useUpvoteNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: NodeId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.upvoteNode(nodeId);
    },
    onSuccess: (_data, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ['voteData', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
    },
  });
}

export function useDownvoteNode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: NodeId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.downvoteNode(nodeId);
    },
    onSuccess: (_data, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ['voteData', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['myBuzzBalance'] });
    },
  });
}

export function useGetVoteData(nodeId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{ upvotes: bigint; downvotes: bigint }>({
    queryKey: ['voteData', nodeId],
    queryFn: async () => {
      if (!actor || !nodeId) throw new Error('Actor or nodeId not available');
      return actor.getVoteData(nodeId);
    },
    enabled: !!actor && !actorFetching && !!nodeId,
    staleTime: 30000,
  });
}

// Swarm Membership Queries
export function useGetSwarmsByCreator() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Swarm[]>({
    queryKey: ['swarmsByCreator'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSwarmsByCreator();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
  });
}

export function useGetSwarmMembers(swarmId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['swarmMembers', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) throw new Error('Actor or swarmId not available');
      return actor.getSwarmMembers(swarmId);
    },
    enabled: !!actor && !actorFetching && !!swarmId,
    staleTime: 60000,
  });
}

export function useGetSwarmMembershipRequests(swarmId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MembershipInfo[]>({
    queryKey: ['swarmMembershipRequests', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) throw new Error('Actor or swarmId not available');
      return actor.getSwarmMembershipRequests(swarmId);
    },
    enabled: !!actor && !actorFetching && !!swarmId,
    staleTime: 30000,
  });
}

export function useRequestToJoinSwarm() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (swarmId: NodeId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestToJoinSwarm(swarmId);
    },
    onSuccess: (_data, swarmId) => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembers', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests', swarmId] });
    },
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ swarmId, member }: { swarmId: NodeId; member: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveJoinRequest(swarmId, member);
    },
    onSuccess: (_data, { swarmId }) => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembers', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests', swarmId] });
    },
  });
}

// BUZZ Leaderboard Query
export function useGetBuzzLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BuzzLeaderboardEntry[]>({
    queryKey: ['buzzLeaderboard'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBuzzLeaderboard();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000, // 1 minute
  });
}

// Approval Queries
export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 300000,
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
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['listApprovals'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30000,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: any }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

export function useAssignCallerUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: any }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
    },
  });
}

// Swarm Updates Query
export function useGetSwarmUpdatesForUser(swarmId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['swarmUpdates', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) throw new Error('Actor or swarmId not available');
      return actor.getSwarmUpdatesForUser(swarmId);
    },
    enabled: !!actor && !actorFetching && !!swarmId,
    staleTime: 30000,
  });
}

// Unvoted tokens for swarm (derived from graph data + vote tracking)
export function useGetUnvotedTokensForSwarm(swarmId: NodeId | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['unvotedTokens', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId || !identity) throw new Error('Actor, swarmId, or identity not available');
      
      const graphData = await actor.getGraphData();
      const currentPrincipal = identity.getPrincipal().toString();
      
      // Get all tokens in this swarm
      const swarmLocations = graphData.locations.filter(l => l.parentSwarmId === swarmId);
      const locationIds = new Set(swarmLocations.map(l => l.id));
      
      const swarmLawTokens = graphData.lawTokens.filter(t => locationIds.has(t.parentLocationId));
      const lawTokenIds = new Set(swarmLawTokens.map(t => t.id));
      
      const swarmInterpretationTokens = graphData.interpretationTokens.filter(t => 
        lawTokenIds.has(t.fromTokenId) || lawTokenIds.has(t.toNodeId)
      );
      
      // Filter out tokens created by current user
      const otherLawTokens = swarmLawTokens.filter(t => t.creator.toString() !== currentPrincipal);
      const otherInterpretationTokens = swarmInterpretationTokens.filter(t => t.creator.toString() !== currentPrincipal);
      
      return {
        lawTokens: otherLawTokens,
        interpretationTokens: otherInterpretationTokens,
      };
    },
    enabled: !!actor && !actorFetching && !!swarmId && !!identity,
    staleTime: 30000,
  });
}

// Admin Data Reset Mutation
export function useResetAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.resetAllData();
    },
    onSuccess: () => {
      // Clear all cached queries after reset
      queryClient.clear();
      clearTreeCache();
    },
  });
}
