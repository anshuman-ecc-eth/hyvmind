import * as THREE from './three.module.min.js';

// ─────────────────────────────────────────────────────────────
// Terrain generation — mirrors terrain-world.html's perlin flow
// (FNV-1a name -> PRNG -> 2D perlin -> elevation -> biomes)
// ─────────────────────────────────────────────────────────────
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function PRNG(seed) { this.seed = seed; }
PRNG.prototype.next = function () { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; };
function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function perlinNoise(w, h, persistence, octaves, wavelength, prng) {
  const gx = [], gy = [];
  for (let o = 0; o < octaves; o++) {
    const gw = w + 1, gh = h + 1, gxL = [], gyL = [];
    for (let y = 0; y < gh; y++) { const gxR = [], gyR = []; for (let x = 0; x < gw; x++) { const a = prng.next() * Math.PI * 2; gxR.push(Math.cos(a)); gyR.push(Math.sin(a)); } gxL.push(gxR); gyL.push(gyR); }
    gx.push(gxL); gy.push(gyL);
  }
  const res = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let n = 0, amp = 1, f = 1 / wavelength, maxA = 0;
      for (let o = 0; o < octaves; o++) {
        const px = x * f, py = y * f, ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy, wx = ease(fx), wy = ease(fy);
        const gw = w + 1, gh = h + 1, ix0 = ((ix % gw) + gw) % gw, ix1 = (((ix + 1) % gw) + gw) % gw, iy0 = ((iy % gh) + gh) % gh, iy1 = (((iy + 1) % gh) + gh) % gh;
        const d00 = gx[o][iy0][ix0] * fx + gy[o][iy0][ix0] * fy, d10 = gx[o][iy0][ix1] * (fx - 1) + gy[o][iy0][ix1] * fy, d01 = gx[o][iy1][ix0] * fx + gy[o][iy1][ix0] * (fy - 1), d11 = gx[o][iy1][ix1] * (fx - 1) + gy[o][iy1][ix1] * (fy - 1);
        n += ((d00 + wx * (d10 - d00)) + wy * ((d01 + wx * (d11 - d01)) - (d00 + wx * (d10 - d00)))) * amp;
        maxA += amp; amp *= persistence; f *= 2;
      }
      row.push(n / maxA);
    }
    res.push(row);
  }
  return res;
}

// ─────────────────────────────────────────────────────────────
// Block types & colours (vertex-coloured; no texture atlas)
// ─────────────────────────────────────────────────────────────
const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, ROCK: 5, SNOW: 6, WATER: 7, WOOD: 8, LEAVES: 9, COAL: 10, IRON: 11, PINE: 12, SPADE: 13, BRUSH: 14, GRAPHITE: 15, SHIELD: 16 };
const C = {
  [B.STONE]: [0.50, 0.52, 0.55], [B.DIRT]: [0.58, 0.44, 0.31],
  [B.GRASS]: [0.35, 0.66, 0.28],
  [B.SAND]: [0.85, 0.78, 0.60], [B.ROCK]: [0.56, 0.56, 0.59],
  [B.SNOW]: [0.92, 0.95, 0.98], [B.WATER]: [0.20, 0.42, 0.85],
  [B.WOOD]: [0.30, 0.16, 0.09], [B.LEAVES]: [0.28, 0.55, 0.22],
  [B.COAL]: [0.16, 0.16, 0.18], [B.IRON]: [0.72, 0.62, 0.50],
  [B.PINE]: [0.12, 0.35, 0.16],
  [B.SPADE]: [0.55, 0.45, 0.35], [B.BRUSH]: [0.13, 0.10, 0.24],
};
function h3(x, y, z) { let n = (x * 374761393 + y * 668265263 + z * 144667) >>> 0; n = ((n ^ (n >> 13)) * 1274126177) >>> 0; return n >>> 0; }
// Per-vertex shading tint multiplied over the texture (top-light + h3 variation)
function blockColor(t, x, y, z, dirY) {
  if (t === B.LEAVES || t === B.PINE) {
    const base = t === B.LEAVES ? [0.95, 1.1, 0.9] : [0.8, 1.0, 0.9];
    const side = dirY === 1 ? 1.12 : 0.8;
    const m = (h3(x, y, z) % 3) === 0 ? 0.85 : (h3(x, y, z) % 3) === 1 ? 1.0 : 1.1;
    return [base[0] * side * m, base[1] * side * m, base[2] * side * m];
  }
  if (t === B.WOOD) {
    const m = 0.9 + (h3(x, y, z) % 5) * 0.04;
    const base = (H && H[z] && y <= H[z][x] + 2) ? 0.8 : 1;
    return [0.95 * m * base, 0.9 * m * base, 0.95 * m * base];
  }
  if (t === B.STONE) {
    const m = (h3(x, y, z) % 3) === 0 ? 0.88 : (h3(x, y, z) % 3) === 1 ? 1.0 : 1.1;
    return [m, m, m];
  }
  if (t === B.DIRT) {
    const m = (h3(x, y, z) % 3) === 0 ? 0.9 : (h3(x, y, z) % 3) === 1 ? 1.0 : 1.1;
    return [m, m, m];
  }
  if (t === B.GRASS || t === B.ROCK || t === B.COAL || t === B.IRON || t === B.SAND || t === B.SNOW) {
    const m = (h3(x, y, z) % 4) === 0 ? 0.94 : 1.0;
    return [m, m, m];
  }
  return [1, 1, 1];
}
// Atlas tile name per block type + face (FACES index: 2 = bottom, 3 = top)
function texSlot(t, f) {
  switch (t) {
    case B.STONE: return 'stone';
    case B.DIRT: return 'dirt';
    case B.GRASS: return f === 3 ? 'grass_top' : (f === 2 ? 'dirt' : 'grass_side');
    case B.SAND: return 'sand';
    case B.ROCK: return 'cobblestone';
    case B.SNOW: return 'snow';
    case B.WATER: return 'water';
    case B.WOOD: return (f === 2 || f === 3) ? 'log_top' : 'log_side';
    case B.LEAVES: return 'leaves';
    case B.COAL: return 'coal';
    case B.IRON: return 'iron';
    case B.PINE: return 'pine';
    case B.SPADE: return 'spade';
    case B.BRUSH: return 'brush';
  }
  return 'stone';
}
// Normalised [0..1] UV for a face corner (faces keep the two non-fixed axes)
function cornerUV(f, k) {
  if (f === 0 || f === 1) return [k[1], k[2]];
  if (f === 2 || f === 3) return [k[0], k[2]];
  return [k[0], k[1]];
}

const FACES = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]] },
  { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]] },
  { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
];

// ─────────────────────────────────────────────────────────────
// Textures — block tiles from vyse12138/minecraft-threejs (MIT),
// packed into a runtime canvas atlas (NearestFilter)
// ─────────────────────────────────────────────────────────────
const TEX_NAMES = ['stone', 'dirt', 'sand', 'snow', 'grass_top', 'grass_side', 'log_side', 'log_top', 'leaves', 'pine', 'coal', 'iron', 'cobblestone', 'water', 'spade', 'brush'];
const TILE = 16, ATLAS_COLS = 4, ATLAS_ROWS = Math.ceil(TEX_NAMES.length / ATLAS_COLS);
let atlasTexture = null, atlasCanvas = null;
const atlasTex = {}, atlasPos = {};

function loadTextures(cb) {
  const loader = new THREE.TextureLoader();
  let pending = TEX_NAMES.length;
  const imgs = {};
  TEX_NAMES.forEach((n) => {
    loader.load('./textures/' + n + '.png', (tex) => {
      imgs[n] = tex.image;
      if (--pending === 0) cb(imgs);
    }, undefined, () => { if (--pending === 0) cb(imgs); });
  });
}
// Per-pixel tile recolour applied when packing the atlas. The source leaf/pine
// tiles are neutral grayscale, so hue is baked in here; logs get a darker, cooler
// bark tone so trunks stop blending into the warm dirt.
const TILE_RECOLOR = {
  leaves: (r) => [0.42 * r, 1.0 * r, 0.3 * r],
  pine: (r) => [0.32 * r, 0.8 * r, 0.28 * r],
  log_side: (r, g, b) => [0.62 * r, 0.54 * g, 0.5 * b],
  log_top: (r, g, b) => [0.68 * r, 0.6 * g, 0.55 * b],
};
function colorizeTile(n, img) {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, TILE, TILE);
  const fn = TILE_RECOLOR[n];
  if (!fn) return c;
  const d = g.getImageData(0, 0, TILE, TILE);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    // Transparent holes get filled with a darker leaf green so the canopy is
    // fully opaque (no sky showing through) while keeping the speckle texture.
    const col = px[i + 3] < 128 ? fn(85, 85, 85) : fn(px[i], px[i + 1], px[i + 2]);
    px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2];
    px[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}
