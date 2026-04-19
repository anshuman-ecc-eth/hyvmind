import type { SourceNode } from "../types/sourceGraph";

interface PublicNodeDetailsPanelProps {
  node: SourceNode;
  onClose: () => void;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  curation: "CURATION",
  swarm: "SWARM",
  location: "LOCATION",
  lawEntity: "LAW ENTITY",
  interpEntity: "INTERP ENTITY",
};

export default function PublicNodeDetailsPanel({
  node,
  onClose,
}: PublicNodeDetailsPanelProps) {
  const typeLabel =
    NODE_TYPE_LABELS[node.nodeType] ?? node.nodeType.toUpperCase();
  const attrs = node.attributes
    ? Object.entries(node.attributes).filter(([, v]) => v !== "")
    : [];

  const optionalFields: { label: string; value: string | undefined }[] = [
    { label: "JURISDICTION", value: node.jurisdiction },
    { label: "SOURCE", value: node.source },
    { label: "CONTENT", value: node.content },
    { label: "FROM", value: node.from },
    { label: "TO", value: node.to },
  ];

  const presentOptional = optionalFields.filter(
    (f) => f.value && f.value.trim() !== "",
  );

  const tagList = node.tags && node.tags.length > 0 ? node.tags : null;

  return (
    /* Overlay backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-ocid="public_node_details.dialog"
    >
      {/* Panel */}
      <dialog
        open
        className="relative w-full max-w-md border border-border bg-card font-mono text-foreground shadow-lg m-0 p-0"
        aria-label="Node details"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2">
          <span className="text-xs text-muted-foreground tracking-widest uppercase">
            NODE_DETAILS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
            aria-label="Close node details"
            data-ocid="public_node_details.close_button"
          >
            [X]
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
              NAME
            </span>
            <p className="mt-0.5 text-foreground break-words">{node.name}</p>
          </div>

          {/* Type */}
          <div>
            <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
              TYPE
            </span>
            <p className="mt-0.5 text-foreground">{typeLabel}</p>
          </div>

          {/* ID */}
          {node.id && (
            <div>
              <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
                ID
              </span>
              <p className="mt-0.5 text-foreground/70 break-all">{node.id}</p>
            </div>
          )}

          {/* Parent */}
          {node.parentName && (
            <div>
              <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
                PARENT
              </span>
              <p className="mt-0.5 text-foreground break-words">
                {node.parentName}
              </p>
            </div>
          )}

          {/* Tags */}
          {tagList && (
            <div>
              <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
                TAGS
              </span>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {tagList.map((tag) => (
                  <span
                    key={tag}
                    className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional text fields */}
          {presentOptional.map(({ label, value }) => (
            <div key={label}>
              <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
                {label}
              </span>
              <p className="mt-0.5 text-foreground/80 break-words whitespace-pre-wrap">
                {value}
              </p>
            </div>
          ))}

          {/* Attributes */}
          <div>
            <span className="text-muted-foreground tracking-widest uppercase text-[10px]">
              ATTRIBUTES
            </span>
            {attrs.length === 0 ? (
              <p className="mt-0.5 text-muted-foreground italic">
                No attributes
              </p>
            ) : (
              <div className="mt-1 border border-border divide-y divide-border">
                {attrs.map(([key, value]) => (
                  <div key={key} className="flex gap-2 px-2 py-1">
                    <span className="text-muted-foreground shrink-0 min-w-0 break-words">
                      {key}
                    </span>
                    <span className="text-foreground/80 ml-auto text-right break-words">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1 hover:bg-secondary"
            data-ocid="public_node_details.cancel_button"
          >
            CLOSE
          </button>
        </div>
      </dialog>
    </div>
  );
}
