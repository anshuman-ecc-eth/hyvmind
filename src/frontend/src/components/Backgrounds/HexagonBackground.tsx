import { useEffect, useRef } from "react";

interface HexagonBackgroundProps {
  size?: number;
  hoverRadius?: number;
}

function resolveCSSColor(varName: string): string {
  const el = document.createElement("div");
  el.style.color = varName;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  document.body.removeChild(el);
  return resolved;
}

export default function HexagonBackground({
  size = 14,
  hoverRadius = 150,
}: HexagonBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiltRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;

    let animationId: number;
    let mouseX = -9999;
    let mouseY = -9999;

    const accentColor = resolveCSSColor("var(--primary)");
    const currentTilt = tiltRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const handlePointer = (e: PointerEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('[data-zone="content"]')
      ) {
        mouseX = -9999;
        mouseY = -9999;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        mouseX = x;
        mouseY = y;
      } else {
        mouseX = -9999;
        mouseY = -9999;
      }
    };
    window.addEventListener("pointermove", handlePointer);

    const hexWidth = Math.sqrt(3) * size;
    const hSpacing = hexWidth;
    const vSpacing = size * 1.5;
    const focalLength = size * 15;

    function drawHexagonFlat(
      cx: number,
      cy: number,
      sz: number,
      hovered: boolean,
    ) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + sz * Math.cos(angle);
        const y = cy + sz * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      if (hovered) {
        ctx.fillStyle = `color-mix(in srgb, ${accentColor} 20%, transparent)`;
        ctx.strokeStyle = `color-mix(in srgb, ${accentColor} 70%, transparent)`;
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = `color-mix(in srgb, ${accentColor} 3%, transparent)`;
        ctx.strokeStyle = `color-mix(in srgb, ${accentColor} 8%, transparent)`;
        ctx.lineWidth = 0.5;
      }
      ctx.fill();
      ctx.stroke();
    }

    function drawHexagon3D(
      cx: number,
      cy: number,
      sz: number,
      tiltX: number,
      tiltY: number,
    ) {
      const cosY = Math.cos(tiltY);
      const sinY = Math.sin(tiltY);
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        let lx = sz * Math.cos(angle);
        let ly = sz * Math.sin(angle);
        let lz = 0;

        // rotateY
        const x1 = lx * cosY + lz * sinY;
        const z1 = -lx * sinY + lz * cosY;
        // rotateX
        const y1 = ly * cosX - z1 * sinX;
        const z2 = ly * sinX + z1 * cosX;
        // perspective projection
        const scale = focalLength / (focalLength + z2);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = `color-mix(in srgb, ${accentColor} 20%, transparent)`;
      ctx.strokeStyle = `color-mix(in srgb, ${accentColor} 70%, transparent)`;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    const cnv = canvas;
    const hoverDist = hoverRadius * hoverRadius;
    const maxTilt = 0.5;

    function render() {
      const w = cnv.clientWidth;
      const h = cnv.clientHeight;
      if (w === 0 || h === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / hSpacing) + 2;
      const rows = Math.ceil(h / vSpacing) + 2;

      let hoverRow = -1;
      let hoverCol = -1;
      let hoverCx = 0;
      let hoverCy = 0;
      let minDist2 = hoverDist;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = row % 2 === 0 ? 0 : hSpacing / 2;
          const cx = col * hSpacing + offsetX;
          const cy = row * vSpacing + size;
          const dx = mouseX - cx;
          const dy = mouseY - cy;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < minDist2) {
            minDist2 = dist2;
            hoverRow = row;
            hoverCol = col;
            hoverCx = cx;
            hoverCy = cy;
          }
        }
      }

      // Compute target tilt toward cursor
      let targetTiltX = 0;
      let targetTiltY = 0;
      if (hoverRow >= 0) {
        const dx = mouseX - hoverCx;
        const dy = mouseY - hoverCy;
        const dist = Math.max(Math.hypot(dx, dy), 0.001);
        if (dist < hoverRadius) {
          const factor = 1 - dist / hoverRadius;
          const angle = factor * maxTilt;
          targetTiltY = (dx / dist) * angle;
          targetTiltX = (dy / dist) * angle;
        }
      }

      // Smooth interpolation
      currentTilt.x += (targetTiltX - currentTilt.x) * 0.12;
      currentTilt.y += (targetTiltY - currentTilt.y) * 0.12;

      const hasHover = hoverRow >= 0;
      const tiltX = currentTilt.x;
      const tiltY = currentTilt.y;
      const is3D = Math.abs(tiltX) > 0.001 || Math.abs(tiltY) > 0.001;

      // Draw non-hovered hexagons (flat path)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (hasHover && row === hoverRow && col === hoverCol) continue;
          const offsetX = row % 2 === 0 ? 0 : hSpacing / 2;
          const cx = col * hSpacing + offsetX;
          const cy = row * vSpacing + size;
          drawHexagonFlat(cx, cy, size, false);
        }
      }

      // Draw hovered hexagon with 3D rotation
      if (hasHover && is3D) {
        drawHexagon3D(hoverCx, hoverCy, size * 1.15, tiltX, tiltY);
      } else if (hasHover) {
        drawHexagonFlat(hoverCx, hoverCy, size * 1.15, true);
      }

      animationId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, [size, hoverRadius]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", zIndex: -1 }}
    />
  );
}