function buildAtlas(imgs) {
  atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS_COLS * TILE;
  atlasCanvas.height = ATLAS_ROWS * TILE;
  const ctx = atlasCanvas.getContext('2d');
  TEX_NAMES.forEach((n, i) => {
    const col = i % ATLAS_COLS, row = (i / ATLAS_COLS) | 0;
    if (imgs[n]) ctx.drawImage(colorizeTile(n, imgs[n]), col * TILE, row * TILE);
    atlasPos[n] = [col, row];
    atlasTex[n] = [col / ATLAS_COLS, 1 - (row + 1) / ATLAS_ROWS, (col + 1) / ATLAS_COLS, 1 - row / ATLAS_ROWS];
  });
  const tex = new THREE.CanvasTexture(atlasCanvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  atlasTexture = tex;
}
// Unit cube geometry textured for a block type (held block, crumbs)
function makeBlockBoxGeometry(t) {
  const pos = [], nrm = [], uv = [];
  for (let f = 0; f < 6; f++) {
    const face = FACES[f];
    const r = atlasTex[texSlot(t, f)] || [0, 0, 1, 1];
    const tri = [[face.corners[0], face.corners[1], face.corners[2]], [face.corners[0], face.corners[2], face.corners[3]]];
    for (let ti = 0; ti < 2; ti++) for (let c = 0; c < 3; c++) {
      const k = tri[ti][c];
      pos.push(k[0], k[1], k[2]);
      nrm.push(face.dir[0], face.dir[1], face.dir[2]);
      const cu = cornerUV(f, k);
      uv.push(r[0] + cu[0] * (r[2] - r[0]), r[1] + cu[1] * (r[3] - r[1]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// ─────────────────────────────────────────────────────────────
// World build
// ─────────────────────────────────────────────────────────────
const GRID = 100;
const CH = 16;
let maxY = 0;
let worldMaxH = 0;
let waterLevel = 0;
let voxels = null;
let worldSeedHash = 0;
let H = null;

function bidx(x, y, z) { return (y * GRID + z) * GRID + x; }
function getBlock(x, y, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID || y < 0 || y >= maxY) return B.AIR;
  return voxels[bidx(x, y, z)];
}
function setBlock(x, y, z, v) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID || y < 0 || y >= maxY) return;
  voxels[bidx(x, y, z)] = v;
}
function h2(x, z, s) { let n = (x * 374761393 + z * 668265263 + s * 144667) >>> 0; n = ((n ^ (n >> 13)) * 1274126177) >>> 0; return n >>> 0; }
function biomeOf(h) {
  if (h < waterLevel) return 'water';
  if (h < waterLevel + 12) return 'sand';
  if (h < 100) return 'grass';
  if (h < 160) return 'forest';
  if (h < 190) return 'dirt';
  return 'rock';
}
function placeTree(x, topY, z) {
  const seed = worldSeedHash;
  if (((h2(x, z, seed) >> 7) % 2) === 1) placePine(x, topY, z, seed);
  else placeBroadleaf(x, topY, z, seed);
}
function placeBroadleaf(x, topY, z, seed) {
  const th = 4 + ((h2(x, z, seed) >> 8) % 3);
  for (let i = 1; i <= th; i++) setBlock(x, topY + i, z, B.WOOD);
  const layers = [
    { dy: th - 2, size: 5, trim: true },
    { dy: th - 1, size: 5, trim: true },
    { dy: th, size: 3, trim: false },
    { dy: th + 1, size: 1, trim: false },
  ];
  for (const L of layers) {
    const r = (L.size - 1) >> 1;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (dx === 0 && dz === 0 && L.dy <= th) continue;
      if (L.trim && Math.abs(dx) === r && Math.abs(dz) === r) continue;
      setBlock(x + dx, topY + L.dy, z + dz, B.LEAVES);
    }
  }
}
function placePine(x, topY, z, seed) {
  const th = 5 + ((h2(x, z, seed + 1) >> 8) % 3);
  for (let i = 1; i <= th; i++) setBlock(x, topY + i, z, B.WOOD);
  const layers = [
    { dy: th - 2, size: 3 },
    { dy: th - 1, size: 3 },
    { dy: th, size: 3 },
    { dy: th + 1, size: 1 },
  ];
  for (const L of layers) {
    const r = (L.size - 1) >> 1;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (dx === 0 && dz === 0 && L.dy <= th) continue;
      setBlock(x + dx, topY + L.dy, z + dz, B.PINE);
    }
  }
}

function buildWorld(seedName) {
  worldSeedHash = fnv1a(seedName);
  const prng = new PRNG((worldSeedHash ^ 0xdeadbeef) >>> 0);
  const rawMap = perlinNoise(GRID + 1, GRID + 1, 0.5, 3, 133, prng);
  const cornerElev = [];
  for (let y = 0; y <= GRID; y++) {
    const row = [];
    for (let x = 0; x <= GRID; x++) {
      const raw = (rawMap[y] && rawMap[y][x] != null) ? rawMap[y][x] : 0;
      const norm = (raw + 1) / 2 + 0.25;
      row.push(Math.max(0, Math.min(255, Math.pow(Math.max(0, norm), 2.2) * 255)));
    }
    cornerElev.push(row);
  }
  const allE = [];
  for (let y = 0; y <= GRID; y++) for (let x = 0; x <= GRID; x++) allE.push(cornerElev[y][x]);
  allE.sort((a, b) => a - b);
  waterLevel = allE[Math.floor(allE.length * 0.2)];

  H = [];
  let maxH = 0;
  for (let z = 0; z < GRID; z++) {
    H[z] = [];
    for (let x = 0; x < GRID; x++) {
      const h = Math.round((cornerElev[z][x] + cornerElev[z][x + 1] + cornerElev[z + 1][x] + cornerElev[z + 1][x + 1]) / 4);
      H[z][x] = h; if (h > maxH) maxH = h;
    }
  }
  maxY = Math.min(192, maxH + 10);
  worldMaxH = maxH;
  voxels = new Uint8Array(GRID * GRID * maxY);

  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const h = Math.min(H[z][x], maxY - 1);
      const bio = biomeOf(H[z][x]);
      let surface = B.GRASS;
      if (bio === 'water' || bio === 'sand') surface = B.SAND;
      else if (bio === 'rock') surface = B.ROCK;
      for (let y = 0; y <= h; y++) {
        if (y === h) setBlock(x, y, z, surface);
        else if (y > h - 4) setBlock(x, y, z, B.DIRT);
        else setBlock(x, y, z, B.STONE);
        if (y < h - 4 && (h2(x, y, z) % 61) === 0) setBlock(x, y, z, (h2(x, y, z + 7) % 2) ? B.IRON : B.COAL);
      }
      if (h < waterLevel) for (let y = h + 1; y <= waterLevel; y++) setBlock(x, y, z, B.WATER);
      const r = (h2(x, z, worldSeedHash) >>> 0) / 4294967296;
      const rate = bio === 'forest' ? 0.01 : 0;
      if (rate && r < rate) placeTree(x, h, z);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Chunk meshing
// ─────────────────────────────────────────────────────────────
function geometryFrom(positions, colors, normals, uvs) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}
function buildChunkGeometry(cx, cz) {
  const pos = [], col = [], nrm = [], uv = [];
  const wPos = [], wCol = [], wNrm = [], wUv = [];
  const lPos = [], lCol = [], lNrm = [], lUv = [];
  const ox = cx * CH, oz = cz * CH;
  for (let y = 0; y < maxY; y++) {
    for (let z = oz; z < oz + CH; z++) {
      for (let x = ox; x < ox + CH; x++) {
        const t = getBlock(x, y, z);
        if (t === B.AIR) continue;
        const foliage = t === B.LEAVES || t === B.PINE;
        const water = t === B.WATER;
        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nb = getBlock(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
          const draw = water ? (nb === B.AIR) : (nb === B.AIR || nb === B.WATER);
          if (!draw) continue;
          const P = foliage ? lPos : water ? wPos : pos;
          const C2 = foliage ? lCol : water ? wCol : col;
          const N = foliage ? lNrm : water ? wNrm : nrm;
          const U = foliage ? lUv : water ? wUv : uv;
          const cc = blockColor(t, x, y, z, face.dir[1]);
          const r = atlasTex[texSlot(t, f)] || [0, 0, 1, 1];
          const tri = [[face.corners[0], face.corners[1], face.corners[2]], [face.corners[0], face.corners[2], face.corners[3]]];
          for (let ti = 0; ti < 2; ti++) {
            for (let c = 0; c < 3; c++) {
              const k = tri[ti][c];
              P.push(x - ox + k[0], y + k[1], z - oz + k[2]);
              N.push(face.dir[0], face.dir[1], face.dir[2]);
              C2.push(cc[0], cc[1], cc[2]);
              const cu = cornerUV(f, k);
              U.push(r[0] + cu[0] * (r[2] - r[0]), r[1] + cu[1] * (r[3] - r[1]));
            }
          }
        }
      }
    }
  }
  return {
    opaque: pos.length ? geometryFrom(pos, col, nrm, uv) : null,
    water: wPos.length ? geometryFrom(wPos, wCol, wNrm, wUv) : null,
    foliage: lPos.length ? geometryFrom(lPos, lCol, lNrm, lUv) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// Scene, camera, renderer
// ─────────────────────────────────────────────────────────────
const container = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88bbff);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667766, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(50, 120, 40);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.2);
fill.position.set(-40, -20, 30);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(100, 1, 0.1, 2000);
camera.rotation.order = 'YXZ';
scene.add(camera);

// ─────────────────────────────────────────────────────────────
// Controls (pointer lock)
// ─────────────────────────────────────────────────────────────
let yaw = 0, pitch = -0.3;
const keys = {};
let pointerLocked = false;
let hasStarted = false;
function clearHolding() {
  if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
  holdingButton = -1;
}
// ── Menu / pause UI (vyse-style) ──
const menuEl = document.getElementById('menu');
const settingsEl = document.getElementById('settings');
const featuresEl = document.getElementById('features');
const playBtn = document.getElementById('play');
const settingBtn = document.getElementById('setting');
const featureBtn = document.getElementById('feature');
const guideBtn = document.getElementById('guide-btn');
const guideEl = document.getElementById('guide');
const guideBackBtn = document.getElementById('guide-back');
const exitBtn = document.getElementById('exit');
const settingBack = document.getElementById('setting-back');
const settingsBack = document.getElementById('settings-back');
const guideBack = document.getElementById('back');
const fovLabel = document.getElementById('fov');
const fovInput = document.getElementById('fov-input');
const distanceLabel = document.getElementById('distance');
const distanceInput = document.getElementById('distance-input');
const musicInput = document.getElementById('music-input');
const soundInput = document.getElementById('sound-input');

let paused = true;
let lockChangeAt = 0;
function setPaused(p) {
  paused = p;
  if (menuEl) menuEl.classList.toggle('hidden', !p);
  const crosshairEl = document.getElementById('crosshair');
  const hotbarEl = document.getElementById('hotbar');
  if (crosshairEl) crosshairEl.style.display = p ? 'none' : 'block';
  if (hotbarEl) hotbarEl.style.display = p ? 'none' : 'flex';
  if (p) {
    if (settingsEl) settingsEl.classList.add('hidden');
    if (featuresEl) featuresEl.classList.add('hidden');
    if (guideEl) guideEl.classList.add('hidden');
    for (const k in keys) keys[k] = false;
  }
}

function closeToParent() {
  stopBirdsong();
  // Flush pending edits (parent shows "Saving changes..", persists, then exits).
  flushVoxelEdits(true);
}

function applySettings() {
  if (fovInput instanceof HTMLInputElement) {
    camera.fov = parseInt(fovInput.value);
    camera.updateProjectionMatrix();
  }
  if (distanceInput instanceof HTMLInputElement) {
    const v = parseInt(distanceInput.value);
    scene.fog = v === 0 ? null : new THREE.Fog(0x88bbff, v * 20, v * 60);
  }
  if (settingsEl) settingsEl.classList.add('hidden');
}

function requestLock() {
  if (!document.pointerLockElement) {
    window.focus();
    const p = renderer.domElement.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(function(){});
  }
}
document.addEventListener('pointerlockchange', () => {
  lockChangeAt = performance.now();
  pointerLocked = document.pointerLockElement === renderer.domElement;
  if (pointerLocked) { hasStarted = true; clearHolding(); startBirdsong(); }
  else { clearHolding(); }
  if (!graffitiOpen && !nodeDetailsOpen && !graphiteOpen && !shieldOpen) setPaused(!pointerLocked);
});
renderer.domElement.addEventListener('click', () => { if (graffitiOpen || nodeDetailsOpen || graphiteOpen || shieldOpen) return; requestLock(); });

playBtn && playBtn.addEventListener('click', requestLock);
settingBtn && settingBtn.addEventListener('click', () => { if (settingsEl) settingsEl.classList.remove('hidden'); });
featureBtn && featureBtn.addEventListener('click', () => { if (featuresEl) featuresEl.classList.remove('hidden'); });
guideBtn && guideBtn.addEventListener('click', () => { if (guideEl) guideEl.classList.remove('hidden'); });
guideBackBtn && guideBackBtn.addEventListener('click', () => { if (guideEl) guideEl.classList.add('hidden'); });
guideBack && guideBack.addEventListener('click', () => { if (featuresEl) featuresEl.classList.add('hidden'); });
exitBtn && exitBtn.addEventListener('click', closeToParent);
settingBack && settingBack.addEventListener('click', applySettings);
settingsBack && settingsBack.addEventListener('click', () => { if (settingsEl) settingsEl.classList.add('hidden'); });

fovInput && fovInput.addEventListener('input', () => {
  camera.fov = parseInt(fovInput.value);
  camera.updateProjectionMatrix();
  if (fovLabel) fovLabel.textContent = 'Field of View: ' + fovInput.value;
});
distanceInput && distanceInput.addEventListener('input', () => {
  if (distanceLabel) distanceLabel.textContent = 'Render Distance: ' + distanceInput.value;
});
// ── Birdsongs (ambient BGM) & block break/place SFX ──
let birdsongEnabled = true;
let sfxEnabled = true;
const bgmEl = document.getElementById('bgm');

function startBirdsong() {
  if (!bgmEl || !birdsongEnabled || (!bgmEl.paused && !bgmEl.ended)) return;
  bgmEl.volume = 0.5;
  bgmEl.play().catch(() => {
    const onInteraction = () => {
      bgmEl.play().catch(() => {});
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    };
    document.addEventListener('click', onInteraction);
    document.addEventListener('keydown', onInteraction);
  });
}
function stopBirdsong() {
  if (bgmEl) { bgmEl.pause(); bgmEl.currentTime = 0; }
}

musicInput && musicInput.addEventListener('change', () => {
  const on = musicInput.value === '1';
  birdsongEnabled = on;
  if (on) startBirdsong(); else stopBirdsong();
});
soundInput && soundInput.addEventListener('change', () => {
  const on = soundInput.value === '1';
  sfxEnabled = on;
});

// Block break/place sounds borrowed from vyse12138/minecraft-threejs (MIT).
const SFX_DIR = './sfx/';
const SFX_GROUPS = {
  grass: ['grass1', 'grass2', 'grass3', 'grass4'],
  sand: ['sand1', 'sand2', 'sand3', 'sand4'],
  tree: ['tree1', 'tree2', 'tree3', 'tree4'],
  leaf: ['leaf1', 'leaf2', 'leaf3', 'leaf4'],
  dirt: ['dirt1', 'dirt2', 'dirt3', 'dirt4'],
  stone: ['stone1', 'stone2', 'stone3', 'stone4'],
};
const sfxPool = {};
const sfxIdx = {};
Object.keys(SFX_GROUPS).forEach((g) => {
  sfxPool[g] = SFX_GROUPS[g].map((name) => {
    const a = new Audio(SFX_DIR + name + '.mp3');
    a.volume = 0.15;
    a.preload = 'auto';
    return a;
  });
  sfxIdx[g] = 0;
});
function sfxGroupFor(t) {
  if (t === B.GRASS) return 'grass';
  if (t === B.SAND) return 'sand';
  if (t === B.WOOD) return 'tree';
  if (t === B.LEAVES || t === B.PINE) return 'leaf';
  if (t === B.DIRT) return 'dirt';
  return 'stone';
}
function playSfx(t) {
  if (!sfxEnabled) return;
  const g = sfxGroupFor(t);
  const pool = sfxPool[g];
  if (!pool) return;
  const a = pool[sfxIdx[g] % pool.length];
  sfxIdx[g]++;
  a.currentTime = 0;
  a.play().catch(() => {});
}

// Jump sound (Yo Frankie! — Blender Foundation, CC-BY 3.0).
const jumpAudio = new Audio(SFX_DIR + 'jump1.mp3');
jumpAudio.volume = 0.15;
jumpAudio.preload = 'auto';
function playJump() {
  if (!sfxEnabled) return;
  jumpAudio.currentTime = 0;
  jumpAudio.play().catch(() => {});
}

// ── Graffiti (brush) ──
const LETTERS_PER_BLOCK = 4;
const graffitiEl = document.getElementById('graffiti');
const graffitiInput = document.getElementById('graffiti-input');
const graffitiLabel = document.getElementById('graffiti-label');
const graffitiOk = document.getElementById('graffiti-ok');
const graffitiCancel = document.getElementById('graffiti-cancel');
let graffitiOpen = false;
let pendingGraffiti = null;
let graffitiCap = LETTERS_PER_BLOCK;
const graffitiList = [];
const selection = [];
const selectionKey = new Set();
const selectionMeshes = [];

// ── Graphite: graffiti ↔ graph-node weights ──
const weightSep = '\u0001'; // must match backend VOXEL_WEIGHT_SEP
const graphiteWeights = new Map(); // key graffitiId+sep+nodeId -> weight
function weightKey(graffitiId, nodeId) { return graffitiId + weightSep + nodeId; }
function getWeight(graffitiId, nodeId) { return graphiteWeights.get(weightKey(graffitiId, nodeId)) || 0; }

// Per-graffiti weight totals, cached so the per-frame highlight/hover paths
// never rescan the whole weights map. Rebuilt lazily on any weight mutation.
let weightTotals = new Map(); // graffitiId -> total weight
let weightTotalsDirty = true;
function rebuildWeightTotals() {
  weightTotals = new Map();
  graphiteWeights.forEach((weight, key) => {
    const sepIdx = key.indexOf(weightSep);
    if (sepIdx < 0) return;
    const gid = key.slice(0, sepIdx);
    weightTotals.set(gid, (weightTotals.get(gid) || 0) + weight);
  });
  weightTotalsDirty = false;
}
function graffitiTotalWeight(g) {
  if (weightTotalsDirty) rebuildWeightTotals();
  return weightTotals.get(g.id) || 0;
}

function clearSelection() {
  selection.length = 0;
  selectionKey.clear();
  for (const m of selectionMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  selectionMeshes.length = 0;
}
function refreshSelectionVisual() {
  for (const m of selectionMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  selectionMeshes.length = 0;
  if (!selection.length) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.35, depthWrite: false });
  for (const s of selection) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.005, 1.005, 1.005), mat);
    mesh.position.set(s.x + 0.5, s.y + 0.5, s.z + 0.5);
    scene.add(mesh);
    selectionMeshes.push(mesh);
  }
}
function toggleSelection(hit) {
  const key = hit.x + ',' + hit.y + ',' + hit.z;
  const i = selection.findIndex((s) => s.x === hit.x && s.y === hit.y && s.z === hit.z);
  if (i >= 0) {
    selectionKey.delete(key);
    selection.splice(i, 1);
  } else {
    selectionKey.add(key);
    selection.push({ x: hit.x, y: hit.y, z: hit.z, face: hit.face });
  }
  refreshSelectionVisual();
}

