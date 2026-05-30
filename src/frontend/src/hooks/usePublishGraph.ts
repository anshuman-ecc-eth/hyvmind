import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import type { SourceRef } from "../types/sourceGraph";
import type {
  PublishedNodeInfo,
  SourceGraph,
  SourceNode,
} from "../types/sourceGraph";
import { generateTerrainArtwork } from "../utils/perlinTerrainGenerator";
import { usePublishMappings } from "./usePublishMappings";

export type PublishCommitResult =
  | {
      type: "success";
      nodeMappings: [string, string][];
      message: string;
      publishedSourceGraphId?: string;
      buzzCost: number;
    }
  | {
      type: "error";
      message: string;
      failedAt: { nodeType: string; name: string } | null;
    };

function parentIdFromPath(id: string): string | null {
  const lastAt = id.lastIndexOf("@");
  return lastAt > 0 ? id.slice(0, lastAt) : null;
}

// Exported so usePublishPreview can import it
export function sourceGraphToInput(graph: SourceGraph) {
  // Build an id-to-node lookup map for ancestor-walk (id-keyed to avoid name collisions)
  const nodeMap = new Map<string, SourceNode>();
  for (const n of graph.nodes) {
    const key = n.id ?? n.name;
    if (key) nodeMap.set(key, n);
  }

  const nodes = graph.nodes.map((node) => {
    // Walk ancestor chain via @-path derivation (avoids name collision bugs)
    const ancestorChain: Record<string, unknown>[] = [];
    const ancestorSourceChain: SourceRef[][] = [];
    let currentId = node.id ? parentIdFromPath(node.id) : null;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const ancestor = nodeMap.get(currentId);
      if (!ancestor) break;
      if (ancestor.attributes && Object.keys(ancestor.attributes).length > 0) {
        ancestorChain.push(ancestor.attributes);
      }
      if (ancestor.sources && ancestor.sources.length > 0) {
        ancestorSourceChain.push(ancestor.sources);
      }
      currentId = parentIdFromPath(currentId);
    }

    // Merge attributes: farthest ancestor first, own attributes override all
    const merged: Record<string, unknown> = {};
    for (let i = ancestorChain.length - 1; i >= 0; i--) {
      Object.assign(merged, ancestorChain[i]);
    }
    Object.assign(merged, node.attributes ?? {});

    // Merge sources: farthest ancestor first, then closer ancestors, then own
    const rawMergedSources: SourceRef[] = [];
    for (let i = ancestorSourceChain.length - 1; i >= 0; i--) {
      rawMergedSources.push(...ancestorSourceChain[i]);
    }
    if (node.sources && node.sources.length > 0) {
      rawMergedSources.push(...node.sources);
    }

    // Deduplicate sources by name|url key
    const seen = new Set<string>();
    const mergedSources: SourceRef[] = [];
    for (const s of rawMergedSources) {
      const key = `${s.name}|${s.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        mergedSources.push(s);
      }
    }

    return {
      id: node.id ?? undefined,
      name: node.name,
      nodeType: node.nodeType,
      tags: [],
      content: node.content ?? undefined,
      parentName: node.parentName ?? undefined,
      attributes: Object.entries(merged).map(
        ([key, value]) =>
          [key, Array.isArray(value) ? value.map(String) : [String(value)]] as [
            string,
            string[],
          ],
      ),
      sources: mergedSources,
    };
  });

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
      const rawResult = (await actor.commitPublishSourceGraph(
        input,
        existingMappings,
      )) as
        | {
            __kind__: "success";
            success: {
              publishedSourceGraphId?: string;
              message: string;
              nodeMappings: [string, string][];
              buzzCost: bigint;
            };
          }
        | {
            __kind__: "error";
            error: {
              message: string;
              failedAt?: { name: string; nodeType: string };
            };
          };

      let result: PublishCommitResult;

      if (rawResult.__kind__ === "success") {
        result = {
          type: "success",
          nodeMappings: rawResult.success.nodeMappings,
          message: rawResult.success.message,
          publishedSourceGraphId: rawResult.success.publishedSourceGraphId,
          buzzCost: Number(rawResult.success.buzzCost),
        };

        const newMappings: PublishedNodeInfo[] =
          rawResult.success.nodeMappings.map(([localName, backendId]) => ({
            localName,
            backendId,
            nodeType:
              graph.nodes.find((n) => (n.id ?? n.name) === localName)
                ?.nodeType ?? "unknown",
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
        queryClient.invalidateQueries({ queryKey: ["myBuzzBalance"] });

        // After a brand-new publish, generate terrain artwork in the background
        if (!isUpdate && rawResult.success.publishedSourceGraphId) {
          const graphId = rawResult.success.publishedSourceGraphId;
          const graphName = graph.name;
          const actorRef = actor;
          setTimeout(async () => {
            try {
              const { dataUrl, params } = await generateTerrainArtwork(
                graphName,
                "full",
                "topdown",
              );
              if (dataUrl && actorRef) {
                await (actorRef as backendInterface).updateSourceGraphArtwork(
                  graphId,
                  dataUrl,
                );
                try {
                  await (
                    actorRef as backendInterface
                  ).updateSourceGraphTerrainParams(
                    graphId,
                    JSON.stringify(params),
                  );
                } catch (paramsErr) {
                  console.warn(
                    "[ARTWORK] Failed to save terrain params:",
                    paramsErr,
                  );
                }
              }
            } catch (artErr) {
              console.warn(
                "[ARTWORK] Failed to generate/save terrain artwork:",
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
