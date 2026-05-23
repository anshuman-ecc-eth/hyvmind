import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePublishedGraphMetas } from "../hooks/usePublicGraphs";
import { generateTerrainArtwork } from "../utils/perlinTerrainGenerator";
import ArtworkModal from "./ArtworkModal";

const TEST_SEEDS = [
  "Indian Constitutional Law",
  "Singapore Company Law",
  "American Contract Law",
  "Chinese Administrative Law",
];

interface MapsOverlayProps {
  onBack: () => void;
}

interface TerrainItem {
  id: string;
  name: string;
  artworkUrl: string;
}

export default function MapsOverlay({ onBack }: MapsOverlayProps): ReactNode {
  const { data: metas, isLoading } = usePublishedGraphMetas();
  const [testMaps, setTestMaps] = useState<TerrainItem[]>([]);
  const [testMapsLoading, setTestMapsLoading] = useState(true);
  const [selectedMeta, setSelectedMeta] = useState<{
    artworkUrl: string;
    name: string;
  } | null>(null);
  const [terrainIdx, setTerrainIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      const results: TerrainItem[] = [];
      for (const name of TEST_SEEDS) {
        const { dataUrl } = await generateTerrainArtwork(name, "thumbnail");
        if (cancelled) return;
        if (dataUrl)
          results.push({ id: `test-${name}`, name, artworkUrl: dataUrl });
      }
      if (!cancelled) {
        setTestMaps(results);
        setTestMapsLoading(false);
      }
    }
    generate();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedTerrains: TerrainItem[] = (metas ?? [])
    .filter((m) => m.artworkDataUrl && m.artworkDataUrl.length > 0)
    .map((m) => ({
      id: m.id,
      name: m.name,
      artworkUrl: m.artworkDataUrl!,
    }));

  const allTerrains = [...testMaps, ...publishedTerrains];
  const cols = 2;

  const openTerrain = useCallback(
    (idx: number) => {
      const testLen = testMaps.length;
      const t =
        idx < testLen ? testMaps[idx] : publishedTerrains[idx - testLen];
      if (!t) return;
      setSelectedMeta({ artworkUrl: t.artworkUrl, name: t.name });
    },
    [testMaps, publishedTerrains],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedMeta) return;
      if (e.key === "ArrowUp") {
        setTerrainIdx((prev) => Math.max(0, prev - cols));
      } else if (e.key === "ArrowDown") {
        setTerrainIdx((prev) => Math.min(allTerrains.length - 1, prev + cols));
      } else if (e.key === "ArrowLeft") {
        setTerrainIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setTerrainIdx((prev) => Math.min(allTerrains.length - 1, prev + 1));
      } else if (e.key === "z" || e.key === "Z") {
        openTerrain(terrainIdx);
      } else if (e.key === "x" || e.key === "X") {
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedMeta, allTerrains.length, terrainIdx, openTerrain, onBack]);

  const loading = isLoading || testMapsLoading;

  return (
    <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto">
      {selectedMeta && (
        <ArtworkModal
          artworkUrl={selectedMeta.artworkUrl}
          graphName={selectedMeta.name}
          onClose={() => setSelectedMeta(null)}
        />
      )}
      <div
        className="w-full max-w-md flex flex-col items-center gap-4 p-4"
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
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {allTerrains.map((t, i) => {
              const isSelected = i === terrainIdx;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`flex flex-col items-center gap-1 p-2 border transition-colors rounded cursor-pointer ${
                    isSelected
                      ? "border-foreground bg-card scale-105"
                      : "border-border bg-card/50 hover:bg-card"
                  }`}
                  style={{ imageRendering: "pixelated" }}
                  onClick={() => openTerrain(i)}
                >
                  <img
                    src={t.artworkUrl}
                    alt={t.name}
                    className="w-full aspect-square object-contain"
                  />
                  <span
                    className="text-muted-foreground truncate w-full text-center"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: "0.4em",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {isSelected ? `> ${t.name}` : `  ${t.name}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 mt-2">
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#7ab0c0",
              letterSpacing: "0.5px",
              background: "#000",
              padding: "6px 14px",
              borderRadius: "2px",
            }}
          >
            [Z] select [X] back
          </div>
          <div className="flex gap-4">
            {allTerrains.length > 0 && (
              <button
                type="button"
                onClick={() => openTerrain(terrainIdx)}
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
    </div>
  );
}