// ── Graffiti armor: a weighted text shields all of its blocks ──
// A spade hit on any block covered by a graffiti with totalWeight > 0 strips
// one weight instead of breaking the block (mirrors graphite's subtract).
// Overlapping unweighted texts riding on the same block are shielded too.
function armoredGraffitiAt(x, y, z) {
  let best = null;
  for (const g of graffitiList) {
    if (graffitiTotalWeight(g) <= 0) continue;
    if (!g.blocks.some((b) => b.x === x && b.y === y && b.z === z)) continue;
    if (!best || graffitiTotalWeight(g) > graffitiTotalWeight(best)) best = g;
  }
  return best;
}
function highestWeightNode(g) {
  let bestNode = null;
  for (const [key, weight] of graphiteWeights) {
    if (!key.startsWith(g.id + weightSep)) continue;
    const nid = key.slice(g.id.length + weightSep.length);
    if (!bestNode || weight > graphiteWeights.get(weightKey(g.id, bestNode))) bestNode = nid;
  }
  return bestNode;
}
function stripOneWeight(g) {
  if (worldScore <= 0) { refuseToolUse(); return; }
  const nodeId = highestWeightNode(g);
  if (!nodeId) return;
  const key = weightKey(g.id, nodeId);
  const cur = graphiteWeights.get(key) || 0;
  const next = cur - 1;
  if (next <= 0) graphiteWeights.delete(key); else graphiteWeights.set(key, next);
  weightTotalsDirty = true;
  recordWeightChange(g.id, nodeId, -1);
  deductToolUse();
  refreshGraphiteBeams();
  showToolTip('Remaining Weight: ' + graffitiTotalWeight(g));
}

function removeGraffitiOn(x, y, z) {
  for (let i = graffitiList.length - 1; i >= 0; i--) {
    const g = graffitiList[i];
    if (g.blocks.some((b) => b.x === x && b.y === y && b.z === z)) {
      recordGraffitiRemove(g.id);
      // Drop the weight links attached to this graffiti (negative deltas zero them server-side).
      for (const [key, weight] of [...graphiteWeights]) {
        if (key.startsWith(g.id + weightSep)) {
          graphiteWeights.delete(key);
          const nid = key.slice(g.id.length + weightSep.length);
          recordWeightChange(g.id, nid, -weight);
        }
      }
      weightTotalsDirty = true;
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.map.dispose();
      g.mesh.material.dispose();
      graffitiList.splice(i, 1);
    }
  }
  refreshGraphiteBeams();
}

// ── Shield tool: a protective box over a set of blocks ──
// A shield has HP = points invested / 5 (e.g. 50 pts → 10 hits). While HP > 0:
//  • spade LMB inside hits the shield (attacker pays 5 pts), not the block;
//  • build, new graffiti and weight-subtract are blocked;
//  • graphite weight-ADD is allowed.
// Once HP reaches 0 the shield is gone and the zone is fully modifiable again.
const SHIELD_PRESETS = [10, 25, 50, 100];
const shields = new Map();      // shieldId -> { id, x0,y0,z0, x1,y1,z1, hp }
const shieldFields = new Map(); // shieldId -> THREE.Mesh
const shieldCorners = [];       // up to 2 corner blocks {x,y,z}
const shieldCornerMeshes = [];
const SHIELD_FIELD_COLOR = 0xff8800;

function shieldId() { return 'sh' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function shieldAt(x, y, z) {
  let best = null;
  for (const s of shields.values()) {
    if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1 || z < s.z0 || z > s.z1) continue;
    if (!best || s.hp > best.hp) best = s;
  }
  return best;
}
// Ray vs. shield-box AABB (slab method). The box spans [x0, x1+1] world units,
// matching how shieldBox renders. Returns the nearest { sh, t, x, y, z } with
// t <= maxDist, or null. Works even when the origin is inside the box.
function shieldRayHit(origin, dir, maxDist) {
  let best = null;
  for (const s of shields.values()) {
    const bx0 = s.x0, by0 = s.y0, bz0 = s.z0;
    const bx1 = s.x1 + 1, by1 = s.y1 + 1, bz1 = s.z1 + 1;
    let tmin = 0, tmax = maxDist;
    let t0, t1;
    // X slab
    if (Math.abs(dir.x) < 1e-9) {
      if (origin.x < bx0 || origin.x > bx1) continue;
    } else {
      t0 = (bx0 - origin.x) / dir.x; t1 = (bx1 - origin.x) / dir.x;
      if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
      if (t0 > tmin) tmin = t0;
      if (t1 < tmax) tmax = t1;
      if (tmin > tmax) continue;
    }
    // Y slab
    if (Math.abs(dir.y) < 1e-9) {
      if (origin.y < by0 || origin.y > by1) continue;
    } else {
      t0 = (by0 - origin.y) / dir.y; t1 = (by1 - origin.y) / dir.y;
      if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
      if (t0 > tmin) tmin = t0;
      if (t1 < tmax) tmax = t1;
      if (tmin > tmax) continue;
    }
    // Z slab
    if (Math.abs(dir.z) < 1e-9) {
      if (origin.z < bz0 || origin.z > bz1) continue;
    } else {
      t0 = (bz0 - origin.z) / dir.z; t1 = (bz1 - origin.z) / dir.z;
      if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
      if (t0 > tmin) tmin = t0;
      if (t1 < tmax) tmax = t1;
      if (tmin > tmax) continue;
    }
    const hitPoint = {
      x: origin.x + dir.x * tmin,
      y: origin.y + dir.y * tmin,
      z: origin.z + dir.z * tmin,
    };
    if (!best || tmin < best.t) best = { sh: s, t: tmin, ...hitPoint };
  }
  return best;
}
const shieldTintEl = document.getElementById('shield-tint');
function updateShieldTint() {
  if (!shieldTintEl) return;
  // Check the eye position (camera) inside the shield volume.
  const ex = px, ey = py + EYE, ez = pz;
  const inside = shieldAt(Math.floor(ex), Math.floor(ey), Math.floor(ez)) != null;
  shieldTintEl.classList.toggle('show', inside);
}
function shieldBox(s) {
  const PAD = 0.15;
  const mat = new THREE.MeshBasicMaterial({ color: SHIELD_FIELD_COLOR, transparent: true, opacity: 0.25, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 + 1 + PAD * 2, s.y1 - s.y0 + 1 + PAD * 2, s.z1 - s.z0 + 1 + PAD * 2), mat);
  mesh.position.set((s.x0 + s.x1 + 1) / 2, (s.y0 + s.y1 + 1) / 2, (s.z0 + s.z1 + 1) / 2);
  mesh.userData.ignored = true; // never raycast
  scene.add(mesh);
  shieldFields.set(s.id, mesh);
}
function disposeShieldField(id) {
  const m = shieldFields.get(id);
  if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); shieldFields.delete(id); }
}

function clearShieldCorners() {
  shieldCorners.length = 0;
  for (const m of shieldCornerMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  shieldCornerMeshes.length = 0;
}
function refreshShieldCorners() {
  for (const m of shieldCornerMeshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  shieldCornerMeshes.length = 0;
  if (!shieldCorners.length) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.5, depthWrite: false });
  for (const c of shieldCorners) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), mat);
    mesh.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5);
    scene.add(mesh);
    shieldCornerMeshes.push(mesh);
  }
}
function toggleShieldCorner(hit) {
  const i = shieldCorners.findIndex((c) => c.x === hit.x && c.y === hit.y && c.z === hit.z);
  if (i >= 0) shieldCorners.splice(i, 1);
  else if (shieldCorners.length >= 4) { shieldCorners.shift(); shieldCorners.push({ x: hit.x, y: hit.y, z: hit.z }); }
  else shieldCorners.push({ x: hit.x, y: hit.y, z: hit.z });
  refreshShieldCorners();
}
// Spend an arbitrary number of points (posts the delta to the parent).
function spendPoints(amount) {
  if (amount <= 0) return;
  const spent = Math.min(amount, worldScore);
  worldScore -= spent;
  updateScoreDisplay();
  window.parent.postMessage({ type: 'hyvmind-voxel-score-delta', delta: -spent }, '*');
}
function applyShield(strength) {
  const amount = Math.max(1, Math.floor(strength)) * 5;
  if (worldScore < amount) { refuseToolUse(); return; }
  if (!shieldCorners.length) return;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const c of shieldCorners) {
    x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x);
    y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y);
    z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z);
  }
  // The corners are the TOP of the shield; extend it down to the terrain surface
  // beneath the box so the whole ground area underneath is covered.
  const cornerTop = y1;
  if (H) {
    let ground = Infinity;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
      ground = Math.min(ground, H[z][x]);
    }
    if (ground !== Infinity) y0 = ground;
  }
  y1 = cornerTop;
  const id = shieldId();
  const hp = Math.max(1, Math.floor(strength));
  const s = { id, x0, y0, z0, x1, y1, z1, hp };
  shields.set(id, s);
  shieldBox(s);
  pendingVoxelEdits.shieldAdds.push({ id, x0, y0, z0, x1, y1, z1, hp });
  clearShieldCorners();
  spendPoints(amount);
  showToolTip('SHIELD ' + hp + ' STRENGTH — ' + amount + ' PTS');
}
function shieldHit(s) {
  if (worldScore <= 0) { refuseToolUse(); return; }
  s.hp--;
  deductToolUse();
  if (s.hp <= 0) {
    pendingVoxelEdits.shieldRemoves.push(s.id);
    disposeShieldField(s.id);
    shields.delete(s.id);
    showToolTip('SHIELD DESTROYED');
  } else {
    showToolTip('SHIELD STRENGTH LEFT: ' + s.hp);
  }
}

// ── Shield cost modal ──
let shieldOpen = false;
const shieldModalEl = document.getElementById('shield-modal');
function openShieldModal() {
  if (!shieldCorners.length) return;
  shieldOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  if (shieldModalEl) shieldModalEl.classList.remove('hidden');
  if (shieldStrengthInput) { shieldStrengthInput.focus(); shieldStrengthInput.select(); }
}
function closeShieldModal() {
  shieldOpen = false;
  if (shieldModalEl) shieldModalEl.classList.add('hidden');
  requestLock();
}

async function addGraffiti(text, blocks, id) {
  if (!blocks.length || !text) return null;
  const gid = id || 'g' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const n = blocks[0].face || [0, 0, 1];
  const nVec = new THREE.Vector3(n[0], n[1], n[2]);
  const upVec = Math.abs(n[1]) === 1 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const uAxis = new THREE.Vector3().crossVectors(upVec, nVec);
  if (uAxis.lengthSq() < 1e-6) uAxis.set(1, 0, 0);
  uAxis.normalize();
  const vAxis = new THREE.Vector3().crossVectors(nVec, uAxis).normalize();
  const project = (b, ax) => (b.x + 0.5) * ax.x + (b.y + 0.5) * ax.y + (b.z + 0.5) * ax.z;
  let loU = Infinity, hiU = -Infinity, loV = Infinity, hiV = -Infinity;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of blocks) {
    const pu = project(b, uAxis), pv = project(b, vAxis);
    loU = Math.min(loU, pu); hiU = Math.max(hiU, pu);
    loV = Math.min(loV, pv); hiV = Math.max(hiV, pv);
    minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x);
    minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y);
    minZ = Math.min(minZ, b.z); maxZ = Math.max(maxZ, b.z);
  }
  const w = Math.max(0.9, hiU - loU);
  const h = Math.max(0.6, hiV - loV);
  const cx = (minX + maxX) / 2 + 0.5, cy = (minY + maxY) / 2 + 0.5, cz = (minZ + maxZ) / 2 + 0.5;

  const W = 1024;
  const H = Math.max(96, Math.round(W * (h + 0.15) / (w + 0.15)));
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const font = (s) => s + 'px "Finger Paint", cursive';
  let size = Math.round(H * 0.78);
  if (document.fonts && document.fonts.load) await document.fonts.load(font(size));
  ctx.font = font(size);
  while (ctx.measureText(text).width > W * 0.94 && size > 6) { size -= 2; ctx.font = font(size); }
  ctx.lineWidth = Math.max(4, size * 0.22);
  ctx.strokeStyle = 'rgba(10,10,15,0.9)';
  ctx.strokeText(text, W / 2, H / 2);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const geo = new THREE.PlaneGeometry(w + 0.15, h + 0.15);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx + nVec.x * 0.52, cy + nVec.y * 0.52, cz + nVec.z * 0.52);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(uAxis, vAxis, nVec));
  scene.add(mesh);
  graffitiList.push({ id: gid, mesh, blocks, text });
  if (graffitiList.length > 64) {
    const old = graffitiList.shift();
    scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.map.dispose(); old.mesh.material.dispose();
  }
  return gid;
}

