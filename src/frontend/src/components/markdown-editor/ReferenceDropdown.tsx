import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ResolvableNode {
  id: string;
  name: string;
  nodeType: "curation" | "swarm" | "location" | "lawEntity" | "interpEntity";
  parentPath: string;
}

export interface ReferenceDropdownProps {
  open: boolean;
  searchText: string;
  nodes: ResolvableNode[];
  editorCenter: { top: number; left: number } | null;
  highlightedIndex: number;
  onSelect: (node: ResolvableNode) => void;
  onHighlightChange: (index: number) => void;
  onSearchTextChange: (text: string) => void;
  onClose: () => void;
}

const dotColorClass: Record<ResolvableNode["nodeType"], string> = {
  curation: "text-blue-400",
  swarm: "text-orange-400",
  location: "text-emerald-600",
  lawEntity: "text-amber-600",
  interpEntity: "text-purple-400",
};

export default function ReferenceDropdown({
  open,
  searchText,
  nodes,
  editorCenter,
  highlightedIndex,
  onSelect,
  onHighlightChange,
  onSearchTextChange,
  onClose,
}: ReferenceDropdownProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  if (!open || !editorCenter || nodes.length === 0) return null;

  const filtered = nodes.filter((n) =>
    n.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filtered.length > 0) {
          onHighlightChange((highlightedIndex + 1) % filtered.length);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filtered.length > 0) {
          onHighlightChange(
            (highlightedIndex - 1 + filtered.length) % filtered.length,
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        if (
          filtered.length > 0 &&
          highlightedIndex >= 0 &&
          highlightedIndex < filtered.length
        ) {
          onSelect(filtered[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        aria-hidden="true"
      />
      <dialog
        open
        aria-modal="true"
        aria-label="Cross-reference selector"
        style={{
          position: "fixed",
          top: editorCenter.top,
          left: editorCenter.left,
          transform: "translate(-50%, -50%)",
          zIndex: 50,
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
        }}
      >
        <div className="bg-popover text-popover-foreground border rounded shadow-md min-w-[300px] max-w-[600px]">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search nodes..."
            aria-label="Search nodes"
            className="w-full bg-transparent border-b border-border px-3 py-2 text-sm font-mono outline-none text-foreground placeholder:text-muted-foreground/60"
          />
          <div className="max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground font-mono">
                No results
              </div>
            ) : (
              filtered.map((node, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={node.id}
                    type="button"
                    tabIndex={-1}
                    className={[
                      "w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm transition-colors",
                      isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    ].join(" ")}
                    onMouseEnter={() => onHighlightChange(index)}
                    onClick={() => onSelect(node)}
                  >
                    <span className={dotColorClass[node.nodeType]}>●</span>
                    <span
                      className={[
                        "font-medium",
                        isHighlighted
                          ? "text-accent-foreground"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {node.name}
                    </span>
                    <span
                      className={[
                        "text-xs ml-auto pl-2",
                        isHighlighted
                          ? "text-accent-foreground/70"
                          : "text-muted-foreground truncate",
                      ].join(" ")}
                    >
                      · {node.parentPath}
                      {isHighlighted && (
                        <span className="opacity-60"> · {node.id}</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </dialog>
    </>,
    document.body,
  );
}
