import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  PublishedSourceGraphMeta as BackendPublishedSourceGraphMeta,
  GraphData,
  backendInterface,
} from "../backend.d";

// ---------------------------------------------------------------------------
// Types — re-exported for consumers
// ---------------------------------------------------------------------------

// Re-export the generated type so pages can import from this hook file
export type PublishedSourceGraphMeta = BackendPublishedSourceGraphMeta;

// The backend type uses Principal for creator; the generated bindings handle
// the Principal↔string conversion, so ExtensionEntry fields are bigints.
export type { ExtensionEntry } from "../backend.d";

// ---------------------------------------------------------------------------
// Typed actor helper (same pattern as useQueries.ts)
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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all published source graph metadata.
 */
export function usePublishedSourceGraphs() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<PublishedSourceGraphMeta[]>({
    queryKey: ["publishedSourceGraphs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPublishedSourceGraphs();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Fetches the full GraphData for a single published source graph.
 * Returns null when the id is null or when the backend returns an empty optional.
 */
export function usePublishedSourceGraph(id: string | null) {
  const { actor, isFetching } = useBackendActor();

  return useQuery<GraphData | null>({
    queryKey: ["publishedSourceGraph", id],
    queryFn: async (): Promise<GraphData | null> => {
      if (!actor || !id) return null;
      // getPublishedSourceGraph returns GraphData | null (generated binding handles optional)
      return actor.getPublishedSourceGraph(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}
