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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;

    let animationId: number;
    let mouseX = -9999;
    let mouseY = -9999;

    const accentColor = resolveCSSColor("var(--primary)");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const handlePointer = (e: PointerEvent) => {
      const container = canvas.parentElement;
      if (!container) return;
      if (e.target !== container) {
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

    function drawHexagon(cx: number, cy: number, sz: number, hovered: boolean) {
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

    const cnv = canvas;
    const hoverDist = hoverRadius * hoverRadius;

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
          }
        }
      }

      const hasHover = hoverRow >= 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (hasHover && row === hoverRow && col === hoverCol) continue;
          const offsetX = row % 2 === 0 ? 0 : hSpacing / 2;
          const cx = col * hSpacing + offsetX;
          const cy = row * vSpacing + size;
          drawHexagon(cx, cy, size, false);
        }
      }

      if (hasHover) {
        const offsetX = hoverRow % 2 === 0 ? 0 : hSpacing / 2;
        const cx = hoverCol * hSpacing + offsetX;
        const cy = hoverRow * vSpacing + size;
        drawHexagon(cx, cy, size * 1.15, true);
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
