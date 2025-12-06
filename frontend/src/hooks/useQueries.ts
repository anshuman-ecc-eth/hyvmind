import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Swarm, Annotation, Location, DigitalAsset, Frame } from '../backend';
import { AnnotationType } from '../backend';
import { toast } from 'sonner';

// Local type definitions for filters and graph data (not exported from backend)
export interface AnnotationFilter {
  tokens?: string[];
  annotationType?: AnnotationType;
  jurisdiction?: string;
  propertyKey?: string;
  propertyValue?: string;
  locationId?: bigint;
}

export interface GraphNode {
  id: bigint;
  nodeLabel: string;
  type_: string;
  swarmId: bigint;
  approvalScore: bigint;
  properties: [string, string][];
}

export interface GraphEdge {
  id: bigint;
  source: bigint;
  target: bigint;
  edgeLabel: string;
  type_: string;
  approvalScore: bigint;
  properties: [string, string][];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  swarms: Swarm[];
  annotations: Annotation[];
  locations: Location[];
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: isReady,
    retry: false,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: !isReady || query.isLoading,
    isFetched: isReady && query.isFetched,
  };
}

export function useGetOrCreateCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  const query = useQuery<UserProfile>({
    queryKey: ['currentUserProfile', 'getOrCreate'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getOrCreateCallerUserProfile();
    },
    enabled: isReady,
    retry: 1,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: !isReady || query.isLoading,
    isFetched: isReady && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save profile');
    },
  });
}

export function useUpdateCallerUsername() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newName: string) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.updateCallerUsername(newName);
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['currentUserProfile'], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Username updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update username');
    },
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useResetAllData() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.resetAllData();
    },
    onSuccess: () => {
      queryClient.clear();
      toast.success('All data has been reset successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset data');
    },
  });
}

// Swarm Queries
export function useGetCallerSwarms() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Swarm[]>({
    queryKey: ['callerSwarms'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerSwarms();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSwarm() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      jurisdiction: string;
      isPublic: boolean;
      tags: string[];
    }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.createSwarm(
        params.title,
        params.description,
        params.jurisdiction,
        params.isPublic,
        params.tags
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerSwarms'] });
      queryClient.invalidateQueries({ queryKey: ['publicSwarms'] });
      queryClient.invalidateQueries({ queryKey: ['allJurisdictions'] });
      toast.success('Swarm created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create swarm');
    },
  });
}

export function useJoinSwarm() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (swarmId: bigint) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.joinSwarm(swarmId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicSwarms'] });
      queryClient.invalidateQueries({ queryKey: ['callerSwarms'] });
      queryClient.invalidateQueries({ queryKey: ['swarmDetail'] });
      toast.success('Successfully joined swarm');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join swarm');
    },
  });
}

// Annotation Queries
export function useGetCallerAnnotations() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Annotation[]>({
    queryKey: ['callerAnnotations'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerAnnotations();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateAnnotation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      content: string;
      annotationType: AnnotationType;
      swarmId: bigint;
      isPublic: boolean;
      referenceIds: bigint[];
      properties: [string, string][];
      linkedLocationIds: bigint[];
      extractedTokens: string[];
    }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.createAnnotation(
        params.content,
        params.annotationType,
        params.swarmId,
        params.isPublic,
        params.referenceIds,
        params.properties,
        params.linkedLocationIds,
        params.extractedTokens
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
      queryClient.invalidateQueries({ queryKey: ['allTokens'] });
      queryClient.invalidateQueries({ queryKey: ['allPropertiesKeys'] });
      queryClient.invalidateQueries({ queryKey: ['allPropertiesValues'] });
      toast.success('Annotation created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create annotation');
    },
  });
}

