import type { EditorNode } from "../types/markdownEditor";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serialise a frontmatter record back to a YAML front-matter block.
 * Returns an empty string when the record is empty.
 */
function serialiseFrontmatter(fm: Record<string, string>): string {
  const entries = Object.entries(fm);
  if (entries.length === 0) return "";
  const yaml = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
  return `---\n${yaml}\n---\n`;
}

/**
 * Collect all descendant node ids of `nodeId` (depth-first, inclusive).
 */
function collectDescendants(
  nodeId: string,
  nodes: Map<string, EditorNode>,
): EditorNode[] {
  const result: EditorNode[] = [];
  const stack = [nodeId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = nodes.get(id);
    if (!node) continue;
    result.push(node);
    for (const childId of node.children) {
      stack.push(childId);
    }
  }
  return result;
}

/**
 * Build the @-separated full-path id for an EditorNode by walking ancestor
 * chain. If a node already carries an @-separated id, that id is its own
 * canonical path. We reconstruct it to support renames.
 */
function buildFullPath(nodeId: string, nodes: Map<string, EditorNode>): string {
  const segments: string[] = [];
  let current: EditorNode | undefined = nodes.get(nodeId);
  while (current) {
    segments.unshift(current.name);
    current = current.parentId ? nodes.get(current.parentId) : undefined;
  }
  return segments.join("@");
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Convert a curation subtree back into a SourceGraph.
 *
 * @param nodes   - Flat map of all EditorNodes in the session.
 * @param rootId  - Id of the root curation EditorNode to export.
 * @returns       A SourceGraph whose id is freshly generated.
 */
export function editorToSourceGraph(
  nodes: Map<string, EditorNode>,
  rootId: string,
): SourceGraph {
  const root = nodes.get(rootId);
  if (!root) {
    throw new Error(`editorToSourceGraph: root node "${rootId}" not found`);
  }

  const allNodes = collectDescendants(rootId, nodes);
  const sourceNodes: SourceNode[] = [];

  for (const node of allNodes) {
    const fullPath = buildFullPath(node.id, nodes);

    // Re-serialise interpEntity content (prepend frontmatter block)
    let content: string | undefined;
    if (node.nodeType === "interpEntity") {
      const fmBlock = serialiseFrontmatter(node.frontmatter);
      const body = node.content ?? "";
      content = fmBlock ? `${fmBlock}${body}` : body || undefined;
    }

    // For non-interp nodes, attributes come from inheritedAttributes
    const attributes =
      node.nodeType !== "interpEntity" &&
      Object.keys(node.inheritedAttributes).length > 0
        ? { ...node.inheritedAttributes }
        : node.nodeType === "interpEntity" &&
            Object.keys(node.frontmatter).length > 0
          ? { ...node.frontmatter }
          : undefined;

    const sourceNode: SourceNode = {
      id: fullPath,
      name: node.name,
      nodeType: node.nodeType,
      content: content || undefined,
      attributes:
        attributes && Object.keys(attributes).length > 0
          ? attributes
          : undefined,
      parentName: node.parentId ? nodes.get(node.parentId)?.name : undefined,
    };

    sourceNodes.push(sourceNode);
  }

  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    name: root.name,
    nodes: sourceNodes,
    // Edges are not reconstructed in this MVP conversion — they will be
    // re-derived by the backend parser when the graph is published.
    edges: [],
    createdAt: now,
  };
}
