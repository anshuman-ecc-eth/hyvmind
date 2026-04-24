import type { AnnotationSession, TokenAnnotation } from "../types/annotation";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

function sanitizeId(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

function buildHierarchyId(parts: string[]): string {
  return parts.map(sanitizeId).join("@");
}

export function annotationsToSourceGraph(
  session: AnnotationSession,
  existingGraphId?: string,
): SourceGraph {
  const { path, annotations, rawText, title, url, createdAt } = session;

  const nodes: SourceNode[] = [];
  const edges: Edge[] = [];

  const curationId = buildHierarchyId([path.curation]);
  const swarmId = buildHierarchyId([path.curation, path.swarm]);
  const locationId = buildHierarchyId([
    path.curation,
    path.swarm,
    path.location,
  ]);

  // --- Hierarchy nodes ---
  nodes.push({
    id: curationId,
    name: path.curation,
    nodeType: "curation",
  });

  nodes.push({
    id: swarmId,
    name: path.swarm,
    nodeType: "swarm",
    parentName: path.curation,
  });

  nodes.push({
    id: locationId,
    name: path.location,
    nodeType: "location",
    parentName: path.swarm,
    source: url,
  });

  // Track law token full IDs by annotation id for cross-references
  const lawIdByAnnotationId = new Map<string, string>();

  // --- Law tokens ---
  const lawAnnotations = annotations.filter((a) => a.tag === "lawEntity");
  for (const ann of lawAnnotations) {
    const lawId = buildHierarchyId([
      path.curation,
      path.swarm,
      path.location,
      ann.name,
    ]);
    lawIdByAnnotationId.set(ann.id, lawId);

    const mergedAttrs: Record<string, string> = {
      ...(ann.inheritedAttributes ?? {}),
      ...ann.attributes,
    };

    nodes.push({
      id: lawId,
      name: ann.name,
      nodeType: "lawEntity",
      parentName: path.location,
      attributes: mergedAttrs,
    });
  }

  // --- Interp tokens ---
  const interpAnnotations = annotations.filter((a) => a.tag === "interpEntity");
  for (const ann of interpAnnotations) {
    const parentLawAnnotation = lawAnnotations.find(
      (l) => l.id === ann.parentLawTokenId,
    );
    const parentLawName = parentLawAnnotation?.name ?? "";
    const interpId = buildHierarchyId([
      path.curation,
      path.swarm,
      path.location,
      parentLawName,
      ann.name,
    ]);

    const mergedAttrs: Record<string, string> = {
      ...(ann.inheritedAttributes ?? {}),
      ...ann.attributes,
    };

    // Content: the annotated text span
    const content = rawText.slice(ann.start, ann.end);

    nodes.push({
      id: interpId,
      name: ann.name,
      nodeType: "interpEntity",
      parentName: parentLawName || undefined,
      attributes: mergedAttrs,
      content,
    });

    // Cross-reference edges for all linked law tokens beyond the first
    // (first = the parent, already expressed via parentName)
    const extraLinks = ann.linkedLawTokenIds.filter(
      (lid) => lid !== ann.parentLawTokenId,
    );
    for (const linkedLawAnnotationId of extraLinks) {
      const targetLawId = lawIdByAnnotationId.get(linkedLawAnnotationId);
      if (targetLawId) {
        edges.push({
          source: interpId,
          target: targetLawId,
          label: "references",
          bidirectional: false,
        });
      }
    }
  }

  const graphId =
    existingGraphId ??
    `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: graphId,
    name: title,
    nodes,
    edges,
    createdAt,
  };
}
