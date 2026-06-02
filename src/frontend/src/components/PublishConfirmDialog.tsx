import { useMemo, useState } from "react";
import type {
  AttributeChange,
  EdgeOperation,
  NodeOperation,
  PublishPreviewResult,
  SourceRef,
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
  const cls = "text-muted-foreground border-border";
  return <span className={`text-xs border px-1 py-0.5 ${cls}`}>{type}</span>;
}

function AttributeChangesView({ changes }: { changes: AttributeChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-1 pl-2 border-l border-dashed border-border space-y-1">
      {changes.map((c) => (
        <div key={c.key} className="text-xs">
          <span className="text-muted-foreground">{c.key}: </span>
          <span className="text-muted-foreground">
            {c.oldValues.map((v) => `${v.value}(×${v.weight})`).join(", ")}
          </span>
          {" → "}
          {c.newWeightedValues && c.newWeightedValues.length > 0 ? (
            <span className="text-foreground">
              {c.newWeightedValues
                .map((v) => `${v.value}(×${v.weight})`)
                .join(", ")}
            </span>
          ) : (
            <span className="text-foreground">{c.newValues.join(", ")}</span>
          )}
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
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-foreground hover:text-accent-foreground hover:bg-accent transition-colors"
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
          <span className="text-xs text-muted-foreground">
            ← {op.parentName}
          </span>
        )}
      </div>
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
        <div className="text-xs text-muted-foreground mt-0.5">
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
        <div className="text-xs text-foreground mt-0.5">
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
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  const perTypeCreateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const op of previewResult.nodeOperations) {
      if (op.action === "create") {
        counts[op.nodeType] = (counts[op.nodeType] ?? 0) + 1;
      }
    }
    return counts;
  }, [previewResult.nodeOperations]);

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
  const edgesToCreate = edgeOperations.filter((op) => op.action === "create");
  const edgesToUpdate = edgeOperations.filter((op) => op.action === "update");

  const nodesWithNewAttributes = nodeOperations.filter((op) =>
    op.action === "create"
      ? op.attributes.length > 0
      : (op.attributeChanges?.length ?? 0) > 0,
  );
  const nodesWithNewSources = nodeOperations.filter(
    (op) => (op.sourceChanges?.length ?? 0) > 0,
  );

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
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Conflict warning */}
          {hasCurationConflict && (
            <div
              className="px-3 py-2 border border-dashed border-border text-foreground text-xs"
              data-ocid="publish_dialog.curation_conflict_warning"
            >
              ⚠ This curation name already exists. Your changes will be
              appended.
            </div>
          )}

          {/* Summary */}
          <div
            className="px-3 py-2 border border-dashed border-border text-xs text-muted-foreground space-y-0.5"
            data-ocid="publish_dialog.summary"
          >
            <div className="flex gap-4 flex-wrap">
              <span>
                <span className="text-foreground">{summary.nodesToCreate}</span>{" "}
                new nodes
              </span>
              <span>
                <span className="text-foreground">{summary.edgesToCreate}</span>{" "}
                cross-ref new
              </span>
              <span>
                <span className="text-foreground">
                  {summary.hierarchyEdgesToCreate}
                </span>{" "}
                hierarchy new
              </span>
              <span>
                <span className="text-foreground">{summary.edgesToUpdate}</span>{" "}
                updated edges
              </span>
              <span>
                publish cost:{" "}
                <span className="text-foreground">
                  {(previewResult.buzzCost / 10).toFixed(1)}
                </span>{" "}
                buzz
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer ml-2 bg-transparent border-none p-0"
                  onClick={() => setShowCostBreakdown((v) => !v)}
                >
                  {showCostBreakdown ? "[hide]" : "[see breakdown]"}
                </button>
              </span>
            </div>
            {showCostBreakdown && (
              <div className="text-xs font-mono text-muted-foreground space-y-0.5 mt-1 pl-2">
                {(perTypeCreateCounts.curation ?? 0) > 0 && (
                  <div>
                    curation: {perTypeCreateCounts.curation} × 1.0 ={" "}
                    {(((perTypeCreateCounts.curation ?? 0) * 10) / 10).toFixed(
                      1,
                    )}
                  </div>
                )}
                {(perTypeCreateCounts.swarm ?? 0) > 0 && (
                  <div>
                    swarm: {perTypeCreateCounts.swarm} × 2.0 ={" "}
                    {(((perTypeCreateCounts.swarm ?? 0) * 20) / 10).toFixed(1)}
                  </div>
                )}
                {(perTypeCreateCounts.location ?? 0) > 0 && (
                  <div>
                    location: {perTypeCreateCounts.location} × 3.0 ={" "}
                    {(((perTypeCreateCounts.location ?? 0) * 30) / 10).toFixed(
                      1,
                    )}
                  </div>
                )}
                {(perTypeCreateCounts.lawEntity ?? 0) > 0 && (
                  <div>
                    law entity: {perTypeCreateCounts.lawEntity} × 4.0 ={" "}
                    {(((perTypeCreateCounts.lawEntity ?? 0) * 40) / 10).toFixed(
                      1,
                    )}
                  </div>
                )}
                {(perTypeCreateCounts.interpEntity ?? 0) > 0 && (
                  <div>
                    interp entity: {perTypeCreateCounts.interpEntity} × 5.0 ={" "}
                    {(
                      ((perTypeCreateCounts.interpEntity ?? 0) * 50) /
                      10
                    ).toFixed(1)}
                  </div>
                )}
                {(summary.edgesToCreate ?? 0) > 0 && (
                  <div>
                    cross-refs: {summary.edgesToCreate} × 0.1 ={" "}
                    {(summary.edgesToCreate / 10).toFixed(1)}
                  </div>
                )}
                {(summary.attributesToCreate ?? 0) > 0 && (
                  <div>
                    attributes: {summary.attributesToCreate} × 0.1 ={" "}
                    {(summary.attributesToCreate / 10).toFixed(1)}
                  </div>
                )}
                {(summary.sourcesToCreate ?? 0) > 0 && (
                  <div>
                    sources: {summary.sourcesToCreate} × 0.1 ={" "}
                    {(summary.sourcesToCreate / 10).toFixed(1)}
                  </div>
                )}
                <div className="border-t border-dashed border-muted-foreground/40 my-0.5" />
                <div className="text-foreground">
                  total: {(previewResult.buzzCost / 10).toFixed(1)} buzz
                </div>
              </div>
            )}
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

            <CollapsibleSection
              title="attributes to add"
              count={nodesWithNewAttributes.length}
            >
              {nodesWithNewAttributes.map((op) => (
                <div
                  key={op.localName}
                  className="py-1.5 border-b border-dashed border-border/40 last:border-0"
                >
                  <div className="text-xs font-mono text-foreground">
                    {op.localName} <NodeTypeBadge type={op.nodeType} />
                  </div>
                  {op.action === "create" ? (
                    <div className="mt-0.5 pl-2 space-y-0.5">
                      {op.attributes.map(([k, vals]) => (
                        <div key={k} className="text-xs text-muted-foreground">
                          + {k}: {vals.join(", ")}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AttributeChangesView changes={op.attributeChanges ?? []} />
                  )}
                </div>
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="sources to add"
              count={nodesWithNewSources.length}
            >
              {nodesWithNewSources.map((op) => (
                <div
                  key={op.localName}
                  className="py-1.5 border-b border-dashed border-border/40 last:border-0"
                >
                  <div className="text-xs font-mono text-foreground">
                    {op.localName} <NodeTypeBadge type={op.nodeType} />
                  </div>
                  <div className="mt-0.5 pl-2 space-y-0.5">
                    {(op.sourceChanges ?? []).map((s) => (
                      <div
                        key={s.name}
                        className="text-xs text-muted-foreground"
                      >
                        + {s.name}
                        {s.url ? ` (${s.url})` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-dashed border-border bg-card">
          <button
            type="button"
            onClick={onClose}
            className="text-xs border border-dashed border-border px-3 py-1.5 text-foreground hover:text-accent-foreground hover:border-foreground hover:bg-accent transition-colors"
            data-ocid="publish_dialog.cancel_button"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || noChanges}
            className="text-xs border border-dashed border-border px-3 py-1.5 text-foreground hover:text-accent-foreground hover:border-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-ocid="publish_dialog.confirm_button"
          >
            {isLoading ? "working..." : isPublished ? "update" : "publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
