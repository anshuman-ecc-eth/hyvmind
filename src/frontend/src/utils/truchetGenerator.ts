/**
 * Truchet tile artwork generator using native Canvas API.
 * Deterministically seeded by curation name via FNV-1a hash + Mulberry32 PRNG.
 * No p5.js dependency — uses only browser Canvas API.
 */

// ---------------------------------------------------------------------------
// Hash + PRNG
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit hash — fast, well-distributed */
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** Mulberry32 — simple seeded PRNG returning [0, 1) */
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const PALETTE = [
  "#60A5FA",
  "#FB923C",
  "#059669",
  "#D97706",
  "#C084FC",
  "#6B7280",
  "#D1D5DB",
];

// ---------------------------------------------------------------------------
// Tile drawing helpers
// ---------------------------------------------------------------------------

type TileType = 0 | 1 | 2 | 3;
// 0 = curved arcs (classic truchet)
// 1 = diagonal line
// 2 = cross
// 3 = dots

function drawTile(
  ctx: CanvasRenderingContext2D,
  tileType: TileType,
  cellSize: number,
  fg: string,
): void {
  const half = cellSize / 2;
  const lw = Math.max(1.5, cellSize * 0.08);
  ctx.strokeStyle = fg;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";

  switch (tileType) {
    case 0: {
      // Two quarter-circle arcs: top-mid → left-mid and right-mid → bottom-mid
      ctx.beginPath();
      ctx.arc(0, 0, half, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cellSize, cellSize, half, Math.PI, (3 * Math.PI) / 2);
      ctx.stroke();
      break;
    }
    case 1: {
      // Diagonal from top-left to bottom-right
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cellSize, cellSize);
      ctx.stroke();
      break;
    }
    case 2: {
      // Cross: horizontal + vertical through centre
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, cellSize);
      ctx.moveTo(0, half);
      ctx.lineTo(cellSize, half);
      ctx.stroke();
      break;
    }
    case 3: {
      // Two small circles in opposite corners
      const r = cellSize * 0.15;
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(cellSize * 0.25, cellSize * 0.25, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cellSize * 0.75, cellSize * 0.75, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateTruchetArtwork(
  curationName: string,
  size: "thumbnail" | "full",
): Promise<string> {
  const canvasSize = size === "thumbnail" ? 200 : 400;
  const gridCount = size === "thumbnail" ? 10 : 20;
  const cellSize = canvasSize / gridCount;

  const seed = fnv1a(curationName);
  const rand = makePrng(seed);

  // Create canvas — works in browser; gracefully skip in non-browser envs
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return "";
  }
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Fill background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  for (let row = 0; row < gridCount; row++) {
    for (let col = 0; col < gridCount; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      // Pick tile attributes deterministically
      const tileType = Math.floor(rand() * 4) as TileType;
      const rotation = Math.floor(rand() * 4) * 90; // 0, 90, 180, 270
      const fgIdx = Math.floor(rand() * PALETTE.length);
      let bgIdx = Math.floor(rand() * (PALETTE.length - 1));
      if (bgIdx >= fgIdx) bgIdx++; // ensure different from fg

      const fg = PALETTE[fgIdx];
      const bg = PALETTE[bgIdx];

      // Fill cell background
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, cellSize, cellSize);

      // Draw tile with rotation around cell centre
      ctx.save();
      ctx.translate(x + cellSize / 2, y + cellSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cellSize / 2, -cellSize / 2);
      drawTile(ctx, tileType, cellSize, fg);
      ctx.restore();
    }
  }

  return canvas.toDataURL("image/jpeg", 0.7);
}
