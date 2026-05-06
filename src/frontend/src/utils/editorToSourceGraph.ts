import type { EditorNode } from "../types/markdownEditor";
import type {
  Edge,
  SourceGraph,
  SourceNode,
  SourceRef,
} from "../types/sourceGraph";
import { parseMarkdownLinks } from "./sourceGraphParser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serialise a frontmatter record back to a YAML front-matter block.
 * Returns an empty string when the record is empty.
 */
function serialiseFrontmatter(fm: Record<string, unknown>): string {
  const entries = Object.entries(fm);
  if (entries.length === 0) return "";
  const yaml = entries
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
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
// Edge-reference helpers
// ---------------------------------------------------------------------------

/**
 * Extract all {name} references from content.
 */
function extractReferences(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1).trim());
}

/**
 * Resolve a reference name against all node type maps, in priority order:
 * interpEntity → lawEntity → location → swarm → curation.
 */
function resolveNodeRef(
  name: string,
  interp: Map<string, string>,
  law: Map<string, string>,
  location: Map<string, string>,
  swarm: Map<string, string>,
  curation: Map<string, string>,
): string | undefined {
  return (
    interp.get(name) ??
    law.get(name) ??
    location.get(name) ??
    swarm.get(name) ??
    curation.get(name)
  );
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

  // Lookup maps populated during the node loop
  const curationNames = new Map<string, string>(); // name -> fullPath
  const swarmNames = new Map<string, string>(); // name -> fullPath
  const locationNames = new Map<string, string>(); // name -> fullPath
  const lawEntityNames = new Map<string, string>(); // name -> fullPath
  const interpFilenames = new Map<string, string>(); // name -> fullPath
  const nodeFullPaths = new Map<string, string>(); // nodeId -> fullPath

  // Accumulators for metadata files (_attributes.md, _sources.md)
  const parentAttributes = new Map<string, Record<string, unknown>>();
  const parentSources = new Map<string, SourceRef[]>();

  for (const node of allNodes) {
    // Skip metadata files — merge their data onto the parent node instead
    if (node.type === "file" && node.name.startsWith("_")) {
      const parentPath = node.parentId
        ? buildFullPath(node.parentId, nodes)
        : null;
      if (parentPath) {
        if (node.name === "_attributes.md") {
          const existing = parentAttributes.get(parentPath) ?? {};
          parentAttributes.set(parentPath, {
            ...existing,
            ...node.frontmatter,
          });
        } else if (node.name === "_sources.md") {
          const parsed = parseMarkdownLinks(node.content ?? "");
          const existing = parentSources.get(parentPath) ?? [];
          parentSources.set(parentPath, [...existing, ...parsed]);
        }
      }
      continue;
    }

    let fullPath = buildFullPath(node.id, nodes);
    let nodeName = node.name;
    if (node.nodeType === "interpEntity") {
      fullPath = fullPath.replace(/\.md$/, "");
      nodeName = nodeName.replace(/\.md$/, "");
    }
    nodeFullPaths.set(node.id, fullPath);

    if (node.nodeType === "curation") curationNames.set(node.name, fullPath);
    if (node.nodeType === "swarm") swarmNames.set(node.name, fullPath);
    if (node.nodeType === "location") locationNames.set(node.name, fullPath);
    if (node.nodeType === "lawEntity") lawEntityNames.set(node.name, fullPath);
    if (node.nodeType === "interpEntity")
      interpFilenames.set(node.name, fullPath);

    // Re-serialise interpEntity content (prepend frontmatter block)
    let content: string | undefined;
    if (node.nodeType === "interpEntity") {
      const fmBlock = serialiseFrontmatter(node.frontmatter);
      const body = node.content ?? "";
      content = fmBlock ? `${fmBlock}${body}` : body || undefined;
    }

    // For non-interp nodes, attributes come from inheritedAttributes
    const attributes: Record<string, string> | undefined =
      node.nodeType !== "interpEntity" &&
      Object.keys(node.inheritedAttributes).length > 0
        ? { ...node.inheritedAttributes }
        : node.nodeType === "interpEntity" &&
            Object.keys(node.frontmatter).length > 0
          ? Object.fromEntries(
              Object.entries(node.frontmatter).map(([k, v]) => [
                k,
                typeof v === "string"
                  ? v
                  : Array.isArray(v)
                    ? v.map(String).join(", ")
                    : JSON.stringify(v),
              ]),
            )
          : undefined;

    const sourceNode: SourceNode = {
      id: fullPath,
      name: nodeName,
      nodeType: node.nodeType,
      content: content || undefined,
      attributes:
        attributes && Object.keys(attributes).length > 0
          ? attributes
          : undefined,
      parentName: node.parentId ? nodes.get(node.parentId)?.name : undefined,
      ...(node.nodeType !== "interpEntity" &&
      node.inheritedSources &&
      node.inheritedSources.length > 0
        ? { sources: node.inheritedSources.map((s) => ({ ...s })) }
        : {}),
    };

    sourceNodes.push(sourceNode);
  }

  // Apply accumulated metadata from _attributes.md and _sources.md onto parent nodes
  for (const sn of sourceNodes) {
    const key = sn.id ?? sn.name;
    const attrs = parentAttributes.get(key);
    const srcs = parentSources.get(key);
    if (attrs) sn.attributes = { ...(sn.attributes ?? {}), ...attrs };
    if (srcs) sn.sources = [...(sn.sources ?? []), ...srcs];
  }

  // -------------------------------------------------------------------------
  // Build edges
  // -------------------------------------------------------------------------

  const edges: Edge[] = [];

  // Hierarchical edges: parent -> child
  for (const node of allNodes) {
    if (node.parentId) {
      const parentPath = nodeFullPaths.get(node.parentId);
      const childPath = nodeFullPaths.get(node.id);
      if (parentPath && childPath) {
        edges.push({ source: parentPath, target: childPath });
      }
    }
  }

  // Cross-reference edges: interpEntity -> any node via {name}
  for (const node of allNodes) {
    if (node.nodeType === "interpEntity" && node.content) {
      const nodePath = nodeFullPaths.get(node.id);
      if (!nodePath) continue;
      const refs = extractReferences(node.content);
      for (const ref of refs) {
        const refPath = resolveNodeRef(
          ref,
          interpFilenames,
          lawEntityNames,
          locationNames,
          swarmNames,
          curationNames,
        );
        if (refPath && refPath !== nodePath) {
          // Avoid duplicates
          const alreadyExists = edges.some(
            (e) => e.source === nodePath && e.target === refPath,
          );
          if (!alreadyExists) {
            edges.push({ source: nodePath, target: refPath });
          }
        }
      }
    }
  }

  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    name: root.name,
    nodes: sourceNodes,
    edges,
    createdAt: now,
  };
}
