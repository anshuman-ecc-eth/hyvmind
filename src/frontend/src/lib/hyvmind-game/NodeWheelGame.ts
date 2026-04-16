import type { GameInstance, TextPools } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────────

const VIEW_W = 100;
const VIEW_H = 100;
const SPIKE_COUNT = 24;
const WHEEL_RADIUS = 32;
const WHEEL_CX = 50;
const WHEEL_CY = 50;
const PLAYER_X = 50;
const PLAYER_START_Y = 20;
const BAR_SPEED = 1.5;
const JUMP_VY = -2.5;
const GRAVITY = 0.12;
const BONUS_ORBIT_RADIUS = 20;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Spike {
  angle: number; // radians, position on wheel rim
  label: string;
  hit: boolean;
}

interface Bonus {
  angle: number; // orbit angle
  label: string;
  collected: boolean;
}

interface FallingBar {
  x: number;
  y: number;
  label: string;
  active: boolean;
}

interface GameState {
  spikes: Spike[];
  bonuses: Bonus[];
  bars: FallingBar[];
  playerY: number;
  playerVY: number;
  onGround: boolean;
  wheelAngle: number; // rotation offset in radians
  score: number;
  multiplier: number;
  gameOver: boolean;
  curations: string[];
  swarms: string[];
  lawEntities: string[];
  labelPool: number; // cycling index
  barCooldown: number;
  barFired: boolean; // did we fire a bar on this fall?
  particles: Particle[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function cycleFrom<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}

function buildSpikes(curations: string[], count: number): Spike[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2,
    label: cycleFrom(curations, i),
    hit: false,
  }));
}

function buildBonuses(swarms: string[], count: number): Bonus[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2,
    label: cycleFrom(swarms, i),
    collected: false,
  }));
}

// ── Canvas text helpers ────────────────────────────────────────────────────────

