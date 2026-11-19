import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";

// ---------------------------------------------------------------------------
// Principal link (hyvmind.xyz)
//
// The link is owner-initiated: the app user mints a short code, the xyz backend
// resolves it, shows a confirmation card, then calls confirmLink. This hook
// only covers the app side of that flow.
// ---------------------------------------------------------------------------

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

export interface PrincipalLink {
  xyzPrincipal: string;
  linkedAt: bigint;
}

export function useMyLink() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<PrincipalLink | null>({
    queryKey: ["myLink"],
    queryFn: async () => {
      if (!actor) return null;
      const link = await actor.getMyLink();
      if (!link) return null;
      return {
        xyzPrincipal: link.xyzPrincipal.toText(),
        linkedAt: link.linkedAt,
      };
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useBeginLink() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.beginLink();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLink"] });
    },
  });
}

export function useRevokeLink() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.revokeLink();
      if (result.__kind__ === "err") throw new Error(result.err);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLink"] });
    },
  });
}
