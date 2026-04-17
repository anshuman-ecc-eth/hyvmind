import { useState } from "react";
import type {
  AttributeChange,
  EdgeOperation,
  NodeOperation,
  PublishPreviewResult,
} from "../types/sourceGraph";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewResult: PublishPreviewResult;
  graphName: string;
  isPublished: boolean;
  isLoading: boolean;
}

function NodeTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    curation: "text-blue-400 border-blue-400/40",
    swarm: "text-orange-400 border-orange-400/40",
    location: "text-green-400 border-green-400/40",
    lawEntity: "text-yellow-400 border-yellow-400/40",
    interpEntity: "text-purple-400 border-purple-400/40",
  };
  const cls = colors[type] ?? "text-muted-foreground border-border";
  return (
    <span className={`text-[10px] border px-1 py-0.5 ${cls}`}>{type}</span>
  );
}

function AttributeChangesView({ changes }: { changes: AttributeChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-1 pl-2 border-l border-dashed border-border space-y-1">
      {changes.map((c) => (
        <div key={c.key} className="text-[10px]">
          <span className="text-muted-foreground">{c.key}: </span>
          <span className="text-destructive line-through">
            {c.oldValues.map((v) => `${v.value}(×${v.weight})`).join(", ")}
          </span>
          {" → "}
          <span className="text-green-400">{c.newValues.join(", ")}</span>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="border border-dashed border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
        data-ocid={`publish_dialog.section_toggle.${title.toLowerCase().replace(/\s+/g, "_")}`}
      >
        <span>
          {title} <span className="text-muted-foreground">({count})</span>
        </span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function NodeCreateRow({ op }: { op: NodeOperation }) {
  return (
    <div className="py-1.5 border-b border-dashed border-border/40 last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-foreground font-mono">
          {op.localName}
        </span>
        <NodeTypeBadge type={op.nodeType} />
        {op.parentName && (
          <span className="text-[10px] text-muted-foreground">
            ← {op.parentName}
          </span>
        )}
      </div>
      {op.attributes.length > 0 && (
        <div className="mt-0.5 pl-2 space-y-0.5">
          {op.attributes.map(([k, vals]) => (
            <div key={k} className="text-[10px] text-muted-foreground">
              {k}: {vals.join(", ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeUpdateRow({ op }: { op: NodeOperation }) {
  return (
    <div className="py-1.5 border-b border-dashed border-border/40 last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-foreground font-mono">
          {op.localName}
        </span>
        <NodeTypeBadge type={op.nodeType} />
        {op.backendId && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {op.backendId.slice(0, 12)}…
          </span>
        )}
      </div>
      {op.attributeChanges && op.attributeChanges.length > 0 && (
        <AttributeChangesView changes={op.attributeChanges} />
      )}
    </div>
  );
}

function EdgeCreateRow({ op }: { op: EdgeOperation }) {
  return (
    <div className="py-1.5 border-b border-dashed border-border/40 last:border-0">
      <div className="text-xs font-mono text-foreground">
        {op.sourceName}{" "}
        <span className="text-muted-foreground">
          {op.bidirectional ? "↔" : "→"}
        </span>{" "}
        {op.targetName}
      </div>
      {op.labels.length > 0 && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {op.labels.join(", ")}
        </div>
      )}
    </div>
  );
}

function EdgeUpdateRow({ op }: { op: EdgeOperation }) {
  return (
    <div className="py-1.5 border-b border-dashed border-border/40 last:border-0">
      <div className="text-xs font-mono text-foreground">
        {op.sourceName}{" "}
        <span className="text-muted-foreground">
          {op.bidirectional ? "↔" : "→"}
        </span>{" "}
        {op.targetName}
      </div>
      {op.newLabels && op.newLabels.length > 0 && (
        <div className="text-[10px] text-green-400 mt-0.5">
          + {op.newLabels.join(", ")}
        </div>
      )}
    </div>
  );
}

export default function PublishConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  previewResult,
  graphName,
  isPublished,
  isLoading,
}: Props) {
  if (!isOpen) return null;

  const { summary, nodeOperations, edgeOperations } = previewResult;
  const noChanges =
    summary.nodesToCreate === 0 &&
    summary.nodesToUpdate === 0 &&
    summary.edgesToCreate === 0 &&
    summary.edgesToUpdate === 0;

  const hasCurationConflict = nodeOperations.some(
    (op) => op.action === "update" && op.nodeType === "curation",
  );

  const nodesToCreate = nodeOperations.filter((op) => op.action === "create");
  const nodesToUpdate = nodeOperations.filter((op) => op.action === "update");
  const edgesToCreate = edgeOperations.filter((op) => op.action === "create");
  const edgesToUpdate = edgeOperations.filter((op) => op.action === "update");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid="publish_dialog.dialog"
    >
      <div className="bg-background border border-dashed border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4 font-mono shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dashed border-border bg-card">
          <h2 className="text-sm text-foreground">
            {isPublished ? "update graph" : "publish graph"}:{" "}
            <span className="text-muted-foreground">{graphName}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="publish_dialog.close_button"
          >
            [×]
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Conflict warning */}
          {hasCurationConflict && (
            <div
              className="px-3 py-2 border border-dashed border-yellow-500/50 text-yellow-400 text-xs"
              data-ocid="publish_dialog.curation_conflict_warning"
            >
              ⚠ this curation name already exists. your changes will be added to
              the shared curation.
            </div>
          )}

          {/* Summary */}
          <div
            className="px-3 py-2 border border-dashed border-border text-xs text-muted-foreground space-y-0.5"
            data-ocid="publish_dialog.summary"
          >
            <div className="flex gap-4 flex-wrap">
              <span>
                <span className="text-green-400">{summary.nodesToCreate}</span>{" "}
                new nodes
              </span>
              <span>
                <span className="text-yellow-400">{summary.nodesToUpdate}</span>{" "}
                updated nodes
              </span>
              <span>
                <span className="text-green-400">{summary.edgesToCreate}</span>{" "}
                new edges
              </span>
              <span>
                <span className="text-yellow-400">{summary.edgesToUpdate}</span>{" "}
                updated edges
              </span>
            </div>
          </div>

          {noChanges && (
            <div
              className="px-3 py-2 border border-dashed border-border text-xs text-muted-foreground text-center"
              data-ocid="publish_dialog.no_changes_state"
            >
              no changes detected — graph is already up to date.
            </div>
          )}

          {/* Collapsible sections */}
          <div className="space-y-2">
            <CollapsibleSection
              title="nodes to create"
              count={nodesToCreate.length}
            >
              {nodesToCreate.map((op) => (
                <NodeCreateRow key={op.localName} op={op} />
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="nodes to update"
              count={nodesToUpdate.length}
            >
              {nodesToUpdate.map((op) => (
                <NodeUpdateRow key={op.localName} op={op} />
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="edges to create"
              count={edgesToCreate.length}
            >
              {edgesToCreate.map((op) => (
                <EdgeCreateRow
                  key={`${op.sourceName}-${op.targetName}`}
                  op={op}
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="edges to update"
              count={edgesToUpdate.length}
            >
              {edgesToUpdate.map((op) => (
                <EdgeUpdateRow
                  key={`${op.sourceName}-${op.targetName}`}
                  op={op}
                />
              ))}
            </CollapsibleSection>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-dashed border-border bg-card">
          <button
            type="button"
            onClick={onClose}
            className="text-xs border border-dashed border-border px-3 py-1.5 text-foreground hover:border-foreground hover:bg-accent transition-colors"
            data-ocid="publish_dialog.cancel_button"
          >
            [cancel]
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || noChanges}
            className="text-xs border border-dashed border-border px-3 py-1.5 text-foreground hover:border-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-ocid="publish_dialog.confirm_button"
          >
            {isLoading ? "working..." : isPublished ? "[update]" : "[publish]"}
          </button>
        </div>
      </div>
    </div>
  );
}
