import { useCallback, useRef, useState } from "react";
import type {
  EditorAction,
  EditorNode,
  EditorSession,
  EditorViewMode,
} from "../types/markdownEditor";
import { editorToSourceGraph } from "../utils/editorToSourceGraph";
import { sourceGraphToEditor } from "../utils/sourceGraphToEditor";
import useSourceGraphs from "./useSourceGraphs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVE_FILE_KEY = "editor-active-file-id";
const SESSION_STORAGE_KEY = "hyvmind-session";

function serializeSession(session: EditorSession): string {
  const serializable = {
    ...session,
    nodes: Array.from(session.nodes.entries()),
  };
  return JSON.stringify(serializable);
}

function deserializeSession(json: string): EditorSession | null {
  try {
    const parsed = JSON.parse(json) as {
      nodes: [string, EditorNode][];
      [key: string]: unknown;
    };
    return {
      ...(parsed as unknown as EditorSession),
      nodes: new Map(parsed.nodes),
    };
  } catch {
    return null;
  }
}
const MAX_UNDO = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slugify a name into a safe id segment (no @ or whitespace) */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/** Determine the expected nodeType for a direct child of a given parent nodeType */
function childNodeType(
  parentNodeType: EditorNode["nodeType"],
  childType: "folder" | "file",
): EditorNode["nodeType"] | null {
  switch (parentNodeType) {
    case "curation":
      return childType === "folder" ? "swarm" : null;
    case "swarm":
      return childType === "folder" ? "location" : null;
    case "location":
      return childType === "folder" ? "lawEntity" : null;
    case "lawEntity":
      return childType === "file" ? "interpEntity" : null;
    default:
      return null;
  }
}

/** Push an action onto a stack, capping it at MAX_UNDO entries */
function pushCapped(
  stack: EditorAction[],
  action: EditorAction,
): EditorAction[] {
  const next = [...stack, action];
  return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
}

/** Collect all descendant ids (inclusive) */
function collectDescendantIds(
  nodeId: string,
  nodes: Map<string, EditorNode>,
): string[] {
  const ids: string[] = [];
  const stack = [nodeId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    ids.push(id);
    const node = nodes.get(id);
    if (node) {
      for (const cid of node.children) stack.push(cid);
    }
  }
  return ids;
}

