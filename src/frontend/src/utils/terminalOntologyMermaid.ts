import type {
  Curation,
  GraphData,
  InterpretationToken,
  LawToken,
  Location,
  Sublocation,
  Swarm,
} from "../backend";
import { sanitizeToLocalName, truncateLabel } from "./ontologySanitize";

interface NodeInfo {
  id: string;
  name: string;
  type:
    | "Curation"
    | "Swarm"
    | "Location"
    | "LawToken"
    | "InterpretationToken"
    | "Sublocation";
  data:
    | Curation
    | Swarm
    | Location
    | LawToken
    | InterpretationToken
    | Sublocation;
}

/**
 * Generate a compact Mermaid flowchart diagram for a node's ontology context
 * Focuses on parent/child (hm:hasChild / hm:hasParent) and interpretation (hm:FromRelation / hm:ToRelation) relationships
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

    // Use flowchart LR for compact horizontal layout
    lines.push("flowchart LR");

    // Add the main node with type styling
    const nodeStyle = getNodeStyle(nodeInfo.type);
    lines.push(`    ${localName}["${shortLabel}"]${nodeStyle}`);

    // Track added nodes to avoid duplicates
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

        // Parent -> Child with hasChild label (solid line)
        lines.push(`    ${parentLocalName} -->|hasChild| ${localName}`);
      }
    }

    // Add child relationships (for Curation, Swarm, Location, LawToken - not InterpretationToken)
    if (nodeInfo.type !== "InterpretationToken") {
      const children = getChildNodes(nodeInfo, graphData);
      // Limit to 2 children for compactness
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

        // Parent -> Child with hasChild label (solid line)
        lines.push(`    ${localName} -->|hasChild| ${childLocalName}`);
      }
    }

    // Add interpretation relationships (for Location, LawToken, InterpretationToken)
    if (
      nodeInfo.type === "Location" ||
      nodeInfo.type === "LawToken" ||
      nodeInfo.type === "InterpretationToken"
    ) {
      // Outgoing interpretations (where this node is the "from" node)
      const outgoingInterpretations = graphData.interpretationTokens.filter(
        (it) => it.fromTokenId === nodeInfo.id,
      );

      // Limit to 1 interpretation for compactness
      const limitedOutgoing = outgoingInterpretations.slice(0, 1);

      for (const interpretation of limitedOutgoing) {
        const interpretationLocalName = sanitizeToLocalName(
          interpretation.title,
        );
        const interpretationShortLabel = truncateLabel(
          interpretation.title,
          18,
        );

        if (!addedNodes.has(interpretationLocalName)) {
          lines.push(
            `    ${interpretationLocalName}{"${interpretationShortLabel}"}`,
          );
          addedNodes.add(interpretationLocalName);
        }

        // From node -> Interpretation (solid line with FromRelation label)
        lines.push(
          `    ${localName} -->|FromRelation| ${interpretationLocalName}`,
        );

        // Interpretation -> To node
        const toNode = findNode(interpretation.toNodeId, graphData);
        if (toNode) {
          const toLocalName = sanitizeToLocalName(toNode.name);
          const toShortLabel = truncateLabel(toNode.name, 18);
          const toStyle = getNodeStyle(toNode.type);

          if (!addedNodes.has(toLocalName)) {
            lines.push(`    ${toLocalName}["${toShortLabel}"]${toStyle}`);
            addedNodes.add(toLocalName);
          }

          // Interpretation -> To node (solid line with ToRelation label)
          lines.push(
            `    ${interpretationLocalName} -->|ToRelation| ${toLocalName}`,
          );
        }
      }
    }

    // If InterpretationToken, show its from and to connections
    if (nodeInfo.type === "InterpretationToken") {
      const interpretation = nodeInfo.data as InterpretationToken;

      // From node
      const fromNode = findNode(interpretation.fromTokenId, graphData);
      if (fromNode) {
        const fromLocalName = sanitizeToLocalName(fromNode.name);
        const fromShortLabel = truncateLabel(fromNode.name, 18);
        const fromStyle = getNodeStyle(fromNode.type);

        if (!addedNodes.has(fromLocalName)) {
          lines.push(`    ${fromLocalName}["${fromShortLabel}"]${fromStyle}`);
          addedNodes.add(fromLocalName);
        }

        // From -> Interpretation (solid line with FromRelation label)
        lines.push(`    ${fromLocalName} -->|FromRelation| ${localName}`);
      }

      // To node
      const toNode = findNode(interpretation.toNodeId, graphData);
      if (toNode) {
        const toLocalName = sanitizeToLocalName(toNode.name);
        const toShortLabel = truncateLabel(toNode.name, 18);
        const toStyle = getNodeStyle(toNode.type);

        if (!addedNodes.has(toLocalName)) {
          lines.push(`    ${toLocalName}["${toShortLabel}"]${toStyle}`);
          addedNodes.add(toLocalName);
        }

        // Interpretation -> To (solid line with ToRelation label)
        lines.push(`    ${localName} -->|ToRelation| ${toLocalName}`);
      }
    }

    return lines.join("\n");
  } catch (error) {
    return `Error generating Mermaid diagram: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

function findNode(nodeId: string, graphData: GraphData): NodeInfo | null {
  // Check curations
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

  // Check swarms
  for (const swarm of graphData.swarms) {
    if (swarm.id === nodeId) {
      return { id: nodeId, name: swarm.name, type: "Swarm", data: swarm };
    }
  }

  // Check locations
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

  // Check law tokens
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

  // Check interpretation tokens
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

  // Check sublocations
  if (graphData.sublocations) {
    for (const sublocation of graphData.sublocations as Sublocation[]) {
      if (sublocation.id === nodeId) {
        return {
          id: nodeId,
          name: sublocation.title,
          type: "Sublocation",
          data: sublocation,
        };
      }
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
      return findNode(interpretation.fromTokenId, graphData);
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

    case "LawToken":
      // Law tokens don't have hierarchical children (interpretations are shown separately)
      break;

    case "InterpretationToken":
      // Interpretation tokens don't have hierarchical children
      break;
  }

  return children;
}

function getNodeStyle(_type: string): string {
  // Return empty string for default rectangular nodes
  // Interpretation tokens use diamond shape in the main rendering
  return "";
}
