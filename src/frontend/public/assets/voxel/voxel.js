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
const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, ROCK: 5, SNOW: 6, WATER: 7, WOOD: 8, LEAVES: 9, COAL: 10, IRON: 11, PINE: 12, SPADE: 13, BRUSH: 14 };
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
const exitBtn = document.getElementById('exit');
const settingBack = document.getElementById('setting-back');
const settingsBack = document.getElementById('settings-back');
const guideBack = document.getElementById('back');
const fovLabel = document.getElementById('fov');
const fovInput = document.getElementById('fov-input');
const distanceLabel = document.getElementById('distance');
const distanceInput = document.getElementById('distance-input');
const musicLabel = document.getElementById('music');
const musicInput = document.getElementById('music-input');
const soundLabel = document.getElementById('sound');
const soundInput = document.getElementById('sound-input');

function setPaused(paused) {
  if (menuEl) menuEl.classList.toggle('hidden', !paused);
  const crosshairEl = document.getElementById('crosshair');
  const hotbarEl = document.getElementById('hotbar');
  if (crosshairEl) crosshairEl.style.display = paused ? 'none' : 'block';
  if (hotbarEl) hotbarEl.style.display = paused ? 'none' : 'flex';
  if (paused) {
    if (settingsEl) settingsEl.classList.add('hidden');
    if (featuresEl) featuresEl.classList.add('hidden');
  }
}

function closeToParent() {
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
  pointerLocked = document.pointerLockElement === renderer.domElement;
  if (pointerLocked) { hasStarted = true; clearHolding(); }
  else { clearHolding(); }
  if (!graffitiOpen) setPaused(!pointerLocked);
});
renderer.domElement.addEventListener('click', requestLock);

playBtn && playBtn.addEventListener('click', requestLock);
settingBtn && settingBtn.addEventListener('click', () => { if (settingsEl) settingsEl.classList.remove('hidden'); });
featureBtn && featureBtn.addEventListener('click', () => { if (featuresEl) featuresEl.classList.remove('hidden'); });
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
musicInput && musicInput.addEventListener('change', () => {
  const on = musicInput.value === '1';
  if (musicLabel) musicLabel.textContent = 'Music: ' + (on ? 'On' : 'Off');
});
soundInput && soundInput.addEventListener('change', () => {
  const on = soundInput.value === '1';
  if (soundLabel) soundLabel.textContent = 'Sound: ' + (on ? 'On' : 'Off');
});

// ── Graffiti (brush) ──
const LETTERS_PER_BLOCK = 4;
const graffitiEl = document.getElementById('graffiti');
const graffitiInput = document.getElementById('graffiti-input');
const graffitiLabel = document.getElementById('graffiti-label');
const graffitiOk = document.getElementById('graffiti-ok');
const graffitiCancel = document.getElementById('graffiti-cancel');
let graffitiOpen = false;
let pendingGraffiti = null;
const graffitiList = [];
const selection = [];
const selectionKey = new Set();
const selectionMeshes = [];

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

function removeGraffitiOn(x, y, z) {
  for (let i = graffitiList.length - 1; i >= 0; i--) {
    const g = graffitiList[i];
    if (g.blocks.some((b) => b.x === x && b.y === y && b.z === z)) {
      recordGraffitiRemove(g.id);
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.map.dispose();
      g.mesh.material.dispose();
      graffitiList.splice(i, 1);
    }
  }
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
  graffitiList.push({ id: gid, mesh, blocks });
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
  const cap = LETTERS_PER_BLOCK * (selection.length || 1);
  graffitiInput.maxLength = cap;
  graffitiInput.value = '';
  graffitiLabel.textContent = 'Enter graffiti (max ' + cap + ' letters)';
  graffitiInput.focus();
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
let escToResume = false;
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  escToResume = false;
  if (graffitiOpen) { e.preventDefault(); cancelGraffiti(); return; }
  if (settingsEl && !settingsEl.classList.contains('hidden')) { e.preventDefault(); settingsEl.classList.add('hidden'); return; }
  if (featuresEl && !featuresEl.classList.contains('hidden')) { e.preventDefault(); featuresEl.classList.add('hidden'); return; }
  if (pointerLocked) return; // native ESC exits pointer lock -> pause menu
  if (menuEl && !menuEl.classList.contains('hidden')) {
    e.preventDefault();
    escToResume = true; // resume press: re-lock after the ESC keypress completes
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Escape' && escToResume) {
    escToResume = false;
    setTimeout(requestLock, 0);
  }
});

