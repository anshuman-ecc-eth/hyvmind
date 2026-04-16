import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import type { SourceGraph } from "../types/sourceGraph";

// Convert SourceGraph to the input format expected by publishSourceGraph
function sourceGraphToInput(graph: SourceGraph) {
  const nodes = graph.nodes.map((node) => ({
    name: node.name,
    nodeType: node.nodeType,
    jurisdiction: node.jurisdiction ? [node.jurisdiction] : [],
    tags: node.tags ?? [],
    content: node.content ?? "",
    parentName: node.parentName ? [node.parentName] : [],
    attributes: Object.entries(node.attributes ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
  }));

  const edges = graph.edges.map((edge) => ({
    sourceName: edge.source,
    targetName: edge.target,
    label: edge.label ?? "",
    bidirectional: edge.bidirectional ?? false,
  }));

  return { nodes, edges };
}

export function usePublishGraph() {
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, SourceGraph>({
    mutationFn: async (graph: SourceGraph) => {
      if (!actor) throw new Error("Actor not available");
      const actorAny = actor as any;
      if (typeof actorAny.publishSourceGraph !== "function") {
        throw new Error(
          "publishSourceGraph is not available on the backend yet. Please deploy the updated backend first.",
        );
      }
      const input = sourceGraphToInput(graph);
      return actorAny.publishSourceGraph(input);
    },
    onSuccess: () => {
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
