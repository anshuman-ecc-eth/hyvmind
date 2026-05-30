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
  anchorRect: DOMRect | null;
  highlightedIndex: number;
  onSelect: (nodeName: string) => void;
  onHighlightChange: (index: number) => void;
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
  anchorRect,
  highlightedIndex,
  onSelect,
  onHighlightChange,
}: ReferenceDropdownProps) {
  if (!open || !anchorRect) return null;

  const filtered = nodes.filter((n) =>
    n.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  if (filtered.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: anchorRect.bottom,
        left: anchorRect.left,
        zIndex: 50,
      }}
    >
      <div className="bg-popover text-popover-foreground border rounded shadow-md z-50 min-w-[200px] max-w-[600px] max-h-[300px] overflow-y-auto">
        {filtered.map((node, index) => {
          const isHighlighted = index === highlightedIndex;
          return (
            <div
              key={node.id}
              tabIndex={-1}
              className={[
                "px-3 py-1.5 flex items-center gap-2 cursor-pointer text-sm",
                isHighlighted
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              ].join(" ")}
              onMouseEnter={() => onHighlightChange(index)}
              onClick={() => onSelect(node.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(node.name);
              }}
            >
              <span className={dotColorClass[node.nodeType]}>●</span>
              <span
                className={[
                  "font-medium",
                  isHighlighted ? "text-accent-foreground" : "text-foreground",
                ].join(" ")}
              >
                {node.name}
              </span>
              <span
                className={[
                  "text-xs ml-auto truncate pl-2",
                  isHighlighted
                    ? "text-accent-foreground/70"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                · {node.parentPath}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
