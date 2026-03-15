import type {
  Curation,
  GraphData,
  InterpretationToken,
  LawToken,
  Location,
  Swarm,
} from "../backend";

export interface ResolvedNode {
  id: string;
  name: string;
  type: string;
  parentContext?: string;
}

type ResolutionResult =
  | { status: "resolved"; id: string }
  | { status: "ambiguous"; candidates: ResolvedNode[] }
  | { status: "not-found" }
  | { status: "graph-not-loaded" };

export function resolveNodeReference(
  reference: string,
  command: string,
  field: string,
  graphData: GraphData | undefined,
): ResolutionResult {
  if (!graphData) {
    return { status: "graph-not-loaded" };
  }

  // Normalize command identifier (strip leading forward slash if present)
  const normalizedCommand = command.startsWith("/")
    ? command.substring(1)
    : command;

  // Determine which node types are valid for this field
  const validTypes = getValidTypesForField(normalizedCommand, field);

  // Try to find matching nodes
  const matches: ResolvedNode[] = [];

  // Check if reference is a literal ID (passthrough for most commands except 'ont' and 'filter')
  if (normalizedCommand !== "ont" && normalizedCommand !== "filter") {
    const nodeById = findNodeById(reference, graphData, validTypes);
    if (nodeById) {
      return { status: "resolved", id: nodeById.id };
    }
  }

  // Search by name (case-insensitive)
  const lowerRef = reference.toLowerCase();

  if (validTypes.includes("curation")) {
    for (const curation of graphData.curations) {
      if (curation.name.toLowerCase() === lowerRef) {
        matches.push({
          id: curation.id,
          name: curation.name,
          type: "Curation",
        });
      }
    }
  }

  if (validTypes.includes("swarm")) {
    for (const swarm of graphData.swarms) {
      if (swarm.name.toLowerCase() === lowerRef) {
        const parentCuration = graphData.curations.find(
          (c) => c.id === swarm.parentCurationId,
        );
        matches.push({
          id: swarm.id,
          name: swarm.name,
          type: "Swarm",
          parentContext: parentCuration?.name,
        });
      }
    }
  }

  if (validTypes.includes("location")) {
    for (const location of graphData.locations) {
      if (location.title.toLowerCase() === lowerRef) {
        const parentSwarm = graphData.swarms.find(
          (s) => s.id === location.parentSwarmId,
        );
        matches.push({
          id: location.id,
          name: location.title,
          type: "Location",
          parentContext: parentSwarm?.name,
        });
      }
    }
  }

  if (validTypes.includes("lawToken")) {
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.tokenLabel.toLowerCase() === lowerRef) {
        const parentLocation = graphData.locations.find(
          (l) => l.id === lawToken.parentLocationId,
        );
        matches.push({
          id: lawToken.id,
          name: lawToken.tokenLabel,
          type: "Law Token",
          parentContext: parentLocation?.title,
        });
      }
    }
  }

  if (validTypes.includes("interpretationToken")) {
    for (const interpretationToken of graphData.interpretationTokens) {
      if (interpretationToken.title.toLowerCase() === lowerRef) {
        matches.push({
          id: interpretationToken.id,
          name: interpretationToken.title,
          type: "Interpretation Token",
        });
      }
    }
  }

  if (matches.length === 0) {
    return { status: "not-found" };
  }

  if (matches.length === 1) {
    return { status: "resolved", id: matches[0].id };
  }

  return { status: "ambiguous", candidates: matches };
}

function getValidTypesForField(command: string, field: string): string[] {
  if (command === "s" && field === "parent") {
    return ["curation"];
  }

  if (command === "l" && field === "parent") {
    return ["swarm"];
  }

  if (command === "i" && (field === "from" || field === "to")) {
    return ["location", "lawToken", "interpretationToken"];
  }

  if (command === "ont" && field === "name") {
    return ["curation", "swarm", "location", "lawToken", "interpretationToken"];
  }

  if (command === "archive" && field === "name") {
    return ["curation", "swarm", "location", "lawToken", "interpretationToken"];
  }

  if (command === "filter") {
    if (field === "name") {
      return [
        "curation",
        "swarm",
        "location",
        "lawToken",
        "interpretationToken",
      ];
    }
    if (field === "parent") {
      return ["curation", "swarm", "location"];
    }
    if (field === "child") {
      return ["swarm", "location", "lawToken"];
    }
  }

  return [];
}

function findNodeById(
  id: string,
  graphData: GraphData,
  validTypes: string[],
): ResolvedNode | null {
  if (validTypes.includes("curation")) {
    const curation = graphData.curations.find((c) => c.id === id);
    if (curation) {
      return { id: curation.id, name: curation.name, type: "Curation" };
    }
  }

  if (validTypes.includes("swarm")) {
    const swarm = graphData.swarms.find((s) => s.id === id);
    if (swarm) {
      const parentCuration = graphData.curations.find(
        (c) => c.id === swarm.parentCurationId,
      );
      return {
        id: swarm.id,
        name: swarm.name,
        type: "Swarm",
        parentContext: parentCuration?.name,
      };
    }
  }

  if (validTypes.includes("location")) {
    const location = graphData.locations.find((l) => l.id === id);
    if (location) {
      const parentSwarm = graphData.swarms.find(
        (s) => s.id === location.parentSwarmId,
      );
      return {
        id: location.id,
        name: location.title,
        type: "Location",
        parentContext: parentSwarm?.name,
      };
    }
  }

  if (validTypes.includes("lawToken")) {
    const lawToken = graphData.lawTokens.find((lt) => lt.id === id);
    if (lawToken) {
      const parentLocation = graphData.locations.find(
        (l) => l.id === lawToken.parentLocationId,
      );
      return {
        id: lawToken.id,
        name: lawToken.tokenLabel,
        type: "Law Token",
        parentContext: parentLocation?.title,
      };
    }
  }

  if (validTypes.includes("interpretationToken")) {
    const interpretationToken = graphData.interpretationTokens.find(
      (it) => it.id === id,
    );
    if (interpretationToken) {
      return {
        id: interpretationToken.id,
        name: interpretationToken.title,
        type: "Interpretation Token",
      };
    }
  }

  return null;
}
