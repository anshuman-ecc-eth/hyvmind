import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePublishedGraphMetas } from "../hooks/usePublicGraphs";

const TEST_SEEDS = [
  "Indian Constitutional Law",
  "Singapore Company Law",
  "American Contract Law",
  "Chinese Administrative Law",
];

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

  const publishedTerrains: TerrainItem[] = (metas ?? [])
    .filter((m) => m.artworkDataUrl && m.artworkDataUrl.length > 0)
    .map((m) => ({ id: m.id, name: m.name }));

  const allTerrains = useMemo(
    () => [
      ...TEST_SEEDS.map((name) => ({ id: `test-${name}`, name })),
      ...publishedTerrains,
    ],
    [publishedTerrains],
  );
  const [terrainIdx, setTerrainIdx] = useState(0);

  const playTerrain = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= allTerrains.length) return;
      const t = allTerrains[idx];
      if (!t || !onPlay) return;
      onPlay(t.name);
    },
    [allTerrains, onPlay],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTerrainIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setTerrainIdx((prev) => Math.min(allTerrains.length - 1, prev + 1));
      } else if (e.key === "z" || e.key === "Z") {
        playTerrain(terrainIdx);
      } else if (e.key === "Enter") {
        playTerrain(terrainIdx);
      } else if (e.key === "x" || e.key === "X") {
        onBack();
      } else if (e.key === "Escape") {
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allTerrains.length, terrainIdx, playTerrain, onBack]);

  const loading = isLoading;

  return (
    <div
      className="flex-1 flex flex-col items-center gap-6 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="text-foreground tracking-widest mt-6"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.9em",
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

      {!loading && allTerrains.length === 0 && (
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

      {allTerrains.length > 0 && (
        <div className="w-full max-w-md px-4 flex flex-col gap-1">
          {allTerrains.map((t, i) => {
            const isSelected = i === terrainIdx;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => playTerrain(i)}
                onMouseEnter={() => setTerrainIdx(i)}
                className="w-full text-left px-4 py-2 rounded cursor-pointer transition-colors border-0"
                style={{
                  background: isSelected
                    ? "rgba(255,255,255,0.15)"
                    : "transparent",
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "0.55em",
                  letterSpacing: "0.05em",
                  color: isSelected ? "#fff" : "rgba(255,255,255,0.7)",
                }}
              >
                {isSelected ? `> ${t.name}` : `  ${t.name}`}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pb-4">
        <div
          className="text-muted-foreground"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.55em",
            letterSpacing: "0.05em",
          }}
        >
          [Z] travel [X] back
        </div>
        <div className="flex gap-4">
          {allTerrains.length > 0 && (
            <button
              type="button"
              onClick={() => playTerrain(terrainIdx)}
              className="active:scale-95 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.5)",
                border: "2px solid #888",
                color: "#000",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Z
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="active:scale-95 transition-transform"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              border: "2px solid #888",
              color: "#000",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}
