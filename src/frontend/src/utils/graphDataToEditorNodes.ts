import type { GraphData } from "../backend.d";
import type { EditorNode } from "../types/markdownEditor";
import type { SourceRef } from "../types/sourceGraph";
import {
  convertSources,
  convertWeightedAttributes,
} from "./graphDataConverter";
import { parseFrontmatter, stripFrontmatter } from "./sourceGraphParser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely convert backend SourceRef[] to frontend SourceRef[].
 * Returns an empty array when undefined/empty.
 */
function toSourceRefs(
  sources: Array<{ name: string; url: string }> | undefined,
): SourceRef[] {
  const converted = convertSources(sources);
  return converted ?? [];
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Converts a subset of a published graph (identified by selectedNodeIds)
 * into a Map<string, EditorNode> and a rootIds array suitable for import
 * into the Notes editor via importRawNodes().
 *
 * @param graphData       Full published graph data returned by the backend.
 * @param selectedNodeIds Set of backend NodeIds (UUIDs) the user selected.
 * @param graphName       Display name for the graph (used as curation name fallback).
 */
export function graphDataToEditorNodes(
  graphData: GraphData,
  selectedNodeIds: Set<string>,
  _graphName: string,
): { nodes: Map<string, EditorNode>; rootIds: string[] } {
  // ------------------------------------------------------------------
  // Step 1: Build id → display-name lookup
  // ------------------------------------------------------------------
  const idToName = new Map<string, string>();
  for (const c of graphData.curations) idToName.set(c.id, c.name);
  for (const s of graphData.swarms) idToName.set(s.id, s.name);
  for (const l of graphData.locations) idToName.set(l.id, l.title);
  for (const lt of graphData.lawTokens) idToName.set(lt.id, lt.tokenLabel);
  for (const it of graphData.interpretationTokens)
    idToName.set(it.id, it.title);

  // Build quick lookup maps for parent resolution
  const swarmById = new Map(graphData.swarms.map((s) => [s.id, s]));
  const locationById = new Map(graphData.locations.map((l) => [l.id, l]));
  const lawTokenById = new Map(graphData.lawTokens.map((lt) => [lt.id, lt]));

  // ------------------------------------------------------------------
  // Step 2: Walk up parent chains for each selected node to auto-include
  // required ancestors. Mutate selectedNodeIds in-place.
  // ------------------------------------------------------------------
  const idsSnapshot = Array.from(selectedNodeIds);

  for (const id of idsSnapshot) {
    // swarm → add parentCurationId
    const swarm = swarmById.get(id);
    if (swarm) {
      selectedNodeIds.add(swarm.parentCurationId);
      continue;
    }

    // location → add parentSwarmId + that swarm's parentCurationId
    const location = locationById.get(id);
    if (location) {
      selectedNodeIds.add(location.parentSwarmId);
      const parentSwarm = swarmById.get(location.parentSwarmId);
      if (parentSwarm) selectedNodeIds.add(parentSwarm.parentCurationId);
      continue;
    }

    // lawToken → add parentLocationId, its parentSwarmId, and that swarm's parentCurationId
    const lawToken = lawTokenById.get(id);
    if (lawToken) {
      selectedNodeIds.add(lawToken.parentLocationId);
      const parentLocation = locationById.get(lawToken.parentLocationId);
      if (parentLocation) {
        selectedNodeIds.add(parentLocation.parentSwarmId);
        const parentSwarm = swarmById.get(parentLocation.parentSwarmId);
        if (parentSwarm) selectedNodeIds.add(parentSwarm.parentCurationId);
      }
      continue;
    }

    // interpToken → add parentLawTokenId, then walk up the chain
    const interpToken = graphData.interpretationTokens.find(
      (it) => it.id === id,
    );
    if (interpToken) {
      selectedNodeIds.add(interpToken.parentLawTokenId);
      const parentLawToken = lawTokenById.get(interpToken.parentLawTokenId);
      if (parentLawToken) {
        selectedNodeIds.add(parentLawToken.parentLocationId);
        const parentLocation = locationById.get(
          parentLawToken.parentLocationId,
        );
        if (parentLocation) {
          selectedNodeIds.add(parentLocation.parentSwarmId);
          const parentSwarm = swarmById.get(parentLocation.parentSwarmId);
          if (parentSwarm) selectedNodeIds.add(parentSwarm.parentCurationId);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 3 & 4: Build @-path IDs and construct EditorNodes
  // ------------------------------------------------------------------
  const nodes = new Map<string, EditorNode>();
  const now = Date.now();

  // Helper: resolve a display name by ID, falling back to the ID itself
  const name = (id: string): string => idToName.get(id) ?? id;

  // Curations (depth 0, no parent)
  for (const c of graphData.curations) {
    if (!selectedNodeIds.has(c.id)) continue;
    const pathId = c.name;
    const node: EditorNode = {
      id: pathId,
      name: c.name,
      type: "folder",
      parentId: null,
      nodeType: "curation",
      frontmatter: { _backendId: c.id },
      inheritedAttributes: convertWeightedAttributes(c.customAttributes),
      inheritedSources: toSourceRefs(c.sources),
      children: [],
      createdAt: Number(c.timestamps.createdAt) / 1_000_000,
      updatedAt: now,
    };
    nodes.set(pathId, node);
  }

  // Swarms (depth 1)
  for (const s of graphData.swarms) {
    if (!selectedNodeIds.has(s.id)) continue;
    const parentCurationName = name(s.parentCurationId);
    const pathId = `${parentCurationName}@${s.name}`;
    const parentPathId = parentCurationName;
    const node: EditorNode = {
      id: pathId,
      name: s.name,
      type: "folder",
      parentId: parentPathId,
      nodeType: "swarm",
      frontmatter: { _backendId: s.id },
      inheritedAttributes: convertWeightedAttributes(s.customAttributes),
      inheritedSources: toSourceRefs(s.sources),
      children: [],
      createdAt: Number(s.timestamps.createdAt) / 1_000_000,
      updatedAt: now,
    };
    nodes.set(pathId, node);
  }

  // Locations (depth 2)
  for (const l of graphData.locations) {
    if (!selectedNodeIds.has(l.id)) continue;
    const parentSwarm = swarmById.get(l.parentSwarmId);
    const parentCurationName = parentSwarm
      ? name(parentSwarm.parentCurationId)
      : "";
    const parentSwarmName = name(l.parentSwarmId);
    const pathId = `${parentCurationName}@${parentSwarmName}@${l.title}`;
    const parentPathId = `${parentCurationName}@${parentSwarmName}`;
    const node: EditorNode = {
      id: pathId,
      name: l.title,
      type: "folder",
      parentId: parentPathId,
      nodeType: "location",
      frontmatter: { _backendId: l.id },
      inheritedAttributes: convertWeightedAttributes(l.customAttributes),
      inheritedSources: toSourceRefs(l.sources),
      children: [],
      createdAt: Number(l.timestamps.createdAt) / 1_000_000,
      updatedAt: now,
    };
    nodes.set(pathId, node);
  }

  // LawTokens (depth 3)
  for (const lt of graphData.lawTokens) {
    if (!selectedNodeIds.has(lt.id)) continue;
    const parentLocation = locationById.get(lt.parentLocationId);
    const parentSwarm = parentLocation
      ? swarmById.get(parentLocation.parentSwarmId)
      : undefined;
    const parentCurationName = parentSwarm
      ? name(parentSwarm.parentCurationId)
      : "";
    const parentSwarmName = parentLocation
      ? name(parentLocation.parentSwarmId)
      : "";
    const parentLocationTitle = parentLocation
      ? parentLocation.title
      : name(lt.parentLocationId);
    const pathId = `${parentCurationName}@${parentSwarmName}@${parentLocationTitle}@${lt.tokenLabel}`;
    const parentPathId = `${parentCurationName}@${parentSwarmName}@${parentLocationTitle}`;
    const node: EditorNode = {
      id: pathId,
      name: lt.tokenLabel,
      type: "folder",
      parentId: parentPathId,
      nodeType: "lawEntity",
      frontmatter: { _backendId: lt.id },
      inheritedAttributes: convertWeightedAttributes(lt.customAttributes),
      inheritedSources: toSourceRefs(lt.sources),
      children: [],
      createdAt: Number(lt.timestamps.createdAt) / 1_000_000,
      updatedAt: now,
    };
    nodes.set(pathId, node);
  }

  // InterpretationTokens (depth 4, type "file")
  for (const it of graphData.interpretationTokens) {
    if (!selectedNodeIds.has(it.id)) continue;
    const parentLawToken = lawTokenById.get(it.parentLawTokenId);
    const parentLocation = parentLawToken
      ? locationById.get(parentLawToken.parentLocationId)
      : undefined;
    const parentSwarm = parentLocation
      ? swarmById.get(parentLocation.parentSwarmId)
      : undefined;
    const parentCurationName = parentSwarm
      ? name(parentSwarm.parentCurationId)
      : "";
    const parentSwarmName = parentLocation
      ? name(parentLocation.parentSwarmId)
      : "";
    const parentLocationTitle = parentLocation ? parentLocation.title : "";
    const parentLawLabel = parentLawToken
      ? parentLawToken.tokenLabel
      : name(it.parentLawTokenId);
    const pathId = `${parentCurationName}@${parentSwarmName}@${parentLocationTitle}@${parentLawLabel}@${it.title}`;
    const parentPathId = `${parentCurationName}@${parentSwarmName}@${parentLocationTitle}@${parentLawLabel}`;

    // Extract last content version
    const rawContent =
      it.contentVersions.length > 0
        ? it.contentVersions[it.contentVersions.length - 1].content
        : "";
    const fm = parseFrontmatter(rawContent);
    const body = stripFrontmatter(rawContent);

    const node: EditorNode = {
      id: pathId,
      name: it.title,
      type: "file",
      parentId: parentPathId,
      nodeType: "interpEntity",
      content: body,
      frontmatter: { ...fm, _backendId: it.id },
      inheritedAttributes: {},
      inheritedSources: [],
      children: [],
      createdAt: Number(it.timestamps.createdAt) / 1_000_000,
      updatedAt: now,
    };
    nodes.set(pathId, node);
  }

  // ------------------------------------------------------------------
  // Step 5: Second pass — populate children arrays
  // ------------------------------------------------------------------
  for (const [id, node] of nodes) {
    if (node.parentId === null) continue;
    const parent = nodes.get(node.parentId);
    if (parent && !parent.children.includes(id)) {
      parent.children.push(id);
    }
  }

  // ------------------------------------------------------------------
  // Step 6: rootIds = @-paths of all kept curations
  // ------------------------------------------------------------------
  const rootIds: string[] = [];
  for (const c of graphData.curations) {
    if (selectedNodeIds.has(c.id) && nodes.has(c.name)) {
      rootIds.push(c.name);
    }
  }

  return { nodes, rootIds };
}
