import type {
  Curation,
  GraphData,
  InterpretationToken,
  LawToken,
  Location,
  Swarm,
} from "../backend";
import { sanitizeToLocalName, truncateLabel } from "./ontologySanitize";

interface NodeInfo {
  id: string;
  name: string;
  type: "Curation" | "Swarm" | "Location" | "LawToken" | "InterpretationToken";
  data: Curation | Swarm | Location | LawToken | InterpretationToken;
}

/**
 * Generate a compact Mermaid flowchart diagram for a node's ontology context
 * Focuses on parent/child (hm:hasChild / hm:hasParent) relationships
 * All connectors use solid lines (no dashed lines)
 */
export function generateOntologyMermaid(
  nodeId: string,
  graphData: GraphData,
): string {
  try {
    const nodeInfo = findNode(nodeId, graphData);
    if (!nodeInfo) {
      return "Error: Node not found";
    }

    const lines: string[] = [];
    const localName = sanitizeToLocalName(nodeInfo.name);
    const shortLabel = truncateLabel(nodeInfo.name, 18);

    lines.push("flowchart LR");

    const nodeStyle = getNodeStyle(nodeInfo.type);
    lines.push(`    ${localName}["${shortLabel}"]${nodeStyle}`);

    const addedNodes = new Set<string>([localName]);

    // Add parent relationship (if not Curation)
    if (nodeInfo.type !== "Curation") {
      const parent = getParentNode(nodeInfo, graphData);
      if (parent) {
        const parentLocalName = sanitizeToLocalName(parent.name);
        const parentShortLabel = truncateLabel(parent.name, 18);
        const parentStyle = getNodeStyle(parent.type);

        if (!addedNodes.has(parentLocalName)) {
          lines.push(
            `    ${parentLocalName}["${parentShortLabel}"]${parentStyle}`,
          );
          addedNodes.add(parentLocalName);
        }

        lines.push(`    ${parentLocalName} -->|hasChild| ${localName}`);
      }
    }

    // Add child relationships
    if (nodeInfo.type !== "InterpretationToken") {
      const children = getChildNodes(nodeInfo, graphData);
      const limitedChildren = children.slice(0, 2);

      for (const child of limitedChildren) {
        const childLocalName = sanitizeToLocalName(child.name);
        const childShortLabel = truncateLabel(child.name, 18);
        const childStyle = getNodeStyle(child.type);

        if (!addedNodes.has(childLocalName)) {
          lines.push(
            `    ${childLocalName}["${childShortLabel}"]${childStyle}`,
          );
          addedNodes.add(childLocalName);
        }

        lines.push(`    ${localName} -->|hasChild| ${childLocalName}`);
      }
    }

    // If InterpretationToken, show its parent law token connection
    if (nodeInfo.type === "InterpretationToken") {
      const interpretation = nodeInfo.data as InterpretationToken;
      const parentLawToken = findNode(
        interpretation.parentLawTokenId,
        graphData,
      );
      if (parentLawToken) {
        const parentLocalName = sanitizeToLocalName(parentLawToken.name);
        const parentShortLabel = truncateLabel(parentLawToken.name, 18);
        const parentStyle = getNodeStyle(parentLawToken.type);

        if (!addedNodes.has(parentLocalName)) {
          lines.push(
            `    ${parentLocalName}["${parentShortLabel}"]${parentStyle}`,
          );
          addedNodes.add(parentLocalName);
        }

        lines.push(`    ${parentLocalName} -->|hasChild| ${localName}`);
      }
    }

    return lines.join("\n");
  } catch (error) {
    return `Error generating Mermaid diagram: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

function findNode(nodeId: string, graphData: GraphData): NodeInfo | null {
  for (const curation of graphData.curations) {
    if (curation.id === nodeId) {
      return {
        id: nodeId,
        name: curation.name,
        type: "Curation",
        data: curation,
      };
    }
  }
  for (const swarm of graphData.swarms) {
    if (swarm.id === nodeId) {
      return { id: nodeId, name: swarm.name, type: "Swarm", data: swarm };
    }
  }
  for (const location of graphData.locations) {
    if (location.id === nodeId) {
      return {
        id: nodeId,
        name: location.title,
        type: "Location",
        data: location,
      };
    }
  }
  for (const lawToken of graphData.lawTokens) {
    if (lawToken.id === nodeId) {
      return {
        id: nodeId,
        name: lawToken.tokenLabel,
        type: "LawToken",
        data: lawToken,
      };
    }
  }
  for (const interpretationToken of graphData.interpretationTokens) {
    if (interpretationToken.id === nodeId) {
      return {
        id: nodeId,
        name: interpretationToken.title,
        type: "InterpretationToken",
        data: interpretationToken,
      };
    }
  }
  return null;
}

function getParentNode(
  nodeInfo: NodeInfo,
  graphData: GraphData,
): NodeInfo | null {
  switch (nodeInfo.type) {
    case "Swarm": {
      const swarm = nodeInfo.data as Swarm;
      const parentCuration = graphData.curations.find(
        (c) => c.id === swarm.parentCurationId,
      );
      return parentCuration
        ? {
            id: parentCuration.id,
            name: parentCuration.name,
            type: "Curation",
            data: parentCuration,
          }
        : null;
    }

    case "Location": {
      const location = nodeInfo.data as Location;
      const parentSwarm = graphData.swarms.find(
        (s) => s.id === location.parentSwarmId,
      );
      return parentSwarm
        ? {
            id: parentSwarm.id,
            name: parentSwarm.name,
            type: "Swarm",
            data: parentSwarm,
          }
        : null;
    }

    case "LawToken": {
      const lawToken = nodeInfo.data as LawToken;
      const parentLocation = graphData.locations.find(
        (l) => l.id === lawToken.parentLocationId,
      );
      return parentLocation
        ? {
            id: parentLocation.id,
            name: parentLocation.title,
            type: "Location",
            data: parentLocation,
          }
        : null;
    }

    case "InterpretationToken": {
      const interpretation = nodeInfo.data as InterpretationToken;
      return findNode(interpretation.parentLawTokenId, graphData);
    }

    default:
      return null;
  }
}

function getChildNodes(nodeInfo: NodeInfo, graphData: GraphData): NodeInfo[] {
  const children: NodeInfo[] = [];

  switch (nodeInfo.type) {
    case "Curation": {
      const childSwarms = graphData.swarms.filter(
        (s) => s.parentCurationId === nodeInfo.id,
      );
      for (const swarm of childSwarms) {
        children.push({
          id: swarm.id,
          name: swarm.name,
          type: "Swarm",
          data: swarm,
        });
      }
      break;
    }

    case "Swarm": {
      const childLocations = graphData.locations.filter(
        (l) => l.parentSwarmId === nodeInfo.id,
      );
      for (const location of childLocations) {
        children.push({
          id: location.id,
          name: location.title,
          type: "Location",
          data: location,
        });
      }
      break;
    }

    case "Location": {
      const childLawTokens = graphData.lawTokens.filter(
        (lt) => lt.parentLocationId === nodeInfo.id,
      );
      for (const lawToken of childLawTokens) {
        children.push({
          id: lawToken.id,
          name: lawToken.tokenLabel,
          type: "LawToken",
          data: lawToken,
        });
      }
      break;
    }

    case "LawToken": {
      const childInterpTokens = graphData.interpretationTokens.filter(
        (it) => it.parentLawTokenId === nodeInfo.id,
      );
      for (const it of childInterpTokens) {
        children.push({
          id: it.id,
          name: it.title,
          type: "InterpretationToken",
          data: it,
        });
      }
      break;
    }
  }

  return children;
}

function getNodeStyle(_type: string): string {
  return "";
}
