import { useEffect } from "react";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";
import { sourceGraphToInput } from "./usePublishGraph";

function parentIdFromPath(id: string): string | null {
  const lastAt = id.lastIndexOf("@");
  return lastAt > 0 ? id.slice(0, lastAt) : null;
}

function getSourceGraphs(): SourceGraph[] {
  try {
    const raw = localStorage.getItem("source_graphs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getActiveGraph(): SourceGraph | undefined {
  const graphs = getSourceGraphs();
  const activeId = localStorage.getItem("active_source_graph_id");
  if (activeId) return graphs.find((g) => g.id === activeId);
  return graphs[0];
}

export function useDebugTools() {
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__debug = {
      dumpSourceGraph: (graphId: string) => {
        const graphs = getSourceGraphs();
        const graph = graphs.find((g) => g.id === graphId);
        if (!graph) {
          console.warn(`[debug] No graph found with id: ${graphId}`);
          return;
        }
        console.log(`[debug] dumpSourceGraph: ${graph.name} (${graph.id})`);
        const rows = graph.nodes.map((n: SourceNode) => ({
          id: n.id ?? "(none)",
          name: n.name,
          nodeType: n.nodeType,
          parentName: n.parentName ?? "(root)",
        }));
        console.table(rows);
        console.log(`[debug] Edges (${graph.edges.length}):`);
        for (const e of graph.edges) {
          console.log(`  ${e.source} → ${e.target}`);
        }
      },

      comparePublish: (graphId: string) => {
        const graphs = getSourceGraphs();
        const graph = graphs.find((g) => g.id === graphId);
        if (!graph) {
          console.warn(`[debug] No graph found with id: ${graphId}`);
          return;
        }
        const input = sourceGraphToInput(graph);
        console.log(`[debug] comparePublish: ${graph.name} (${graph.id})`);
        console.log(input);
        return input;
      },

      traceAncestorChain: (nodeId: string) => {
        const graph = getActiveGraph();
        if (!graph) {
          console.warn("[debug] No active graph found");
          return;
        }
        const nodeMap = new Map<string, SourceNode>();
        for (const n of graph.nodes) {
          const key = n.id ?? n.name;
          if (key) nodeMap.set(key, n);
        }
        console.log(`[debug] traceAncestorChain from: ${nodeId}`);
        let currentId: string | null = nodeId;
        let depth = 0;
        while (currentId) {
          const node = nodeMap.get(currentId);
          if (!node) {
            console.log(
              `  [depth ${depth}] id="${currentId}" — NOT FOUND in nodeMap`,
            );
            break;
          }
          console.log(
            `  [depth ${depth}] id="${node.id ?? "(none)"}" name="${node.name}" nodeType="${node.nodeType}"`,
          );
          if (node.attributes && Object.keys(node.attributes).length > 0) {
            console.log("    attributes:", node.attributes);
          }
          if (node.sources && node.sources.length > 0) {
            console.log("    sources:", node.sources);
          }
          currentId = parentIdFromPath(currentId);
          depth++;
        }
        if (depth === 0) console.log("  (no ancestors found)");
      },
    };

    return () => {
      (window as unknown as Record<string, unknown>).__debug = undefined;
    };
  }, []);
}