export function useUpdateAnnotation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      content: string;
      annotationType: AnnotationType;
      properties: [string, string][];
      linkedLocationIds: bigint[];
      extractedTokens: string[];
    }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.updateAnnotation(
        params.id,
        params.content,
        params.annotationType,
        params.properties,
        params.linkedLocationIds,
        params.extractedTokens
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
      queryClient.invalidateQueries({ queryKey: ['allTokens'] });
      queryClient.invalidateQueries({ queryKey: ['allPropertiesKeys'] });
      queryClient.invalidateQueries({ queryKey: ['allPropertiesValues'] });
      toast.success('Annotation updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update annotation');
    },
  });
}

export function useDeleteAnnotation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotationId: bigint) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.deleteAnnotation(annotationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
      toast.success('Annotation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete annotation');
    },
  });
}

export function useForkAnnotation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotationId: bigint) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.forkAnnotation(annotationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
      toast.success('Annotation forked successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to fork annotation');
    },
  });
}

export function useToggleAnnotationVisibility() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: bigint; isPublic: boolean }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.toggleAnnotationVisibility(id, isPublic);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle visibility');
    },
  });
}

// Approval Mutation
export function useApproveAnnotation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId, isApproval }: { annotationId: bigint; isApproval: boolean }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.approveAnnotation(annotationId, isApproval);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['swarmDetail'] });
      
      if (variables.isApproval) {
        toast.success('Approved successfully! Credits awarded.');
      } else {
        toast.success('Disapproved successfully.');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve annotation');
    },
  });
}

// Token Queries
export function useGetAllTokens() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<string[]>({
    queryKey: ['allTokens'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTokens();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useGetAllJurisdictions() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<string[]>({
    queryKey: ['allJurisdictions'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllJurisdictions();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useGetAllPropertiesKeys() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<string[]>({
    queryKey: ['allPropertiesKeys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPropertiesKeys();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useGetAllPropertiesValues() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<string[]>({
    queryKey: ['allPropertiesValues'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPropertiesValues();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// Location Queries
export function useGetAllLocations() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Location[]>({
    queryKey: ['allLocations'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllLocations();
    },
    enabled: isReady,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useGetCallerLocations() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Location[]>({
    queryKey: ['callerLocations'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerLocations();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useGetLocation(locationId: bigint | null) {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Location | null>({
    queryKey: ['location', locationId?.toString()],
    queryFn: async () => {
      if (!actor || !locationId) return null;
      return actor.getLocation(locationId);
    },
    enabled: isReady && !!locationId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateLocation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      content: string;
      metadata: [string, string][];
      parentIds: bigint[];
      siblingIds: bigint[];
    }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.createLocation(
        params.title,
        params.content,
        params.metadata,
        params.parentIds,
        [],
        params.siblingIds
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLocations'] });
      queryClient.invalidateQueries({ queryKey: ['callerLocations'] });
      toast.success('Location created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create location');
    },
  });
}

export function useUpdateLocation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      title: string;
      content: string;
      metadata: [string, string][];
      parentIds: bigint[];
      siblingIds: bigint[];
    }) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.updateLocation(
        params.id,
        params.title,
        params.content,
        params.metadata,
        params.parentIds,
        [],
        params.siblingIds
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLocations'] });
      queryClient.invalidateQueries({ queryKey: ['callerLocations'] });
      queryClient.invalidateQueries({ queryKey: ['location'] });
      toast.success('Location updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update location');
    },
  });
}

export function useDeleteLocation() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: bigint) => {
      if (!isReady || !actor) {
        throw new Error('Connection not ready. Please wait...');
      }
      return actor.deleteLocation(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLocations'] });
      queryClient.invalidateQueries({ queryKey: ['callerLocations'] });
      queryClient.invalidateQueries({ queryKey: ['location'] });
      toast.success('Location deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete location');
    },
  });
}

// Digital Asset Queries
export function useGetCallerDigitalAssets() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<DigitalAsset[]>({
    queryKey: ['callerDigitalAssets'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerDigitalAssets();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// Frame Queries
export function useGetCallerFrames() {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  return useQuery<Frame[]>({
    queryKey: ['callerFrames'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerFrames();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
