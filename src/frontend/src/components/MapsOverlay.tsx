import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePublishedGraphMetas } from "../hooks/usePublicGraphs";

interface MapsOverlayProps {
  onBack: () => void;
  onPlay?: (name: string) => void;
}

interface TerrainItem {
  id: string;
  name: string;
}

export default function MapsOverlay({
  onBack,
  onPlay,
}: MapsOverlayProps): ReactNode {
  const { data: metas, isLoading } = usePublishedGraphMetas();

  const publishedTerrains: TerrainItem[] = useMemo(
    () =>
      (metas ?? [])
        .filter((m) => m.artworkDataUrl && m.artworkDataUrl.length > 0)
        .map((m) => ({ id: m.id, name: m.name })),
    [metas],
  );

  const allItems = useMemo(() => {
    return publishedTerrains.map((t) => t.name);
  }, [publishedTerrains]);

  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSelect = useCallback(
    (idx: number) => {
      const item = allItems[idx];
      if (!item) return;
      if (onPlay) onPlay(item);
    },
    [allItems, onPlay],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (allItems.length === 0) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(allItems.length - 1, prev + 1));
      } else if (e.key === "z" || e.key === "Z") {
        handleSelect(selectedIdx);
      } else if (e.key === "Enter") {
        handleSelect(selectedIdx);
      } else if (e.key === "x" || e.key === "X") {
        onBack();
      } else if (e.key === "Escape") {
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allItems.length, selectedIdx, handleSelect, onBack]);

  const loading = isLoading;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="text-foreground tracking-widest"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "1em",
          letterSpacing: "0.15em",
        }}
      >
        Maps
      </div>

      {loading && (
        <div
          className="text-muted-foreground"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.55em",
          }}
        >
          Loading..
        </div>
      )}

      {!loading && publishedTerrains.length === 0 && allItems.length === 0 && (
        <div
          className="text-muted-foreground text-center px-4"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.5em",
            lineHeight: 1.8,
          }}
        >
          No maps available yet.
          <br />
          Publish a graph to generate one.
        </div>
      )}

      {allItems.length > 0 && (
        <div className="flex flex-col items-center gap-1.5">
          {allItems.map((item, i) => {
            const isSelected = i === selectedIdx;
            return (
              <button
                key={item}
                type="button"
                className={`transition-all duration-150 ${
                  isSelected
                    ? "text-foreground scale-105"
                    : "text-muted-foreground opacity-50 hover:text-foreground hover:scale-105"
                }`}
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "0.65em",
                  letterSpacing: "0.2em",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                }}
                onClick={() => {
                  setSelectedIdx(i);
                  handleSelect(i);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                {isSelected ? `> ${item}` : `  ${item}`}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="text-foreground transition-colors hover:text-muted-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.55em",
          letterSpacing: "0.15em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          marginTop: "4px",
        }}
        onClick={onBack}
      >
        {"> Back"}
      </button>
    </div>
  );
}
