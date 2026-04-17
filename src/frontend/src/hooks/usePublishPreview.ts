import { useActor } from "@caffeineai/core-infrastructure";
import { useState } from "react";
import { createActor } from "../backend";
import type {
  EdgeOperation as BackendEdgeOperation,
  NodeOperation as BackendNodeOperation,
  PublishPreviewResult as BackendPublishPreviewResult,
  backendInterface,
} from "../backend";
import type {
  AttributeChange,
  EdgeOperation,
  NodeOperation,
  PublishPreviewResult,
  SourceGraph,
} from "../types/sourceGraph";
import { sourceGraphToInput } from "./usePublishGraph";
import { usePublishMappings } from "./usePublishMappings";

// Map raw backend NodeOperation to frontend NodeOperation
function mapNodeOperation(raw: BackendNodeOperation): NodeOperation {
  let action: "create" | "update";
  let attributeChanges: AttributeChange[] | undefined;

  if (raw.action.__kind__ === "update") {
    action = "update";
    attributeChanges = raw.action.update.map((c) => ({
      key: c.key,
      newValues: c.newValues,
      oldValues: c.oldValues.map((wv) => ({
        value: wv.value,
        weight: Number(wv.weight),
      })),
    }));
  } else {
    action = "create";
  }

  return {
    nodeType: raw.nodeType,
    localName: raw.localName,
    backendId: raw.backendId ?? null,
    parentName: raw.parentName ?? null,
    action,
    attributeChanges,
    attributes: raw.attributes,
  };
}

// Map raw backend EdgeOperation to frontend EdgeOperation
function mapEdgeOperation(raw: BackendEdgeOperation): EdgeOperation {
  let action: "create" | "update";
  let newLabels: string[] | undefined;

  if (raw.action.__kind__ === "update") {
    action = "update";
    newLabels = raw.action.update.newLabels;
  } else {
    action = "create";
  }

  return {
    sourceName: raw.sourceName,
    targetName: raw.targetName,
    sourceId: raw.sourceId ?? null,
    targetId: raw.targetId ?? null,
    action,
    labels: raw.labels,
    bidirectional: raw.bidirectional,
    newLabels,
  };
}

// Map the full backend PublishPreviewResult to the frontend type
function mapPreviewResult(
  raw: BackendPublishPreviewResult,
): PublishPreviewResult {
  return {
    nodeOperations: raw.nodeOperations.map(mapNodeOperation),
    edgeOperations: raw.edgeOperations.map(mapEdgeOperation),
    summary: {
      nodesToCreate: Number(raw.summary.nodesToCreate),
      nodesToUpdate: Number(raw.summary.nodesToUpdate),
      edgesToCreate: Number(raw.summary.edgesToCreate),
      edgesToUpdate: Number(raw.summary.edgesToUpdate),
    },
  };
}

export function usePublishPreview() {
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const [previewResult, setPreviewResult] =
    useState<PublishPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedGraphId, setCachedGraphId] = useState<string | null>(null);
  const { getMappingsObject } = usePublishMappings();

  async function preview(graph: SourceGraph): Promise<PublishPreviewResult> {
    if (cachedGraphId === graph.id && previewResult) return previewResult;
    if (!actor) throw new Error("Actor not available");

    setIsLoading(true);
    setError(null);
    try {
      const mappingsObj = getMappingsObject(graph.id);
      const existingMappings: [string, string][] = Object.entries(mappingsObj);
      const input = sourceGraphToInput(graph);
      const raw = await actor.previewPublishSourceGraph(
        input,
        existingMappings,
      );
      const mapped = mapPreviewResult(raw);
      setPreviewResult(mapped);
      setCachedGraphId(graph.id);
      return mapped;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }

  function invalidateCache() {
    setPreviewResult(null);
    setCachedGraphId(null);
    setError(null);
  }

  function hasCache(graphId: string): boolean {
    return cachedGraphId === graphId && previewResult !== null;
  }

  return {
    previewResult,
    isLoading,
    error,
    preview,
    invalidateCache,
    hasCache,
  };
}
