import type { EditorNode, EditorNodeType } from "../types/markdownEditor";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";
import { parseFrontmatter, stripFrontmatter } from "./sourceGraphParser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive EditorNodeType from source node type */
function toEditorNodeType(nodeType: SourceNode["nodeType"]): EditorNodeType {
  return nodeType === "interpEntity" ? "file" : "folder";
}

/**
 * Parse the @-separated id into individual path segments.
 * e.g. "Curation@Swarm@Location@Law@Interp" → ["Curation","Swarm","Location","Law","Interp"]
 */
function pathSegments(id: string): string[] {
  return id.split("@");
}

/**
 * Derive parentId from a full @-separated id.
 * A root-level curation (no @) returns null.
 */
function parentIdFromPath(id: string): string | null {
  const parts = pathSegments(id);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("@");
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Convert a SourceGraph into a flat array of EditorNode objects that can be
 * stored in an EditorSession.nodes Map.
 *
 * The conversion rules are:
 *  - curation   → folder (EditorNodeType='folder', nodeType='curation')
 *  - swarm      → folder (nodeType='swarm')
 *  - location   → folder (nodeType='location')
 *  - lawEntity  → folder (nodeType='lawEntity')
 *  - interpEntity → file (EditorNodeType='file', nodeType='interpEntity')
 *
 * Parent–child relationships are derived from the @-separated node id,
 * e.g. "Curation@Swarm@Loc@Law@Interp".
 *
 * Frontmatter is extracted from interpEntity content; the body (content
 * without the frontmatter block) is stored in EditorNode.content.
 */
export function sourceGraphToEditor(graph: SourceGraph): EditorNode[] {
  const now = Date.now();
  const childrenMap = new Map<string, string[]>();

  // First pass — collect all ids and initialise children arrays
  for (const node of graph.nodes) {
    const id = node.id ?? node.name;
    if (!childrenMap.has(id)) childrenMap.set(id, []);

    const pid = parentIdFromPath(id);
    if (pid !== null) {
      const existing = childrenMap.get(pid) ?? [];
      if (!existing.includes(id)) {
        childrenMap.set(pid, [...existing, id]);
      }
    }
  }

  const editorNodes: EditorNode[] = [];

  for (const node of graph.nodes) {
    const id = node.id ?? node.name;
    const parentId = parentIdFromPath(id);

    let content: string | undefined;
    let frontmatter: Record<string, unknown> = {};

    if (node.nodeType === "interpEntity") {
      const raw = node.content ?? "";
      // Attempt to parse frontmatter from the raw content; if no frontmatter
      // block exists, treat the entire content as the body.
      const fm = parseFrontmatter(raw);
      frontmatter =
        Object.keys(fm).length > 0
          ? fm
          : // Also expose node.attributes as pseudo-frontmatter so nothing is lost
            { ...(node.attributes ?? {}) };
      content =
        Object.keys(parseFrontmatter(raw)).length > 0
          ? stripFrontmatter(raw)
          : raw;
    }

    // Inherited attributes come from node.attributes for non-interp nodes
    const inheritedAttributes: Record<string, string> =
      node.nodeType !== "interpEntity"
        ? Object.fromEntries(
            Object.entries(node.attributes ?? {}).map(([k, v]) => [
              k,
              typeof v === "string" ? v : JSON.stringify(v),
            ]),
          )
        : {};

    const editorNode: EditorNode = {
      id,
      name: node.name,
      type: toEditorNodeType(node.nodeType),
      parentId,
      nodeType: node.nodeType,
      content: content || undefined,
      frontmatter,
      inheritedAttributes,
      children: childrenMap.get(id) ?? [],
      createdAt: graph.createdAt ?? now,
      updatedAt: now,
    };

    editorNodes.push(editorNode);
  }

  return editorNodes;
}