setPaused(true);
document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
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
function updateChunkSet() {
  const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH);
  const needed = new Set();
  for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
    const cx = Math.max(0, Math.min(MAX_CHUNK, pcx + dx));
    const cz = Math.max(0, Math.min(MAX_CHUNK, pcz + dz));
    needed.add(cx + ',' + cz);
  }
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
const HOTBAR_BLOCKS = [B.SPADE, B.BRUSH, null, null, null, null];
const SELECTABLE = HOTBAR_BLOCKS.filter((t) => t != null);
let wheelGap = false;
function selectBlock(t) {
  heldBlock = t;
  if (t === B.SPADE) clearSelection();
  const hotbarEl = document.getElementById('hotbar');
  if (hotbarEl) {
    const slots = hotbarEl.children;
    for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('selected', HOTBAR_BLOCKS[i] === t);
  }
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
// blockEdits: {x,y,z,v} (v=block id, 0=AIR); graffitiAdds: {id,text,blocks}; graffitiRemoves: [id]
const pendingVoxelEdits = { blockEdits: [], graffitiAdds: [], graffitiRemoves: [] };

function recordBlockEdit(x, y, z, v) {
  if (applyingRemote) return;
  pendingVoxelEdits.blockEdits.push({ x, y, z, v });
}
function recordGraffitiRemove(id) {
  if (applyingRemote || !id) return;
  pendingVoxelEdits.graffitiRemoves.push(id);
}
function hasPendingVoxelEdits() {
  return pendingVoxelEdits.blockEdits.length > 0 ||
    pendingVoxelEdits.graffitiAdds.length > 0 ||
    pendingVoxelEdits.graffitiRemoves.length > 0;
}
function flushVoxelEdits(exit) {
  if (!hasPendingVoxelEdits() && !exit) return;
  const payload = {
    type: 'hyvmind-voxel-edits',
    exit: !!exit,
    blockEdits: pendingVoxelEdits.blockEdits,
    graffitiAdds: pendingVoxelEdits.graffitiAdds,
    graffitiRemoves: pendingVoxelEdits.graffitiRemoves,
  };
  pendingVoxelEdits.blockEdits = [];
  pendingVoxelEdits.graffitiAdds = [];
  pendingVoxelEdits.graffitiRemoves = [];
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
  } finally {
    applyingRemote = false;
  }
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
  if (!pointerLocked) { highlightMesh.visible = false; return; }
  camera.getWorldDirection(dir);
  const hit = raycast(camera.position, dir, 4);
  if (hit && !aerialView) {
    highlightMesh.visible = true;
    highlightMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else {
    highlightMesh.visible = false;
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
function doBlockAction(button) {
  const origin = camera.position.clone();
  camera.getWorldDirection(dir);
  const hit = raycast(origin, dir, 4);
  if (!hit) return;
  if (heldBlock === B.SPADE) {
    if (button === 0) {
      if (worldScore <= 0) { refuseToolUse(); return; }
      const removed = getBlock(hit.x, hit.y, hit.z);
      spawnCrumb(hit.x, hit.y, hit.z, removed);
      lastRemoved = removed;
      setBlock(hit.x, hit.y, hit.z, B.AIR);
      recordBlockEdit(hit.x, hit.y, hit.z, B.AIR);
      removeGraffitiOn(hit.x, hit.y, hit.z);
      markDirty(hit.x, hit.z);
      paintMinimapColumn(hit.x, hit.z);
      deductToolUse();
    } else {
      if (lastRemoved == null) return;
      const nx = hit.x + hit.face[0], ny = hit.y + hit.face[1], nz = hit.z + hit.face[2];
      const t = getBlock(nx, ny, nz);
      if (t === B.AIR && !cellOverlapsPlayer(nx, ny, nz)) {
        if (worldScore <= 0) { refuseToolUse(); return; }
        spawnCrumb(nx, ny, nz, lastRemoved);
        setBlock(nx, ny, nz, lastRemoved);
        recordBlockEdit(nx, ny, nz, lastRemoved);
        markDirty(nx, nz);
        paintMinimapColumn(nx, nz);
        deductToolUse();
      }
    }
  } else {
    if (button === 0) openGraffiti(hit);
    else toggleSelection(hit);
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
    if (keys.Space && onGround) vy = 8.2;
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
  updateChunkSet();
  renderMinimap();
  updateHighlight();
  updateCrumbs();

  fpsCount++;
  if (performance.now() - fpsT0 >= 1000) {
    if (fpsEl) fpsEl.textContent = fpsCount + ' FPS';
    fpsCount = 0;
    fpsT0 = performance.now();
  }

  renderer.render(scene, camera);

  if (!bootNotified) {
    bootNotified = true;
    window.parent.postMessage({ type: 'hyvmind-terrain-ready' }, '*');
  }
}

// ─────────────────────────────────────────────────────────────
// Break / place
// ─────────────────────────────────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (!pointerLocked || (e.button !== 0 && e.button !== 2)) return;
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

const HOTBAR_INITIALS = { [B.SPADE]: 'S', [B.BRUSH]: 'B' };
const HOTBAR_NAMES = {
  [B.SPADE]: 'SPADE\nleft: destroy · right: build',
  [B.BRUSH]: 'BRUSH\nleft: write · right: select',
};
function initHotbar() {
  const hotbarEl = document.getElementById('hotbar');
  if (!hotbarEl) return;
  for (let i = 0; i < HOTBAR_BLOCKS.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const t = HOTBAR_BLOCKS[i];
    if (t != null) {
      const initial = document.createElement('span');
      initial.className = 'initial';
      initial.textContent = HOTBAR_INITIALS[t];
      slot.appendChild(initial);
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
  const name = HOTBAR_NAMES[heldBlock];
  if (name) showToolTip(name);
}

function startGame() {
  buildWorld(seed);
  worldReady = true;
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
  window.focus();
  animate();
}

loadTextures((imgs) => {
  buildAtlas(imgs);
  material.map = atlasTexture; material.needsUpdate = true;
  waterMaterial.map = atlasTexture; waterMaterial.needsUpdate = true;
  foliageMaterial.map = atlasTexture; foliageMaterial.needsUpdate = true;
  initHotbar();
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
