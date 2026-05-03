import { useCallback, useEffect, useState } from "react";
import type {
  SourceGraph,
  SourceGraphsStore,
  SourceNode,
} from "../types/sourceGraph";

const STORAGE_KEY = "source_graphs";

function loadFromStorage(): SourceGraphsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { graphs: [], activeGraphId: null };
    const parsed = JSON.parse(raw) as SourceGraphsStore;
    return parsed;
  } catch {
    return { graphs: [], activeGraphId: null };
  }
}

function saveToStorage(store: SourceGraphsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error(
        "localStorage is full. Please delete some graphs before importing new ones.",
      );
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Singleton store — shared across all hook instances in the same tab
// ---------------------------------------------------------------------------

let globalStore: SourceGraphsStore = loadFromStorage();
const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}

export default function useSourceGraphs() {
  const [, forceUpdate] = useState(0);

  // Subscribe / unsubscribe on mount / unmount
  useEffect(() => {
    const fn = () => forceUpdate((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const saveGraph = useCallback((graph: SourceGraph) => {
    const existingIndex = globalStore.graphs.findIndex(
      (g) => g.id === graph.id,
    );
    const newGraphs =
      existingIndex >= 0
        ? globalStore.graphs.map((g, i) => (i === existingIndex ? graph : g))
        : [...globalStore.graphs, graph];
    globalStore = {
      graphs: newGraphs,
      activeGraphId: globalStore.activeGraphId,
    };
    saveToStorage(globalStore);
    notify();
  }, []);

  const deleteGraph = useCallback((id: string) => {
    globalStore = {
      graphs: globalStore.graphs.filter((g) => g.id !== id),
      activeGraphId:
        globalStore.activeGraphId === id ? null : globalStore.activeGraphId,
    };
    saveToStorage(globalStore);
    notify();
  }, []);

  const setActiveGraph = useCallback((id: string | null) => {
    globalStore = { ...globalStore, activeGraphId: id };
    saveToStorage(globalStore);
    notify();
  }, []);

  const updateNode = useCallback(
    (graphId: string, nodeName: string, updates: Partial<SourceNode>) => {
      globalStore = {
        ...globalStore,
        graphs: globalStore.graphs.map((g) =>
          g.id !== graphId
            ? g
            : {
                ...g,
                nodes: g.nodes.map((n) =>
                  n.name !== nodeName ? n : { ...n, ...updates },
                ),
              },
        ),
      };
      saveToStorage(globalStore);
      notify();
    },
    [],
  );

  const loadGraphs = useCallback((): SourceGraph[] => {
    globalStore = loadFromStorage();
    notify();
    return globalStore.graphs;
  }, []);

  return {
    graphs: globalStore.graphs,
    activeGraphId: globalStore.activeGraphId,
    loadGraphs,
    saveGraph,
    deleteGraph,
    setActiveGraph,
    updateNode,
  };
}
