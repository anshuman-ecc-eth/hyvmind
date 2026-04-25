import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import type { PublishedNodeInfo, SourceGraph } from "../types/sourceGraph";
import { generateTruchetArtwork } from "../utils/truchetGenerator";
import { usePublishMappings } from "./usePublishMappings";

export type PublishCommitResult =
  | {
      type: "success";
      nodeMappings: [string, string][];
      message: string;
      publishedSourceGraphId?: string;
    }
  | {
      type: "error";
      message: string;
      failedAt: { nodeType: string; name: string } | null;
    };

// Exported so usePublishPreview can import it
export function sourceGraphToInput(graph: SourceGraph) {
  const nodes = graph.nodes.map((node) => ({
    id: node.id ?? undefined,
    name: node.name,
    nodeType: node.nodeType,
    jurisdiction: node.jurisdiction ?? undefined,
    tags: node.tags ?? [],
    content: node.content ?? undefined,
    parentName: node.parentName ?? undefined,
    attributes: Object.entries(node.attributes ?? {}).map(
      ([key, value]) => [key, [value]] as [string, string[]],
    ),
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PublishCommitResult | null>(
    null,
  );
  const { getMappingsObject, saveMappings, getMappings } = usePublishMappings();

  async function commit(
    graph: SourceGraph,
    isUpdate: boolean,
  ): Promise<PublishCommitResult> {
    if (!actor) throw new Error("Actor not available");
    setIsPublishing(true);
    setError(null);

    try {
      const mappingsObj = getMappingsObject(graph.id);
      const existingMappings: [string, string][] = Object.entries(mappingsObj);
      console.log("🔵 [PUBLISH] commit() called");
      console.log("🔵 [PUBLISH] graph.nodes count:", graph.nodes.length);
      console.log("🔵 [PUBLISH] graph.edges count:", graph.edges.length);
      console.log(
        "🔵 [PUBLISH] full edges:",
        JSON.stringify(graph.edges, null, 2),
      );
      console.log("🔵 [PUBLISH] isUpdate:", isUpdate);
      console.log("🔵 [PUBLISH] existingMappings:", existingMappings);
      const input = sourceGraphToInput(graph);
      console.log("🔵 [PUBLISH] input.nodes count:", input.nodes.length);
      console.log("🔵 [PUBLISH] input.edges count:", input.edges.length);
      console.log(
        "🔵 [PUBLISH] full input.edges:",
        JSON.stringify(input.edges, null, 2),
      );
      const rawResult = await actor.commitPublishSourceGraph(
        input,
        existingMappings,
      );

      let result: PublishCommitResult;

      if (rawResult.__kind__ === "success") {
        result = {
          type: "success",
          nodeMappings: rawResult.success.nodeMappings,
          message: rawResult.success.message,
          publishedSourceGraphId: rawResult.success.publishedSourceGraphId,
        };

        const newMappings: PublishedNodeInfo[] =
          rawResult.success.nodeMappings.map(([localName, backendId]) => ({
            localName,
            backendId,
            nodeType:
              graph.nodes.find((n) => n.name === localName)?.nodeType ??
              "unknown",
            publishedAt: Date.now(),
          }));

        if (!isUpdate) {
          saveMappings(graph.id, newMappings);
        } else {
          const existing = getMappings(graph.id);
          const merged = [
            ...existing.filter(
              (e) => !newMappings.find((n) => n.localName === e.localName),
            ),
            ...newMappings,
          ];
          saveMappings(graph.id, merged);
        }

        queryClient.invalidateQueries({ queryKey: ["graphData"] });
        queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
        queryClient.invalidateQueries({ queryKey: ["publishedSourceGraphs"] });

        // After a brand-new publish, generate truchet artwork in the background
        if (!isUpdate && rawResult.success.publishedSourceGraphId) {
          const graphId = rawResult.success.publishedSourceGraphId;
          const graphName = graph.name;
          const actorRef = actor;
          setTimeout(async () => {
            try {
              const dataUrl = await generateTruchetArtwork(graphName, "full");
              if (dataUrl && actorRef) {
                await (actorRef as backendInterface).updateSourceGraphArtwork(
                  graphId,
                  dataUrl,
                );
              }
            } catch (artErr) {
              console.warn(
                "[ARTWORK] Failed to generate/save artwork:",
                artErr,
              );
            }
          }, 0);
        }
      } else {
        result = {
          type: "error",
          message: rawResult.error.message,
          failedAt: rawResult.error.failedAt ?? null,
        };
        setError(rawResult.error.message);
      }

      setLastResult(result);
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsPublishing(false);
    }
  }

  function reset() {
    setError(null);
    setLastResult(null);
  }

  return { commit, isPublishing, error, lastResult, reset };
}
