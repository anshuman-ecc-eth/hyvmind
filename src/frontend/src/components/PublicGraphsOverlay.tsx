import { useEffect } from "react";
import type { ReactNode } from "react";
import PublicGraphView from "../pages/PublicGraphView";

const ESCAPE_CONSUMERS = [
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
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      <main className="flex-1 min-h-0 overflow-hidden">
        <PublicGraphView isLanding />
      </main>
    </div>
  );
}
