import { DeleteConfirmDialog } from "@/components/markdown-editor/DeleteConfirmDialog";
import { FileTree } from "@/components/markdown-editor/FileTree";
import { FrontmatterEditor } from "@/components/markdown-editor/FrontmatterEditor";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/markdown-editor/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { useMarkdownEditor } from "@/hooks/useMarkdownEditor";
import type { EditorNode } from "@/types/markdownEditor";
import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
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
  | "add-attributes"
  | "add-sources"
  | "rename"
  | "delete"
  | "convert-to-source-graph"
  | "download";

const CONTEXT_OPTIONS: Record<string, ContextOption[]> = {
  curation: [
    "new-swarm",
    "download",
    "add-attributes",
    "add-sources",
    "rename",
    "delete",
    "convert-to-source-graph",
  ],
  swarm: ["new-location", "add-attributes", "add-sources", "rename", "delete"],
  location: [
    "new-law-entity",
    "add-attributes",
    "add-sources",
    "rename",
    "delete",
  ],
  lawEntity: ["new-file", "add-attributes", "add-sources", "rename", "delete"],
  interpEntity: ["rename", "delete"],
};

const OPTION_LABELS: Record<ContextOption, string> = {
  "new-swarm": "New Swarm",
  "new-location": "New Location",
  "new-law-entity": "New Law Entity",
  "new-file": "New File",
  "add-attributes": "Add Attributes",
  "add-sources": "Add Sources",
  rename: "Rename",
  delete: "Delete",
  "convert-to-source-graph": "Convert",
  download: "Download ZIP",
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid={`${ocidPrefix}.cancel_button`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              if (name.trim()) onSubmit(name.trim());
            }}
            data-ocid={`${ocidPrefix}.submit_button`}
          >
            Confirm
          </Button>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Obsidian import conversion
// ---------------------------------------------------------------------------

interface ObsidianFolder {
  name: string;
  content?: string;
  folders?: ObsidianFolder[];
}

