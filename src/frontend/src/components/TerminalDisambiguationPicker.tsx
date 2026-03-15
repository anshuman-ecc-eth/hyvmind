import { useEffect, useRef } from "react";
import type { ResolvedNode } from "../utils/terminalNameResolution";

interface TerminalDisambiguationPickerProps {
  candidates: ResolvedNode[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: (selectedNode: ResolvedNode) => void;
  onCancel: () => void;
}

export default function TerminalDisambiguationPicker({
  candidates,
  selectedIndex,
  onSelect,
  onConfirm,
  onCancel,
}: TerminalDisambiguationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelect((selectedIndex + 1) % candidates.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSelect((selectedIndex - 1 + candidates.length) % candidates.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm(candidates[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, candidates, onSelect, onConfirm, onCancel]);

  return (
    <div
      ref={containerRef}
      className="rounded-md border border-border bg-muted/50 p-3 font-mono text-sm"
    >
      <div className="mb-2 text-muted-foreground">
        Multiple matches found. Use ↑/↓ to select, Enter to confirm, Escape to
        cancel:
      </div>
      <div className="space-y-1">
        {candidates.map((candidate, index) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: interactive element
          <div
            key={candidate.id}
            className={`cursor-pointer rounded px-2 py-1 ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-muted"
            }`}
            onClick={() => {
              onSelect(index);
              onConfirm(candidate);
            }}
          >
            <span className="font-semibold">{candidate.name}</span>
            <span className="ml-2 text-muted-foreground">
              ({candidate.type})
            </span>
            {candidate.parentContext && (
              <span className="ml-2 text-xs text-muted-foreground">
                in {candidate.parentContext}
              </span>
            )}
            <div className="text-xs text-muted-foreground truncate">
              {candidate.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
