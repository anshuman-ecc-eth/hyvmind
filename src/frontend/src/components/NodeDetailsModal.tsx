import { useEffect, useRef } from "react";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";
import type { SourceRef } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodeDetailsModalProps {
  node: SourceNode;
  graph: SourceGraph;
  onClose: () => void;
}

function parentIdFromPath(id: string): string | null {
  const lastAt = id.lastIndexOf("@");
  return lastAt > 0 ? id.slice(0, lastAt) : null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPE_LABELS: Record<string, string> = {
  curation: "Curation",
  swarm: "Swarm",
  location: "Location",
  lawEntity: "Law Entity",
  interpEntity: "Interp. Entity",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInheritedAttributes(
  node: SourceNode,
  nodeMap: Map<string, SourceNode>,
): Record<string, string> {
  const chain: Record<string, unknown>[] = [];
  let currentId = node.id ? parentIdFromPath(node.id) : null;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const ancestor = nodeMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.attributes && Object.keys(ancestor.attributes).length > 0) {
      chain.push(ancestor.attributes);
    }
    currentId = parentIdFromPath(currentId);
  }

  const merged: Record<string, unknown> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    Object.assign(merged, chain[i]);
  }
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [
      k,
      typeof v === "string" ? v : JSON.stringify(v),
    ]),
  );
}

function buildInheritedSources(
  node: SourceNode,
  nodeMap: Map<string, SourceNode>,
): SourceRef[] {
  const chain: SourceRef[][] = [];
  let currentId = node.id ? parentIdFromPath(node.id) : null;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const ancestor = nodeMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.sources && ancestor.sources.length > 0) {
      chain.push(ancestor.sources);
    }
    currentId = parentIdFromPath(currentId);
  }

  chain.reverse();
  return chain.flat();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NodeDetailsModal({
  node,
  graph,
  onClose,
}: NodeDetailsModalProps) {
  const nodeMap = useRef(new Map(graph.nodes.map((n) => [n.id ?? n.name, n])));
  const inheritedAttributes = buildInheritedAttributes(node, nodeMap.current);
  const hasInherited = Object.keys(inheritedAttributes).length > 0;
  const inheritedSources = buildInheritedSources(node, nodeMap.current);

  const ownAttrs = Object.entries(node.attributes ?? {}).filter(
    ([, v]) => v !== "",
  );

  // Trap focus inside modal
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [tabindex="0"]',
    );
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          <div>
            <span className="block text-xs text-muted-foreground mb-0.5">
              name
            </span>
            <p className="text-sm text-foreground break-words">{node.name}</p>
          </div>

          {/* ID */}
          {node.id && (
            <div>
              <span className="block text-xs text-muted-foreground mb-0.5">
                id
              </span>
              <p className="text-xs text-foreground/70 break-all">{node.id}</p>
            </div>
          )}

          {/* Parent */}
          {node.parentName && (
            <div>
              <span className="block text-xs text-muted-foreground mb-0.5">
                parent
              </span>
              <p className="text-xs text-foreground break-words">
                {node.parentName}
              </p>
            </div>
          )}

          {/* Content */}
          {node.content && (
            <div>
              <span className="block text-xs text-muted-foreground mb-0.5">
                content
              </span>
              <p className="text-xs text-foreground/80 break-words whitespace-pre-wrap">
                {node.content}
              </p>
            </div>
          )}

          {/* Own Attributes */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              own attributes
            </div>
            {ownAttrs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            ) : (
              <div className="border border-dashed border-border divide-y divide-dashed divide-border">
                {ownAttrs.map(([key, value]) => (
                  <div key={key} className="flex gap-2 px-2 py-1 text-xs">
                    <span className="text-muted-foreground shrink-0 min-w-0 break-words">
                      {key}
                    </span>
                    <span className="text-foreground/80 ml-auto text-right break-words">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inherited Attributes */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              inherited attributes
            </div>
            {hasInherited ? (
              <div className="border border-dashed border-border divide-y divide-dashed divide-border">
                {Object.entries(inheritedAttributes).map(([key, value]) => (
                  <div key={key} className="flex gap-2 px-2 py-1 text-xs">
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
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            )}
          </div>

          {/* Own Sources */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              own sources
            </div>
            {!node.sources || node.sources.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            ) : (
              <div className="space-y-1">
                {node.sources.map((s, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: flat list, no stable key
                  <div key={i} className="text-xs break-words">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/80 underline hover:text-foreground transition-colors"
                      >
                        {s.name}
                      </a>
                    ) : (
                      <span className="text-foreground/80">{s.name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inherited Sources */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1">
              inherited sources
            </div>
            {inheritedSources.length > 0 ? (
              <div className="space-y-1">
                {inheritedSources.map((s) => (
                  <div
                    key={`${s.name}-${s.url}`}
                    className="text-xs text-foreground break-words min-w-0"
                  >
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary transition-colors"
                      >
                        {s.name}
                      </a>
                    ) : (
                      <span>{s.name}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">(none)</p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-dashed border-border shrink-0">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-3 py-1 transition-colors"
            onClick={onClose}
            data-ocid="node-details-close-button"
          >
            [close]
          </button>
        </div>
      </div>
    </div>
  );
}
