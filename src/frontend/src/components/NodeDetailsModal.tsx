import { useEffect, useRef, useState } from "react";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodeDetailsModalProps {
  node: SourceNode;
  graph: SourceGraph;
  onSave: (nodeId: string, updates: Partial<SourceNode>) => void;
  onClose: () => void;
}

interface AttributeRow {
  key: string;
  value: string;
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawEntity: "Law Entity",
  lawRelation: "Law Relation",
  interpEntity: "Interp. Entity",
  interpRelation: "Interp. Relation",
};

const RELATION_TYPES = new Set(["lawRelation", "interpRelation"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveNodeName(
  id: string | undefined,
  nodes: SourceNode[],
): string | null {
  if (!id) return null;
  return nodes.find((n) => n.id === id)?.name ?? id;
}

function buildInheritedAttributes(
  node: SourceNode,
  nodeMap: Map<string, SourceNode>,
): Record<string, string> {
  // Walk ancestor chain; closer ancestors take priority (we collect bottom-up
  // then reverse so closer entries overwrite further ones).
  const chain: Record<string, string>[] = [];
  let currentId = node.parentId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const ancestor = nodeMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.attributes && Object.keys(ancestor.attributes).length > 0) {
      chain.push(ancestor.attributes);
    }
    currentId = ancestor.parentId;
  }

  // Merge: later entries (closer ancestors) override earlier (further ancestors)
  const merged: Record<string, string> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    Object.assign(merged, chain[i]);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NodeDetailsModal({
  node,
  graph,
  onSave,
  onClose,
}: NodeDetailsModalProps) {
  const [editedName, setEditedName] = useState(node.name);

  // Existing attributes (key read-only, value editable)
  const [existingRows, setExistingRows] = useState<AttributeRow[]>(() =>
    Object.entries(node.attributes ?? {}).map(([key, value]) => ({
      key,
      value,
      isNew: false,
    })),
  );

  // New rows added in this session (both key + value editable)
  const [newRows, setNewRows] = useState<AttributeRow[]>([]);

  const nodeMap = useRef(new Map(graph.nodes.map((n) => [n.id, n])));

  const inheritedAttributes = buildInheritedAttributes(node, nodeMap.current);
  const hasInherited = Object.keys(inheritedAttributes).length > 0;

  const isRelation = RELATION_TYPES.has(node.nodeType);
  const fromName = isRelation ? resolveNodeName(node.from, graph.nodes) : null;
  const toName = isRelation ? resolveNodeName(node.to, graph.nodes) : null;

  // Trap focus inside modal
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, input, [tabindex="0"]',
    );
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleExistingValueChange = (index: number, value: string) => {
    setExistingRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, value } : r)),
    );
  };

  const handleExistingRemove = (index: number) => {
    setExistingRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleNewKeyChange = (index: number, key: string) => {
    setNewRows((rows) => rows.map((r, i) => (i === index ? { ...r, key } : r)));
  };

  const handleNewValueChange = (index: number, value: string) => {
    setNewRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, value } : r)),
    );
  };

  const handleNewRemove = (index: number) => {
    setNewRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleAddAttribute = () => {
    setNewRows((rows) => [...rows, { key: "", value: "", isNew: true }]);
  };

  const handleSave = () => {
    const merged: Record<string, string> = {};
    for (const row of existingRows) {
      if (row.key.trim()) merged[row.key.trim()] = row.value;
    }
    for (const row of newRows) {
      if (row.key.trim()) merged[row.key.trim()] = row.value;
    }
    onSave(node.id, { name: editedName, attributes: merged });
    onClose();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
      data-ocid="node-details-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Enter") onClose();
      }}
    >
      <div
        className="
          relative w-full max-w-lg mx-4 bg-background
          border border-dashed border-border
          font-mono flex flex-col
          max-h-[90vh]
        "
        data-ocid="node-details-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-dashed border-border shrink-0">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            node details
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 border border-dashed border-border text-muted-foreground">
              {NODE_TYPE_LABELS[node.nodeType] ?? node.nodeType}
            </span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
              data-ocid="node-details-close"
              onClick={onClose}
            >
              [x]
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label
              htmlFor="node-name-input"
              className="block text-xs text-muted-foreground"
            >
              name
            </label>
            <input
              id="node-name-input"
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="
                w-full bg-background text-foreground border border-dashed border-border
                px-2 py-1 text-sm font-mono
                focus:outline-none focus:border-foreground
              "
              data-ocid="node-name-input"
            />
          </div>

          {/* Relation from/to — only for relation types */}
          {isRelation && (
            <div className="space-y-1 border border-dashed border-border p-2">
              <div className="text-xs text-muted-foreground mb-1">relation</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-8 shrink-0">
                  from:
                </span>
                <span className="text-foreground truncate min-w-0">
                  {fromName ?? (
                    <span className="text-muted-foreground italic">
                      (unresolved)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-8 shrink-0">
                  to:
                </span>
                <span className="text-foreground truncate min-w-0">
                  {toName ?? (
                    <span className="text-muted-foreground italic">
                      (unresolved)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Own Attributes */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              own attributes
            </div>

            {existingRows.length === 0 && newRows.length === 0 && (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            )}

            {existingRows.map((row, i) => (
              <div key={row.key} className="flex items-center gap-2">
                <span
                  className="text-xs text-muted-foreground w-28 shrink-0 truncate"
                  title={row.key}
                >
                  {row.key}
                </span>
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => handleExistingValueChange(i, e.target.value)}
                  className="
                    flex-1 min-w-0 bg-background text-foreground border border-dashed border-border
                    px-2 py-0.5 text-xs font-mono
                    focus:outline-none focus:border-foreground
                  "
                  data-ocid={`attr-value-${row.key}`}
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  onClick={() => handleExistingRemove(i)}
                  data-ocid={`attr-remove-${row.key}`}
                >
                  [–]
                </button>
              </div>
            ))}

            {newRows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: new rows have no stable key
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) => handleNewKeyChange(i, e.target.value)}
                  className="
                    w-28 shrink-0 bg-background text-foreground border border-dashed border-border
                    px-2 py-0.5 text-xs font-mono placeholder:text-muted-foreground
                    focus:outline-none focus:border-foreground
                  "
                  data-ocid="new-attr-key-input"
                />
                <input
                  type="text"
                  placeholder="value"
                  value={row.value}
                  onChange={(e) => handleNewValueChange(i, e.target.value)}
                  className="
                    flex-1 min-w-0 bg-background text-foreground border border-dashed border-border
                    px-2 py-0.5 text-xs font-mono placeholder:text-muted-foreground
                    focus:outline-none focus:border-foreground
                  "
                  data-ocid="new-attr-value-input"
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  onClick={() => handleNewRemove(i)}
                  data-ocid="new-attr-remove"
                >
                  [–]
                </button>
              </div>
            ))}

            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-2 py-1 transition-colors"
              onClick={handleAddAttribute}
              data-ocid="add-attribute-btn"
            >
              [+ add attribute]
            </button>
          </div>

          {/* Inherited Attributes */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              inherited attributes
            </div>
            {hasInherited ? (
              Object.entries(inheritedAttributes).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span
                    className="text-muted-foreground w-28 shrink-0 truncate"
                    title={key}
                  >
                    {key}
                  </span>
                  <span className="text-foreground break-words min-w-0">
                    {value}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            )}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-dashed border-border shrink-0">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-3 py-1 transition-colors"
            onClick={onClose}
            data-ocid="node-details-cancel"
          >
            [cancel]
          </button>
          <button
            type="button"
            className="text-xs text-foreground bg-foreground/10 hover:bg-foreground/20 border border-dashed border-foreground px-3 py-1 transition-colors"
            onClick={handleSave}
            data-ocid="node-details-save"
          >
            [save]
          </button>
        </div>
      </div>
    </div>
  );
}
