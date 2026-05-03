import { Plus, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FrontmatterEditorProps {
  frontmatter: Record<string, unknown>;
  onChange: (frontmatter: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseValue(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// ---------------------------------------------------------------------------
// FrontmatterEditor
// ---------------------------------------------------------------------------

export function FrontmatterEditor({
  frontmatter,
  onChange,
}: FrontmatterEditorProps) {
  const entries = Object.entries(frontmatter);

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const updated: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(frontmatter)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange(updated);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...frontmatter, [key]: parseValue(value) });
  };

  const handleRemove = (key: string) => {
    const updated: Record<string, unknown> = { ...frontmatter };
    delete updated[key];
    onChange(updated);
  };

  const handleAdd = () => {
    // Find a unique key name
    let i = 1;
    let candidate = `key${i}`;
    while (Object.prototype.hasOwnProperty.call(frontmatter, candidate)) {
      i++;
      candidate = `key${i}`;
    }
    onChange({ ...frontmatter, [candidate]: "" });
  };

  return (
    <div
      className="border-b border-border bg-card"
      data-ocid="frontmatter_editor.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Frontmatter
        </span>
        <button
          type="button"
          aria-label="Add frontmatter field"
          data-ocid="frontmatter_editor.add_button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 hover:bg-accent rounded-sm"
          onClick={handleAdd}
        >
          <Plus size={11} />
          Add
        </button>
      </div>

      {/* Rows */}
      {entries.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">
          No frontmatter — click Add to create a field
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map(([key, value], idx) => (
            <div
              key={key}
              className="flex items-center gap-1 px-2 py-1"
              data-ocid={`frontmatter_editor.row.${idx + 1}`}
            >
              {/* Key input */}
              <input
                type="text"
                aria-label="Frontmatter key"
                value={key}
                data-ocid={`frontmatter_editor.key_input.${idx + 1}`}
                className="w-28 px-1.5 py-0.5 text-xs font-mono bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
                onChange={(e) => handleKeyChange(key, e.target.value)}
              />
              <span className="text-xs text-muted-foreground flex-shrink-0">
                :
              </span>
              {/* Value input */}
              <input
                type="text"
                aria-label="Frontmatter value"
                value={formatValue(value)}
                data-ocid={`frontmatter_editor.value_input.${idx + 1}`}
                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs font-mono bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
                onChange={(e) => handleValueChange(key, e.target.value)}
              />
              {/* Remove button */}
              <button
                type="button"
                aria-label={`Remove ${key}`}
                data-ocid={`frontmatter_editor.remove_button.${idx + 1}`}
                className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-destructive transition-colors rounded-sm hover:bg-accent"
                onClick={() => handleRemove(key)}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