function openGraffiti(hit) {
  if (worldScore <= 0) { refuseToolUse(); return; }
  pendingGraffiti = { blocks: selection.slice(), fallbackHit: hit };
  graffitiOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  graffitiEl.classList.remove('hidden');
  graffitiCap = LETTERS_PER_BLOCK * (selection.length || 1);
  graffitiInput.maxLength = graffitiCap;
  graffitiInput.value = '';
  updateGraffitiCount();
  graffitiInput.focus();
}
function updateGraffitiCount() {
  if (!graffitiLabel) return;
  const left = Math.max(0, graffitiCap - (graffitiInput ? graffitiInput.value.length : 0));
  graffitiLabel.textContent = 'Enter graffiti — ' + left + ' left';
}
async function submitGraffiti() {
  const text = graffitiInput.value.trim();
  const p = pendingGraffiti || { blocks: [], fallbackHit: null };
  const blocks = p.blocks.length ? p.blocks : (p.fallbackHit ? [p.fallbackHit] : []);
  if (text) {
    const gid = await addGraffiti(text, blocks);
    if (gid && !applyingRemote) {
      pendingVoxelEdits.graffitiAdds.push({
        id: gid,
        text,
        blocks: blocks.map((b) => ({ x: b.x, y: b.y, z: b.z, face: b.face || [0, 0, 1] })),
      });
    }
  }
  closeGraffiti();
  clearSelection();
}
function cancelGraffiti() { closeGraffiti(); }
function closeGraffiti() {
  graffitiOpen = false;
  pendingGraffiti = null;
  graffitiEl.classList.add('hidden');
  requestLock();
}
graffitiOk && graffitiOk.addEventListener('click', submitGraffiti);
graffitiCancel && graffitiCancel.addEventListener('click', cancelGraffiti);
graffitiInput && graffitiInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitGraffiti(); }
});
graffitiInput && graffitiInput.addEventListener('input', updateGraffitiCount);

// ── Graphite modal: link a graffiti block to a node in the graph ──
const graphiteEl = document.getElementById('graphite');
const graphiteGraffitiEl = document.getElementById('graphite-graffiti');
const graphiteListEl = document.getElementById('graphite-list');
const graphiteDescEl = document.getElementById('graphite-desc');
const graphiteActionBtn = document.getElementById('graphite-action');
const graphiteCancelBtn = document.getElementById('graphite-cancel');
let graphiteOpen = false;
let graphiteGraffiti = null;   // the linked graffiti record
let graphiteMode = 'add';      // 'add' | 'subtract' (left vs right click)
let graphiteTarget = null;     // selected node id
let graphiteRowEl = null;      // currently selected row element (for badge updates)
const graphiteExpanded = new Set(); // node ids currently expanded in the tree
let graphiteTree = null;       // { rootId, children: Map<parentId, node[]> }

function buildGraphiteTree() {
  const nodes = [];
  skyNodeData.forEach((n, id) => {
    if (!n) return;
    nodes.push({
      id,
      type: n.type,
      name: String(n.name || n.label || n.id || id || ''),
      parentId: n.parentId || null,
    });
  });
  if (!nodes.length) return { rootId: null, children: new Map() };
  const root = nodes.find((n) => n.type === 'curation') || nodes[0];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map();
  for (const n of nodes) {
    if (n.id === root.id) continue; // the root is never a child of anything
    const p = (n.parentId && n.parentId !== n.id && byId.has(n.parentId)) ? n.parentId : root.id;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(n);
  }
  children.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
  return { rootId: root.id, children };
}

function renderGraphiteRows(parentId, containerEl, visited) {
  if (visited.has(parentId)) return; // cycle guard (defensive against cyclic parentId)
  visited.add(parentId);
  const gid = graphiteGraffiti ? graphiteGraffiti.id : '';
  const kids = graphiteTree.children.get(parentId) || [];
  for (const kid of kids) {
    const hasKids = (graphiteTree.children.get(kid.id) || []).length > 0;
    const row = document.createElement('div');
    row.className = 'gi';
    row.dataset.id = kid.id;
    if (graphiteTarget === kid.id) row.classList.add('selected');

    const caret = document.createElement('span');
    caret.className = 'gi-caret';
    caret.textContent = hasKids ? (graphiteExpanded.has(kid.id) ? '-' : '+') : '';
    if (hasKids) {
      caret.addEventListener('click', (e) => {
        e.stopPropagation();
        if (graphiteExpanded.has(kid.id)) graphiteExpanded.delete(kid.id);
        else graphiteExpanded.add(kid.id);
        renderGraphiteTree();
      });
    }
    row.appendChild(caret);

    const dot = document.createElement('span');
    dot.className = 'gi-dot';
    dot.style.background = skyColor(kid.type);
    row.appendChild(dot);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'gi-name';
    nameSpan.textContent = kid.name.slice(0, 48);
    row.appendChild(nameSpan);

    const wSpan = document.createElement('span');
    wSpan.className = 'gi-w';
    wSpan.textContent = 'W ' + getWeight(gid, kid.id);
    row.appendChild(wSpan);

    row.addEventListener('click', () => selectGraphiteRow(row));
    containerEl.appendChild(row);

    if (hasKids && graphiteExpanded.has(kid.id)) {
      const kidsContainer = document.createElement('div');
      kidsContainer.className = 'gi-children';
      containerEl.appendChild(kidsContainer);
      renderGraphiteRows(kid.id, kidsContainer, new Set(visited));
    }
  }
}

function renderGraphiteTree() {
  if (!graphiteListEl || !graphiteTree || !graphiteTree.rootId) return;
  graphiteListEl.textContent = '';
  renderGraphiteRows(graphiteTree.rootId, graphiteListEl, new Set());
}

function selectGraphiteRow(row) {
  if (!graphiteListEl) return;
  for (const r of graphiteListEl.querySelectorAll('.gi')) r.classList.toggle('selected', r === row);
  graphiteTarget = row.dataset.id || null;
  graphiteRowEl = row;
  if (graphiteDescEl) graphiteDescEl.classList.remove('hidden');
  if (graphiteActionBtn) {
    graphiteActionBtn.textContent = graphiteMode === 'add' ? 'Add Weight' : 'Subtract Weight';
    graphiteActionBtn.classList.remove('hidden');
  }
}

function populateGraphiteList() {
  if (!graphiteListEl) return;
  graphiteTarget = null;
  graphiteRowEl = null;
  graphiteExpanded.clear();
  graphiteTree = buildGraphiteTree();
  if (graphiteActionBtn) graphiteActionBtn.classList.add('hidden');
  if (graphiteDescEl) graphiteDescEl.classList.add('hidden');
  if (!graphiteTree.rootId) {
    graphiteListEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'gi';
    empty.textContent = 'No nodes in this graph.';
    graphiteListEl.appendChild(empty);
    return;
  }
  graphiteExpanded.add(graphiteTree.rootId);
  renderGraphiteTree();
}
function openGraphite(g, mode) {
  if (worldScore <= 0) { refuseToolUse(); return; }
  graphiteGraffiti = g;
  graphiteMode = mode;
  graphiteOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  if (graphiteEl) graphiteEl.classList.remove('hidden');
  if (graphiteGraffitiEl) {
    const txt = g && g.text ? g.text : 'graffiti';
    const anchor = g && g.blocks[0] ? g.blocks[0] : null;
    graphiteGraffitiEl.textContent = 'LINK: "' + txt + '" @ ' + (anchor ? (anchor.x + ',' + anchor.y + ',' + anchor.z) : '?');
  }
  populateGraphiteList();
}
function applyGraphiteWeight() {
  if (!graphiteTarget || !graphiteGraffiti) return;
  if (worldScore <= 0) { refuseToolUse(); return; }
  const delta = graphiteMode === 'add' ? 1 : -1;
  const key = weightKey(graphiteGraffiti.id, graphiteTarget);
  const cur = graphiteWeights.get(key) || 0;
  if (delta < 0 && cur <= 0) { showToolTip('NO WEIGHT TO REMOVE'); return; }
  const next = cur + delta;
  if (next <= 0) graphiteWeights.delete(key); else graphiteWeights.set(key, next);
  weightTotalsDirty = true;
  recordWeightChange(graphiteGraffiti.id, graphiteTarget, delta);
  deductToolUse();
  refreshGraphiteBeams();
  if (graphiteRowEl) {
    const w = graphiteRowEl.querySelector('.gi-w');
    if (w) w.textContent = 'W ' + getWeight(graphiteGraffiti.id, graphiteTarget);
  }
  showToolTip((delta > 0 ? '+1 WEIGHT' : '-1 WEIGHT') + ' — 5 PTS');
}
function closeGraphite() {
  graphiteOpen = false;
  graphiteGraffiti = null;
  graphiteTarget = null;
  graphiteRowEl = null;
  graphiteExpanded.clear();
  graphiteTree = null;
  if (graphiteEl) graphiteEl.classList.add('hidden');
  requestLock();
}
graphiteActionBtn && graphiteActionBtn.addEventListener('click', applyGraphiteWeight);
graphiteCancelBtn && graphiteCancelBtn.addEventListener('click', closeGraphite);

// ── Shield modal wiring (strength input) ──
const shieldStrengthInput = document.getElementById('shield-strength');
const shieldApplyBtn = document.getElementById('shield-apply');
function applyShieldFromInput() {
  const strength = shieldStrengthInput ? parseInt(shieldStrengthInput.value, 10) : 0;
  if (!strength || strength < 1) { showToolTip('ENTER A STRENGTH >= 1'); return; }
  applyShield(strength);
  closeShieldModal();
}
shieldApplyBtn && shieldApplyBtn.addEventListener('click', applyShieldFromInput);
shieldStrengthInput && shieldStrengthInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); applyShieldFromInput(); }
});
const shieldModalCancel = document.getElementById('shield-cancel');
shieldModalCancel && shieldModalCancel.addEventListener('click', closeShieldModal);

let escToResume = false;
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  escToResume = false;
  if (graffitiOpen) { e.preventDefault(); cancelGraffiti(); return; }
  if (graphiteOpen) { e.preventDefault(); closeGraphite(); return; }
  if (nodeDetailsOpen) { e.preventDefault(); closeNodeDetails(false); escToResume = true; return; }
  if (shieldOpen) { e.preventDefault(); closeShieldModal(); return; }
  if (settingsEl && !settingsEl.classList.contains('hidden')) { e.preventDefault(); settingsEl.classList.add('hidden'); return; }
  if (featuresEl && !featuresEl.classList.contains('hidden')) { e.preventDefault(); featuresEl.classList.add('hidden'); return; }
  if (guideEl && !guideEl.classList.contains('hidden')) { e.preventDefault(); guideEl.classList.add('hidden'); return; }
  // Ignore the ESC that just toggled pointer lock (its keydown can arrive after
  // pointerlockchange) so it can't be mistaken for a fresh resume press.
  if (performance.now() - lockChangeAt < 350) return;
  if (pointerLocked) return; // native ESC exits pointer lock -> pause menu
  if (paused) {
    e.preventDefault();
    escToResume = true; // resume press: defer re-lock past the ESC keypress
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Escape' && escToResume) {
    escToResume = false;
    setTimeout(requestLock, 0); // one tick after the keypress fully completes
  }
});

setPaused(true);
document.addEventListener('mousemove', (e) => {
  if (!pointerLocked || graffitiOpen || graphiteOpen || nodeDetailsOpen || shieldOpen) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch));
});
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true; if (e.code === 'Space') e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ─────────────────────────────────────────────────────────────
// Physics
// ─────────────────────────────────────────────────────────────
const PLAYER_HW = 0.3, PLAYER_H = 1.8, EYE = 1.6;
let px = 0, py = 0, pz = 0;
let vx = 0, vy = 0, vz = 0;
let onGround = false;
function solidAt(x, y, z) { const t = getBlock(x, y, z); return t !== B.AIR && t !== B.WATER && t !== B.LEAVES && t !== B.PINE; }
function aabbCollides(x, y, z) {
  const x0 = Math.floor(x - PLAYER_HW), x1 = Math.floor(x + PLAYER_HW);
  const y0 = Math.floor(y), y1 = Math.floor(y + PLAYER_H);
  const z0 = Math.floor(z - PLAYER_HW), z1 = Math.floor(z + PLAYER_HW);
  for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) {
    if (solidAt(bx, by, bz)) return true;
  }
  return false;
}

