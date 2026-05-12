import gsap from "gsap";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface PixelTransitionProps {
  firstContent: ReactNode;
  secondContent: ReactNode;
  gridSize?: number;
  pixelColor?: string;
  animationStepDuration?: number;
}

export default function PixelTransition({
  firstContent,
  secondContent,
  gridSize = 7,
  pixelColor = "var(--foreground)",
  animationStepDuration = 0.3,
}: PixelTransitionProps) {
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
    if (!pixelGridEl) return;
    pixelGridEl.innerHTML = "";

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pixel = document.createElement("div");
        pixel.style.cssText = `display:none;position:absolute;background-color:${pixelColor};`;
        const size = 100 / gridSize;
        pixel.style.width = `${size}%`;
        pixel.style.height = `${size}%`;
        pixel.style.left = `${col * size}%`;
        pixel.style.top = `${row * size}%`;
        pixelGridEl.appendChild(pixel);
      }
    }
  }, [gridSize, pixelColor]);

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
