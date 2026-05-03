import { DeleteConfirmDialog } from "@/components/markdown-editor/DeleteConfirmDialog";
import { FileTree } from "@/components/markdown-editor/FileTree";
import { FrontmatterEditor } from "@/components/markdown-editor/FrontmatterEditor";
import { GettingStarted } from "@/components/markdown-editor/GettingStarted";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/markdown-editor/MarkdownPreview";
import { useMarkdownEditor } from "@/hooks/useMarkdownEditor";
import type { EditorNode } from "@/types/markdownEditor";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseFrontmatter, stripFrontmatter } from "../utils/sourceGraphParser";

// ---------------------------------------------------------------------------
// Context menu state
// ---------------------------------------------------------------------------

interface ContextMenu {
  x: number;
  y: number;
  nodeId: string;
}

type ContextOption =
  | "new-swarm"
  | "new-location"
  | "new-law-entity"
  | "new-file"
  | "rename"
  | "delete"
  | "convert-to-source-graph";

const CONTEXT_OPTIONS: Record<string, ContextOption[]> = {
  curation: ["new-swarm", "rename", "delete", "convert-to-source-graph"],
  swarm: ["new-location", "rename", "delete"],
  location: ["new-law-entity", "rename", "delete"],
  lawEntity: ["new-file", "rename", "delete"],
  interpEntity: ["rename", "delete"],
};

const OPTION_LABELS: Record<ContextOption, string> = {
  "new-swarm": "New Swarm",
  "new-location": "New Location",
  "new-law-entity": "New Law Entity",
  "new-file": "New File",
  rename: "Rename",
  delete: "Delete",
  "convert-to-source-graph": "Convert",
};

// ---------------------------------------------------------------------------
// Inline dialog helper
// ---------------------------------------------------------------------------

