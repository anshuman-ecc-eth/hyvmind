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

export default function useSourceGraphs() {
  const [store, setStore] = useState<SourceGraphsStore>(() =>
    loadFromStorage(),
  );

  // Sync state from storage on focus (multi-tab support)
  useEffect(() => {
    const onFocus = () => setStore(loadFromStorage());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const saveGraph = useCallback((graph: SourceGraph) => {
    setStore((prev) => {
      const next: SourceGraphsStore = {
        graphs: [...prev.graphs, graph],
        activeGraphId: prev.activeGraphId,
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const deleteGraph = useCallback((id: string) => {
    setStore((prev) => {
      const next: SourceGraphsStore = {
        graphs: prev.graphs.filter((g) => g.id !== id),
        activeGraphId: prev.activeGraphId === id ? null : prev.activeGraphId,
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setActiveGraph = useCallback((id: string | null) => {
    setStore((prev) => {
      const next: SourceGraphsStore = { ...prev, activeGraphId: id };
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateNode = useCallback(
    (graphId: string, nodeId: string, updates: Partial<SourceNode>) => {
      setStore((prev) => {
        const next: SourceGraphsStore = {
          ...prev,
          graphs: prev.graphs.map((g) =>
            g.id !== graphId
              ? g
              : {
                  ...g,
                  nodes: g.nodes.map((n) =>
                    n.id !== nodeId ? n : { ...n, ...updates },
                  ),
                },
          ),
        };
        saveToStorage(next);
        return next;
      });
    },
    [],
  );

  const loadGraphs = useCallback((): SourceGraph[] => {
    const current = loadFromStorage();
    setStore(current);
    return current.graphs;
  }, []);

  return {
    graphs: store.graphs,
    activeGraphId: store.activeGraphId,
    loadGraphs,
    saveGraph,
    deleteGraph,
    setActiveGraph,
    updateNode,
  };
}