// Find a dry, tree-free column to spawn on (spirals outward from the centre)
function clearSpawn(x, z, h) {
  const x0 = Math.floor(x - PLAYER_HW), x1 = Math.floor(x + PLAYER_HW);
  const z0 = Math.floor(z - PLAYER_HW), z1 = Math.floor(z + PLAYER_HW);
  const y1 = h + Math.ceil(PLAYER_H) + 1;
  for (let bx = x0; bx <= x1; bx++) for (let by = h + 1; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) {
    if (getBlock(bx, by, bz) !== B.AIR) return false;
  }
  return true;
}
function findSpawn() {
  const cx = Math.floor(GRID / 2), cz = Math.floor(GRID / 2);
  for (let r = 0; r < GRID; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const x = cx + dx, z = cz + dy;
      if (x < 0 || x >= GRID || z < 0 || z >= GRID) continue;
      const h = H[z][x];
      if (h < waterLevel) continue;
      if (clearSpawn(x, z, h)) return { x: x + 0.5, z: z + 0.5, h };
    }
  }
  const h = Math.max(1, H[cz][cx]);
  return { x: cx + 0.5, z: cz + 0.5, h };
}

// ─────────────────────────────────────────────────────────────
// Voxel raycast (DDA) for break / place
// ─────────────────────────────────────────────────────────────
function raycast(origin, dir, maxDist) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = dir.x > 0 ? 1 : -1, stepY = dir.y > 0 ? 1 : -1, stepZ = dir.z > 0 ? 1 : -1;
  const tDX = Math.abs(1 / (dir.x || 1e-9)), tDY = Math.abs(1 / (dir.y || 1e-9)), tDZ = Math.abs(1 / (dir.z || 1e-9));
  let tMX = ((stepX > 0) ? (x + 1 - origin.x) : (origin.x - x)) * tDX;
  let tMY = ((stepY > 0) ? (y + 1 - origin.y) : (origin.y - y)) * tDY;
  let tMZ = ((stepZ > 0) ? (z + 1 - origin.z) : (origin.z - z)) * tDZ;
  let face = [0, 0, 0];
  let entry = 0;
  for (;;) {
    if (entry > maxDist) return null;
    const blk = getBlock(x, y, z);
    if (blk !== B.AIR && blk !== B.WATER) return { x, y, z, face, t: entry };
    if (tMX < tMY && tMX < tMZ) { x += stepX; entry = tMX; tMX += tDX; face = [-stepX, 0, 0]; }
    else if (tMY < tMZ) { y += stepY; entry = tMY; tMY += tDY; face = [0, -stepY, 0]; }
    else { z += stepZ; entry = tMZ; tMZ += tDZ; face = [0, 0, -stepZ]; }
  }
}

// ─────────────────────────────────────────────────────────────
// Chunk management
// ─────────────────────────────────────────────────────────────
const builtChunks = new Map();
const material = new THREE.MeshLambertMaterial({ vertexColors: true });
const waterMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });
const foliageMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
const RENDER_DIST = 3;
const chunkQueue = [];
const queued = new Set();
let dirtyChunks = new Set();

function buildChunk(cx, cz) {
  const key = cx + ',' + cz;
  if (builtChunks.has(key)) return;
  if (cx < 0 || cz < 0 || cx * CH >= GRID || cz * CH >= GRID) return;
  const geo = buildChunkGeometry(cx, cz);
  const group = new THREE.Group();
  group.position.set(cx * CH, 0, cz * CH);
  if (geo.opaque) { const m = new THREE.Mesh(geo.opaque, material); group.add(m); }
  if (geo.water) { const m = new THREE.Mesh(geo.water, waterMaterial); group.add(m); }
  if (geo.foliage) { const m = new THREE.Mesh(geo.foliage, foliageMaterial); group.add(m); }
  scene.add(group);
  builtChunks.set(key, group);
}
function removeChunk(key) {
  const g = builtChunks.get(key);
  if (!g) return;
  scene.remove(g);
  g.children.forEach((c) => { c.geometry.dispose(); });
  builtChunks.delete(key);
}
const MAX_CHUNK = Math.floor((GRID - 1) / CH);
function rebuildChunkSync(key) {
  queued.delete(key);
  const g = builtChunks.get(key);
  if (g) {
    scene.remove(g);
    g.children.forEach((c) => { c.geometry.dispose(); });
    builtChunks.delete(key);
  }
  const [cx, cz] = key.split(',').map(Number);
  buildChunk(cx, cz);
}
function neededChunkKeys() {
  const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH);
  const needed = new Set();
  for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
    const cx = Math.max(0, Math.min(MAX_CHUNK, pcx + dx));
    const cz = Math.max(0, Math.min(MAX_CHUNK, pcz + dz));
    needed.add(cx + ',' + cz);
  }
  return needed;
}
function updateChunkSet() {
  const needed = neededChunkKeys();
  for (const key of needed) {
    if (!builtChunks.has(key) && !queued.has(key)) { queued.add(key); chunkQueue.push(key); }
  }
  for (const key of builtChunks.keys()) if (!needed.has(key)) removeChunk(key);
  for (const key of dirtyChunks) {
    dirtyChunks.delete(key);
    rebuildChunkSync(key);
  }
}
function markDirty(x, z) {
  const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const nx = cx + dx, nz = cz + dz;
    if (nx < 0 || nz < 0 || nx > MAX_CHUNK || nz > MAX_CHUNK) continue;
    dirtyChunks.add(nx + ',' + nz);
  }
}

// ─────────────────────────────────────────────────────────────
// Minimap (top-left locator, mirrors the 2D terrain world's)
// ─────────────────────────────────────────────────────────────
const minimapEl = document.getElementById('minimap');
const minimapCtx = minimapEl ? minimapEl.getContext('2d') : null;
let minimapImage = null;

function columnColor(x, z) {
  for (let y = maxY - 1; y >= 0; y--) {
    const t = getBlock(x, y, z);
    if (t === B.AIR) continue;
    const c = t === B.WATER ? [0.16, 0.4, 0.7] : (C[t] || [0.5, 0.5, 0.5]);
    return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
  }
  return [40, 100, 180];
}
function paintMinimapColumn(x, z) {
  if (!minimapImage || x < 0 || z < 0 || x >= GRID || z >= GRID) return;
  const cctx = minimapImage.getContext('2d');
  const [r, g, b] = columnColor(x, z);
  const s = Math.min(255, 170 + (H[z] ? H[z][x] : 0) * 0.3) / 255;
  cctx.fillStyle = 'rgb(' + Math.round(r * s) + ',' + Math.round(g * s) + ',' + Math.round(b * s) + ')';
  cctx.fillRect(x, z, 1, 1);
}
function buildMinimap() {
  if (!minimapCtx) return;
  minimapImage = document.createElement('canvas');
  minimapImage.width = GRID;
  minimapImage.height = GRID;
  for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) paintMinimapColumn(x, z);
}
function renderMinimap() {
  if (!minimapCtx || !minimapImage) return;
  const mm = minimapEl.width;
  minimapCtx.imageSmoothingEnabled = false;
  minimapCtx.clearRect(0, 0, mm, mm);
  minimapCtx.drawImage(minimapImage, 0, 0, mm, mm);
  minimapCtx.fillStyle = 'rgba(0,0,0,0.3)';
  minimapCtx.fillRect(0, 0, mm, mm);
  minimapCtx.fillStyle = '#fff';
  minimapCtx.beginPath();
  minimapCtx.arc(px / GRID * mm, pz / GRID * mm, 2.5, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#ffd';
  minimapCtx.lineWidth = 1.5;
  minimapCtx.beginPath();
  minimapCtx.moveTo(px / GRID * mm, pz / GRID * mm);
  minimapCtx.lineTo((px - Math.sin(yaw) * 6) / GRID * mm, (pz - Math.cos(yaw) * 6) / GRID * mm);
  minimapCtx.stroke();
}

// ─────────────────────────────────────────────────────────────
// Fly mode & aerial view
// ─────────────────────────────────────────────────────────────
let flyMode = false;
let aerialView = false;
let aerialAlt = 80;
const modeEl = document.getElementById('mode');
function updateModeLabel() {
  if (!modeEl) return;
  modeEl.textContent = aerialView ? 'AERIAL' : (flyMode ? 'FLY' : '');
}

// ── Score (mirror of the 2D world's unsubmitted score) ──
const TOOL_USE_COST = 5;
const scoreEl = document.getElementById('score');
let worldScore = 0;
function updateScoreDisplay() {
  if (scoreEl) scoreEl.textContent = 'Score: ' + worldScore;
}
function refuseToolUse() {
  showToolTip('Score = 0');
}
function deductToolUse() {
  worldScore = Math.max(0, worldScore - TOOL_USE_COST);
  updateScoreDisplay();
  window.parent.postMessage({ type: 'hyvmind-voxel-score-delta', delta: -TOOL_USE_COST }, '*');
}
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyF') {
    flyMode = !flyMode;
    updateModeLabel();
    showToolTip(flyMode ? 'FLY\nspace: up · shift: down' : 'FLY OFF');
  } else if (e.code === 'KeyV') {
    aerialView = !aerialView;
    if (aerialView) { flyMode = true; aerialAlt = Math.max(aerialAlt, py + 40); }
    updateModeLabel();
    showToolTip(aerialView ? 'AERIAL' : 'AERIAL OFF');
  }
});
const HOTBAR_BLOCKS = [B.SPADE, B.BRUSH, B.GRAPHITE, B.SHIELD, null, null];
const SELECTABLE = HOTBAR_BLOCKS.filter((t) => t != null);
let wheelGap = false;
// Held-tool "hand" — a 3D billboarded sprite parented to the camera,
// replicating voxelworld's hand.rs: positioned in view space at (1, -0.85, -1.5),
// pre-angled (flip X/Y 180°, rotateY −100°, rotateZ −20°), swung by rotating
// about X (t·−90°) plus a downward dip, exactly like the repo's quad3d path.
const TOOL_SPRITES = {
  [B.SPADE]: 'spade',
  [B.BRUSH]: 'brush',
  [B.GRAPHITE]: 'weight',
  [B.SHIELD]: 'shield',
};
const HAND_POS = new THREE.Vector3(2.1, -1.5, -1.5);
const HAND_PITCH_MAX = Math.PI / 2; // 90°
// Replicate the repo's hand.rs tool chain exactly:
//   T(HAND_POS) * Rx(item_rot) * T(0,t,0) * Rx180*Ry180 * Ry(-100)*Rz(-90)
// The swing rotation and its dip translate live between the position and the
// flip/pose — the bottom end then stays anchored while the top swings.
const handPivot = new THREE.Object3D();
handPivot.position.copy(HAND_POS);
handPivot.rotation.order = 'XYZ';
const handSwing = new THREE.Object3D();
handSwing.rotation.order = 'XYZ';
const handDip = new THREE.Object3D();
// Flip the sprite so it faces the camera, then tilt it into the held pose.
const handFlip = new THREE.Object3D();
handFlip.rotation.order = 'XYZ';
handFlip.rotation.set(Math.PI, Math.PI, 0);
const handPose = new THREE.Object3D();
handPose.rotation.order = 'XYZ';
handPose.rotation.set(0, THREE.MathUtils.degToRad(-100), THREE.MathUtils.degToRad(-90));
handPivot.add(handSwing);
handSwing.add(handDip);
handDip.add(handFlip);
handFlip.add(handPose);
let handMesh = null;
let handAnim = 0;
const handTex = {};
function loadHandTextures(cb) {
  const loader = new THREE.TextureLoader();
  let pending = 0;
  for (const name of Object.values(TOOL_SPRITES)) {
    pending++;
    loader.load('/assets/voxel/tools/' + name + '.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      // Match the repo's raw-GL upload (no Y-flip): the quad's top edge must
      // sample the PNG's bottom row, or the hand tool renders upside down.
      tex.flipY = false;
      handTex[name] = tex;
      if (--pending === 0) cb();
    });
  }
}
function initHand() {
  loadHandTextures(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: handTex[TOOL_SPRITES[heldBlock]],
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    handMesh = new THREE.Mesh(geo, mat);
    handPose.add(handMesh);
    handMesh.scale.setScalar(1.35);
    handMesh.renderOrder = 999;
    handMesh.frustumCulled = false;
    camera.add(handPivot);
    updateHand();
  });
}
function updateHand() {
  if (!handMesh) return;
  const name = TOOL_SPRITES[heldBlock];
  if (name && handTex[name]) handMesh.material.map = handTex[name];
}
function swingHand() {
  if (handAnim <= 0) handAnim = 0.01; // kick off a fresh 0→1 loop
}
// Advance the hand swing timer (0→1→0 triangle) and rotate the hand about X.
function updateHandSwing(dt) {
  if (handAnim > 0) {
    handAnim += dt * 3.0; // 333ms full swing, matching the spade auto-repeat rate
    if (handAnim >= 1) handAnim = 0;
  }
  if (!handSwing) return;
  const t = handAnim < 0.5 ? handAnim * 2 : (1 - handAnim) * 2;
  const pitch = t * -HAND_PITCH_MAX * 0.5; // repo's item_rotation: rotateX(t·−90°), halved
  handSwing.rotation.set(pitch, 0, 0);
  handDip.position.y = t * 0.35 * 0.5; // repo's translate(0, t, 0) dip, halved
}
function selectBlock(t) {
  heldBlock = t;
  if (t === B.SPADE) clearSelection();
  if (t !== B.SHIELD) clearShieldCorners();
  const hotbarEl = document.getElementById('hotbar');
  if (hotbarEl) {
    const slots = hotbarEl.children;
    for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('selected', HOTBAR_BLOCKS[i] === t);
  }
  updateHand();
}
document.addEventListener('wheel', (e) => {
  if (aerialView) { aerialAlt = Math.max(12, Math.min(230, aerialAlt - e.deltaY * 0.05)); return; }
  if (!pointerLocked) return;
  if (wheelGap) return;
  wheelGap = true;
  setTimeout(() => { wheelGap = false; }, 100);
  let idx = SELECTABLE.indexOf(heldBlock);
  idx += (e.deltaY > 0) ? 1 : -1;
  idx = (idx + SELECTABLE.length) % SELECTABLE.length;
  selectBlock(SELECTABLE[idx]);
  announceTool();
});

