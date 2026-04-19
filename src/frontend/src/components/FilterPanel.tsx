import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterPanelProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  visibleNodeTypes: Set<string>;
  onNodeTypesChange: (types: Set<string>) => void;
  totalNodes: number;
  visibleNodes: number;
  onReset: () => void;
  onFitToVisible: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

const ALL_NODE_TYPES: { key: string; label: string; color: string }[] = [
  { key: "curation", label: "curation", color: "#4a9eff" },
  { key: "swarm", label: "swarm", color: "#ff7f50" },
  { key: "location", label: "location", color: "#90EE90" },
  { key: "lawEntity", label: "law entity", color: "#FFD700" },
  { key: "interpEntity", label: "interp entity", color: "#DA70D6" },
];

// ---------------------------------------------------------------------------
// NodeTypeCheckbox sub-component
// ---------------------------------------------------------------------------

interface NodeTypeCheckboxProps {
  nodeKey: string;
  label: string;
  color: string;
  checked: boolean;
  onChange: (key: string) => void;
}

function NodeTypeCheckbox({
  nodeKey,
  label,
  color,
  checked,
  onChange,
}: NodeTypeCheckboxProps) {
  const inputId = `filter-type-${nodeKey}`;
  return (
    <div className="flex items-center gap-2 cursor-pointer group">
      <div
        className="relative flex items-center justify-center w-3 h-3 border border-dashed shrink-0 transition-colors"
        style={{
          borderColor: checked ? color : "oklch(var(--border))",
          background: checked ? `${color}22` : "transparent",
        }}
      >
        {checked && (
          <span className="w-1.5 h-1.5 block" style={{ background: color }} />
        )}
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={() => onChange(nodeKey)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label={`Show ${label} nodes`}
          data-ocid={`filter_panel.type_checkbox.${nodeKey}`}
        />
      </div>
      <label
        htmlFor={inputId}
        className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterPanel component
// ---------------------------------------------------------------------------

export default function FilterPanel({
  searchText,
  onSearchChange,
  visibleNodeTypes,
  onNodeTypesChange,
  totalNodes,
  visibleNodes,
  onReset,
  onFitToVisible,
  isCollapsed,
  onToggleCollapsed,
}: FilterPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when panel expands
  useEffect(() => {
    if (!isCollapsed) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isCollapsed]);

  const toggleNodeType = (key: string) => {
    const next = new Set(visibleNodeTypes);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onNodeTypesChange(next);
  };

  const isFiltered =
    searchText.trim().length > 0 ||
    visibleNodeTypes.size < ALL_NODE_TYPES.length;

  return (
    <div
      className="flex shrink-0 font-mono"
      style={{ zIndex: 10 }}
      data-ocid="filter_panel.panel"
    >
      {/* Collapsed tab — vertical label */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex flex-col items-center justify-start pt-3 px-1.5 bg-background border-l border-t border-b border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
        style={{ writingMode: "vertical-rl", gap: "6px" }}
        aria-label={
          isCollapsed ? "Expand filter panel" : "Collapse filter panel"
        }
        data-ocid="filter_panel.toggle"
      >
        <span className="text-[9px] tracking-widest uppercase select-none">
          {isCollapsed ? "▶ filter" : "◀ filter"}
        </span>
        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded panel — slides in/out via width transition */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          width: isCollapsed ? 0 : 200,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div
          className="w-[200px] h-full flex flex-col border-l border-t border-b border-dashed border-border bg-background"
          data-ocid="filter_panel.content"
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-dashed border-border shrink-0">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
              search
            </span>
            <input
              ref={searchInputRef}
              id="filter-panel-search"
              type="text"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="filter by name..."
              className="w-full bg-transparent border border-dashed border-input text-xs text-foreground placeholder:text-muted-foreground/50 px-2 py-1 outline-none focus:border-foreground transition-colors"
              data-ocid="filter_panel.search_input"
              aria-label="Filter nodes by name"
            />
          </div>

          {/* Node type checkboxes */}
          <div className="px-3 pt-2 pb-2 border-b border-dashed border-border shrink-0">
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              node types
            </span>
            <div className="flex flex-col gap-1.5">
              {ALL_NODE_TYPES.map((nt) => (
                <NodeTypeCheckbox
                  key={nt.key}
                  nodeKey={nt.key}
                  label={nt.label}
                  color={nt.color}
                  checked={visibleNodeTypes.has(nt.key)}
                  onChange={toggleNodeType}
                />
              ))}
            </div>
          </div>

          {/* Node count */}
          <div className="px-3 py-2 border-b border-dashed border-border shrink-0">
            <span
              className="text-[10px] text-muted-foreground"
              data-ocid="filter_panel.node_count"
            >
              showing{" "}
              <span className="text-foreground font-semibold">
                {visibleNodes}
              </span>{" "}
              of{" "}
              <span className="text-foreground font-semibold">
                {totalNodes}
              </span>{" "}
              nodes
            </span>
          </div>

          {/* Actions */}
          <div className="px-3 py-2 flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onFitToVisible}
              className="w-full text-[10px] border border-dashed border-border px-2 py-1 text-foreground hover:border-foreground hover:bg-accent transition-colors text-left"
              data-ocid="filter_panel.fit_to_visible"
              aria-label="Zoom to fit visible nodes"
            >
              [fit to visible]
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={!isFiltered}
              className="w-full text-[10px] border border-dashed border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-accent transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed"
              data-ocid="filter_panel.reset_button"
              aria-label="Reset all filters"
            >
              [reset filters]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