/** Create a fresh empty EditorSession */
function emptySession(): EditorSession {
  return {
    id: "editor-session",
    name: "Editor",
    rootIds: [],
    nodes: new Map(),
    activeFileId: null,
    viewMode: "edit",
    undoStack: [],
    redoStack: [],
    lastSavedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMarkdownEditor() {
  const { graphs, saveGraph } = useSourceGraphs();

  const [session, setSession] = useState<EditorSession>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const loaded = deserializeSession(saved);
      if (loaded) return loaded;
    }
    const s = emptySession();
    const savedFile = localStorage.getItem(ACTIVE_FILE_KEY);
    if (savedFile) s.activeFileId = savedFile;
    return s;
  });

  // Track which graph ids we've already synced to avoid re-importing unchanged data
  const syncedGraphIdsRef = useRef<Set<string>>(new Set());

  // (debounce timer removed — no auto-save)

  // ---------------------------------------------------------------------------
  // loadGraphs — merge all SourceGraphs into the session
  // ---------------------------------------------------------------------------

  const loadGraphs = useCallback(() => {
    setSession((prev) => {
      const nodes = new Map<string, EditorNode>(prev.nodes);
      const rootIds = new Set<string>(prev.rootIds);

      for (const graph of graphs) {
        const editorNodes = sourceGraphToEditor(graph);
        for (const en of editorNodes) {
          // Only overwrite if newer or not yet in the map
          const existing = nodes.get(en.id);
          if (!existing || en.updatedAt >= existing.updatedAt) {
            nodes.set(en.id, en);
          }
          if (en.nodeType === "curation") {
            rootIds.add(en.id);
          }
        }
        syncedGraphIdsRef.current.add(graph.id);
      }

      // Remove root ids that no longer have a corresponding node
      const validRootIds = [...rootIds].filter((id) => nodes.has(id));

      return {
        ...prev,
        nodes,
        rootIds: validRootIds,
        lastSavedAt: Date.now(),
      };
    });
  }, [graphs]);

  // (auto-load on mount removed — Notes and Graphs are now independent)

  // (re-sync on graphs change removed — Notes and Graphs are now independent)

  // ---------------------------------------------------------------------------
  // Internal: persist helpers (kept for explicit convert only)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // createCuration
  // ---------------------------------------------------------------------------

  const createCuration = useCallback((name: string) => {
    const id = slugify(name) || `curation-${Date.now()}`;
    const now = Date.now();
    const node: EditorNode = {
      id,
      name,
      type: "folder",
      parentId: null,
      nodeType: "curation",
      frontmatter: {},
      inheritedAttributes: {},
      inheritedSources: [],
      children: [],
      createdAt: now,
      updatedAt: now,
    };

    const action: EditorAction = { type: "create", node, parentId: null };

    setSession((prev) => {
      // Guard: don't create duplicate curation ids
      if (prev.nodes.has(id)) return prev;
      // Guard: don't create duplicate curation names
      const nameExists = Array.from(prev.nodes.values()).some(
        (n) => n.nodeType === "curation" && n.name === name,
      );
      if (nameExists) return prev;
      const nodes = new Map(prev.nodes);
      nodes.set(id, node);
      const newSession = {
        ...prev,
        nodes,
        rootIds: [...prev.rootIds, id],
        undoStack: pushCapped(prev.undoStack, action),
        redoStack: [],
        lastSavedAt: now,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // createNode
  // ---------------------------------------------------------------------------

  const createNode = useCallback(
    (parentId: string, name: string, type: "folder" | "file") => {
      setSession((prev) => {
        const parent = prev.nodes.get(parentId);
        if (!parent) return prev;

        const nt = childNodeType(parent.nodeType, type);
        if (!nt) {
          console.warn(
            `[useMarkdownEditor] Invalid hierarchy: cannot add ${type} under ${parent.nodeType}`,
          );
          return prev;
        }

        const now = Date.now();
        const childId = `${parentId}@${name}`;
        const node: EditorNode = {
          id: childId,
          name,
          type,
          parentId,
          nodeType: nt,
          frontmatter: {},
          inheritedAttributes: {},
          inheritedSources: [],
          children: [],
          createdAt: now,
          updatedAt: now,
          ...(type === "file" ? { content: "" } : {}),
        };

        const action: EditorAction = { type: "create", node, parentId };

        const nodes = new Map(prev.nodes);
        nodes.set(childId, node);
        // Add child to parent
        nodes.set(parentId, {
          ...parent,
          children: [...parent.children, childId],
          updatedAt: now,
        });

        const newSession = {
          ...prev,
          nodes,
          undoStack: pushCapped(prev.undoStack, action),
          redoStack: [],
          lastSavedAt: now,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
        return newSession;
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // updateFile
  // ---------------------------------------------------------------------------

  const updateFile = useCallback(
    (
      fileId: string,
      updates: { content?: string; frontmatter?: Record<string, unknown> },
    ) => {
      setSession((prev) => {
        const existing = prev.nodes.get(fileId);
        if (!existing) return prev;

        const now = Date.now();
        const actions: EditorAction[] = [];

        if (
          updates.content !== undefined &&
          updates.content !== existing.content
        ) {
          actions.push({
            type: "updateContent",
            nodeId: fileId,
            oldContent: existing.content,
            newContent: updates.content,
          });
        }
        if (
          updates.frontmatter !== undefined &&
          JSON.stringify(updates.frontmatter) !==
            JSON.stringify(existing.frontmatter)
        ) {
          actions.push({
            type: "updateFrontmatter",
            nodeId: fileId,
            oldFrontmatter: existing.frontmatter,
            newFrontmatter: updates.frontmatter,
          });
        }

        if (actions.length === 0) return prev;

        const updated: EditorNode = {
          ...existing,
          ...(updates.content !== undefined
            ? { content: updates.content }
            : {}),
          ...(updates.frontmatter !== undefined
            ? { frontmatter: updates.frontmatter }
            : {}),
          updatedAt: now,
        };

        const nodes = new Map(prev.nodes);
        nodes.set(fileId, updated);

        const lastAction = actions[actions.length - 1];
        let undoStack = prev.undoStack;
        for (const a of actions) {
          undoStack = pushCapped(undoStack, a);
        }
        void lastAction; // used above

        const newSession = {
          ...prev,
          nodes,
          undoStack,
          redoStack: [],
          lastSavedAt: now,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
        return newSession;
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // renameNode
  // ---------------------------------------------------------------------------

  const renameNode = useCallback((nodeId: string, newName: string) => {
    setSession((prev) => {
      const node = prev.nodes.get(nodeId);
      if (!node || node.name === newName) return prev;

      const now = Date.now();
      const action: EditorAction = {
        type: "rename",
        nodeId,
        oldName: node.name,
        newName,
      };

      // Rebuild ids for node and all descendants (since ids are path-based)
      const newId = node.parentId
        ? `${node.parentId}@${newName}`
        : slugify(newName);
      const nodes = renameNodeIds(prev.nodes, nodeId, newId, newName, now);

      // Update parent's children list
      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          nodes.set(node.parentId, {
            ...parent,
            children: parent.children.map((c) => (c === nodeId ? newId : c)),
            updatedAt: now,
          });
        }
      }

      // Update rootIds if curation was renamed
      const rootIds = prev.rootIds.map((id) => (id === nodeId ? newId : id));

      // Fix activeFileId if it was under the renamed node
      const activeFileId = prev.activeFileId
        ? remapId(prev.activeFileId, nodeId, newId)
        : null;
      if (activeFileId !== prev.activeFileId && activeFileId) {
        localStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
      }

      const newSession = {
        ...prev,
        nodes,
        rootIds,
        activeFileId,
        undoStack: pushCapped(prev.undoStack, action),
        redoStack: [],
        lastSavedAt: now,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // deleteNode
  // ---------------------------------------------------------------------------

  const deleteNode = useCallback((nodeId: string) => {
    setSession((prev) => {
      const node = prev.nodes.get(nodeId);
      if (!node) return prev;

      const now = Date.now();
      const allIds = collectDescendantIds(nodeId, prev.nodes);
      const deletedDescendantIds = allIds.filter((id) => id !== nodeId);

      const action: EditorAction = {
        type: "delete",
        node,
        parentId: node.parentId,
        deletedDescendantIds,
      };

      const nodes = new Map(prev.nodes);
      for (const id of allIds) nodes.delete(id);

      // Remove from parent's children
      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          nodes.set(node.parentId, {
            ...parent,
            children: parent.children.filter((c) => c !== nodeId),
            updatedAt: now,
          });
        }
      }

      const rootIds = prev.rootIds.filter((id) => id !== nodeId);
      const activeFileId =
        prev.activeFileId && allIds.includes(prev.activeFileId)
          ? null
          : prev.activeFileId;
      if (activeFileId !== prev.activeFileId) {
        if (activeFileId) localStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
        else localStorage.removeItem(ACTIVE_FILE_KEY);
      }

      const newSession = {
        ...prev,
        nodes,
        rootIds,
        activeFileId,
        undoStack: pushCapped(prev.undoStack, action),
        redoStack: [],
        lastSavedAt: now,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // setActiveFile
  // ---------------------------------------------------------------------------

  const setActiveFile = useCallback((fileId: string | null) => {
    setSession((prev) => {
      if (fileId) localStorage.setItem(ACTIVE_FILE_KEY, fileId);
      else localStorage.removeItem(ACTIVE_FILE_KEY);
      const newSession = { ...prev, activeFileId: fileId };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // setViewMode
  // ---------------------------------------------------------------------------

  const setViewMode = useCallback((mode: EditorViewMode) => {
    setSession((prev) => {
      const newSession = { ...prev, viewMode: mode };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // undo / redo
  // ---------------------------------------------------------------------------

  const undo = useCallback(() => {
    setSession((prev) => {
      if (prev.undoStack.length === 0) return prev;
      const action = prev.undoStack[prev.undoStack.length - 1];
      const undoStack = prev.undoStack.slice(0, -1);
      const redoStack = [...prev.redoStack, action];
      const nodes = applyInverseAction(action, prev.nodes);
      const rootIds = rebuildRootIds(nodes);
      const newSession = { ...prev, nodes, rootIds, undoStack, redoStack };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  const redo = useCallback(() => {
    setSession((prev) => {
      if (prev.redoStack.length === 0) return prev;
      const action = prev.redoStack[prev.redoStack.length - 1];
      const redoStack = prev.redoStack.slice(0, -1);
      const undoStack = pushCapped(prev.undoStack, action);
      const nodes = applyAction(action, prev.nodes);
      const rootIds = rebuildRootIds(nodes);
      const newSession = { ...prev, nodes, rootIds, undoStack, redoStack };
      localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
      return newSession;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // convertToSourceGraph — explicit one-way conversion: Notes → Graphs
  // ---------------------------------------------------------------------------

  const convertToSourceGraph = useCallback(
    async (
      curationId: string,
    ): Promise<
      { success: true; graphName: string } | { success: false; error: string }
    > => {
      try {
        const node = session.nodes.get(curationId);
        if (!node || node.nodeType !== "curation") {
          return { success: false, error: "Node is not a curation" };
        }
        const sourceGraph = editorToSourceGraph(session.nodes, curationId);
        // Resolve name conflicts in Graphs store
        let graphName = sourceGraph.name;
        const existingNames = new Set(graphs.map((g) => g.name));
        if (existingNames.has(graphName)) {
          let counter = 1;
          while (existingNames.has(`${graphName} (${counter})`)) {
            counter++;
          }
          graphName = `${graphName} (${counter})`;
        }
        saveGraph({ ...sourceGraph, name: graphName });
        setSession((prev) => {
          const newSession = { ...prev, lastSavedAt: Date.now() };
          localStorage.setItem(
            SESSION_STORAGE_KEY,
            serializeSession(newSession),
          );
          return newSession;
        });
        return { success: true, graphName };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Conversion failed";
        console.error("[useMarkdownEditor] convertToSourceGraph failed:", err);
        return { success: false, error: message };
      }
    },
    [graphs, saveGraph, session.nodes],
  );

  // ---------------------------------------------------------------------------
  // importRawNodes — add raw nodes directly to session (ZIP import)
  // ---------------------------------------------------------------------------

  const importRawNodes = useCallback(
    (nodes: Map<string, EditorNode>, rootIds: string | string[]) => {
      const newRootIds = Array.isArray(rootIds) ? rootIds : [rootIds];
      setSession((prev) => {
        const mergedNodes = new Map(prev.nodes);
        for (const [id, node] of nodes) {
          mergedNodes.set(id, node);
        }
        const newSession = {
          ...prev,
          nodes: mergedNodes,
          rootIds: [...prev.rootIds, ...newRootIds],
        };
        localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(newSession));
        return newSession;
      });
    },
    [],
  );

  return {
    session,
    loadGraphs,
    createCuration,
    createNode,
    updateFile,
    renameNode,
    deleteNode,
    setActiveFile,
    setViewMode,
    undo,
    redo,
    canUndo: session.undoStack.length > 0,
    canRedo: session.redoStack.length > 0,
    convertToSourceGraph,
    importRawNodes,
  };
}

// ---------------------------------------------------------------------------
// Pure helpers used inside state updaters (defined outside hook to avoid
// stale-closure issues since they are stateless)
// ---------------------------------------------------------------------------

/** Remap a single id: if it starts with oldId, replace that prefix with newId */
function remapId(id: string, oldId: string, newId: string): string {
  if (id === oldId) return newId;
  if (id.startsWith(`${oldId}@`)) return `${newId}${id.slice(oldId.length)}`;
  return id;
}

/**
 * Recursively rename node ids when a node is renamed.
 * Returns a new Map with updated ids and children arrays.
 */
function renameNodeIds(
  nodes: Map<string, EditorNode>,
  oldId: string,
  newId: string,
  newName: string,
  now: number,
): Map<string, EditorNode> {
  const result = new Map<string, EditorNode>();
  for (const [id, node] of nodes) {
    const mappedId = remapId(id, oldId, newId);
    const mappedParentId = node.parentId
      ? remapId(node.parentId, oldId, newId)
      : null;
    const mappedChildren = node.children.map((c) => remapId(c, oldId, newId));
    result.set(mappedId, {
      ...node,
      id: mappedId,
      name: id === oldId ? newName : node.name,
      parentId: mappedParentId,
      children: mappedChildren,
      updatedAt: id === oldId ? now : node.updatedAt,
    });
  }
  return result;
}

/** Rebuild rootIds from the nodes map */
function rebuildRootIds(nodes: Map<string, EditorNode>): string[] {
  const ids: string[] = [];
  for (const [id, node] of nodes) {
    if (node.nodeType === "curation" && node.parentId === null) ids.push(id);
  }
  return ids;
}

/** Apply a forward action to the nodes map */
function applyAction(
  action: EditorAction,
  nodes: Map<string, EditorNode>,
): Map<string, EditorNode> {
  const next = new Map(nodes);
  const now = Date.now();

  switch (action.type) {
    case "create": {
      next.set(action.node.id, action.node);
      if (action.parentId) {
        const parent = next.get(action.parentId);
        if (parent && !parent.children.includes(action.node.id)) {
          next.set(action.parentId, {
            ...parent,
            children: [...parent.children, action.node.id],
            updatedAt: now,
          });
        }
      }
      break;
    }
    case "rename": {
      const node = next.get(action.nodeId);
      if (node) {
        const newId = node.parentId
          ? `${node.parentId}@${action.newName}`
          : slugify(action.newName);
        return renameNodeIds(next, action.nodeId, newId, action.newName, now);
      }
      break;
    }
    case "delete": {
      const allIds = collectDescendantIds(action.node.id, next);
      for (const id of allIds) next.delete(id);
      if (action.parentId) {
        const parent = next.get(action.parentId);
        if (parent) {
          next.set(action.parentId, {
            ...parent,
            children: parent.children.filter((c) => c !== action.node.id),
            updatedAt: now,
          });
        }
      }
      break;
    }
    case "updateContent": {
      const node = next.get(action.nodeId);
      if (node) {
        next.set(action.nodeId, {
          ...node,
          content: action.newContent,
          updatedAt: now,
        });
      }
      break;
    }
    case "updateFrontmatter": {
      const node = next.get(action.nodeId);
      if (node) {
        next.set(action.nodeId, {
          ...node,
          frontmatter: action.newFrontmatter,
          updatedAt: now,
        });
      }
      break;
    }
  }
  return next;
}

/** Apply the inverse of an action (for undo) */
function applyInverseAction(
  action: EditorAction,
  nodes: Map<string, EditorNode>,
): Map<string, EditorNode> {
  const next = new Map(nodes);
  const now = Date.now();

  switch (action.type) {
    case "create": {
      // Inverse of create = delete
      const allIds = collectDescendantIds(action.node.id, next);
      for (const id of allIds) next.delete(id);
      if (action.parentId) {
        const parent = next.get(action.parentId);
        if (parent) {
          next.set(action.parentId, {
            ...parent,
            children: parent.children.filter((c) => c !== action.node.id),
            updatedAt: now,
          });
        }
      }
      break;
    }
    case "rename": {
      const node = next.get(action.nodeId);
      // After a rename the nodeId may have been updated — find by old name
      const currentNode =
        node ??
        [...next.values()].find(
          (n) =>
            n.name === action.newName &&
            n.parentId ===
              (action.nodeId.includes("@")
                ? action.nodeId.slice(0, action.nodeId.lastIndexOf("@"))
                : null),
        );
      if (currentNode) {
        const oldId = currentNode.parentId
          ? `${currentNode.parentId}@${action.oldName}`
          : slugify(action.oldName);
        return renameNodeIds(next, currentNode.id, oldId, action.oldName, now);
      }
      break;
    }
    case "delete": {
      // Restore the deleted node and all its descendants
      next.set(action.node.id, action.node);
      if (action.parentId) {
        const parent = next.get(action.parentId);
        if (parent && !parent.children.includes(action.node.id)) {
          next.set(action.parentId, {
            ...parent,
            children: [...parent.children, action.node.id],
            updatedAt: now,
          });
        }
      }
      // NOTE: descendant nodes were not stored in the action for brevity;
      // a full restore would require storing them — this is a best-effort undo.
      break;
    }
    case "updateContent": {
      const node = next.get(action.nodeId);
      if (node) {
        next.set(action.nodeId, {
          ...node,
          content: action.oldContent,
          updatedAt: now,
        });
      }
      break;
    }
    case "updateFrontmatter": {
      const node = next.get(action.nodeId);
      if (node) {
        next.set(action.nodeId, {
          ...node,
          frontmatter: action.oldFrontmatter,
          updatedAt: now,
        });
      }
      break;
    }
  }
  return next;
}
