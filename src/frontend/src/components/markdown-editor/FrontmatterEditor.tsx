import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

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

  // Stable row IDs — grow-only array so keys never change when a field name is edited
  const stableKeys = useRef<string[]>([]);
  if (stableKeys.current.length < entries.length) {
    const extra = Array.from(
      { length: entries.length - stableKeys.current.length },
      (_, i) =>
        `fmrow-${stableKeys.current.length + i}-${Math.random().toString(36).slice(2)}`,
    );
    stableKeys.current = [...stableKeys.current, ...extra];
  }

  const [navMode, setNavMode] = useState(false);

  // 2D ref array: refs.current[idx][0] = key input, refs.current[idx][1] = value input
  const refs = useRef<(HTMLInputElement | null)[][]>([]);
  refs.current = refs.current.slice(0, entries.length);
  for (let i = 0; i < entries.length; i++) {
    if (!refs.current[i]) refs.current[i] = [null, null];
    if (refs.current[i].length < 2)
      refs.current[i] = [refs.current[i][0] ?? null, null];
  }

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

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    col: number,
    _key: string,
  ) => {
    switch (e.key) {
      case "ArrowUp":
        if (navMode) {
          e.preventDefault();
          if (idx > 0) refs.current[idx - 1]?.[col]?.focus();
        }
        break;
      case "ArrowDown":
        if (navMode) {
          e.preventDefault();
          if (idx < entries.length - 1) refs.current[idx + 1]?.[col]?.focus();
        }
        break;
      case "ArrowRight":
        if (navMode && col === 0) {
          e.preventDefault();
          refs.current[idx]?.[1]?.focus();
        }
        break;
      case "ArrowLeft":
        if (navMode && col === 1) {
          e.preventDefault();
          refs.current[idx]?.[0]?.focus();
        }
        break;
      case "Escape":
        e.preventDefault();
        setNavMode(true);
        break;
      case "Enter":
        e.preventDefault();
        setNavMode(false);
        requestAnimationFrame(() => {
          const input = refs.current[idx]?.[col];
          if (input && document.activeElement === input) {
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
        break;
    }
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
              key={stableKeys.current[idx]}
              className="flex items-center gap-1 px-2 py-1"
              data-ocid={`frontmatter_editor.row.${idx + 1}`}
            >
              {/* Key input */}
              <input
                type="text"
                aria-label="Frontmatter key"
                value={key}
                data-ocid={`frontmatter_editor.key_input.${idx + 1}`}
                className={`w-28 px-1.5 py-0.5 text-xs font-mono bg-muted border border-border text-foreground focus:outline-none rounded-sm ${navMode ? "focus:ring-2 focus:ring-ring" : "focus:ring-1 focus:ring-ring"}`}
                ref={(el) => {
                  if (!refs.current[idx]) refs.current[idx] = [null, null];
                  refs.current[idx][0] = el;
                }}
                onChange={(e) => handleKeyChange(key, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx, 0, key)}
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
                className={`flex-1 min-w-0 px-1.5 py-0.5 text-xs font-mono bg-background border border-border text-foreground focus:outline-none rounded-sm ${navMode ? "focus:ring-2 focus:ring-ring" : "focus:ring-1 focus:ring-ring"}`}
                ref={(el) => {
                  if (!refs.current[idx]) refs.current[idx] = [null, null];
                  refs.current[idx][1] = el;
                }}
                onChange={(e) => handleValueChange(key, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx, 1, key)}
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
