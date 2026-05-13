import type { EditorNode } from "@/types/markdownEditor";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
}

interface TreeNodeProps {
  nodeId: string;
  nodes: Map<string, EditorNode>;
  activeFileId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectFile: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  depth: number;
  renameTarget: { id: string; currentName: string } | null;
  onRenameEnd: () => void;
}

// ---------------------------------------------------------------------------
// Single tree node row
// ---------------------------------------------------------------------------

function TreeNode({
  nodeId,
  nodes,
  activeFileId,
  expandedIds,
  onToggleExpand,
  onSelectFile,
  onContextMenu,
  onRenameNode,
  depth,
  renameTarget,
  onRenameEnd,
}: TreeNodeProps) {
  const node = nodes.get(nodeId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameTarget?.id === nodeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameTarget?.id, nodeId]);

  if (!node) return null;

  const isFolder = node.type === "folder";
  const isExpanded = expandedIds.has(nodeId);
  const isActive = node.id === activeFileId;
  const indent = depth * 12;

  const handleClick = () => {
    if (isFolder) {
      onToggleExpand(nodeId);
    } else {
      onSelectFile(nodeId);
    }
  };

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isActive}
        aria-expanded={isFolder ? isExpanded : undefined}
        data-ocid={`file_tree.item.${nodeId}`}
        className={[
          "flex w-full items-center gap-0.5 px-2 py-1.5 text-left text-xs font-mono rounded",
          "hover:bg-muted hover:text-foreground transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
        ].join(" ")}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, nodeId);
        }}
      >
        {/* Chevron for folders */}
        {isFolder ? (
          <span className="w-2.5 h-2.5 flex-shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
          </span>
        ) : (
          <span className="w-2.5 h-2.5 flex-shrink-0" />
        )}

        {/* Icon */}
        <span className="flex-shrink-0">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen size={10} />
            ) : (
              <Folder size={10} />
            )
          ) : (
            <File size={10} />
          )}
        </span>

        {/* Label */}
        {renameTarget?.id === nodeId ? (
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
          <span className="truncate min-w-0 flex-1" title={node.name}>
            {node.name}
          </span>
        )}
      </div>

      {/* Children — only rendered when folder is expanded */}
      {isFolder && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((childId) => (
            <TreeNode
              key={childId}
              nodeId={childId}
              nodes={nodes}
              activeFileId={activeFileId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
              onRenameNode={onRenameNode}
              depth={depth + 1}
              renameTarget={renameTarget}
              onRenameEnd={onRenameEnd}
            />
          ))}
        </div>
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
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand root-level curation folders
    return new Set(rootIds);
  });

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (rootIds.length === 0) {
    return (
      <div
        className="px-3 py-4 text-xs text-muted-foreground text-center"
        data-ocid="file_tree.empty_state"
      >
        No curations yet
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
      {rootIds.map((rootId) => (
        <TreeNode
          key={rootId}
          nodeId={rootId}
          nodes={nodes}
          activeFileId={activeFileId}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onSelectFile={onSelectFile}
          onContextMenu={onContextMenu}
          onRenameNode={onRenameNode}
          depth={0}
          renameTarget={renameTarget}
          onRenameEnd={onRenameEnd}
        />
      ))}
    </div>
  );
}
