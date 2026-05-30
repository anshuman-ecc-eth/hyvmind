import type { GraphData } from "../backend";

// Parse TTL text and extract relationships to generate Mermaid diagram
export function ttlToMermaid(ttlText: string): string {
  const lines = ttlText.split("\n");
  const relationships: Array<{ from: string; to: string; label: string }> = [];
  const nodeLabels = new Map<string, string>();

  // Extract node labels from hm:label (not rdfs:label)
  for (const line of lines) {
    const labelMatch = line.match(/hm:(\w+)\s+hm:label\s+"([^"]+)"/);
    if (labelMatch) {
      const nodeId = labelMatch[1];
      const label = labelMatch[2];
      nodeLabels.set(nodeId, label);
    }
  }

  // Extract relationships from Relations section
  let inRelationsSection = false;
  for (const line of lines) {
    if (line.trim() === "# Relations") {
      inRelationsSection = true;
      continue;
    }

    if (!inRelationsSection) continue;

    // Parse hasChild relationships
    const hasChildMatch = line.match(/hm:(\w+)\s+hm:hasChild\s+hm:(\w+)/);
    if (hasChildMatch) {
      const from = hasChildMatch[1];
      const to = hasChildMatch[2];
      relationships.push({ from, to, label: "hasChild" });
    }

    // Parse hasParent relationships
    const hasParentMatch = line.match(/hm:(\w+)\s+hm:hasParent\s+hm:(\w+)/);
    if (hasParentMatch) {
      const from = hasParentMatch[1];
      const to = hasParentMatch[2];
      relationships.push({ from, to, label: "hasParent" });
    }

    // Parse FromRelation relationships
    const fromRelationMatch = line.match(
      /hm:(\w+)\s+hm:FromRelation\s+hm:(\w+)/,
    );
    if (fromRelationMatch) {
      const from = fromRelationMatch[1];
      const to = fromRelationMatch[2];
      relationships.push({ from, to, label: "FromRelation" });
    }

    // Parse ToRelation relationships
    const toRelationMatch = line.match(/hm:(\w+)\s+hm:ToRelation\s+hm:(\w+)/);
    if (toRelationMatch) {
      const from = toRelationMatch[1];
      const to = toRelationMatch[2];
      relationships.push({ from, to, label: "ToRelation" });
    }
  }

  // Generate Mermaid flowchart
  const mermaidLines = ["flowchart LR"];

  // Add node definitions with labels
  const allNodes = new Set<string>();
  for (const rel of relationships) {
    allNodes.add(rel.from);
    allNodes.add(rel.to);
  }

  for (const nodeId of allNodes) {
    const label = nodeLabels.get(nodeId) || nodeId;
    mermaidLines.push(`  ${nodeId}["${label}"]`);
  }

  // Add relationships with explicit labels - all solid lines
  for (const rel of relationships) {
    if (rel.label === "hasChild") {
      mermaidLines.push(`  ${rel.from} -->|hasChild| ${rel.to}`);
    } else if (rel.label === "hasParent") {
      mermaidLines.push(`  ${rel.from} -->|hasParent| ${rel.to}`);
    } else if (rel.label === "FromRelation") {
      mermaidLines.push(`  ${rel.from} -->|FromRelation| ${rel.to}`);
    } else if (rel.label === "ToRelation") {
      mermaidLines.push(`  ${rel.from} -->|ToRelation| ${rel.to}`);
    }
  }

  return mermaidLines.join("\n");
}

// Wrapper function for backward compatibility with TerminalPage
export function convertTTLToMermaid(
  ttlText: string,
  _graphData?: GraphData,
): { mermaidText: string; mermaidError?: string } {
  try {
    const mermaidText = ttlToMermaid(ttlText);
    return { mermaidText };
  } catch (error) {
    return {
      mermaidText: "",
      mermaidError:
        error instanceof Error
          ? error.message
          : "Unknown error generating Mermaid diagram",
    };
  }
}
