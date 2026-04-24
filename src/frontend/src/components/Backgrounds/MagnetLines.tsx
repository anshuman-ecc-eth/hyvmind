import { useEffect, useRef } from "react";

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
}

export default function MagnetLines({
  rows = 18,
  columns = 18,
  containerSize = "80vmin",
  lineColor = "color-mix(in srgb, var(--foreground) 30%, transparent)",
  lineWidth = "1vmin",
  lineHeight = "6vmin",
  baseAngle = -10,
}: MagnetLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const lines = container.querySelectorAll<HTMLElement>(".magnet-line");
      for (const line of lines) {
        const rect = line.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const a = e.clientX - centerX;
        const b = e.clientY - centerY;
        const c = Math.sqrt(a * a + b * b);
        const angle =
          c === 0
            ? 0
            : ((Math.acos(b / c) * 180) / Math.PI) *
              (e.clientX > centerX ? 1 : -1);
        line.style.setProperty("--rotate", `${angle}deg`);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const totalCells = rows * columns;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 0,
          width: containerSize === "100%" ? "100%" : containerSize,
          height: containerSize === "100%" ? "100%" : containerSize,
          margin: containerSize === "100%" ? undefined : "auto",
        }}
      >
        {Array.from(
          { length: totalCells },
          (_, i) => `cell-${rows}-${columns}-${i}`,
        ).map((cellKey) => (
          <div
            key={cellKey}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="magnet-line"
              style={{
                width: lineWidth,
                height: lineHeight,
                background: lineColor,
                transform: `rotate(var(--rotate, ${baseAngle}deg))`,
                transition: "transform 0.1s ease",
                transformOrigin: "center center",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