// ─────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────
let heldBlock = B.SPADE;
let lastRemoved = null;
let bootNotified = false;
let worldReady = false;
let applyingRemote = false;

// Pending voxel edits, flushed to the parent (TextGameModal) which persists them.
// blockEdits: {x,y,z,v} (v=block id, 0=AIR); graffitiAdds: {id,text,blocks};
// graffitiRemoves: [id]; weightChanges: {graffitiId,nodeId,delta};
// shieldAdds: {id,x0,y0,z0,x1,y1,z1,hp}; shieldRemoves: [id]
const pendingVoxelEdits = { blockEdits: [], graffitiAdds: [], graffitiRemoves: [], weightChanges: [], shieldAdds: [], shieldRemoves: [] };

function recordBlockEdit(x, y, z, v) {
  if (applyingRemote) return;
  pendingVoxelEdits.blockEdits.push({ x, y, z, v });
}
function recordGraffitiRemove(id) {
  if (applyingRemote || !id) return;
  pendingVoxelEdits.graffitiRemoves.push(id);
}
function recordWeightChange(graffitiId, nodeId, delta) {
  if (applyingRemote) return;
  pendingVoxelEdits.weightChanges.push({ graffitiId, nodeId, delta });
}
function hasPendingVoxelEdits() {
  return pendingVoxelEdits.blockEdits.length > 0 ||
    pendingVoxelEdits.graffitiAdds.length > 0 ||
    pendingVoxelEdits.graffitiRemoves.length > 0 ||
    pendingVoxelEdits.weightChanges.length > 0 ||
    pendingVoxelEdits.shieldAdds.length > 0 ||
    pendingVoxelEdits.shieldRemoves.length > 0;
}
function flushVoxelEdits(exit) {
  if (!hasPendingVoxelEdits() && !exit) return;
  const payload = {
    type: 'hyvmind-voxel-edits',
    exit: !!exit,
    blockEdits: pendingVoxelEdits.blockEdits,
    graffitiAdds: pendingVoxelEdits.graffitiAdds,
    graffitiRemoves: pendingVoxelEdits.graffitiRemoves,
    weightChanges: pendingVoxelEdits.weightChanges,
    shieldAdds: pendingVoxelEdits.shieldAdds,
    shieldRemoves: pendingVoxelEdits.shieldRemoves,
  };
  pendingVoxelEdits.blockEdits = [];
  pendingVoxelEdits.graffitiAdds = [];
  pendingVoxelEdits.graffitiRemoves = [];
  pendingVoxelEdits.weightChanges = [];
  pendingVoxelEdits.shieldAdds = [];
  pendingVoxelEdits.shieldRemoves = [];
  window.parent.postMessage(payload, '*');
}

// Apply persisted edits sent by the parent after buildWorld completes.
function applyVoxelState(state) {
  if (!state) return;
  applyingRemote = true;
  try {
    if (state.blockEdits) {
      for (const be of state.blockEdits) {
        const x = Number(be.x), y = Number(be.y), z = Number(be.z);
        if (be.v === 0) {
          setBlock(x, y, z, B.AIR);
          removeGraffitiOn(x, y, z);
        } else {
          setBlock(x, y, z, be.v);
        }
        markDirty(x, z);
        paintMinimapColumn(x, z);
      }
    }
    if (state.graffiti) {
      for (const g of state.graffiti) {
        const blocks = g.blocks.map((b) => ({
          x: Number(b.x), y: Number(b.y), z: Number(b.z), face: b.face.map(Number),
        }));
        // Skip graffiti whose blocks were broken (block edits may have emptied them).
        const anchored = blocks.every((b) => getBlock(b.x, b.y, b.z) !== B.AIR);
        if (anchored) addGraffiti(g.text, blocks, g.id);
      }
    }
    if (state.weights) {
      for (const w of state.weights) {
        const gid = String(w.graffitiId || '');
        const nid = String(w.nodeId || '');
        const weight = Number(w.weight) || 0;
        if (gid && nid && weight > 0) graphiteWeights.set(weightKey(gid, nid), weight);
      }
    }
    if (state.shields) {
      for (const s of state.shields) {
        const x0 = Number(s.x0), y0 = Number(s.y0), z0 = Number(s.z0);
        const x1 = Number(s.x1), y1 = Number(s.y1), z1 = Number(s.z1);
        const hp = Math.max(1, Number(s.hp) || 0);
        if (!(s.id && x1 >= x0 && y1 >= y0 && z1 >= z0)) continue;
        const sh = { id: String(s.id), x0, y0, z0, x1, y1, z1, hp };
        shields.set(sh.id, sh);
        shieldBox(sh);
      }
    }
  } finally {
    applyingRemote = false;
  }
  weightTotalsDirty = true;
  refreshGraphiteBeams();
}

const clock = new THREE.Clock();
const dir = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

// Targeted-block highlight under the crosshair (vyse-style)
const highlightMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false });
const highlightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.005, 1.005, 1.005), highlightMat);
highlightMesh.visible = false;
scene.add(highlightMesh);
function updateHighlight() {
  if (!pointerLocked) { highlightMesh.visible = false; updateSkyHover(null); return; }
  camera.getWorldDirection(dir);
  const hit = raycast(camera.position, dir, 4);
  if (hit && !aerialView) {
    highlightMesh.visible = true;
    highlightMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    const sh = shieldAt(hit.x, hit.y, hit.z);
    if (sh) {
      highlightMat.color.set(0xff8800); // shielded — spade hits the shield
      showToolTip('SHIELDED — STRENGTH ' + sh.hp);
      updateSkyHover(null);
      return;
    }
    const armored = armoredGraffitiAt(hit.x, hit.y, hit.z);
    if (armored) {
      highlightMat.color.set(0x8b7cf6); // armored — spade will strip a weight
      showToolTip('Remaining Weight: ' + graffitiTotalWeight(armored));
      updateSkyHover(null);
    } else {
      highlightMat.color.set(0x000000);
      updateSkyHover(null); // a terrain block is targeted — sky takes a back seat
    }
  } else if (!aerialView) {
    // Aiming at empty air: check the shield volume (its interior is interactive).
    const shRay = shieldRayHit(camera.position, dir, 4);
    if (shRay) {
      highlightMesh.visible = true;
      highlightMesh.position.set(
        Math.floor(shRay.x) + 0.5,
        Math.floor(shRay.y) + 0.5,
        Math.floor(shRay.z) + 0.5,
      );
      highlightMat.color.set(0xff8800);
      showToolTip('SHIELDED — STRENGTH ' + shRay.sh.hp);
      updateSkyHover(null);
      return;
    }
    highlightMesh.visible = false;
    updateSkyHover(dir);
  } else {
    highlightMesh.visible = false;
    updateSkyHover(dir);
  }
}

// "Crumbling" break/place particles (vyse-style): textured cube shrinking ~250ms
const crumbs = [];
function spawnCrumb(x, y, z, t) {
  if (!atlasTexture || t === B.AIR) return;
  const mesh = new THREE.Mesh(makeBlockBoxGeometry(t), new THREE.MeshLambertMaterial({ map: atlasTexture }));
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  scene.add(mesh);
  crumbs.push({ mesh, start: performance.now() });
  if (crumbs.length > 32) { const old = crumbs.shift(); scene.remove(old.mesh); old.mesh.geometry.dispose(); }
}
function updateCrumbs() {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const cr = crumbs[i];
    const el = (performance.now() - cr.start) / 250;
    if (el >= 1) { scene.remove(cr.mesh); cr.mesh.geometry.dispose(); crumbs.splice(i, 1); continue; }
    const s = 1 - el * el;
    cr.mesh.scale.setScalar(Math.max(0.01, s));
  }
}

// Hold-to-repeat break / place (vyse-style 333ms auto-repeat)
let holdingButton = -1, holdTimer = null;
function cellOverlapsPlayer(x, y, z) {
  const px0 = px - PLAYER_HW, px1 = px + PLAYER_HW, py0 = py, py1 = py + PLAYER_H, pz0 = pz - PLAYER_HW, pz1 = pz + PLAYER_HW;
  return x < px1 && x + 1 > px0 && y < py1 && y + 1 > py0 && z < pz1 && z + 1 > pz0;
}
function graffitiAt(x, y, z) {
  return graffitiList.find((g) => g.blocks.some((b) => b.x === x && b.y === y && b.z === z)) || null;
}
function doBlockAction(button) {
  const origin = camera.position.clone();
  camera.getWorldDirection(dir);
  const hit = raycast(origin, dir, 4);
  // The shield is a volume, not its solid blocks: detect it via the ray-vs-box
  // test (works over empty air inside the box), falling back to the aimed block.
  const shRay = shieldRayHit(origin, dir, 4);
  let sh = null;
  if (shRay) sh = shRay.sh;
  else if (hit) sh = shieldAt(hit.x, hit.y, hit.z);
  if (sh) {
    // Shielded zone rules while HP > 0:
    //  • spade LMB hits the shield (attacker pays 5 pts) — no block break, no weight strip;
    //  • build / new graffiti / weight-subtract / new shield are blocked;
    //  • graphite weight-ADD is allowed (proceeds below); brush-RMB select allowed.
    if (heldBlock === B.SPADE) {
      if (button === 0) { swingHand(); shieldHit(sh); return; }
      showToolTip('Shielded'); return;
    }
    if (heldBlock === B.BRUSH) {
      if (button === 0) { showToolTip('Shielded'); return; }
      if (hit) { swingHand(); toggleSelection(hit); } // harmless preview selection allowed (solid block only)
      return;
    }
    if (heldBlock === B.SHIELD) {
      showToolTip('Shielded'); return;
    }
    if (heldBlock === B.GRAPHITE && button === 2) { showToolTip('Shielded'); return; }
    // fall through for graphite LMB (add weight) — allowed.
  }
  if (!hit) return;
  if (heldBlock === B.SPADE) {
    if (button === 0) {
      const armored = armoredGraffitiAt(hit.x, hit.y, hit.z);
      if (armored) { swingHand(); stripOneWeight(armored); return; }
      if (worldScore <= 0) { refuseToolUse(); return; }
      const removed = getBlock(hit.x, hit.y, hit.z);
      spawnCrumb(hit.x, hit.y, hit.z, removed);
      lastRemoved = removed;
      playSfx(removed);
      setBlock(hit.x, hit.y, hit.z, B.AIR);
      recordBlockEdit(hit.x, hit.y, hit.z, B.AIR);
      removeGraffitiOn(hit.x, hit.y, hit.z);
      markDirty(hit.x, hit.z);
      paintMinimapColumn(hit.x, hit.z);
      swingHand();
      deductToolUse();
    } else {
      if (lastRemoved == null) return;
      const nx = hit.x + hit.face[0], ny = hit.y + hit.face[1], nz = hit.z + hit.face[2];
      const t = getBlock(nx, ny, nz);
      if (t === B.AIR && !cellOverlapsPlayer(nx, ny, nz)) {
        if (worldScore <= 0) { refuseToolUse(); return; }
        spawnCrumb(nx, ny, nz, lastRemoved);
        playSfx(lastRemoved);
        setBlock(nx, ny, nz, lastRemoved);
        recordBlockEdit(nx, ny, nz, lastRemoved);
        markDirty(nx, nz);
        paintMinimapColumn(nx, nz);
        swingHand();
        deductToolUse();
      }
    }
  } else if (heldBlock === B.BRUSH) {
    if (button === 0) { swingHand(); openGraffiti(hit); }
    else { swingHand(); toggleSelection(hit); }
  } else if (heldBlock === B.SHIELD) {
    if (button === 0) {
      if (!shieldCorners.length) { showToolTip('Right mouse click to select top corners.'); return; }
      swingHand();
      openShieldModal();
    } else {
      swingHand();
      toggleShieldCorner(hit);
      showToolTip('SHIELD CORNERS: ' + shieldCorners.length + '/4');
    }
  } else {
    // Graphite — link a graffiti block to a node in the sky tree.
    const g = graffitiAt(hit.x, hit.y, hit.z);
    if (!g) { showToolTip('NO GRAFFITI HERE'); return; }
    swingHand();
    openGraphite(g, button === 0 ? 'add' : 'subtract');
  }
}

// FPS counter
const fpsEl = document.getElementById('fps');
let fpsCount = 0, fpsT0 = performance.now();

