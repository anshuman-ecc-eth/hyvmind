import { useEffect, useRef } from "react";

interface HexagonBackgroundProps {
  size?: number;
  glowRadius?: number;
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
  glowRadius = 150,
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

    function drawHexagon(cx: number, cy: number, sz: number, glow: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + sz * Math.cos(angle);
        const y = cy + sz * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      ctx.fillStyle = `color-mix(in srgb, ${accentColor} ${Math.round(3 + glow * 20)}%, transparent)`;
      ctx.fill();

      ctx.strokeStyle = `color-mix(in srgb, ${accentColor} ${Math.round(8 + glow * 60)}%, transparent)`;
      ctx.lineWidth = 0.5 + glow * 2;
      ctx.stroke();
    }

    const cnv = canvas;

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

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = row % 2 === 0 ? 0 : hSpacing / 2;
          const cx = col * hSpacing + offsetX;
          const cy = row * vSpacing + size;

          const dx = mouseX - cx;
          const dy = mouseY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const rawGlow = Math.max(0, 1 - dist / glowRadius);
          const glow = rawGlow * rawGlow;

          drawHexagon(cx, cy, size, glow);
        }
      }

      animationId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, [size, glowRadius]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
