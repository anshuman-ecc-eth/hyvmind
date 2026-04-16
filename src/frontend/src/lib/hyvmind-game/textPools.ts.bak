import type { TextPools } from "./types";

export const FALLBACK_CURATION_NAMES: string[] = [
  "Constitutional Framework",
  "Criminal Code",
  "Civil Rights",
  "Due Process",
  "Judicial Review",
];

export const FALLBACK_SWARM_NAMES: string[] = [
  "Legal Collective",
  "Civic Assembly",
  "Policy Forum",
  "Rights Advocacy",
  "Justice Coalition",
];

export const FALLBACK_LAW_NAMES: string[] = [
  "Article I",
  "Amendment IV",
  "Precedent",
  "Habeas Corpus",
  "Stare Decisis",
];

interface SourceNode {
  name: string;
  nodeType: string;
}

interface SourceGraph {
  nodes?: SourceNode[];
}

export function loadTextPools(): TextPools {
  try {
    const raw = localStorage.getItem("source_graphs");
    if (!raw) return fallback();

    const graphs: SourceGraph[] = JSON.parse(raw);
    if (!Array.isArray(graphs) || graphs.length === 0) return fallback();

    const curations = new Set<string>();
    const swarms = new Set<string>();
    const lawEntities = new Set<string>();

    for (const graph of graphs) {
      if (!Array.isArray(graph.nodes)) continue;
      for (const node of graph.nodes) {
        if (!node.name) continue;
        if (node.nodeType === "curation") curations.add(node.name);
        else if (node.nodeType === "swarm") swarms.add(node.name);
        else if (node.nodeType === "lawEntity") lawEntities.add(node.name);
      }
    }

    return {
      curations:
        curations.size > 0 ? [...curations] : [...FALLBACK_CURATION_NAMES],
      swarms: swarms.size > 0 ? [...swarms] : [...FALLBACK_SWARM_NAMES],
      lawEntities:
        lawEntities.size > 0 ? [...lawEntities] : [...FALLBACK_LAW_NAMES],
    };
  } catch {
    return fallback();
  }
}

function fallback(): TextPools {
  return {
    curations: [...FALLBACK_CURATION_NAMES],
    swarms: [...FALLBACK_SWARM_NAMES],
    lawEntities: [...FALLBACK_LAW_NAMES],
  };
}
