/**
 * Isometric Perlin terrain artwork generator using native Canvas API.
 * Deterministically seeded by curation name via FNV-1a hash + LCG PRNG.
 * Outputs JPEG data URL and the TerrainParams used to produce it.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TerrainParams {
  seed: number;
  persistence: number;
  octaves: number;
  wavelength: number;
  amplitude: number;
  exponent: number;
  peaks: number;
  waterLevel: number;
  beachSize: number;
  lightPosition: number;
  lightHeight: number;
  light: number;
}

// ---------------------------------------------------------------------------
// Hash + PRNG
// ---------------------------------------------------------------------------

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

class SeedablePRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// ---------------------------------------------------------------------------
// Perlin noise
// ---------------------------------------------------------------------------

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function perlinNoise(
  width: number,
  height: number,
  persistence: number,
  octaves: number,
  wavelength: number,
  prng: SeedablePRNG,
): number[][] {
  // Build gradient grids per octave
  const gradX: number[][][] = [];
  const gradY: number[][][] = [];
  for (let o = 0; o < octaves; o++) {
    const gw = width + 1;
    const gh = height + 1;
    const gxLayer: number[][] = [];
    const gyLayer: number[][] = [];
    for (let gy = 0; gy < gh; gy++) {
      const gxRow: number[] = [];
      const gyRow: number[] = [];
      for (let gx = 0; gx < gw; gx++) {
        const angle = prng.next() * Math.PI * 2;
        gxRow.push(Math.cos(angle));
        gyRow.push(Math.sin(angle));
      }
      gxLayer.push(gxRow);
      gyLayer.push(gyRow);
    }
    gradX.push(gxLayer);
    gradY.push(gyLayer);
  }

  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let noise = 0;
      let amplitude = 1;
      let freq = 1 / wavelength;
      let maxAmp = 0;

      for (let o = 0; o < octaves; o++) {
        const px = x * freq;
        const py = y * freq;
        const ix = Math.floor(px);
        const iy = Math.floor(py);
        const fx = px - ix;
        const fy = py - iy;

        const gx0 = gradX[o];
        const gy0 = gradY[o];

        const wx = easeInOutQuad(fx);
        const wy = easeInOutQuad(fy);

        // Dot products for 4 corners (wrap gradient indices)
        const gw = width + 1;
        const gh = height + 1;
        const ix0 = ((ix % gw) + gw) % gw;
        const ix1 = (((ix + 1) % gw) + gw) % gw;
        const iy0 = ((iy % gh) + gh) % gh;
        const iy1 = (((iy + 1) % gh) + gh) % gh;

        const d00 = gx0[iy0][ix0] * fx + gy0[iy0][ix0] * fy;
        const d10 = gx0[iy0][ix1] * (fx - 1) + gy0[iy0][ix1] * fy;
        const d01 = gx0[iy1][ix0] * fx + gy0[iy1][ix0] * (fy - 1);
        const d11 = gx0[iy1][ix1] * (fx - 1) + gy0[iy1][ix1] * (fy - 1);

        const lerpX0 = d00 + wx * (d10 - d00);
        const lerpX1 = d01 + wx * (d11 - d01);
        noise += (lerpX0 + wy * (lerpX1 - lerpX0)) * amplitude;

        maxAmp += amplitude;
        amplitude *= persistence;
        freq *= 2;
      }

      row.push(noise / maxAmp);
    }
    result.push(row);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Terrain helpers
// ---------------------------------------------------------------------------

function calculateSlopeDirection(
  y0: number,
  y1: number,
  y2: number,
  y3: number,
): [number, number, number] {
  const avgSlopeX = (y1 - y0 + (y3 - y2)) / 2;
  const avgSlopeZ = (y2 - y0 + (y3 - y1)) / 2;
  const slopeDirection = (Math.atan2(avgSlopeZ, avgSlopeX) * 180) / Math.PI;
  return [slopeDirection, avgSlopeX, avgSlopeZ];
}

function addShading(
  colors: number[],
  slopeDirection: number,
  _slopeX: number,
  _slopeZ: number,
  lightPosition: number,
  lightHeight: number,
  light: number,
): void {
  const rawDiff = (((lightPosition - slopeDirection) % 360) + 360) % 360;
  const angleDiff = rawDiff > 180 ? rawDiff - 360 : rawDiff;
  const darkening = (Math.abs(angleDiff) / 180) * lightHeight;
  colors[0] = Math.max(0, Math.min(255, colors[0] - darkening + light));
  colors[1] = Math.max(0, Math.min(255, colors[1] - darkening + light));
  colors[2] = Math.max(0, Math.min(255, colors[2] - darkening + light));
}

function terrainColorLookup(
  elevation: number,
  slopeDirection: number,
  slopeX: number,
  slopeZ: number,
  waterLevel: number,
  beachSize: number,
  lightPosition: number,
  lightHeight: number,
  light: number,
): [number, number, number, number] {
  const sandThreshold = waterLevel + beachSize;
  const remaining = 255 - sandThreshold;
  const band = remaining / 8;

  let r: number;
  let g: number;
  let b: number;

  if (elevation <= sandThreshold) {
    // Sandy beach
    r = 218;
    g = 195;
    b = 139;
  } else if (elevation <= sandThreshold + band) {
    r = 86;
    g = 158;
    b = 75;
  } else if (elevation <= sandThreshold + band * 2) {
    r = 76;
    g = 140;
    b = 66;
  } else if (elevation <= sandThreshold + band * 3) {
    r = 66;
    g = 122;
    b = 57;
  } else if (elevation <= sandThreshold + band * 4) {
    r = 56;
    g = 104;
    b = 48;
  } else if (elevation <= sandThreshold + band * 5) {
    r = 46;
    g = 86;
    b = 39;
  } else if (elevation <= sandThreshold + band * 6) {
    // Hill
    r = 110;
    g = 84;
    b = 60;
  } else if (elevation <= sandThreshold + band * 7) {
    // Rock
    r = 128;
    g = 120;
    b = 110;
  } else {
    // Snow
    r = 240;
    g = 240;
    b = 245;
  }

  const colors = [r, g, b];
  addShading(
    colors,
    slopeDirection,
    slopeX,
    slopeZ,
    lightPosition,
    lightHeight,
    light,
  );
  return [colors[0], colors[1], colors[2], 255];
}

function waterColorLookup(
  depth: number,
  waterLevel: number,
  lightHeight: number,
): [number, number, number, number] {
  const clampedDepth = Math.max(0, depth);
  const t = Math.min(1, clampedDepth / waterLevel);

  // Shallow: (248, 218, 148), Deep: (64, 164, 223)
  const r = Math.round(248 + t * (64 - 248));
  const g = Math.round(218 + t * (164 - 218));
  const b = Math.round(148 + t * (223 - 148));

  // Shallow water is slightly transparent, deep is opaque
  const alpha = Math.round(180 + t * 75 + lightHeight * 0.1);
  return [r, g, b, Math.min(255, alpha)];
}

// ---------------------------------------------------------------------------
// Isometric projection
// ---------------------------------------------------------------------------

const cos30 = Math.cos(Math.PI / 6);
const sin30 = Math.sin(Math.PI / 6);
const isoHeight = 20;
const isoWidth = 1;
const isoLength = 1;
const scale = 5;

function coordToPixel(
  coordX: number,
  coordY: number,
  coordHeight: number,
): [number, number] {
  return [
    Math.floor(scale * (((coordX - coordY) * cos30) / isoWidth) + 432.5),
    Math.floor(
      scale *
        (((coordX + coordY) * sin30) / isoLength - coordHeight * isoHeight) +
        345,
    ),
  ];
}

// ---------------------------------------------------------------------------
// Tile + border drawing
// ---------------------------------------------------------------------------

function drawTile(
  ctx: CanvasRenderingContext2D,
  h0: number,
  h1: number,
  h2: number,
  h3: number,
  isWater: boolean,
  x: number,
  y: number,
  terrainAverageHeight: number,
  terrainHighestHeight: number,
  slopeValues: [number, number, number],
  waterLevel: number,
  beachSize: number,
  lightPosition: number,
  lightHeight: number,
  light: number,
): void {
  const [px0, py0] = coordToPixel(x, y, h0);
  const [px1, py1] = coordToPixel(x + 1, y, h1);
  const [px2, py2] = coordToPixel(x, y + 1, h2);
  const [px3, py3] = coordToPixel(x + 1, y + 1, h3);

  let color: [number, number, number, number];
  if (isWater) {
    const depth = waterLevel - terrainAverageHeight;
    color = waterColorLookup(depth, waterLevel, lightHeight);
  } else {
    color = terrainColorLookup(
      terrainHighestHeight,
      slopeValues[0],
      slopeValues[1],
      slopeValues[2],
      waterLevel,
      beachSize,
      lightPosition,
      lightHeight,
      light,
    );
  }

  const [r, g, b, a] = color;
  ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px1, py1);
  ctx.lineTo(px3, py3);
  ctx.lineTo(px2, py2);
  ctx.closePath();
  ctx.fill();

  if (!isWater) {
    ctx.strokeStyle = `rgba(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)},0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  h0: number,
  h1: number,
  _h2: number,
  _h3: number,
  isWater: boolean,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  isLeftBorder: boolean,
  waterLevel: number,
  lightHeight: number,
  light: number,
): void {
  // Four pixel corners of the tile top face
  const [px0, py0] = coordToPixel(x1, y1, h0);
  const [px1, py1] = coordToPixel(x2, y2, h1);
  // Bottom of the border wall (ground level)
  const [px0b, py0b] = coordToPixel(x1, y1, 0);
  const [px1b, py1b] = coordToPixel(x2, y2, 0);

  if (isWater) {
    const depthAdj = isLeftBorder ? 25 : 15;
    const [r, g, b, a] = waterColorLookup(depthAdj, waterLevel, lightHeight);
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px1, py1);
    ctx.lineTo(px1b, py1b);
    ctx.lineTo(px0b, py0b);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    return;
  }

  // Land side wall — check if we have meaningful height
  const maxH = Math.max(h0, h1);
  if (maxH <= 0) return;

  // Gradient: bottom (golden) -> top (brighter golden)
  const gradient = ctx.createLinearGradient(px0b, py0b, px0, py0);
  const lightHeightChange = lightHeight * 0.5;
  const bottomR = Math.min(255, 150 + light);
  const bottomG = Math.min(255, 110 + light);
  const bottomB = Math.min(255, 0 + light);
  const topR = Math.min(255, 255 + light - lightHeightChange);
  const topG = Math.min(255, 215 + light - lightHeightChange);
  const topB = Math.min(255, 105 + light - lightHeightChange);
  gradient.addColorStop(0, `rgb(${bottomR},${bottomG},${bottomB})`);
  gradient.addColorStop(1, `rgb(${topR},${topG},${topB})`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px1, py1);
  ctx.lineTo(px1b, py1b);
  ctx.lineTo(px0b, py0b);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(80,60,0,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateTerrainArtwork(
  curationName: string,
  size: "thumbnail" | "full",
): Promise<{ dataUrl: string; params: TerrainParams }> {
  const canvasWidth = size === "full" ? 865 : 433;
  const canvasHeight = size === "full" ? 690 : 345;
  const gridWidth = 100;
  const gridHeight = 100;

  const seed = fnv1a(curationName);
  const prng = new SeedablePRNG(seed);

  // Derive all params from PRNG
  const persistence = 0.3 + prng.next() * 0.4; // 0.3 - 0.7
  const octaves = 3 + Math.floor(prng.next() * 4); // 3 - 6
  const wavelength = 12 + prng.next() * 12; // 12 - 24
  const amplitude = 1.0; // fixed
  const exponent = 1.0 + prng.next() * 0.5; // 1.0 - 1.5
  const peaks = prng.next() * 0.15; // 0.0 - 0.15
  const waterLevel = Math.round(80 + prng.next() * 60); // 80 - 140
  const beachSize = Math.round(5 + prng.next() * 15); // 5 - 20
  const lightPosition = Math.floor(prng.next() * 360); // 0 - 359
  const lightHeight = 42; // fixed
  const light = 0; // fixed

  const params: TerrainParams = {
    seed,
    persistence,
    octaves,
    wavelength,
    amplitude,
    exponent,
    peaks,
    waterLevel,
    beachSize,
    lightPosition,
    lightHeight,
    light,
  };

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return { dataUrl: "", params };
  }
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", params };

  // Background fill
  ctx.fillStyle = "rgb(40,80,140)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Scale canvas for thumbnail
  if (size === "thumbnail") {
    ctx.scale(0.5, 0.5);
  }

  // Translate origin as specified
  ctx.translate(382, 250);

  // Generate noise map — use a fresh PRNG seeded from params for reproducibility
  const noisePrng = new SeedablePRNG(seed ^ 0xdeadbeef);
  const rawMap = perlinNoise(
    gridWidth + 1,
    gridHeight + 1,
    persistence,
    octaves,
    wavelength,
    noisePrng,
  );

  // Convert raw noise to elevation map (0-255)
  const elevationMap: number[][] = [];
  for (let y = 0; y <= gridHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x <= gridWidth; x++) {
      const raw = rawMap[y]?.[x] ?? 0;
      const normalized = (raw + 1) / 2 + peaks;
      const elevated = Math.max(0, normalized) ** exponent * 255;
      row.push(Math.max(0, Math.min(255, elevated)));
    }
    elevationMap.push(row);
  }

  const perlinWaterLevel = 2 * (waterLevel / 255) - 1;

  // Render tiles — back to front (painter's algorithm)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const mapvalue0 = elevationMap[y][x];
      const mapvalue1 = elevationMap[y][x + 1];
      const mapvalue2 = elevationMap[y + 1][x];
      const mapvalue3 = elevationMap[y + 1][x + 1];

      // Convert to normalized perlin range for height in coordToPixel
      const toPerlin = (v: number) => (v / 255) * 2 - 1;
      const p0 = toPerlin(mapvalue0);
      const p1 = toPerlin(mapvalue1);
      const p2 = toPerlin(mapvalue2);
      const p3 = toPerlin(mapvalue3);

      const terrainAverageHeight =
        (mapvalue0 + mapvalue1 + mapvalue2 + mapvalue3) / 4;
      const terrainHighestHeight = Math.max(
        mapvalue0,
        mapvalue1,
        mapvalue2,
        mapvalue3,
      );
      const terrainLowestHeight = Math.min(
        mapvalue0,
        mapvalue1,
        mapvalue2,
        mapvalue3,
      );

      const slopeValues = calculateSlopeDirection(
        mapvalue0,
        mapvalue1,
        mapvalue2,
        mapvalue3,
      );

      if (terrainHighestHeight < waterLevel) {
        // Fully underwater
        drawTile(
          ctx,
          perlinWaterLevel,
          perlinWaterLevel,
          perlinWaterLevel,
          perlinWaterLevel,
          true,
          x,
          y,
          terrainAverageHeight,
          terrainHighestHeight,
          slopeValues,
          waterLevel,
          beachSize,
          lightPosition,
          lightHeight,
          light,
        );
      } else if (terrainLowestHeight >= waterLevel) {
        // Fully above water
        drawTile(
          ctx,
          p0,
          p1,
          p2,
          p3,
          false,
          x,
          y,
          terrainAverageHeight,
          terrainHighestHeight,
          slopeValues,
          waterLevel,
          beachSize,
          lightPosition,
          lightHeight,
          light,
        );
      } else {
        // Mixed: terrain first, then water overlay
        drawTile(
          ctx,
          p0,
          p1,
          p2,
          p3,
          false,
          x,
          y,
          terrainAverageHeight,
          terrainHighestHeight,
          slopeValues,
          waterLevel,
          beachSize,
          lightPosition,
          lightHeight,
          light,
        );
        drawTile(
          ctx,
          perlinWaterLevel,
          perlinWaterLevel,
          perlinWaterLevel,
          perlinWaterLevel,
          true,
          x,
          y,
          terrainAverageHeight,
          terrainHighestHeight,
          slopeValues,
          waterLevel,
          beachSize,
          lightPosition,
          lightHeight,
          light,
        );
      }

      // Side borders on last rows/cols
      if (y === gridHeight - 2) {
        if (mapvalue2 > 0 || mapvalue3 > 0) {
          drawBorder(
            ctx,
            mapvalue2 / 255,
            mapvalue3 / 255,
            0,
            0,
            mapvalue2 < waterLevel && mapvalue3 < waterLevel,
            x,
            y + 1,
            x + 1,
            y + 1,
            true,
            waterLevel,
            lightHeight,
            light,
          );
        }
      }
      if (x === gridWidth - 2) {
        if (mapvalue1 > 0 || mapvalue3 > 0) {
          drawBorder(
            ctx,
            mapvalue1 / 255,
            mapvalue3 / 255,
            0,
            0,
            mapvalue1 < waterLevel && mapvalue3 < waterLevel,
            x + 1,
            y,
            x + 1,
            y + 1,
            false,
            waterLevel,
            lightHeight,
            light,
          );
        }
      }
    }
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  return { dataUrl, params };
}
