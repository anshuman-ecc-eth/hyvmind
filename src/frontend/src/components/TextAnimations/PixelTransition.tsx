import gsap from "gsap";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface PixelTransitionProps {
  firstContent: ReactNode;
  secondContent: ReactNode;
  pixelSize?: number;
  pixelColor?: string;
  animationStepDuration?: number;
}

export default function PixelTransition({
  firstContent,
  secondContent,
  pixelSize = 6,
  pixelColor = "var(--foreground)",
  animationStepDuration = 0.3,
}: PixelTransitionProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const pixelGridRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const delayedCallRef = useRef<gsap.core.Tween | null>(null);
  const [isActive, setIsActive] = useState(false);
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const pixelGridEl = pixelGridRef.current;
    const containerEl = containerRef.current;
    if (!pixelGridEl || !containerEl) return;
    pixelGridEl.innerHTML = "";

    const w = containerEl.offsetWidth;
    const h = containerEl.offsetHeight;
    if (w === 0 || h === 0) return;

    const cols = Math.ceil(w / pixelSize);
    const rows = Math.ceil(h / pixelSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pixel = document.createElement("div");
        pixel.style.cssText = `display:none;position:absolute;background-color:${pixelColor};`;
        pixel.style.width = `${100 / cols}%`;
        pixel.style.height = `${100 / rows}%`;
        pixel.style.left = `${(col * 100) / cols}%`;
        pixel.style.top = `${(row * 100) / rows}%`;
        pixelGridEl.appendChild(pixel);
      }
    }
  }, [pixelSize, pixelColor]);

  const animatePixels = (activate: boolean) => {
    setIsActive(activate);
    const pixelGridEl = pixelGridRef.current;
    const activeEl = activeRef.current;
    if (!pixelGridEl || !activeEl) return;

    const pixels = Array.from(pixelGridEl.querySelectorAll<HTMLElement>("div"));
    if (!pixels.length) return;

    gsap.killTweensOf(pixels);
    delayedCallRef.current?.kill();

    gsap.set(pixels, { display: "none" });

    const totalPixels = pixels.length;
    const staggerDuration = animationStepDuration / totalPixels;

    gsap.to(pixels, {
      display: "block",
      duration: 0,
      stagger: { each: staggerDuration, from: "random" },
    });

    delayedCallRef.current = gsap.delayedCall(animationStepDuration, () => {
      activeEl.style.display = activate ? "flex" : "none";
    });

    gsap.to(pixels, {
      display: "none",
      duration: 0,
      delay: animationStepDuration,
      stagger: { each: staggerDuration, from: "random" },
    });
  };

  return (
    <button
      ref={containerRef}
      type="button"
      className="pixel-transition"
      style={{
        position: "relative",
        display: "inline-block",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={
        isTouchDevice
          ? undefined
          : () => {
              if (!isActive) animatePixels(true);
            }
      }
      onMouseLeave={
        isTouchDevice
          ? undefined
          : () => {
              if (isActive) animatePixels(false);
            }
      }
      onClick={() => {
        if (!isTouchDevice) return;
        animatePixels(!isActive);
      }}
      aria-label="Toggle title"
    >
      <div
        className="pixel-transition__default"
        style={{ opacity: isActive ? 0 : 1 }}
      >
        {firstContent}
      </div>
      <div
        ref={activeRef}
        className="pixel-transition__active"
        style={{
          display: "none",
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {secondContent}
      </div>
      <div
        ref={pixelGridRef}
        className="pixel-transition__pixels"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
        }}
      />
    </button>
  );
}
