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
// Height conversion helper
// ---------------------------------------------------------------------------

function toPerlin(elevation: number): number {
  return (elevation / 255) * 2 - 1;
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
  slopeX: number,
  slopeZ: number,
  lightPosition: number,
  lightHeight: number,
  light: number,
): void {
  const lightHeightChange = (90 - lightHeight) / (3 - (lightHeight + 90) / 90);
  const light1 = (3 * (lightHeight + 90)) / 180 + 1;
  const light2 = 5 - light1;
  colors[0] = Math.max(
    0,
    colors[0] - lightHeightChange / light1 + Math.min(0, lightHeight),
  );
  colors[1] = Math.max(
    0,
    colors[1] - lightHeightChange / 2 + Math.min(0, lightHeight),
  );
  colors[2] = Math.max(
    0,
    colors[2] - lightHeightChange / light2 + Math.min(0, lightHeight),
  );
  let diff = Math.abs(lightPosition - slopeDirection);
  diff = diff > 180 ? 360 - diff : diff;
  if (slopeX === 0 && slopeZ === 0) {
    diff = -(lightHeight - 90);
  }
  const darkening = diff * Math.abs((lightHeight - 90) / 90);
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
  let r: number;
  let g: number;
  let b: number;

  if (elevation < waterLevel + beachSize) {
    r = elevation / 3 + 150 * 1.3;
    g = elevation / 3 + 110 * 1.3;
    b = (elevation / 3) * 1.3;
  } else if (elevation < 100) {
    r = elevation;
    g = elevation + 88;
    b = elevation;
  } else if (elevation < 130) {
    r = elevation;
    g = elevation + 58;
    b = elevation;
  } else if (elevation < 160) {
    r = elevation;
    g = Math.min(elevation + 29, 255);
    b = elevation;
  } else if (elevation < 190) {
    r = elevation - 10;
    g = elevation - 10;
    b = elevation;
  } else if (elevation < 220) {
    r = elevation - 40;
    g = elevation - 40;
    b = elevation - 30;
  } else {
    r = Math.min(255, elevation + 10);
    g = Math.min(255, elevation + 10);
    b = Math.min(255, elevation + 20);
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
  _waterLevel: number,
  lightHeight: number,
): [number, number, number, number] {
  const lightHeightChange = (90 - lightHeight) / (3 - (lightHeight + 90) / 90);
  const light1 = (3 * (lightHeight + 90)) / 180 + 1;
  const light2 = 5 - light1;
  const baseR = 0;
  const baseG = 180 - depth / 2;
  const baseB = 255 - depth / 4;
  const r = Math.max(
    0,
    baseR - lightHeightChange / light1 + Math.min(0, lightHeight),
  );
  const g = Math.max(
    0,
    baseG - lightHeightChange / 2 + Math.min(0, lightHeight),
  );
  const b = Math.max(
    0,
    baseB - lightHeightChange / light2 + Math.min(0, lightHeight),
  );
  return [Math.round(r), Math.round(g), Math.round(b), 178];
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
    Math.floor(scale * (((coordX - coordY) * cos30) / isoWidth) + 50),
    Math.floor(
      scale *
        (((coordX + coordY) * sin30) / isoLength - coordHeight * isoHeight) +
        50,
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
  const lightHeightChange = (90 - lightHeight) / (3 - (lightHeight + 90) / 90);
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
  const _prng = new SeedablePRNG(seed);

  // Fixed reference defaults
  const persistence = 0.5;
  const octaves = 5;
  const wavelength = 133;
  const amplitude = 1.0;
  const exponent = 3.3;
  const peaks = 0.25;
  const beachSize = 12;
  const lightPosition = 180;
  const lightHeight = 60;
  const light = 0;

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
  } catch {
    return {
      dataUrl: "",
      params: {
        seed,
        persistence,
        octaves,
        wavelength,
        amplitude,
        exponent,
        peaks,
        waterLevel: 132,
        beachSize,
        lightPosition,
        lightHeight,
        light,
      },
    };
  }
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      dataUrl: "",
      params: {
        seed,
        persistence,
        octaves,
        wavelength,
        amplitude,
        exponent,
        peaks,
        waterLevel: 132,
        beachSize,
        lightPosition,
        lightHeight,
        light,
      },
    };
  }

  // Background fill (transparent)
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Scale canvas for thumbnail
  if (size === "thumbnail") {
    ctx.scale(0.5, 0.5);
  }

  // Translate origin as specified
  ctx.translate(382, 50);

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

  // Calculate waterLevel from elevation distribution to guarantee >=20% land
  const allElevations: number[] = [];
  for (let y = 0; y <= gridHeight; y++) {
    for (let x = 0; x <= gridWidth; x++) {
      allElevations.push(elevationMap[y][x]);
    }
  }
  allElevations.sort((a, b) => a - b);
  const percentileIndex = Math.floor(allElevations.length * 0.2);
  const waterLevel = allElevations[percentileIndex];

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

  const perlinWaterLevel = 2 * (waterLevel / 255) - 1;

  // Render tiles — back to front (painter's algorithm)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const mapvalue0 = elevationMap[y][x];
      const mapvalue1 = elevationMap[y][x + 1];
      const mapvalue2 = elevationMap[y + 1][x];
      const mapvalue3 = elevationMap[y + 1][x + 1];

      // Convert to normalized perlin range for height in coordToPixel
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
        // Mixed cell: dynamic coastline implementation
        const slope1 = mapvalue1 - mapvalue0;
        const slope2 = mapvalue2 - mapvalue0;
        const slope3 = mapvalue3 - mapvalue1;
        const slope4 = mapvalue3 - mapvalue2;

        const b1 = mapvalue0 - slope1 * x;
        const b2 = mapvalue0 - slope2 * y;
        const b3 = mapvalue1 - slope3 * y;
        const b4 = mapvalue2 - slope4 * x;

        const x1 =
          slope1 !== 0 ? (waterLevel - b1) / slope1 : Number.NEGATIVE_INFINITY;
        const y1 =
          slope2 !== 0 ? (waterLevel - b2) / slope2 : Number.NEGATIVE_INFINITY;
        const y2 =
          slope3 !== 0 ? (waterLevel - b3) / slope3 : Number.NEGATIVE_INFINITY;
        const x2 =
          slope4 !== 0 ? (waterLevel - b4) / slope4 : Number.NEGATIVE_INFINITY;

        type Vertex = [number, number, number];
        const vertexList: Vertex[] = [];
        const tileList: Vertex[] = [];
        const tileList2: Vertex[] = [];

        // Corner 0: (x, y)
        if (mapvalue0 >= waterLevel) {
          tileList2.push([x, y, toPerlin(mapvalue0)]);
        } else {
          tileList.push([x, y, toPerlin(mapvalue0)]);
          vertexList.push([x, y, perlinWaterLevel]);
        }
        // Edge 0->1 (top edge)
        if (mapvalue0 >= waterLevel !== mapvalue1 >= waterLevel) {
          vertexList.push([x1, y, perlinWaterLevel]);
          tileList.push([x1, y, perlinWaterLevel]);
          tileList2.push([x1, y, perlinWaterLevel]);
        }
        // Corner 1: (x+1, y)
        if (mapvalue1 >= waterLevel) {
          tileList2.push([x + 1, y, toPerlin(mapvalue1)]);
        } else {
          tileList.push([x + 1, y, toPerlin(mapvalue1)]);
          vertexList.push([x + 1, y, perlinWaterLevel]);
        }
        // Edge 1->3 (right edge)
        if (mapvalue1 >= waterLevel !== mapvalue3 >= waterLevel) {
          vertexList.push([x + 1, y2, perlinWaterLevel]);
          tileList.push([x + 1, y2, perlinWaterLevel]);
          tileList2.push([x + 1, y2, perlinWaterLevel]);
        }
        // Corner 3: (x+1, y+1)
        if (mapvalue3 >= waterLevel) {
          tileList2.push([x + 1, y + 1, toPerlin(mapvalue3)]);
        } else {
          tileList.push([x + 1, y + 1, toPerlin(mapvalue3)]);
          vertexList.push([x + 1, y + 1, perlinWaterLevel]);
        }
        // Edge 3->2 (bottom edge)
        if (mapvalue3 >= waterLevel !== mapvalue2 >= waterLevel) {
          vertexList.push([x2, y + 1, perlinWaterLevel]);
          tileList.push([x2, y + 1, perlinWaterLevel]);
          tileList2.push([x2, y + 1, perlinWaterLevel]);
        }
        // Corner 2: (x, y+1)
        if (mapvalue2 >= waterLevel) {
          tileList2.push([x, y + 1, toPerlin(mapvalue2)]);
        } else {
          tileList.push([x, y + 1, toPerlin(mapvalue2)]);
          vertexList.push([x, y + 1, perlinWaterLevel]);
        }
        // Edge 2->0 (left edge)
        if (mapvalue2 >= waterLevel !== mapvalue0 >= waterLevel) {
          vertexList.push([x, y1, perlinWaterLevel]);
          tileList.push([x, y1, perlinWaterLevel]);
          tileList2.push([x, y1, perlinWaterLevel]);
        }

        function drawPolygon(
          verts: Vertex[],
          isWater: boolean,
          avgHeight: number,
        ): void {
          if (verts.length < 3) return;
          const pixels = verts.map(([cx, cy, ch]) => coordToPixel(cx, cy, ch));
          let color: [number, number, number, number];
          if (isWater) {
            color = waterColorLookup(
              waterLevel - avgHeight,
              waterLevel,
              lightHeight,
            );
          } else {
            color = terrainColorLookup(
              terrainAverageHeight,
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
          ctx!.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})`;
          ctx!.beginPath();
          ctx!.moveTo(pixels[0][0], pixels[0][1]);
          for (let i = 1; i < pixels.length; i++) {
            ctx!.lineTo(pixels[i][0], pixels[i][1]);
          }
          ctx!.closePath();
          ctx!.fill();
          if (!isWater) {
            ctx!.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},0.5)`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }

        // Draw above-water terrain
        drawPolygon(tileList2, false, terrainAverageHeight);
        // Draw below-water terrain
        drawPolygon(tileList, false, terrainAverageHeight);
        // Draw water surface
        drawPolygon(vertexList, true, terrainAverageHeight);

        // Water borders for mixed cells at grid edges
        if (
          y === gridHeight - 2 &&
          (mapvalue2 < waterLevel || mapvalue3 < waterLevel)
        ) {
          drawBorder(
            ctx,
            toPerlin(mapvalue2),
            toPerlin(mapvalue3),
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
        if (
          x === gridWidth - 2 &&
          (mapvalue1 < waterLevel || mapvalue3 < waterLevel)
        ) {
          drawBorder(
            ctx,
            toPerlin(mapvalue1),
            toPerlin(mapvalue3),
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

      // Side borders on last rows/cols
      if (y === gridHeight - 2) {
        if (mapvalue2 > 0 || mapvalue3 > 0) {
          drawBorder(
            ctx,
            toPerlin(mapvalue2),
            toPerlin(mapvalue3),
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
            toPerlin(mapvalue1),
            toPerlin(mapvalue3),
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

  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, params };
}
