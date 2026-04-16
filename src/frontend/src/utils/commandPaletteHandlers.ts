import type { QueryClient } from "@tanstack/react-query";
import type { GraphData, backendInterface } from "../backend";
import { executeArchiveCommand } from "./terminalCommands";
import {
  formatFilterMissingNameError,
  formatFilterResults,
  formatFindResults,
  formatGraphNotLoadedError,
  formatNoMatchesFound,
  formatNodeNotFoundError,
  formatOntCommandMissingNameError,
} from "./terminalMessages";
import type { ResolvedNode } from "./terminalNameResolution";
import { resolveNodeReference } from "./terminalNameResolution";
import { generateOntologyTurtle } from "./terminalOntologyTurtle";
import { convertTTLToMermaid } from "./ttlToMermaid";

export type HandlerResult =
  | { success: boolean; message: string }
  | { needsDisambiguation: true; candidates: ResolvedNode[]; field: string };

// ---------- find ----------
export function handleFindCommand(
  searchTerm: string,
  graphData: GraphData,
): { success: boolean; message: string } {
  if (!graphData)
    return { success: false, message: formatGraphNotLoadedError() };
  if (!searchTerm)
    return { success: false, message: "Error: /find requires a search term." };

  const lower = searchTerm.toLowerCase();
  const matches: Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }> = [];

  for (const c of graphData.curations) {
    if (c.name.toLowerCase().includes(lower))
      matches.push({ id: c.id, type: "Curation", name: c.name });
  }
  for (const s of graphData.swarms) {
    if (s.name.toLowerCase().includes(lower)) {
      const parent = graphData.curations.find(
        (c) => c.id === s.parentCurationId,
      );
      matches.push({
        id: s.id,
        type: "Swarm",
        name: s.name,
        parentContext: parent?.name,
      });
    }
  }
  for (const l of graphData.locations) {
    if (l.title.toLowerCase().includes(lower)) {
      const parent = graphData.swarms.find((s) => s.id === l.parentSwarmId);
      matches.push({
        id: l.id,
        type: "Location",
        name: l.title,
        parentContext: parent?.name,
      });
    }
  }
  for (const lt of graphData.lawTokens) {
    if (lt.tokenLabel.toLowerCase().includes(lower)) {
      const parent = graphData.locations.find(
        (l) => l.id === lt.parentLocationId,
      );
      matches.push({
        id: lt.id,
        type: "Law Token",
        name: lt.tokenLabel,
        parentContext: parent?.title,
      });
    }
  }
  for (const it of graphData.interpretationTokens) {
    if (it.title.toLowerCase().includes(lower))
      matches.push({ id: it.id, type: "Interpretation Token", name: it.title });
  }

  if (matches.length === 0)
    return { success: false, message: formatNoMatchesFound(searchTerm) };
  return { success: true, message: formatFindResults(matches) };
}

// ---------- filter ----------
export function handleFilterCommand(
  nodeName: string,
  graphData: GraphData,
  parentName?: string,
  childName?: string,
): HandlerResult {
  if (!graphData)
    return { success: false, message: formatGraphNotLoadedError() };
  if (!nodeName)
    return { success: false, message: formatFilterMissingNameError() };

  const resolution = resolveNodeReference(
    nodeName,
    "filter",
    "name",
    graphData,
  );

  if (resolution.status === "graph-not-loaded")
    return { success: false, message: formatGraphNotLoadedError() };
  if (resolution.status === "not-found")
    return {
      success: false,
      message: formatNodeNotFoundError(nodeName, "node"),
    };
  if (resolution.status === "ambiguous")
    return {
      needsDisambiguation: true,
      candidates: resolution.candidates,
      field: "name",
    };

  let filteredResults: Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }> = [];

  if (parentName) {
    const parentRes = resolveNodeReference(
      parentName,
      "filter",
      "parent",
      graphData,
    );
    if (parentRes.status === "resolved") {
      const children = findChildrenOfNode(parentRes.id, graphData);
      filteredResults = children.filter((child) =>
        child.name.toLowerCase().includes(nodeName.toLowerCase()),
      );
    }
  } else if (childName) {
    const childRes = resolveNodeReference(
      childName,
      "filter",
      "child",
      graphData,
    );
    if (childRes.status === "resolved") {
      const parents = findParentsOfNode(childRes.id, graphData);
      filteredResults = parents.filter((parent) =>
        parent.name.toLowerCase().includes(nodeName.toLowerCase()),
      );
    }
  } else {
    const nodeInfo = findNodeById(resolution.id, graphData);
    if (nodeInfo)
      filteredResults = [
        { id: resolution.id, type: nodeInfo.type, name: nodeInfo.name },
      ];
  }

  if (filteredResults.length === 0)
    return { success: false, message: formatNoMatchesFound(nodeName) };
  return { success: true, message: formatFilterResults(filteredResults) };
}

