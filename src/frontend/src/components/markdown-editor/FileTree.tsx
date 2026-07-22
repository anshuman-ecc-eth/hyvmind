import type { EditorNode } from "@/types/markdownEditor";
import { File, Folder } from "lucide-react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileTreeProps {
  nodes: Map<string, EditorNode>;
  rootIds: string[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateNode: (
    parentId: string,
    name: string,
    type: "folder" | "file",
  ) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  renameTarget: { id: string; currentName: string } | null;
  onRenameEnd: () => void;
  currentFolderId: string | null;
  onNavigateInto: (folderId: string) => void;
}

// ---------------------------------------------------------------------------
// Node type labels for hover tooltips
// ---------------------------------------------------------------------------

const NODE_TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawEntity: "Law Entity",
  interpEntity: "Interpretation",
};

// ---------------------------------------------------------------------------
// Single tree row (flat-list drill-down UI)
// ---------------------------------------------------------------------------

function TreeRow({
  nodeId,
  node,
  isActive,
  isFolder,
  inRename,
  onSelectFile,
  onNavigateInto,
  onRenameNode,
  onRenameEnd,
  onContextMenu,
}: {
  nodeId: string;
  node: EditorNode;
  isActive: boolean;
  isFolder: boolean;
  inRename: boolean;
  onSelectFile: (id: string) => void;
  onNavigateInto: (folderId: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onRenameEnd: () => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inRename && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inRename]);

  const handleClick = () => {
    if (isFolder) {
      onNavigateInto(nodeId);
    } else {
      onSelectFile(nodeId);
    }
  };

  return (
    <div
      role="treeitem"
      aria-selected={isActive}
      data-ocid={`file_tree.item.${nodeId}`}
      className={[
        "flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs font-mono",
        "hover:bg-muted hover:text-foreground transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      ].join(" ")}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, nodeId);
      }}
    >
      <span className="flex-shrink-0">
        {isFolder ? <Folder size={10} /> : <File size={10} />}
      </span>

      {inRename ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={node.name}
          className="min-w-0 flex-1 bg-background border border-border text-foreground text-xs px-1 py-0 focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              onRenameNode(nodeId, e.currentTarget.value.trim());
              onRenameEnd();
            } else if (e.key === "Escape") {
              onRenameEnd();
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.value.trim()) {
              onRenameNode(nodeId, e.currentTarget.value.trim());
            }
            onRenameEnd();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="min-w-0 flex-1 break-words"
          title={NODE_TYPE_LABELS[node.nodeType] ?? node.nodeType}
        >
          {node.name}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileTree
// ---------------------------------------------------------------------------

export function FileTree({
  nodes,
  rootIds,
  activeFileId,
  onSelectFile,
  onCreateNode: _onCreateNode,
  onRenameNode,
  onDeleteNode: _onDeleteNode,
  onContextMenu,
  renameTarget,
  onRenameEnd,
  currentFolderId,
  onNavigateInto,
}: FileTreeProps) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally react only to renameTarget.id change; nodes, currentFolderId, and onNavigateInto are stable references
  useEffect(() => {
    if (renameTarget) {
      const node = nodes.get(renameTarget.id);
      const parentId = node?.parentId;
      if (parentId && parentId !== currentFolderId) {
        onNavigateInto(parentId);
      }
    }
  }, [renameTarget?.id]);

  const children = currentFolderId
    ? (nodes.get(currentFolderId)?.children ?? [])
    : rootIds;

  if (children.length === 0) {
    return (
      <div
        className="px-3 py-4 text-xs text-muted-foreground text-center"
        data-ocid="file_tree.empty_state"
      >
        {currentFolderId ? "empty folder" : "No curations yet"}
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="File tree"
      className="w-full overflow-y-auto"
      data-ocid="file_tree.panel"
    >
      {children.map((childId) => {
        const node = nodes.get(childId);
        if (!node) return null;
        const isFolder = node.type === "folder";
        const isActive = node.id === activeFileId;
        const inRename = renameTarget?.id === childId;

        return (
          <TreeRow
            key={childId}
            nodeId={childId}
            node={node}
            isActive={isActive}
            isFolder={isFolder}
            inRename={inRename}
            onSelectFile={onSelectFile}
            onNavigateInto={onNavigateInto}
            onRenameNode={onRenameNode}
            onRenameEnd={onRenameEnd}
            onContextMenu={onContextMenu}
          />
        );
      })}
    </div>
  );
}