function resize() {
  const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  // process a chunk or two per frame
  let budget = 2;
  while (budget-- && chunkQueue.length) {
    const key = chunkQueue.pop();
    queued.delete(key);
    const [cx, cz] = key.split(',').map(Number);
    if (!builtChunks.has(key)) buildChunk(cx, cz);
  }

  if (!paused && !graffitiOpen && !graphiteOpen && !nodeDetailsOpen && !shieldOpen) {
    // movement
    const speed = (flyMode ? 3 : 1) * 5.2;
    if (aerialView) {
      fwd.set(0, 0, -1);
      right.set(1, 0, 0);
    } else {
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    }
    dir.set(0, 0, 0);
    if (keys.KeyW) dir.add(fwd);
    if (keys.KeyS) dir.sub(fwd);
    if (keys.KeyD) dir.add(right);
    if (keys.KeyA) dir.sub(right);
    if (dir.lengthSq() > 0) dir.normalize();
    const tx = dir.x * speed, tz = dir.z * speed;
    vx += (tx - vx) * Math.min(1, dt * 12);
    vz += (tz - vz) * Math.min(1, dt * 12);
    if (flyMode) {
      const vs = (keys.Space ? speed : 0) + (keys.ShiftLeft || keys.ShiftRight ? -speed : 0);
      vy += (vs - vy) * Math.min(1, dt * 12);
    } else {
      vy -= 26 * dt;
      if (keys.Space && onGround) { vy = 8.2; playJump(); }
    }
    // fall off world edge / protect
    if (py < -30) { py = 60; vx = vy = vz = 0; }
    if (py > 1200) { py = 1200; vy = 0; }

    px += vx * dt;
    if (!flyMode && aabbCollides(px, py, pz)) { px -= vx * dt; vx = 0; }
    pz += vz * dt;
    if (!flyMode && aabbCollides(px, py, pz)) { pz -= vz * dt; vz = 0; }
    py += vy * dt;
    if (!flyMode && aabbCollides(px, py, pz)) {
      if (vy < 0) onGround = true;
      py -= vy * dt; vy = 0;
    } else if (!flyMode) onGround = false;

    // keep the player on the island (the grid beyond [0, GRID) is void)
    px = Math.min(GRID - 0.5, Math.max(0.5, px));
    pz = Math.min(GRID - 0.5, Math.max(0.5, pz));

    if (aerialView) {
      camera.position.set(px, aerialAlt, pz);
      camera.rotation.set(-Math.PI / 2, 0, 0);
    } else {
      camera.position.set(px, py + EYE, pz);
      camera.rotation.set(pitch, yaw, 0);
    }
  }
  updateChunkSet();
  renderMinimap();
  updateHighlight();
  updateCrumbs();
  updateShieldTint();
  updateHandSwing(dt);

  fpsCount++;
  if (performance.now() - fpsT0 >= 1000) {
    if (fpsEl) fpsEl.textContent = fpsCount + ' FPS';
    fpsCount = 0;
    fpsT0 = performance.now();
  }

  renderer.render(scene, camera);

  // Notify the parent only once the terrain is fully meshed so the "Travelling.."
  // overlay (held by TextGameModal) doesn't clear while chunks are still popping in.
  if (!bootNotified) {
    let allBuilt = true;
    for (const key of neededChunkKeys()) {
      if (!builtChunks.has(key)) { allBuilt = false; break; }
    }
    if (allBuilt) {
      bootNotified = true;
      window.parent.postMessage({ type: 'hyvmind-terrain-ready' }, '*');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Break / place
// ─────────────────────────────────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (!pointerLocked || (e.button !== 0 && e.button !== 2)) return;
  if (heldBlock === B.GRAPHITE) {
    // A graffiti click must win over sky-cube picking (the sky ray has no distance
    // limit, so a cube behind the graffiti would otherwise steal the click).
    camera.getWorldDirection(dir);
    const hit = raycast(camera.position, dir, 4);
    if (hit && graffitiAt(hit.x, hit.y, hit.z)) {
      holdingButton = e.button;
      doBlockAction(e.button);
      return;
    }
  }
  // LMB prefers a terrain block within reach over a distant sky cube behind it —
  // otherwise a wall between the player and the sky tree would open node modals
  // instead of letting the spade/brush act on the block.
  camera.getWorldDirection(dir);
  const hit = e.button === 0 ? raycast(camera.position, dir, 4) : null;
  if (hit) {
    holdingButton = e.button;
    doBlockAction(e.button);
    clearInterval(holdTimer);
    if (heldBlock === B.SPADE) {
      holdTimer = setInterval(() => doBlockAction(holdingButton), 333);
    }
    return;
  }
  // Aiming at empty air: a shield box may still be in the way (its interior is a
  // volume, not just solid blocks). Let the spade hit the shield (and hold-repeat),
  // and stop a distant sky cube behind the box from stealing the click.
  const shRay = shieldRayHit(camera.position, dir, 4);
  if (shRay) {
    holdingButton = e.button;
    doBlockAction(e.button);
    clearInterval(holdTimer);
    if (heldBlock === B.SPADE) {
      holdTimer = setInterval(() => doBlockAction(holdingButton), 333);
    }
    return;
  }
  const skyNode = e.button === 0 ? pickSkyNode() : null;
  if (skyNode) { openNodeDetails(skyNode); return; }
  holdingButton = e.button;
  doBlockAction(e.button);
  clearInterval(holdTimer);
  if (heldBlock === B.SPADE) {
    holdTimer = setInterval(() => doBlockAction(holdingButton), 333);
  }
});
document.addEventListener('mouseup', clearHolding);
window.addEventListener('blur', clearHolding);
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const digit = e.code === 'Digit1' ? 1 : e.code === 'Digit2' ? 2 : e.code === 'Digit3' ? 3 : e.code === 'Digit4' ? 4 : e.code === 'Digit5' ? 5 : e.code === 'Digit6' ? 6 : 0;
  if (digit >= 1 && digit <= SELECTABLE.length) { selectBlock(SELECTABLE[digit - 1]); announceTool(); }
});

// ─────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────
const seed = new URLSearchParams(location.search).get('seed') || 'Indian Constitutional Law';
document.getElementById('seed').textContent = seed;

const HOTBAR_NAMES = {
  [B.SPADE]: 'Spade',
  [B.BRUSH]: 'Brush',
  [B.GRAPHITE]: 'Weight',
  [B.SHIELD]: 'Shield',
};
const HOTBAR_TIPS = {
  [B.SPADE]: 'SPADE\nleft: destroy · right: build',
  [B.BRUSH]: 'BRUSH\nleft: write · right: select',
  [B.GRAPHITE]: 'WEIGHT\nleft: add · right: subtract',
  [B.SHIELD]: 'SHIELD\nleft: apply · right: select',
};
function initHotbar() {
  const hotbarEl = document.getElementById('hotbar');
  if (!hotbarEl) return;
  for (let i = 0; i < HOTBAR_BLOCKS.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const t = HOTBAR_BLOCKS[i];
    if (t != null) {
      const label = document.createElement('span');
      label.className = 'initial';
      label.textContent = HOTBAR_NAMES[t];
      slot.appendChild(label);
    }
    hotbarEl.appendChild(slot);
  }
  selectBlock(HOTBAR_BLOCKS[0]);
}

// 1-second center tooltip announcing the selected tool
const tooltipEl = document.getElementById('tooltip');
let tooltipTimer = null;
function showToolTip(text) {
  if (!tooltipEl) return;
  tooltipEl.textContent = text;
  tooltipEl.classList.add('show');
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => tooltipEl.classList.remove('show'), 1000);
}
function announceTool() {
  const tip = HOTBAR_TIPS[heldBlock];
  if (tip) showToolTip(tip);
}

// ─────────────────────────────────────────────────────────────
// Sky graph tree — fetch the published graph for this terrain
// from the Hyvmind public API and render it as a floating,
// colour-coded hierarchy of blocks hanging in the sky. Names are
// read via crosshair hover; left-click opens a node detail modal.
// ─────────────────────────────────────────────────────────────
const SKY_COLORS = {
  curation: '#4a9eff',
  swarm: '#ff7f50',
  location: '#90EE90',
  lawEntity: '#FFD700',
  interpEntity: '#DA70D6',
};
const SKY_TYPE_LABELS = {
  curation: 'CURATION', swarm: 'SWARM', location: 'LOCATION',
  lawEntity: 'LAW TOKEN', interpEntity: 'INTERPRETATION',
};
const SKY_BUDGET = 300;            // max rendered cubes; bigger subtrees collapse
const SKY_LEVEL_SPACING = 22;      // vertical drop per hierarchy level
const SKY_RADIUS_MIN = 6;
const SKY_RADIUS_STEP = 6;
const SKY_SIZE_BY_LEVEL = [3.2, 2.4, 1.9, 1.6, 1.35];

let skyGroup = null;
let skyInitDone = false;
let skyNodeData = new Map(); // node id -> full API node object (for the detail panel)
const skyCubes = [];
const skyEdges = [];
const skyRay = new THREE.Raycaster();
const skyDir = new THREE.Vector3();
let nodeDetailsOpen = false;

function skyHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function skyColor(t) { return SKY_COLORS[t] || '#888888'; }

async function resolveSkyApiBases() {
  let cid = '';
  try {
    const env = await (await fetch('/env.json')).json();
    cid = env.backend_canister_id || '';
  } catch (e) { /* env.json missing */ }
  const bases = [];
  if (/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname)) {
    bases.push(''); // same-origin /api via the Vite dev proxy (local backend)
  }
  if (cid && cid !== 'undefined') bases.push('https://' + cid + '.raw.icp0.io');
  bases.push('https://4p5ty-yyaaa-aaaam-qfana-cai.raw.icp0.io');
  return bases;
}

// The backend sometimes emits raw control characters inside strings
// (e.g. unescaped newlines in interpretation-token content); strip them.
function parseGraphJson(text) {
  return JSON.parse(text.replace(/[\u0000-\u001f]/g, ' '));
}

// Deterministic demo hierarchy used when the API has no graph for this seed
// (e.g. the DEV test maps) — exercises every node type colour.
function demoSkyNodes() {
  const nodes = [{ id: 'demo-root', label: seed, type: 'curation', parentId: null }];
  const add = (type, parentId, label) => {
    const id = parentId + '>' + label;
    nodes.push({ id, label, type, parentId });
    return id;
  };
  const s1 = add('swarm', 'demo-root', 'Constitutional Framework');
  const s2 = add('swarm', 'demo-root', 'Rights & Freedoms');
  const s3 = add('swarm', 'demo-root', 'State Structure');
  const locs = [['Preamble', s1], ['Art 21', s2], ['Art 19', s2], ['Part III', s2], ['Art 245', s3], ['Art 246', s3]];
  locs.forEach(([name, p]) => {
    const loc = add('location', p, name);
    for (let i = 0; i < 2; i++) {
      const law = add('lawEntity', loc, 'clause ' + (i + 1));
      for (let j = 0; j < 2; j++) add('interpEntity', law, 'reading ' + (j + 1));
    }
  });
  return nodes;
}

async function fetchSkyGraph() {
  const bases = await resolveSkyApiBases();
  for (const base of bases) {
    try {
      const list = parseGraphJson(await (await fetch(base + '/api/graphs')).text());
      const meta = (list || []).find((m) => m && m.name === seed)
        || (list || []).find((m) => m && m.name && m.name.toLowerCase() === seed.toLowerCase());
      if (!meta || !meta.id) continue; // no graph here — try the next base
      const raw = parseGraphJson(await (await fetch(base + '/api/nodes/' + encodeURIComponent(meta.id))).text());
      if (!Array.isArray(raw) || !raw.length) throw new Error('empty node list for ' + meta.id);
      let edges = [];
      try {
        const e = parseGraphJson(await (await fetch(base + '/api/edges/' + encodeURIComponent(meta.id))).text());
        if (Array.isArray(e)) edges = e;
      } catch (err) { console.warn('[sky] edges fetch failed:', err); }
      const nodes = raw.map((n) => ({
        id: n.id,
        label: String(n.name || n.id || '').slice(0, 80),
        type: n.type || 'lawEntity',
        parentId: n.parentId || null,
      }));
      skyNodeData = new Map();
      raw.forEach((n) => skyNodeData.set(n.id, n));
      return { nodes, edges };
    } catch (err) {
      if (base === '') console.warn('[sky] local /api unavailable, trying live API:', err);
    }
  }
  console.warn('[sky] no graph named ' + seed + ' found on any API, using demo graph');
  const demoNodes = demoSkyNodes();
  skyNodeData = new Map(demoNodes.map((n) => [n.id, n]));
  return { nodes: demoNodes, edges: [] };
}

async function initSkyTree() {
  if (skyInitDone) return;
  skyInitDone = true;
  const graph = await fetchSkyGraph();
  buildSkyTree(graph.nodes, graph.edges);
}

