import React from "react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ArtworkModalProps {
  artworkUrl: string;
  graphName: string;
  terrainParams?: string;
  onClose: () => void;
}

export default function ArtworkModal({
  artworkUrl,
  graphName,
  terrainParams,
  onClose,
}: ArtworkModalProps): ReactNode {
  const [showParams, setShowParams] = useState(false);
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      data-ocid="artwork_modal.dialog"
    >
      {/* Backdrop clickable area */}
      <button
        type="button"
        aria-label="Close artwork modal"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Card */}
      <div className="relative bg-card border border-border p-4 flex flex-col items-center gap-3 shadow-lg z-10">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
          aria-label="Close"
          data-ocid="artwork_modal.close_button"
        >
          ✕
        </button>

        {/* Graph name */}
        <h3 className="font-mono text-sm text-foreground font-semibold pr-6 max-w-[400px] truncate">
          {graphName}
        </h3>

        {/* Artwork */}
        <img
          src={artworkUrl}
          alt={`Terrain artwork for ${graphName}`}
          width={400}
          height={400}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Parameters toggle */}
        <button
          type="button"
          onClick={() => setShowParams((p) => !p)}
          className="border border-border px-2 py-1 font-mono text-xs text-foreground hover:bg-secondary transition-colors"
          data-ocid="artwork_modal.parameters_toggle"
        >
          {showParams ? "Hide Parameters" : "⚙ Parameters"}
        </button>

        {/* Parameters panel */}
        {showParams && terrainParams && (
          <div className="mt-1 w-full font-mono text-xs text-muted-foreground">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(
                JSON.parse(terrainParams) as Record<string, unknown>,
              ).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </dt>
                  <dd>
                    {key === "light"
                      ? "Max"
                      : key === "lightPosition"
                        ? `${String(value)}°`
                        : String(value)}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