function convertObsidianData(data: { folders: ObsidianFolder[] }): {
  nodes: Map<string, EditorNode>;
  rootIds: string[];
} {
  const nodes = new Map<string, EditorNode>();
  const rootIds: string[] = [];

  function processFolder(
    folder: ObsidianFolder,
    parentId: string | null,
    pathPrefix: string,
    depth = 0,
  ): void {
    const id = parentId ? `${pathPrefix}@${folder.name}` : folder.name;
    let nodeType: EditorNode["nodeType"];
    if (folder.content != null) {
      nodeType = "interpEntity";
    } else {
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
          nodeType = "lawEntity";
          break;
      }
    }
    const children: string[] = [];
    if (folder.folders) {
      for (const child of folder.folders) {
        const childId = `${id}@${child.name}`;
        children.push(childId);
        processFolder(child, id, id, depth + 1);
      }
    }
    const node: EditorNode = {
      id,
      name: folder.name,
      type: nodeType === "interpEntity" ? "file" : "folder",
      nodeType,
      content: folder.content ? stripFrontmatter(folder.content) : "",
      parentId,
      children,
      frontmatter: folder.content ? parseFrontmatter(folder.content) : {},
      inheritedAttributes: {},
      inheritedSources: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    nodes.set(id, node);
    if (parentId === null) rootIds.push(id);
  }

  for (const folder of data.folders) {
    processFolder(folder, null, folder.name, 0);
  }
  return { nodes, rootIds };
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

  const rawActor = useActor(createActor as Parameters<typeof useActor>[0]);
  const backendActor = rawActor.actor as backendInterface | null;

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

  // Auto-import Obsidian folder data from backend on mount
  useEffect(() => {
    if (!backendActor) return;
    void (async () => {
      try {
        const result = await backendActor.getNotesData();
        if (!result) return;
        const data = JSON.parse(result) as { folders: ObsidianFolder[] };
        if (!data.folders || data.folders.length === 0) return;
        const { nodes: nodeMap, rootIds } = convertObsidianData(data);
        importRawNodes(nodeMap, rootIds);
        await backendActor.storeNotesData("");
      } catch (err) {
        console.warn("Obsidian import failed:", err);
      }
    })();
  }, [backendActor, importRawNodes]);

  // Import nodes from hyvmind:import-nodes custom event (dispatched by SaveGraphDialog)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        nodes: Map<string, EditorNode>;
        rootIds: string[];
      }>;
      importRawNodes(customEvent.detail.nodes, customEvent.detail.rootIds);
    };
    window.addEventListener("hyvmind:import-nodes", handler);
    return () => window.removeEventListener("hyvmind:import-nodes", handler);
  }, [importRawNodes]);

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
          createNode(nodeId, "Untitled", "folder");
          setRenameTarget({
            id: `${nodeId}@Untitled`,
            currentName: "Untitled",
          });
          break;
        case "new-location":
          createNode(nodeId, "Untitled", "folder");
          setRenameTarget({
            id: `${nodeId}@Untitled`,
            currentName: "Untitled",
          });
          break;
        case "new-law-entity":
          createNode(nodeId, "Untitled", "folder");
          setRenameTarget({
            id: `${nodeId}@Untitled`,
            currentName: "Untitled",
          });
          break;
        case "new-file":
          createNode(nodeId, "Untitled", "file");
          setRenameTarget({
            id: `${nodeId}@Untitled`,
            currentName: "Untitled",
          });
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
        case "download": {
          void (async () => {
            if (!session) return;
            const curationNode = session.nodes.get(nodeId);
            if (!curationNode || curationNode.nodeType !== "curation") return;
            const { default: JSZip } = await import("jszip");
            const zip = new JSZip();
            // DFS to collect all descendants
            const allNodes: import("@/types/markdownEditor").EditorNode[] = [];
            const stack = [nodeId];
            while (stack.length > 0) {
              const id = stack.pop()!;
              const n = session.nodes.get(id);
              if (!n) continue;
              allNodes.push(n);
              for (const cid of n.children) stack.push(cid);
            }
            // Populate ZIP — build paths from parent chain, not from IDs
            for (const n of allNodes) {
              const parts: string[] = [];
              let cur: typeof n | undefined = n;
              while (cur) {
                parts.unshift(cur.name);
                cur = cur.parentId
                  ? session.nodes.get(cur.parentId)
                  : undefined;
              }
              const path = parts.join("/");
              if (n.type === "folder") {
                zip.folder(path);
              } else {
                const fm = n.frontmatter;
                const fmEntries = Object.entries(fm);
                const fmBlock =
                  fmEntries.length > 0
                    ? `---\n${fmEntries
                        .map(([k, v]) =>
                          typeof v === "string"
                            ? `${k}: ${v}`
                            : `${k}: ${JSON.stringify(v)}`,
                        )
                        .join("\n")}\n---\n`
                    : "";
                const fullContent = `${fmBlock}${n.content ?? ""}`;
                zip.file(path, fullContent);
              }
            }
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${curationNode.name}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          })();
          break;
        }
        case "add-attributes": {
          const parent = session?.nodes.get(nodeId);
          if (parent) {
            const alreadyExists = parent.children.some(
              (cid) => session?.nodes.get(cid)?.name === "_attributes.md",
            );
            if (!alreadyExists) {
              createNode(nodeId, "_attributes.md", "file", {
                nodeType: "interpEntity",
              });
            }
          }
          setContextMenu(null);
          break;
        }
        case "add-sources": {
          const parent = session?.nodes.get(nodeId);
          if (parent) {
            const alreadyExists = parent.children.some(
              (cid) => session?.nodes.get(cid)?.name === "_sources.md",
            );
            if (!alreadyExists) {
              createNode(nodeId, "_sources.md", "file", {
                nodeType: "interpEntity",
                content: "- ",
              });
            }
          }
          setContextMenu(null);
          break;
        }
      }
    },
    [contextMenu, session, convertToSourceGraph, createNode],
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
                nodeType = "lawEntity"; // fallback
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
            inheritedSources: [],
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

  const allNodes = useMemo(() => {
    return [...(session?.nodes.values() ?? [])];
  }, [session?.nodes]);

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
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          Notes
        </span>

        {/* View mode tabs */}
        {!isEmpty && (
          <div className="flex items-center gap-0.5 mr-2">
            {(["edit", "preview"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={viewMode === mode ? "outline" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={
                  viewMode === mode
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                }
                data-ocid={`editor.view_mode.${mode}`}
              >
                {mode}
              </Button>
            ))}
          </div>
        )}

        {/* Undo / Redo */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          data-ocid="editor.undo_button"
        >
          ↩
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          data-ocid="editor.redo_button"
        >
          ↪
        </Button>

        {/* Create curation */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreateCuration(true)}
          data-ocid="editor.create_button"
        >
          + create
        </Button>

        {/* Import ZIP */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          data-ocid="editor.import_button"
        >
          import zip
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center content area */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {isEmpty ? (
            <div />
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
                      nodes={allNodes}
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
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
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
                renameTarget={renameTarget}
                onRenameEnd={() => setRenameTarget(null)}
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
                <Button
                  key={opt}
                  type="button"
                  variant={opt === "delete" ? "destructive" : "ghost"}
                  role="menuitem"
                  onClick={() => handleContextOption(opt)}
                  className="w-full text-left px-3 py-1.5 text-xs justify-start"
                  data-ocid={`editor.context_menu.${opt}`}
                >
                  {OPTION_LABELS[opt]}
                </Button>
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
