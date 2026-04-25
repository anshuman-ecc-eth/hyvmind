/**
 * Spirograph pattern artwork generator using native Canvas API.
 * Deterministically seeded by published graph ID via FNV-1a hash + Mulberry32 PRNG.
 * No external dependencies — uses only browser Canvas API.
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
// Spirograph helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawSpirograph(
  ctx: CanvasRenderingContext2D,
  radius1: number,
  radius2: number,
  distance: number,
  cycles: number,
  controlPoints: number,
  scale: number,
): void {
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1;
  ctx.beginPath();

  const rDiff = radius1 - radius2;
  let maxAll = 0;

  for (let i = 0; i <= controlPoints; i++) {
    const t = (i / controlPoints) * cycles * 2 * Math.PI;
    const x = rDiff * Math.sin(t) - distance * Math.sin((t * rDiff) / radius2);
    const y = rDiff * Math.cos(t) + distance * Math.cos((t * rDiff) / radius2);
    maxAll = Math.max(maxAll, Math.abs(x), Math.abs(y));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.setTransform(scale / maxAll, 0, 0, scale / maxAll, 0, 0);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateTruchetArtwork(
  seed: string,
  size: "thumbnail" | "full",
): Promise<string> {
  const canvasSize = size === "thumbnail" ? 200 : 400;

  const seedNum = fnv1a(seed);
  const rand = makePrng(seedNum);

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

  // Generate spirograph parameters from seeded PRNG
  const radius1 = lerp(0.5, 2.5, rand());
  const radius2 = lerp(0.1, 1.5, rand());
  const distance = lerp(0.2, 1.5, rand());
  const cycles = Math.floor(lerp(2, 6, rand())) + 1;
  const controlPoints = Math.floor(lerp(200, 600, rand()));

  // Draw spirograph centered on canvas
  ctx.save();
  ctx.translate(canvasSize / 2, canvasSize / 2);
  drawSpirograph(
    ctx,
    radius1,
    radius2,
    distance,
    cycles,
    controlPoints,
    (canvasSize / 2) * 0.9,
  );
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.7);
}
