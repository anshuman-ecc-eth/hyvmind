import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublishResult } from "../backend";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import type { SourceGraph } from "../types/sourceGraph";

// Convert SourceGraph to the input format expected by publishSourceGraph
function sourceGraphToInput(graph: SourceGraph) {
  const nodes = graph.nodes.map((node) => ({
    name: node.name,
    nodeType: node.nodeType,
    jurisdiction: node.jurisdiction ? node.jurisdiction : undefined,
    tags: node.tags ?? [],
    content: node.content ?? undefined,
    parentName: node.parentName ? node.parentName : undefined,
    attributes: Object.entries(node.attributes ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
  }));

  const edges = graph.edges.map((edge) => ({
    sourceName: edge.source,
    targetName: edge.target,
    edgeLabel: edge.label ?? "",
    bidirectional: edge.bidirectional ?? false,
  }));

  return { nodes, edges };
}

export function usePublishGraph() {
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const queryClient = useQueryClient();

  const mutation = useMutation<PublishResult, Error, SourceGraph>({
    mutationFn: async (graph: SourceGraph) => {
      if (!actor) throw new Error("Actor not available");
      const input = sourceGraphToInput(graph);
      return actor.publishSourceGraph(input);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "error") {
        // Don't invalidate on error — data is unchanged
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
    },
  });

  return {
    publish: mutation.mutateAsync,
    isPublishing: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  };
}