function buildSkyTree(nodeList, edgeList) {
  if (!nodeList || !nodeList.length) return;
  const byId = new Map();
  nodeList.forEach((n) => byId.set(n.id, n));

  // Root = the curation (or the first node); every orphan hangs under it.
  const root = nodeList.find((n) => n.type === 'curation') || nodeList[0];
  const children = new Map();
  const parentOf = new Map();
  nodeList.forEach((n) => {
    let p = (n.parentId && byId.has(n.parentId) && n.parentId !== n.id) ? n.parentId : root.id;
    parentOf.set(n.id, p);
    if (n.id === root.id) return; // the root is never a child of anything
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(n);
  });

  // Assign levels via BFS with a visited set; prune any back edge that would
  // otherwise form a cycle in `children` (real data occasionally has them).
  const levelOf = new Map();
  const seen = new Set([root.id]);
  levelOf.set(root.id, 0);
  const q = [root.id];
  while (q.length) {
    const id = q.shift();
    const kids = children.get(id);
    if (!kids) continue;
    const keep = [];
    for (const c of kids) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      levelOf.set(c.id, levelOf.get(id) + 1);
      keep.push(c);
      q.push(c.id);
    }
    children.set(id, keep);
  }

  // Collapse oversized subtrees (bottom-up, biggest first) into one block.
  function subtreeSize(id) {
    let s = 1;
    (children.get(id) || []).forEach((c) => { s += subtreeSize(c.id); });
    return s;
  }
  const hidden = new Set();
  nodeList.forEach((n) => { n.isCluster = false; n.clusterCount = 0; n.hidden = false; });
  if (nodeList.length > SKY_BUDGET) {
    const sizes = new Map();
    nodeList.forEach((n) => sizes.set(n.id, subtreeSize(n.id)));
    const cands = nodeList
      .filter((n) => n.id !== root.id && (children.get(n.id) || []).length)
      .sort((a, b) => sizes.get(b.id) - sizes.get(a.id));
    let total = nodeList.length;
    for (const n of cands) {
      if (total <= SKY_BUDGET) break;
      if (hidden.has(n.id)) continue;
      total -= sizes.get(n.id) - 1;
      n.isCluster = true;
      n.clusterCount = sizes.get(n.id);
      const st = [...(children.get(n.id) || [])].map((g) => g.id);
      while (st.length) {
        const cid = st.pop();
        hidden.add(cid);
        (children.get(cid) || []).forEach((g) => st.push(g.id));
      }
    }
    nodeList.forEach((n) => { if (hidden.has(n.id)) n.hidden = true; });
  }

  // Chandelier layout: each node owns an angular span proportional to the
  // weight (visible subtree size) of its descendants.
  function weight(id) {
    let w = 1;
    (children.get(id) || []).forEach((c) => { if (!hidden.has(c.id)) w += weight(c.id); });
    return w;
  }
  const pos = new Map();
  const rootY = Math.max(130, worldMaxH + 92); // tree bottom clears the highest peak
  pos.set(root.id, { x: GRID / 2, y: rootY, z: GRID / 2, level: 0 });
  function place(id, a0, a1) {
    const kids = (children.get(id) || []).filter((c) => !hidden.has(c.id));
    const totalW = kids.reduce((s, c) => s + weight(c.id), 0) || 1;
    let a = a0;
    kids.forEach((c) => {
      const span = (a1 - a0) * (weight(c.id) / totalW);
      const mid = a + span / 2;
      const lvl = levelOf.get(c.id) || 0;
      const radius = Math.min(SKY_RADIUS_MIN + lvl * SKY_RADIUS_STEP + ((skyHash(c.id) % 5) - 2), 34);
      pos.set(c.id, {
        x: GRID / 2 + Math.sin(mid) * radius,
        y: rootY - lvl * SKY_LEVEL_SPACING,
        z: GRID / 2 + Math.cos(mid) * radius,
        level: lvl,
      });
      place(c.id, a, a + span);
      a += span;
    });
  }
  place(root.id, 0, Math.PI * 2);

  // Meshes — standalone group, never written into the voxel grid.
  skyGroup = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x9db4ff, transparent: true, opacity: 0.45, depthWrite: false });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x0a0a0f });
  const clusterMarkMat = new THREE.MeshLambertMaterial({ color: 0x101018 });

  nodeList.forEach((n) => {
    if (n.hidden) return;
    const p = pos.get(n.id);
    if (!p) return;
    const pp = pos.get(parentOf.get(n.id));
    if (pp) {
      const dv = new THREE.Vector3(p.x - pp.x, p.y - pp.y, p.z - pp.z);
      const len = dv.length();
      if (len > 0.01) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, len, 0.24), beamMat);
        beam.position.set((p.x + pp.x) / 2, (p.y + pp.y) / 2, (p.z + pp.z) / 2);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.clone().normalize());
        beam.userData.ignored = true; // never raycast
        skyGroup.add(beam);
      }
    }
    const lvl = Math.min(p.level, SKY_SIZE_BY_LEVEL.length - 1);
    const size = SKY_SIZE_BY_LEVEL[lvl] + (n.isCluster ? 0.7 : 0);
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: skyColor(n.type) }));
    mesh.position.set(p.x, p.y, p.z);
    mesh.userData = { sky: true, id: n.id, label: n.label, type: n.type, isCluster: n.isCluster, count: n.clusterCount };
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
    if (n.isCluster) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(size * 0.34, size * 0.34, size * 0.34), clusterMarkMat);
      mark.position.set(0, size / 2 + size * 0.2, 0);
      mesh.add(mark);
    }
    skyGroup.add(mesh);
    skyCubes.push(mesh);
  });

  // Cross-reference edges — thin distinct beams between the two rendered cubes.
  // Only drawn when both endpoints survived the collapse; bidirectional rows deduped.
  if (edgeList && edgeList.length) {
    const seenPairs = new Set();
    edgeList.forEach((e) => {
      const src = e && e.source, tgt = e && e.target;
      if (!src || !tgt) return;
      const key = src < tgt ? src + '\u0000' + tgt : tgt + '\u0000' + src;
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      const pa = pos.get(src);
      const pb = pos.get(tgt);
      if (!pa || !pb) return; // one endpoint hidden/collapsed
      const dv = new THREE.Vector3(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z);
      const len = dv.length();
      if (len < 0.01) return;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, len, 0.16), edgeMat);
      beam.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.clone().normalize());
      const sa = skyNodeData.get(src) || {};
      const sb = skyNodeData.get(tgt) || {};
      beam.userData = {
        edge: true,
        label: String(e.label || ''),
        sourceLabel: String(sa.name || sa.id || src),
        targetLabel: String(sb.name || sb.id || tgt),
      };
      skyGroup.add(beam);
      skyEdges.push(beam);
    });
  }

  scene.add(skyGroup);
  refreshGraphiteBeams();
}

// ── Graphite beams: graffiti ↔ node weight links ──
const graphiteBeamMat = new THREE.MeshBasicMaterial({ color: 0x8b7cf6, transparent: true, opacity: 0.55, depthWrite: false });
let graphiteGroup = null;
function refreshGraphiteBeams() {
  if (!graphiteGroup) { graphiteGroup = new THREE.Group(); scene.add(graphiteGroup); }
  for (const c of [...graphiteGroup.children]) { graphiteGroup.remove(c); c.geometry.dispose(); }
  graphiteWeights.forEach((weight, key) => {
    const sepIdx = key.indexOf(weightSep);
    if (sepIdx < 0) return;
    const gid = key.slice(0, sepIdx);
    const nid = key.slice(sepIdx + weightSep.length);
    const g = graffitiList.find((gr) => gr.id === gid);
    const cube = skyCubes.find((c) => c.userData && c.userData.id === nid);
    if (!g || !cube) return; // graffiti gone or node collapsed/hidden
    const a = g.mesh.position, b = cube.position;
    const dv = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = dv.length();
    if (len < 0.01) return;
    const thick = 0.05 + Math.min(weight, 10) * 0.045;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), graphiteBeamMat);
    beam.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.clone().normalize());
    beam.userData.ignored = true; // never raycast (hover/click)
    graphiteGroup.add(beam);
  });
}

function updateSkyHover(dir) {
  if (!dir || !skyGroup || !pointerLocked) return;
  skyRay.set(camera.position, dir);
  let hits = skyRay.intersectObjects(skyCubes, false);
  if (hits.length) {
    const ud = hits[0].object.userData;
    const typeLabel = SKY_TYPE_LABELS[ud.type] || String(ud.type || '').toUpperCase();
    showToolTip(ud.isCluster
      ? typeLabel + ' CLUSTER (' + ud.count + ' nodes) — ' + (ud.label || '')
      : typeLabel + ' — ' + (ud.label || ''));
    return;
  }
  if (skyEdges.length) {
    hits = skyRay.intersectObjects(skyEdges, false);
    if (hits.length) {
      const ud = hits[0].object.userData;
      showToolTip('REF — ' + ud.sourceLabel + ' → ' + ud.targetLabel + (ud.label ? ' · ' + ud.label : ''));
    }
  }
}

// Reusable sky pick used by hover-free click handling (left mousedown).
function pickSkyNode() {
  if (!skyGroup || !skyCubes.length) return null;
  camera.getWorldDirection(skyDir);
  skyRay.set(camera.position, skyDir);
  const hits = skyRay.intersectObjects(skyCubes, false);
  return hits.length ? hits[0].object.userData : null;
}

// ── Node detail modal (click a sky cube) ──
const nodeDetailsEl = document.getElementById('node-details');
function appendDetailRow(container, key, value) {
  const row = document.createElement('div');
  row.className = 'kv';
  const k = document.createElement('span');
  k.className = 'k';
  k.textContent = key;
  const v = document.createElement('span');
  v.className = 'v';
  v.textContent = value;
  row.appendChild(k);
  row.appendChild(v);
  container.appendChild(row);
}
function openNodeDetails(ud) {
  if (!nodeDetailsEl || !ud) return;
  const node = skyNodeData.get(ud.id) || {};
  nodeDetailsOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  nodeDetailsEl.classList.remove('hidden');
  const titleEl = nodeDetailsEl.querySelector('.title');
  if (titleEl) {
    const typeLabel = (SKY_TYPE_LABELS[ud.type] || ud.type || 'NODE') + (ud.isCluster ? ' CLUSTER · ' + ud.count + ' nodes' : '');
    titleEl.textContent = typeLabel + ' — ' + (ud.label || node.name || '');
  }
  const bodyEl = nodeDetailsEl.querySelector('.detail-body');
  if (bodyEl) {
    bodyEl.textContent = '';
    appendDetailRow(bodyEl, 'ID', String(ud.id || node.id || '—'));
    appendDetailRow(bodyEl, 'CREATOR', String(node.creator || '—'));
    const createdAt = node.createdAt ? new Date(Number(node.createdAt) / 1e6).toLocaleString() : '—';
    appendDetailRow(bodyEl, 'CREATED', createdAt);
    const tags = Array.isArray(node.tags) && node.tags.length ? node.tags.join(', ') : '—';
    appendDetailRow(bodyEl, 'TAGS', tags);
    const attrs = Array.isArray(node.attributes) && node.attributes.length
      ? node.attributes.map((a) => (a.key || '') + ': ' + ((a.weightedValues || []).map((w) => w.value).join(', '))).join('\n')
      : '—';
    appendDetailRow(bodyEl, 'ATTRIBUTES', attrs);
    const sources = Array.isArray(node.sources) && node.sources.length
      ? node.sources.map((s) => s.name || s.url || '').filter(Boolean).join('\n')
      : '—';
    appendDetailRow(bodyEl, 'SOURCES', sources);
    appendDetailRow(bodyEl, 'CONTENT', node.content ? String(node.content) : '—');
    if (ud.isCluster) {
      appendDetailRow(bodyEl, 'NOTE', 'Cluster cube: ' + ud.count + ' nodes of this subtree are collapsed into this block.');
    }
  }
}
function closeNodeDetails(relock) {
  nodeDetailsOpen = false;
  if (nodeDetailsEl) nodeDetailsEl.classList.add('hidden');
  if (relock) requestLock();
}
const nodeDetailsCloseBtn = document.getElementById('node-details-close');
nodeDetailsCloseBtn && nodeDetailsCloseBtn.addEventListener('click', () => closeNodeDetails(true));

function startGame() {
  buildWorld(seed);
  worldReady = true;
  initSkyTree();
  if (bufferedVoxelState) {
    applyVoxelState(bufferedVoxelState);
    bufferedVoxelState = null;
  }
  buildMinimap();
  updateModeLabel();
  const sp = findSpawn();
  px = sp.x;
  pz = sp.z;
  py = sp.h + 2;
  resize();
  for (const key of neededChunkKeys()) {
    const [cx, cz] = key.split(',').map(Number);
    if (!builtChunks.has(key)) buildChunk(cx, cz);
  }
  if (!bootNotified) {
    bootNotified = true;
    window.parent.postMessage({ type: 'hyvmind-terrain-ready' }, '*');
  }
  window.focus();
  animate();
}

loadTextures((imgs) => {
  buildAtlas(imgs);
  material.map = atlasTexture; material.needsUpdate = true;
  waterMaterial.map = atlasTexture; waterMaterial.needsUpdate = true;
  foliageMaterial.map = atlasTexture; foliageMaterial.needsUpdate = true;
  initHotbar();
  initHand();
  startGame();
});

// ── Parent bridge: receive persisted state, auto-save on a timer ────────────
let bufferedVoxelState = null;
window.addEventListener('message', (e) => {
  if (e.data?.type === 'hyvmind-voxel-state') {
    if (worldReady) {
      applyVoxelState(e.data.state);
    } else {
      bufferedVoxelState = e.data.state;
    }
  } else if (e.data?.type === 'hyvmind-voxel-score') {
    worldScore = Number(e.data.score) || 0;
    updateScoreDisplay();
  }
});

// Best-effort silent flush if the tab/iframe is closed or refreshed.
window.addEventListener('pagehide', () => flushVoxelEdits(false));
window.addEventListener('beforeunload', () => flushVoxelEdits(false));

// Auto-save every 15s while there are unsaved edits (crash protection).
setInterval(() => flushVoxelEdits(false), 15000);