function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillStyle: string,
  fontSize: number,
  rotate?: number,
) {
  ctx.save();
  ctx.translate(x, y);
  if (rotate !== undefined) ctx.rotate(rotate);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Black outline (4 directions)
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  const offsets = [
    [-0.8, 0],
    [0.8, 0],
    [0, -0.8],
    [0, 0.8],
  ];
  for (const [dx, dy] of offsets) {
    ctx.fillText(text, dx, dy);
  }
  // Colored fill
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function initGame(
  container: HTMLElement,
  pools: TextPools,
  onGameOver: (score: number) => void,
): GameInstance {
  // ── Canvas setup ────────────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "display:block;width:100%;height:100%;image-rendering:pixelated;background:#f0f0e0";
  container.appendChild(canvas);

  let animId = 0;
  let lastTime = 0;
  let scale = 1;

  function resize() {
    const rect = container.getBoundingClientRect();
    const s = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    scale = s;
    canvas.width = Math.round(VIEW_W * s);
    canvas.height = Math.round(VIEW_H * s);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // ── Game state ───────────────────────────────────────────────────────────────
  const state: GameState = {
    spikes: [],
    bonuses: [],
    bars: [],
    playerY: PLAYER_START_Y,
    playerVY: 0,
    onGround: false,
    wheelAngle: 0,
    score: 0,
    multiplier: 1,
    gameOver: false,
    curations: [...pools.curations],
    swarms: [...pools.swarms],
    lawEntities: [...pools.lawEntities],
    labelPool: 0,
    barCooldown: 0,
    barFired: false,
    particles: [],
  };

  function resetState() {
    state.spikes = buildSpikes(state.curations, SPIKE_COUNT);
    state.bonuses = buildBonuses(state.swarms, 3);
    state.bars = [];
    state.playerY = PLAYER_START_Y;
    state.playerVY = 0;
    state.onGround = false;
    state.wheelAngle = 0;
    state.score = 0;
    state.multiplier = 1;
    state.gameOver = false;
    state.labelPool = 0;
    state.barCooldown = 0;
    state.barFired = false;
    state.particles = [];
  }

  resetState();

  // ── Input ─────────────────────────────────────────────────────────────────
  let inputJustPressed = false;

  function handleInput() {
    if (state.gameOver) return;
    inputJustPressed = true;
  }

  canvas.addEventListener("pointerdown", handleInput);
  const handleKey = (e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      handleInput();
    }
  };
  window.addEventListener("keydown", handleKey);

  // ── Update ────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state.gameOver) return;

    const dtN = Math.min(dt / 16.67, 3); // normalized to 60fps ticks

    // Wheel rotation
    state.wheelAngle += 0.008 * dtN;

    // Player physics
    const wasAboveGround = !state.onGround;

    if (inputJustPressed) {
      state.playerVY = JUMP_VY;
      state.onGround = false;
      state.barFired = false;
    }

    state.playerVY += GRAVITY * dtN;
    state.playerY += state.playerVY * dtN;

    // Ground = top of wheel area (player bounces off the wheel)
    const groundY = PLAYER_START_Y;
    if (state.playerY <= groundY) {
      state.playerY = groundY;
      if (state.playerVY < 0) state.playerVY = 0;
    }

    // Ceiling / wall detection — player at PLAYER_X, moving vertically
    // When player falls back close to start, reset to ground
    if (state.playerY >= PLAYER_START_Y + 5 && wasAboveGround) {
      // Player is falling — fire bar on the way down if not already fired
      if (!state.barFired && state.barCooldown <= 0) {
        const lawLabel = cycleFrom(state.lawEntities, state.labelPool);
        state.labelPool++;
        state.bars.push({
          x: PLAYER_X,
          y: state.playerY,
          label: lawLabel,
          active: true,
        });
        state.barFired = true;
        state.barCooldown = 10;
      }
    }

    if (state.playerVY >= 0 && state.playerY >= PLAYER_START_Y) {
      state.onGround = true;
      state.playerY = PLAYER_START_Y;
      state.playerVY = 0;
      state.barFired = false;
    } else {
      state.onGround = false;
    }

    if (state.barCooldown > 0) state.barCooldown -= dtN;

    // Move bars downward
    for (const bar of state.bars) {
      if (!bar.active) continue;
      bar.y += BAR_SPEED * dtN;
    }

    // Bonus orbit
    for (const bonus of state.bonuses) {
      if (bonus.collected) continue;
      bonus.angle += 0.02 * dtN;
    }

    // Collision: bars vs spikes
    for (const bar of state.bars) {
      if (!bar.active) continue;
      for (const spike of state.spikes) {
        if (spike.hit) continue;
        const spikeWorldAngle = spike.angle + state.wheelAngle;
        const sx = WHEEL_CX + Math.cos(spikeWorldAngle) * WHEEL_RADIUS;
        const sy = WHEEL_CY + Math.sin(spikeWorldAngle) * WHEEL_RADIUS;
        const dist = Math.hypot(bar.x - sx, bar.y - sy);
        if (dist < 5) {
          spike.hit = true;
          bar.active = false;
          const pts = 10 * state.multiplier;
          state.score += pts;
          spawnParticles(sx, sy, "#ff4444");
        }
      }
    }

    // Collision: player vs bonuses
    for (const bonus of state.bonuses) {
      if (bonus.collected) continue;
      const bx = WHEEL_CX + Math.cos(bonus.angle) * BONUS_ORBIT_RADIUS;
      const by = WHEEL_CY + Math.sin(bonus.angle) * BONUS_ORBIT_RADIUS;
      const dist = Math.hypot(PLAYER_X - bx, state.playerY - by);
      if (dist < 6) {
        bonus.collected = true;
        state.multiplier = Math.min(state.multiplier + 1, 5);
        state.score += 50 * state.multiplier;
        spawnParticles(bx, by, "#ffd700");
      }
    }

    // Collision: player vs spikes (GAME OVER immediately)
    for (const spike of state.spikes) {
      if (spike.hit) continue;
      const spikeWorldAngle = spike.angle + state.wheelAngle;
      const sx = WHEEL_CX + Math.cos(spikeWorldAngle) * WHEEL_RADIUS;
      const sy = WHEEL_CY + Math.sin(spikeWorldAngle) * WHEEL_RADIUS;
      const dist = Math.hypot(PLAYER_X - sx, state.playerY - sy);
      if (dist < 4.5) {
        state.gameOver = true;
        spawnParticles(PLAYER_X, state.playerY, "#ffffff");
        // Small delay then callback
        setTimeout(() => onGameOver(state.score), 600);
        return;
      }
    }

    // Remove off-screen bars
    state.bars = state.bars.filter((b) => b.y < VIEW_H + 10 && b.active);

    // Regenerate spikes if all hit
    const activeSpikes = state.spikes.filter((s) => !s.hit);
    if (activeSpikes.length === 0) {
      state.spikes = buildSpikes(state.curations, SPIKE_COUNT);
      state.score += 100 * state.multiplier;
      spawnParticles(WHEEL_CX, WHEEL_CY, "#44ff88");
    }

    // Update particles
    for (const p of state.particles) {
      p.x += p.vx * dtN;
      p.y += p.vy * dtN;
      p.life -= dtN;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (0.5 + Math.random()),
        vy: Math.sin(angle) * (0.5 + Math.random()),
        life: 20,
        maxLife: 20,
        color,
      });
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#f0f0e0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(s, s);

    // ── Wheel ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(WHEEL_CX, WHEEL_CY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // ── Spikes ────────────────────────────────────────────────────────────
    for (const spike of state.spikes) {
      if (spike.hit) continue;
      const worldAngle = spike.angle + state.wheelAngle;
      const sx = WHEEL_CX + Math.cos(worldAngle) * WHEEL_RADIUS;
      const sy = WHEEL_CY + Math.sin(worldAngle) * WHEEL_RADIUS;

      // Spike triangle
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(worldAngle + Math.PI / 2);
      ctx.fillStyle = "#cc2222";
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(-2, 1);
      ctx.lineTo(2, 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Label
      const labelAngle = worldAngle - Math.PI / 2;
      const labelR = WHEEL_RADIUS + 10;
      const lx = WHEEL_CX + Math.cos(worldAngle) * labelR;
      const ly = WHEEL_CY + Math.sin(worldAngle) * labelR;
      const label = truncateLabel(spike.label, 8);
      drawOutlinedText(ctx, label, lx, ly, "#cc2222", 2.5, labelAngle);
    }

    // ── Bonuses ────────────────────────────────────────────────────────────
    for (const bonus of state.bonuses) {
      if (bonus.collected) continue;
      const bx = WHEEL_CX + Math.cos(bonus.angle) * BONUS_ORBIT_RADIUS;
      const by = WHEEL_CY + Math.sin(bonus.angle) * BONUS_ORBIT_RADIUS;

      ctx.fillStyle = "#cc8800";
      ctx.beginPath();
      ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fill();

      const label = truncateLabel(bonus.label, 8);
      drawOutlinedText(ctx, label, bx, by - 5, "#cc8800", 2.5);
    }

    // ── Falling bars ───────────────────────────────────────────────────────
    for (const bar of state.bars) {
      if (!bar.active) continue;
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(bar.x - 0.8, bar.y - 3, 1.6, 6);
      const label = truncateLabel(bar.label, 8);
      drawOutlinedText(ctx, label, bar.x + 5, bar.y, "#3366cc", 2);
    }

    // ── Player ─────────────────────────────────────────────────────────────
    if (!state.gameOver) {
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(PLAYER_X, state.playerY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // White highlight
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(PLAYER_X - 0.7, state.playerY - 0.7, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Particles ──────────────────────────────────────────────────────────
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── HUD ────────────────────────────────────────────────────────────────
    ctx.font = "bold 4px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000";
    ctx.fillText(`${state.score}`, 2, 2);

    if (state.multiplier > 1) {
      ctx.fillStyle = "#cc8800";
      ctx.fillText(`x${state.multiplier}`, 2, 8);
    }

    // ── Game Over overlay ─────────────────────────────────────────────────
    if (state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", VIEW_W / 2, VIEW_H / 2 - 6);
      ctx.font = "bold 4.5px monospace";
      ctx.fillText(`score: ${state.score}`, VIEW_W / 2, VIEW_H / 2 + 4);
    }

    // ── Controls hint ─────────────────────────────────────────────────────
    if (state.onGround && !state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = "3px monospace";
      ctx.textAlign = "center";
      ctx.fillText("tap / space to jump", VIEW_W / 2, VIEW_H - 4);
    }

    ctx.restore();
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop(time: number) {
    const dt = lastTime === 0 ? 16.67 : time - lastTime;
    lastTime = time;

    if (inputJustPressed) {
      update(dt);
      inputJustPressed = false;
    } else {
      update(dt);
    }
    draw();

    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return {
    cleanup() {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handleInput);
      window.removeEventListener("keydown", handleKey);
      container.removeChild(canvas);
    },
  };
}
