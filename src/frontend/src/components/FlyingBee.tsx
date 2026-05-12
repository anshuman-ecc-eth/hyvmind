import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function FlyingBee() {
  const beeRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!beeRef.current) return;
    gsap.set(beeRef.current, { opacity: 1, x: 400, y: 300 });
  }, []);

  return (
    <img
      ref={beeRef}
      src="/assets/generated/pixel-bee.svg"
      alt=""
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "28px",
        height: "19px",
        imageRendering: "pixelated",
        opacity: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    />
  );
}
