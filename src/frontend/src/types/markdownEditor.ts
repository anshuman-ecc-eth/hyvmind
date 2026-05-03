// ---------------------------------------------------------------------------
// Markdown Editor Types
// ---------------------------------------------------------------------------

export type EditorNodeType = "folder" | "file";

export type EditorViewMode = "edit" | "preview";

/**
 * A single node in the editor's virtual file tree.
 *
 * - Folders map to curation / swarm / location / lawEntity source nodes.
 * - Files  map to interpEntity source nodes (leaf .md files).
 */
export interface EditorNode {
  /** Stable unique id — derived from the node's full @-separated path */
  id: string;
  name: string;
  /** Whether this node renders as a directory or a file in the tree */
  type: EditorNodeType;
  /** id of the parent EditorNode, or null for root curations */
  parentId: string | null;
  /** Original source graph node type */
  nodeType: "curation" | "swarm" | "location" | "lawEntity" | "interpEntity";
  /** Markdown body (files only) */
  content?: string;
  /** Parsed YAML frontmatter key-value pairs (files only) */
  frontmatter: Record<string, unknown>;
  /** Attributes inherited from ancestor _attributes.md files */
  inheritedAttributes: Record<string, string>;
  /** Ordered ids of direct children */
  children: string[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Undo / redo action union
// ---------------------------------------------------------------------------

export type EditorAction =
  | {
      type: "create";
      node: EditorNode;
      parentId: string | null;
    }
  | {
      type: "rename";
      nodeId: string;
      oldName: string;
      newName: string;
    }
  | {
      type: "delete";
      node: EditorNode;
      parentId: string | null;
      /** ids of all descendant nodes that were also removed */
      deletedDescendantIds: string[];
    }
  | {
      type: "updateContent";
      nodeId: string;
      oldContent: string | undefined;
      newContent: string | undefined;
    }
  | {
      type: "updateFrontmatter";
      nodeId: string;
      oldFrontmatter: Record<string, unknown>;
      newFrontmatter: Record<string, unknown>;
    };

// ---------------------------------------------------------------------------
// Editor session
// ---------------------------------------------------------------------------

/**
 * The top-level editor session that holds all nodes across curations.
 *
 * `rootIds` contains the ids of every top-level curation folder so that
 * multiple curations can be displayed in the same session.
 */
export interface EditorSession {
  id: string;
  name: string;
  /** ids of root-level curation EditorNodes */
  rootIds: string[];
  /** flat map of all EditorNodes by id */
  nodes: Map<string, EditorNode>;
  /** id of the currently open file, or null */
  activeFileId: string | null;
  viewMode: EditorViewMode;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
  lastSavedAt: number;
}
