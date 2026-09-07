import { useEffect } from "react";
import type { ReactNode } from "react";
import PublicGraphView from "../pages/PublicGraphView";

const ESCAPE_CONSUMERS = [
  '[data-ocid="fuzzy_finder.search_input"]',
  '[data-ocid="fuzzy_finder.dropdown"]',
  '[data-ocid="artwork_modal.dialog"]',
  '[data-ocid="ontology_modal.dialog"]',
  '[data-ocid="public_node_details.dialog"]',
];

export default function PublicGraphsOverlay({
  onClose,
}: {
  onClose: () => void;
}): ReactNode {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (
        document.querySelector(ESCAPE_CONSUMERS.join(", ")) ||
        document.activeElement?.matches?.(
          '[data-ocid="fuzzy_finder.search_input"]',
        )
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <button
        type="button"
        data-ocid="public_graphs_overlay.back_button"
        className="absolute top-2 left-2 z-10 text-foreground transition-colors hover:text-muted-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.6em",
          letterSpacing: "0.15em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
        }}
        onClick={onClose}
      >
        {"> Back"}
      </button>
      <main className="flex-1 min-h-0 overflow-hidden">
        <PublicGraphView isLanding />
      </main>
    </div>
  );
}
