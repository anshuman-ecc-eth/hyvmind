/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { GraphData, UserProfile, NodeId, MembershipInfo, Swarm, CustomAttribute, Tag, VoteData, BuzzLeaderboardEntry, SearchResult } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { createActorWithConfig } from '../config';

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
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

// Graph Data Query (authenticated) with manual refresh only
export function useGetGraphData() {
  const { actor, isFetching } = useActor();

  return useQuery<GraphData>({
    queryKey: ['graphData'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getGraphData();
    },
    enabled: !!actor && !isFetching,
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Keep data in cache indefinitely
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchInterval: false, // Disable polling
  });
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

  // Note: Duplicate tokens are allowed and handled by the backend
  // The backend will reuse existing tokens within the same Swarm
  // Only tokens from different Swarms/Curations are treated as new

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
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
      // Invalidate all related queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['graphData'] });
      await queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
      await queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['customAttributeKeys'] });
      
      // Force refetch to ensure UI updates with new law tokens
      await queryClient.refetchQueries({ queryKey: ['graphData'] });
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
      fromLawTokenId: NodeId;
      fromRelationshipType: string;
      toNodeId: NodeId;
      toRelationshipType: string;
      customAttributes: CustomAttribute[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInterpretationToken(
        data.title,
        data.context,
        data.fromLawTokenId,
        data.fromRelationshipType,
        data.toNodeId,
        data.toRelationshipType,
        data.customAttributes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
      queryClient.invalidateQueries({ queryKey: ['publicGraphData'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['customAttributeKeys'] });
    },
  });
}

// Helper function to convert any principal format to Principal object
function ensurePrincipal(value: any): Principal {
  // If it's already a Principal instance, return it
  if (value && typeof value === 'object' && '_isPrincipal' in value) {
    return value as Principal;
  }
  
  // If it's a serialized principal object with __principal__ property
  if (value && typeof value === 'object' && '__principal__' in value) {
    return Principal.fromText(value.__principal__);
  }
  
  // If it's a string, try to parse it as a principal
  if (typeof value === 'string') {
    return Principal.fromText(value);
  }
  
  // If it has a toString method, use it
  if (value && typeof value.toString === 'function') {
    const principalStr = value.toString();
    return Principal.fromText(principalStr);
  }
  
  throw new Error('Invalid principal format');
}

// Swarm Membership Queries and Mutations
export function useGetSwarmMembers(swarmId: NodeId | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['swarmMembers', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) throw new Error('Actor or swarmId not available');
      return actor.getSwarmMembers(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetSwarmMembershipRequests(swarmId: NodeId | null) {
  const { actor, isFetching } = useActor();

  return useQuery<MembershipInfo[]>({
    queryKey: ['swarmMembershipRequests', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) throw new Error('Actor or swarmId not available');
      return actor.getSwarmMembershipRequests(swarmId);
    },
    enabled: !!actor && !isFetching && !!swarmId,
  });
}

export function useGetSwarmsByCreator() {
  const { actor, isFetching } = useActor();

  return useQuery<Swarm[]>({
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
    mutationFn: async (swarmId: NodeId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestToJoinSwarm(swarmId);
    },
    onSuccess: (_, swarmId) => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembers', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { swarmId: NodeId; member: Principal | string | any }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Convert member to proper Principal object
      let memberPrincipal: Principal;
      try {
        memberPrincipal = ensurePrincipal(data.member);
      } catch (error) {
        throw new Error(`Invalid principal format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return actor.approveJoinRequest(data.swarmId, memberPrincipal);
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['swarmMembers', data.swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarmMembershipRequests', data.swarmId] });
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
    },
  });
}

// Voting Queries and Mutations
export function useGetVoteData(nodeId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<VoteData>({
    queryKey: ['voteData', nodeId],
    queryFn: async () => {
      if (!actor || !nodeId) throw new Error('Actor or nodeId not available');
      return actor.getVoteData(nodeId);
    },
    enabled: !!actor && !isFetching && !!nodeId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });
}

export function useHasUserVoted(nodeId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean | null>({
    queryKey: ['hasUserVoted', nodeId],
    queryFn: async () => {
      if (!actor || !nodeId) return null;
      return actor.hasUserVoted(nodeId);
    },
    enabled: !!actor && !isFetching && !!nodeId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
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
      // Invalidate all vote-related queries to ensure global sync
      queryClient.invalidateQueries({ queryKey: ['voteData'] });
      queryClient.invalidateQueries({ queryKey: ['hasUserVoted'] });
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
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
      // Invalidate all vote-related queries to ensure global sync
      queryClient.invalidateQueries({ queryKey: ['voteData'] });
      queryClient.invalidateQueries({ queryKey: ['hasUserVoted'] });
      queryClient.invalidateQueries({ queryKey: ['graphData'] });
      queryClient.invalidateQueries({ queryKey: ['buzzLeaderboard'] });
    },
  });
}

// BUZZ Leaderboard Query
export function useGetBuzzLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<BuzzLeaderboardEntry[]>({
    queryKey: ['buzzLeaderboard'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBuzzLeaderboard();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Custom Attribute Search Queries
export function useGetAllCustomAttributeKeys() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['customAttributeKeys'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllCustomAttributeKeys();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60000, // 1 minute
  });
}

export function useGetAttributeValuesForKey(key: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['attributeValues', key],
    queryFn: async () => {
      if (!actor || !key) throw new Error('Actor or key not available');
      return actor.getAttributeValuesForKey(key);
    },
    enabled: !!actor && !isFetching && !!key,
    staleTime: 60000, // 1 minute
  });
}

export function useSearchNodesByAttribute() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.searchNodesByAttribute(data.key, data.value);
    },
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Data Reset Mutation
export function useResetAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.resetAllData();
    },
    onSuccess: () => {
      // Clear all cached data after reset
      queryClient.clear();
    },
  });
}
