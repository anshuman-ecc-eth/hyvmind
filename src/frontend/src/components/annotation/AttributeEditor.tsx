import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  ownAttributes: Record<string, string>;
  inheritedAttributes?: Record<string, string>;
  onChange: (attrs: Record<string, string>) => void;
}

interface NewAttr {
  key: string;
  value: string;
}

export function AttributeEditor({
  ownAttributes,
  inheritedAttributes = {},
  onChange,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newAttr, setNewAttr] = useState<NewAttr>({ key: "", value: "" });

  const inheritedKeys = Object.keys(inheritedAttributes);
  const ownKeys = Object.keys(ownAttributes);

  function updateOwn(key: string, value: string) {
    onChange({ ...ownAttributes, [key]: value });
  }

  function deleteOwn(key: string) {
    const next = { ...ownAttributes };
    delete next[key];
    onChange(next);
  }

  function saveNew() {
    if (!newAttr.key.trim()) return;
    onChange({ ...ownAttributes, [newAttr.key.trim()]: newAttr.value });
    setNewAttr({ key: "", value: "" });
    setAdding(false);
  }

  function cancelNew() {
    setNewAttr({ key: "", value: "" });
    setAdding(false);
  }

  return (
    <div className="space-y-1" data-ocid="attribute-editor.panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Attributes
        </span>
        <Button
          data-ocid="attribute-editor.add_button"
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdding(true)}
          className="h-5 px-1 font-mono text-xs text-primary"
          disabled={adding}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Inherited attributes (read-only) */}
      {inheritedKeys.length > 0 && (
        <div className="space-y-0.5">
          {inheritedKeys.map((k) => {
            const isOverridden = k in ownAttributes;
            return (
              <div
                key={`inherited-${k}`}
                className="flex items-center gap-1 px-2 py-0.5 bg-muted/30 border border-dashed border-border/50"
              >
                <span className="font-mono text-xs text-muted-foreground/70 flex-1 truncate">
                  {k}
                </span>
                <span className="font-mono text-xs text-muted-foreground/50 flex-1 truncate line-through">
                  {inheritedAttributes[k]}
                </span>
                <span
                  className="font-mono text-[9px] uppercase tracking-wider px-1 border border-dashed"
                  style={{
                    color: isOverridden ? "#DA70D6" : undefined,
                    borderColor: "currentColor",
                    opacity: 0.6,
                  }}
                >
                  {isOverridden ? "overridden" : "inherited"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Own attributes */}
      {ownKeys.map((k) => (
        <div
          key={k}
          className="flex items-center gap-1 border border-dashed border-border"
        >
          <Input
            data-ocid={`attribute-editor.key.${k}`}
            value={k}
            readOnly
            className="flex-1 font-mono text-xs border-0 rounded-none bg-transparent h-7 px-2"
          />
          <span className="text-muted-foreground text-xs">:</span>
          <Input
            data-ocid={`attribute-editor.value.${k}`}
            value={ownAttributes[k]}
            onChange={(e) => updateOwn(k, e.target.value)}
            className="flex-1 font-mono text-xs border-0 rounded-none bg-transparent h-7 px-2"
            placeholder="value"
          />
          <Button
            data-ocid={`attribute-editor.delete_button.${k}`}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deleteOwn(k)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {/* Add new attribute row */}
      {adding && (
        <div className="flex items-center gap-1 border-2 border-dashed border-primary">
          <Input
            data-ocid="attribute-editor.new-key.input"
            autoFocus
            placeholder="key"
            value={newAttr.key}
            onChange={(e) => setNewAttr((p) => ({ ...p, key: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && saveNew()}
            className="flex-1 font-mono text-xs border-0 rounded-none bg-transparent h-7 px-2"
          />
          <span className="text-muted-foreground text-xs">:</span>
          <Input
            data-ocid="attribute-editor.new-value.input"
            placeholder="value"
            value={newAttr.value}
            onChange={(e) =>
              setNewAttr((p) => ({ ...p, value: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && saveNew()}
            className="flex-1 font-mono text-xs border-0 rounded-none bg-transparent h-7 px-2"
          />
          <Button
            data-ocid="attribute-editor.save_button"
            type="button"
            variant="ghost"
            size="sm"
            onClick={saveNew}
            className="h-7 px-2 font-mono text-xs text-primary"
          >
            Save
          </Button>
          <Button
            data-ocid="attribute-editor.cancel_button"
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelNew}
            className="h-7 px-2 font-mono text-xs text-muted-foreground"
          >
            ✕
          </Button>
        </div>
      )}

      {ownKeys.length === 0 && inheritedKeys.length === 0 && !adding && (
        <p className="font-mono text-xs text-muted-foreground/50 italic px-1">
          No attributes
        </p>
      )}
    </div>
  );
}