function InlineDialog({
  label,
  value,
  placeholder,
  onClose,
  onSubmit,
  ocidPrefix,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  ocidPrefix: string;
}) {
  const [name, setName] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60"
        aria-hidden="true"
        onClick={onClose}
        onKeyDown={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-label={label}
        data-ocid={`${ocidPrefix}.dialog`}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border shadow-lg p-5 w-80 font-mono m-0 max-w-none"
      >
        <p className="text-sm font-medium text-foreground mb-3">{label}</p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSubmit(name.trim());
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder={placeholder ?? "Name"}
          className="w-full px-2 py-1.5 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-3"
          data-ocid={`${ocidPrefix}.input`}
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-ocid={`${ocidPrefix}.cancel_button`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              if (name.trim()) onSubmit(name.trim());
            }}
            className="text-xs px-3 py-1.5 border border-dashed border-border text-foreground hover:border-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-ocid={`${ocidPrefix}.submit_button`}
          >
            Confirm
          </button>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// EditorView
// ---------------------------------------------------------------------------

export default function EditorView() {
  const {
    session,
    createCuration,
    createNode,
    updateFile,
    renameNode,
    deleteNode,
    setActiveFile,
    setViewMode,
    convertToSourceGraph,
    importRawNodes,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useMarkdownEditor();

  // Saving indicator
  const [isSaving, setIsSaving] = useState(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Dialog: create curation
  const [showCreateCuration, setShowCreateCuration] = useState(false);

  // Dialog: rename node
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    currentName: string;
  } | null>(null);

  // Dialog: create child
  const [createChild, setCreateChild] = useState<{
    parentId: string;
    type: "folder" | "file";
    label: string;
  } | null>(null);

  // File input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: Ctrl+E toggles edit/preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "e") {
        e.preventDefault();
        setViewMode(
          (session?.viewMode ?? "edit") === "edit" ? "preview" : "edit",
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setViewMode, session?.viewMode]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  // Cleanup saving timer
  useEffect(() => {
    return () => {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    },
    [],
  );

  const handleContextOption = useCallback(
    (option: ContextOption) => {
      if (!contextMenu) return;
      const { nodeId } = contextMenu;
      setContextMenu(null);

      switch (option) {
        case "new-swarm":
          setCreateChild({
            parentId: nodeId,
            type: "folder",
            label: "New Swarm",
          });
          break;
        case "new-location":
          setCreateChild({
            parentId: nodeId,
            type: "folder",
            label: "New Location",
          });
          break;
        case "new-law-entity":
          setCreateChild({
            parentId: nodeId,
            type: "folder",
            label: "New Law Entity",
          });
          break;
        case "new-file":
          setCreateChild({ parentId: nodeId, type: "file", label: "New File" });
          break;
        case "rename": {
          const node = session?.nodes.get(nodeId);
          if (node) setRenameTarget({ id: nodeId, currentName: node.name });
          break;
        }
        case "delete":
          setDeleteTarget(nodeId);
          break;
        case "convert-to-source-graph": {
          void (async () => {
            const result = await convertToSourceGraph(nodeId);
            if (result.success) {
              toast.success(`Converted to source graph: ${result.graphName}`);
            } else {
              toast.error(`Conversion failed: ${result.error}`);
            }
          })();
          break;
        }
      }
    },
    [contextMenu, session, convertToSourceGraph],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      try {
        const { default: JSZip } = await import("jszip");
        const zip = await JSZip.loadAsync(file);
        const entries = Object.keys(zip.files);

        const newNodes = new Map<string, EditorNode>();
        const idMap = new Map<string, string>(); // normalized path -> nodeId
        const topLevelFolderIds: string[] = [];

        const sortedEntries = [...entries].sort();

        for (const entryPath of sortedEntries) {
          const zipEntry = zip.files[entryPath];
          if (!entryPath || entryPath === "/") continue;
          const normalizedPath = entryPath.replace(/\/$/, "");
          if (!normalizedPath) continue;
          const parts = normalizedPath.split("/");
          const name = parts[parts.length - 1];
          if (!name) continue;

          const parentPath = parts.slice(0, -1).join("/");
          const isDirectory = zipEntry.dir || entryPath.endsWith("/");
          const nodeId = `import-${Date.now()}-${Math.random().toString(36).slice(2)}`;

          let content: string | undefined;
          let frontmatterData: Record<string, unknown> = {};
          if (!isDirectory && name.endsWith(".md")) {
            try {
              const rawContent = await zipEntry.async("string");
              frontmatterData = parseFrontmatter(rawContent);
              content = stripFrontmatter(rawContent);
            } catch {
              content = "";
            }
          }

          // Depth-based nodeType inference
          const depth = parts.length - 1;
          let nodeType: EditorNode["nodeType"];
          if (!isDirectory && name.endsWith(".md")) {
            nodeType = "interpEntity";
          } else if (isDirectory) {
            switch (depth) {
              case 0:
                nodeType = "curation";
                break;
              case 1:
                nodeType = "swarm";
                break;
              case 2:
                nodeType = "location";
                break;
              case 3:
                nodeType = "lawEntity";
                break;
              default:
                nodeType = "swarm"; // fallback
            }
          } else {
            nodeType = "interpEntity";
          }

          const parentId =
            parentPath === "" ? null : (idMap.get(parentPath) ?? null);

          const node: EditorNode = {
            id: nodeId,
            name,
            type: isDirectory ? "folder" : "file",
            parentId,
            nodeType,
            content,
            frontmatter: frontmatterData,
            inheritedAttributes: {},
            children: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          newNodes.set(nodeId, node);
          idMap.set(normalizedPath, nodeId);

          if (parentId !== null) {
            const parent = newNodes.get(parentId);
            if (parent) {
              parent.children.push(nodeId);
            }
          }

          if (depth === 0 && isDirectory) {
            topLevelFolderIds.push(nodeId);
          }
        }

        // Use top-level folder IDs as roots; fall back to any root-level entries
        const rootIds =
          topLevelFolderIds.length > 0
            ? topLevelFolderIds
            : [...newNodes.keys()].filter(
                (id) => newNodes.get(id)?.parentId === null,
              );

        importRawNodes(newNodes, rootIds);
      } catch (err) {
        console.error("[EditorView] ZIP import failed:", err);
      }
    },
    [importRawNodes],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!session?.activeFileId) return;
      setIsSaving(true);
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      savingTimerRef.current = setTimeout(() => setIsSaving(false), 900);
      updateFile(session.activeFileId, { content });
    },
    [session, updateFile],
  );

  const handleFrontmatterChange = useCallback(
    (frontmatter: Record<string, unknown>) => {
      if (!session?.activeFileId) return;
      updateFile(session.activeFileId, { frontmatter });
    },
    [session, updateFile],
  );

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const activeNode = session?.activeFileId
    ? (session.nodes.get(session.activeFileId) ?? null)
    : null;

  const viewMode = session?.viewMode ?? "edit";
  const isEmpty = !session || session.rootIds.length === 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="flex flex-col h-full bg-background font-mono"
      data-ocid="notes.page"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import ZIP file"
        data-ocid="editor.file_input"
      />

      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          notes
        </span>

        {/* View mode tabs */}
        {!isEmpty && (
          <div className="flex items-center gap-0.5 mr-2">
            {(["edit", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={[
                  "text-xs px-2 py-1 transition-colors border",
                  viewMode === mode
                    ? "border-border bg-accent text-accent-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                ].join(" ")}
                data-ocid={`editor.view_mode.${mode}`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          className="text-xs px-2 py-1 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-ocid="editor.undo_button"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          className="text-xs px-2 py-1 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-ocid="editor.redo_button"
        >
          ↪
        </button>

        {/* Create curation */}
        <button
          type="button"
          onClick={() => setShowCreateCuration(true)}
          className="text-xs border border-dashed border-border px-3 py-1 text-foreground hover:border-foreground hover:bg-accent transition-colors"
          data-ocid="editor.create_button"
        >
          + create
        </button>

        {/* Import ZIP */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs border border-dashed border-border px-3 py-1 text-foreground hover:border-foreground hover:bg-accent transition-colors"
          data-ocid="editor.import_button"
        >
          import zip
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center content area */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {isEmpty ? (
            <GettingStarted
              onCreate={() => setShowCreateCuration(true)}
              onImport={() => fileInputRef.current?.click()}
            />
          ) : (
            <>
              {viewMode === "edit" && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {activeNode?.type === "file" && (
                    <FrontmatterEditor
                      frontmatter={activeNode.frontmatter}
                      onChange={handleFrontmatterChange}
                    />
                  )}
                  {activeNode?.type === "file" ? (
                    <MarkdownEditor
                      content={activeNode.content ?? ""}
                      onChange={handleContentChange}
                      isSaving={isSaving}
                    />
                  ) : (
                    <div
                      className="flex-1 flex items-center justify-center text-muted-foreground text-xs"
                      data-ocid="editor.no_file_state"
                    >
                      Select a file from the tree to edit
                    </div>
                  )}
                </div>
              )}

              {viewMode === "preview" && (
                <MarkdownPreview
                  content={
                    activeNode?.type === "file"
                      ? (activeNode.content ?? "")
                      : ""
                  }
                />
              )}
            </>
          )}
        </div>

        {/* Right sidebar: file tree */}
        {!isEmpty && (
          <div
            className="w-60 shrink-0 border-l border-dashed border-border bg-card flex flex-col overflow-hidden"
            data-ocid="editor.sidebar"
          >
            <div className="px-2 py-1.5 border-b border-dashed border-border shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                files
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <FileTree
                nodes={session.nodes}
                rootIds={session.rootIds}
                activeFileId={session.activeFileId}
                onSelectFile={setActiveFile}
                onCreateNode={createNode}
                onRenameNode={renameNode}
                onDeleteNode={(id) => setDeleteTarget(id)}
                onContextMenu={handleContextMenu}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating context menu */}
      {contextMenu &&
        (() => {
          const node = session?.nodes.get(contextMenu.nodeId);
          const options = CONTEXT_OPTIONS[node?.nodeType ?? ""] ?? [];
          if (options.length === 0) return null;
          return (
            <div
              ref={contextMenuRef}
              role="menu"
              aria-label="Node context menu"
              data-ocid="editor.context_menu"
              className="fixed z-50 bg-card border border-border shadow-lg py-0.5 min-w-[150px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="menuitem"
                  onClick={() => handleContextOption(opt)}
                  className={[
                    "w-full text-left px-3 py-1.5 text-xs transition-colors",
                    opt === "delete"
                      ? "text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
                  data-ocid={`editor.context_menu.${opt}`}
                >
                  {OPTION_LABELS[opt]}
                </button>
              ))}
            </div>
          );
        })()}

      {/* Create curation dialog */}
      {showCreateCuration && (
        <InlineDialog
          label="New curation"
          value=""
          placeholder="Curation name"
          onClose={() => setShowCreateCuration(false)}
          onSubmit={(name) => {
            createCuration(name);
            setShowCreateCuration(false);
          }}
          ocidPrefix="editor.create_curation_dialog"
        />
      )}

      {/* Rename dialog */}
      {renameTarget && (
        <InlineDialog
          label="Rename"
          value={renameTarget.currentName}
          onClose={() => setRenameTarget(null)}
          onSubmit={(name) => {
            renameNode(renameTarget.id, name);
            setRenameTarget(null);
          }}
          ocidPrefix="editor.rename_dialog"
        />
      )}

      {/* Create child node dialog */}
      {createChild && (
        <InlineDialog
          label={createChild.label}
          value=""
          placeholder="Name"
          onClose={() => setCreateChild(null)}
          onSubmit={(name) => {
            createNode(createChild.parentId, name, createChild.type);
            setCreateChild(null);
          }}
          ocidPrefix="editor.create_child_dialog"
        />
      )}

      {/* Delete confirm dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        nodeName={
          deleteTarget ? (session?.nodes.get(deleteTarget)?.name ?? "") : ""
        }
        onConfirm={() => {
          if (deleteTarget) deleteNode(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
