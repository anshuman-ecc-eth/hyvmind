import type { SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Shared node-visibility model for the force-graph diagram and its counters.
//
// A node is visible when it passes the node-type filter AND either:
//   - it is a "seed": it matches the active text/attribute filters, or
//   - it is an immediate (one undirected hop) neighbour of a seed.
// With no text/attribute filter active, every type-passing node is visible.
// ---------------------------------------------------------------------------

const ALL_NODE_TYPES = new Set([
  "curation",
  "swarm",
  "location",
  "lawEntity",
  "interpEntity",
]);

export interface GraphVisibilityFilters {
  searchText?: string;
  visibleNodeTypes?: Set<string>;
  attributeFilterText?: string;
}

export function nodeKey(node: SourceNode): string {
  return node.id ?? node.name;
}

export function matchesAttributeFilter(
  node: { attributes?: Record<string, unknown> },
  filter: string,
): boolean {
  const attrs = node.attributes;
  if (!attrs) return false;
  const colonIdx = filter.indexOf(":");
  if (colonIdx === -1) {
    return Object.keys(attrs).some((k) =>
      k.toLowerCase().includes(filter.toLowerCase()),
    );
  }
  const key = filter.slice(0, colonIdx).toLowerCase();
  const value = filter
    .slice(colonIdx + 1)
    .trim()
    .toLowerCase();
  if (!key) return false;
  if (!value) {
    return Object.keys(attrs).some((k) => k.toLowerCase().includes(key));
  }
  return Object.entries(attrs).some(
    ([k, v]) =>
      k.toLowerCase().includes(key) && String(v).toLowerCase().includes(value),
  );
}

export function isAllVisible(filters: GraphVisibilityFilters): boolean {
  const search = (filters.searchText ?? "").trim();
  const attr = (filters.attributeFilterText ?? "").trim();
  const types = filters.visibleNodeTypes;
  const allTypes = !types || types.size >= ALL_NODE_TYPES.size;
  return allTypes && search.length === 0 && attr.length === 0;
}

export function computeVisibleNodeIds(
  graph: SourceGraph,
  filters: GraphVisibilityFilters,
): Set<string> {
  const search = (filters.searchText ?? "").trim().toLowerCase();
  const attr = (filters.attributeFilterText ?? "").trim();
  const types = filters.visibleNodeTypes;
  const allTypes = !types || types.size >= ALL_NODE_TYPES.size;
  const noSearch = search.length === 0;
  const noAttr = attr.length === 0;

  const typeOk = (node: SourceNode) =>
    allTypes || (types?.has(node.nodeType) ?? true);

  if (allTypes && noSearch && noAttr) {
    return new Set(graph.nodes.map(nodeKey));
  }

  const nodesByKey = new Map<string, SourceNode>();
  for (const node of graph.nodes) nodesByKey.set(nodeKey(node), node);

  const adjacency = new Map<string, Set<string>>();
  const addAdj = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    const set = adjacency.get(a) ?? new Set<string>();
    set.add(b);
    adjacency.set(a, set);
  };
  for (const edge of graph.edges) {
    addAdj(edge.source, edge.target);
    addAdj(edge.target, edge.source);
  }

  const visible = new Set<string>();
  const seeds: string[] = [];
  for (const node of graph.nodes) {
    if (!typeOk(node)) continue;
    const key = nodeKey(node);
    const searchOk = noSearch || node.name.toLowerCase().includes(search);
    const attrOk = noAttr || matchesAttributeFilter(node, attr);
    if (searchOk && attrOk) {
      visible.add(key);
      seeds.push(key);
    }
  }

  for (const seed of seeds) {
    for (const neighbour of adjacency.get(seed) ?? []) {
      const node = nodesByKey.get(neighbour);
      if (node && typeOk(node)) visible.add(neighbour);
    }
  }

  return visible;
}
