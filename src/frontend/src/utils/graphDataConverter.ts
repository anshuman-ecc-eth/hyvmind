import type {
  GraphData,
  GraphEdge,
  WeightedAttribute,
  WeightedValue,
} from "../backend.d";
import { Directionality } from "../backend.d";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a single WeightedValue as "value" or "value(×N)" when weight > 1.
 */
function formatWeightedValue(wv: WeightedValue): string {
  const w = Number(wv.weight);
  return w > 1 ? `${wv.value}(×${w})` : wv.value;
}

/**
 * Converts backend WeightedAttribute[] to a flat Record<string, string>.
 * Multiple values for the same key are joined with ", ".
 */
function convertWeightedAttributes(
  attrs: WeightedAttribute[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of attrs) {
    result[attr.key] = attr.weightedValues.map(formatWeightedValue).join(", ");
  }
  return result;
}

/**
 * Determines whether a GraphEdge is bidirectional, handling both the enum
 * form (Directionality.bidirectional) and any object/string variants that
 * the Motoko JS serialiser may produce at runtime.
 */
function isBidirectional(directionality: GraphEdge["directionality"]): boolean {
  if (directionality === Directionality.bidirectional) return true;
  // Motoko variant objects: { bidirectional: null }
  if (
    typeof directionality === "object" &&
    directionality !== null &&
    "bidirectional" in directionality
  )
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Converts backend GraphData into the frontend SourceGraph format used by
 * SourceGraphDiagram.
 *
 * @param data    GraphData returned from the backend
 * @param name    Display name for the graph
 * @param id      Optional stable identifier (defaults to first curation id)
 */
export function graphDataToSourceGraph(
  data: GraphData,
  name: string,
  id?: string,
): SourceGraph {
  // ------------------------------------------------------------------
  // Build ID → display-name lookup
  // ------------------------------------------------------------------
  const idToName = new Map<string, string>();

  for (const c of data.curations) idToName.set(c.id, c.name);
  for (const s of data.swarms) idToName.set(s.id, s.name);
  for (const l of data.locations) idToName.set(l.id, l.title);
  for (const lt of data.lawTokens) idToName.set(lt.id, lt.tokenLabel);
  for (const it of data.interpretationTokens) idToName.set(it.id, it.title);

  // ------------------------------------------------------------------
  // Convert each entity type to SourceNode
  // ------------------------------------------------------------------
  const curationNodes: SourceNode[] = data.curations.map((c) => ({
    id: c.id,
    name: c.name,
    nodeType: "curation" as const,
    attributes: convertWeightedAttributes(c.customAttributes),
  }));

  const swarmNodes: SourceNode[] = data.swarms.map((s) => ({
    id: s.id,
    name: s.name,
    nodeType: "swarm" as const,
    parentName: idToName.get(s.parentCurationId),
    tags: s.tags,
    attributes: convertWeightedAttributes(s.customAttributes),
  }));

  const locationNodes: SourceNode[] = data.locations.map((l) => ({
    id: l.id,
    name: l.title,
    nodeType: "location" as const,
    parentName: idToName.get(l.parentSwarmId),
    attributes: convertWeightedAttributes(l.customAttributes),
  }));

  const lawTokenNodes: SourceNode[] = data.lawTokens.map((lt) => ({
    id: lt.id,
    name: lt.tokenLabel,
    nodeType: "lawEntity" as const,
    parentName: idToName.get(lt.parentLocationId),
    attributes: convertWeightedAttributes(lt.customAttributes),
  }));

  const interpNodes: SourceNode[] = data.interpretationTokens.map((it) => ({
    id: it.id,
    name: it.title,
    nodeType: "interpEntity" as const,
    parentName: idToName.get(it.parentLawTokenId),
    // contentVersions holds historical content; use most recent version if available
    content:
      it.contentVersions.length > 0
        ? it.contentVersions[it.contentVersions.length - 1].content
        : undefined,
    attributes: convertWeightedAttributes(it.customAttributes),
  }));

  // ------------------------------------------------------------------
  // Convert edges — source/target are backend NodeIds (UUIDs); map to names
  // for SourceGraphDiagram which matches edges against node.id
  // ------------------------------------------------------------------
  const edges: Edge[] = data.edges.map((e) => ({
    // Use the UUID directly — SourceGraphDiagram matches node.id, and nodes
    // above are created with id = backend UUID.
    source: e.source,
    target: e.target,
    label: e.edgeLabel || undefined,
    bidirectional: isBidirectional(e.directionality),
  }));

  // ------------------------------------------------------------------
  // Assemble result
  // ------------------------------------------------------------------
  const nodes: SourceNode[] = [
    ...curationNodes,
    ...swarmNodes,
    ...locationNodes,
    ...lawTokenNodes,
    ...interpNodes,
  ];

  return {
    id: id ?? data.curations[0]?.id ?? "unknown",
    name,
    nodes,
    edges,
    createdAt: Date.now(),
  };
}
