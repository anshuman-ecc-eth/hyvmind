import type { GraphData, SourceRef } from "../backend.d";
import { truncateLabel } from "./ontologySanitize";

function leafName(name: string): string {
  return name.split("@").pop() ?? name;
}

interface NodeType {
  id: string;
  name: string;
  typeLabel: string;
  parentId: string | null;
  attrs: Record<string, string>;
  sources: SourceRef[];
}

interface MermaidResult {
  mermaidText: string;
  sourceLines: string[];
}

function collectNodes(data: GraphData): NodeType[] {
  const nodes: NodeType[] = [];

  for (const c of data.curations) {
    nodes.push({
      id: c.id,
      name: leafName(c.name),
      typeLabel: "curation",
      parentId: null,
      attrs: buildAttrs(c.customAttributes),
      sources: c.sources,
    });
  }
  for (const s of data.swarms) {
    nodes.push({
      id: s.id,
      name: leafName(s.name),
      typeLabel: "swarm",
      parentId: s.parentCurationId,
      attrs: buildAttrs(s.customAttributes),
      sources: s.sources,
    });
  }
  for (const l of data.locations) {
    nodes.push({
      id: l.id,
      name: leafName(l.title),
      typeLabel: "location",
      parentId: l.parentSwarmId,
      attrs: buildAttrs(l.customAttributes),
      sources: l.sources,
    });
  }
  for (const lt of data.lawTokens) {
    nodes.push({
      id: lt.id,
      name: leafName(lt.tokenLabel),
      typeLabel: "lawEntity",
      parentId: lt.parentLocationId,
      attrs: buildAttrs(lt.customAttributes),
      sources: lt.sources,
    });
  }
  for (const it of data.interpretationTokens) {
    nodes.push({
      id: it.id,
      name: leafName(it.title),
      typeLabel: "interpEntity",
      parentId: it.parentLawTokenId,
      attrs: buildAttrs(it.customAttributes),
      sources: it.sources,
    });
  }

  return nodes;
}

function buildAttrs(
  attrs: Array<{
    key: string;
    weightedValues: Array<{ value: string; weight: bigint }>;
  }>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of attrs) {
    const values = attr.weightedValues
      .map((wv) =>
        Number(wv.weight) > 1 ? `${wv.value}(×${Number(wv.weight)})` : wv.value,
      )
      .join(", ");
    result[attr.key] = values;
  }
  return result;
}

function formatAttrs(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return "";
  const maxAttrs = 3;
  const parts = entries
    .slice(0, maxAttrs)
    .map(([k, v]) => `${k}: ${truncateLabel(v, 15)}`);
  const label = parts.join(" · ");
  if (entries.length > maxAttrs)
    return `${label} · +${entries.length - maxAttrs}`;
  return label;
}

const ID_PREFIX = "n";

export function graphDataToMermaid(data: GraphData): MermaidResult {
  const nodes = collectNodes(data);
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const nodeIdx = new Map<string, string>();
  nodes.forEach((n, i) => nodeIdx.set(n.id, `${ID_PREFIX}${i}`));

  const lines: string[] = [];
  lines.push("flowchart TB");

  for (const node of nodes) {
    const sid = nodeIdx.get(node.id)!;
    const name = truncateLabel(node.name, 22);
    const attrs = formatAttrs(node.attrs);
    let label = `${name}<br>(${node.typeLabel})`;
    if (attrs) label += `<br>${attrs}`;
    lines.push(`  ${sid}["${label}"]`);
  }

  for (const node of nodes) {
    if (node.parentId && nodeIdSet.has(node.parentId)) {
      const sid = nodeIdx.get(node.id)!;
      const pid = nodeIdx.get(node.parentId)!;
      lines.push(`  ${pid} --> ${sid}`);
    }
  }

  for (const edge of data.edges) {
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      const src = nodeIdx.get(edge.source)!;
      const tgt = nodeIdx.get(edge.target)!;
      const label = edge.edgeLabel ? truncateLabel(edge.edgeLabel, 16) : "";
      if (label) {
        lines.push(`  ${src} -.->|${label}| ${tgt}`);
      } else {
        lines.push(`  ${src} -.-> ${tgt}`);
      }
    }
  }

  const sourceLines: string[] = [];
  for (const node of nodes) {
    if (node.sources.length > 0) {
      const titles = node.sources.map((s) => s.name).join(", ");
      sourceLines.push(
        `${truncateLabel(node.name, 18)} (${node.typeLabel}): ${titles}`,
      );
    }
  }

  return { mermaidText: lines.join("\n"), sourceLines };
}