// ---------- ont ----------
export function handleOntCommand(
  nodeName: string,
  graphData: GraphData,
): HandlerResult {
  if (!graphData)
    return { success: false, message: formatGraphNotLoadedError() };
  if (!nodeName)
    return { success: false, message: formatOntCommandMissingNameError() };

  const resolution = resolveNodeReference(nodeName, "ont", "name", graphData);

  if (resolution.status === "graph-not-loaded")
    return { success: false, message: formatGraphNotLoadedError() };
  if (resolution.status === "not-found")
    return {
      success: false,
      message: formatNodeNotFoundError(nodeName, "node"),
    };
  if (resolution.status === "ambiguous")
    return {
      needsDisambiguation: true,
      candidates: resolution.candidates,
      field: "name",
    };

  const turtleText = generateOntologyTurtle(resolution.id, graphData);
  const { mermaidText, mermaidError } = convertTTLToMermaid(
    turtleText,
    graphData,
  );
  const nodeInfo = findNodeById(resolution.id, graphData);
  const displayName = nodeInfo?.name || nodeName;

  const combined = [
    `Ontology for: ${displayName}`,
    "",
    "── Turtle (TTL) ──",
    turtleText,
    "",
    "── Mermaid ──",
    mermaidError ? `Error: ${mermaidError}` : mermaidText,
  ].join("\n");

  return { success: true, message: combined };
}

// ---------- archive ----------
export async function handleArchiveCommand(
  nodeName: string,
  graphData: GraphData,
  actor: backendInterface,
  queryClient: QueryClient,
): Promise<HandlerResult> {
  if (!graphData)
    return { success: false, message: formatGraphNotLoadedError() };
  if (!nodeName)
    return { success: false, message: "Error: /archive requires a node name." };

  const resolution = resolveNodeReference(
    nodeName,
    "archive",
    "name",
    graphData,
  );

  if (resolution.status === "graph-not-loaded")
    return { success: false, message: formatGraphNotLoadedError() };
  if (resolution.status === "not-found")
    return {
      success: false,
      message: formatNodeNotFoundError(nodeName, "node"),
    };
  if (resolution.status === "ambiguous")
    return {
      needsDisambiguation: true,
      candidates: resolution.candidates,
      field: "name",
    };

  const nodeInfo = findNodeById(resolution.id, graphData);
  const displayName = nodeInfo?.name || nodeName;
  const displayType = nodeInfo?.type || "Node";

  return executeArchiveCommand(
    resolution.id,
    displayName,
    displayType,
    actor,
    queryClient,
  );
}

// ---------- helpers ----------
function findNodeById(
  nodeId: string,
  graphData: GraphData,
): { id: string; name: string; type: string } | null {
  for (const c of graphData.curations)
    if (c.id === nodeId) return { id: c.id, name: c.name, type: "Curation" };
  for (const s of graphData.swarms)
    if (s.id === nodeId) return { id: s.id, name: s.name, type: "Swarm" };
  for (const l of graphData.locations)
    if (l.id === nodeId) return { id: l.id, name: l.title, type: "Location" };
  for (const lt of graphData.lawTokens)
    if (lt.id === nodeId)
      return { id: lt.id, name: lt.tokenLabel, type: "Law Token" };
  for (const it of graphData.interpretationTokens)
    if (it.id === nodeId)
      return { id: it.id, name: it.title, type: "Interpretation Token" };
  return null;
}

function findChildrenOfNode(
  nodeId: string,
  graphData: GraphData,
): Array<{ id: string; type: string; name: string; parentContext?: string }> {
  const results: Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }> = [];

  for (const s of graphData.swarms)
    if (s.parentCurationId === nodeId)
      results.push({ id: s.id, type: "Swarm", name: s.name });
  for (const l of graphData.locations)
    if (l.parentSwarmId === nodeId)
      results.push({ id: l.id, type: "Location", name: l.title });
  for (const lt of graphData.lawTokens)
    if (lt.parentLocationId === nodeId)
      results.push({ id: lt.id, type: "Law Token", name: lt.tokenLabel });

  return results;
}

function findParentsOfNode(
  nodeId: string,
  graphData: GraphData,
): Array<{ id: string; type: string; name: string }> {
  const results: Array<{ id: string; type: string; name: string }> = [];

  for (const c of graphData.curations) {
    const child = graphData.swarms.find(
      (s) => s.id === nodeId && s.parentCurationId === c.id,
    );
    if (child) results.push({ id: c.id, type: "Curation", name: c.name });
  }
  for (const s of graphData.swarms) {
    const child = graphData.locations.find(
      (l) => l.id === nodeId && l.parentSwarmId === s.id,
    );
    if (child) results.push({ id: s.id, type: "Swarm", name: s.name });
  }
  for (const l of graphData.locations) {
    const child = graphData.lawTokens.find(
      (lt) => lt.id === nodeId && lt.parentLocationId === l.id,
    );
    if (child) results.push({ id: l.id, type: "Location", name: l.title });
  }

  return results;
}
