import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";

// Register the useGSAP plugin
gsap.registerPlugin(useGSAP);

export interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
}

export default function TargetCursor({
  targetSelector = ".cursor-target",
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
}: TargetCursorProps) {
  const isTouchDevice =
    typeof window !== "undefined" && "ontouchstart" in window;

  const cursorRef = useRef<HTMLDivElement>(null);
  const topLeftRef = useRef<HTMLDivElement>(null);
  const topRightRef = useRef<HTMLDivElement>(null);
  const bottomLeftRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTouchDevice || !hideDefaultCursor) return;
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = "";
    };
  }, [isTouchDevice, hideDefaultCursor]);

  useGSAP(() => {
    if (isTouchDevice || !cursorRef.current) return;

    // Spin the cursor ring continuously
    gsap.timeline({ repeat: -1 }).to(cursorRef.current, {
      rotation: 360,
      duration: spinDuration,
      ease: "none",
    });

    // RAF loop to snap cursor to mouse
    function tick() {
      if (cursorRef.current) {
        gsap.set(cursorRef.current, {
          x: mousePos.current.x,
          y: mousePos.current.y,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isTouchDevice, spinDuration]);

  useEffect(() => {
    if (isTouchDevice) return;

    function onMouseMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseEnter(e: MouseEvent) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pad = 8;

      gsap.to(topLeftRef.current, {
        x: rect.left - pad,
        y: rect.top - pad,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(topRightRef.current, {
        x: rect.right + pad - 12,
        y: rect.top - pad,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(bottomLeftRef.current, {
        x: rect.left - pad,
        y: rect.bottom + pad - 12,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(bottomRightRef.current, {
        x: rect.right + pad - 12,
        y: rect.bottom + pad - 12,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
    }

    function onMouseLeave(_e: MouseEvent) {
      // Return corners near the mouse position
      const cx = mousePos.current.x;
      const cy = mousePos.current.y;
      gsap.to(topLeftRef.current, {
        x: cx - 8,
        y: cy - 8,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(topRightRef.current, {
        x: cx,
        y: cy - 8,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(bottomLeftRef.current, {
        x: cx - 8,
        y: cy,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(bottomRightRef.current, {
        x: cx,
        y: cy,
        duration: hoverDuration,
        ease: "power2.out",
        overwrite: true,
      });
    }

    document.addEventListener("mousemove", onMouseMove);

    function attachListeners() {
      const targets = document.querySelectorAll<HTMLElement>(targetSelector);
      for (const el of targets) {
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
        el.addEventListener("mouseenter", onMouseEnter);
        el.addEventListener("mouseleave", onMouseLeave);
      }
    }

    attachListeners();

    const observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
      const targets = document.querySelectorAll<HTMLElement>(targetSelector);
      for (const el of targets) {
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, [isTouchDevice, targetSelector, hoverDuration]);

  if (isTouchDevice) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    >
      {/* Main spinning reticle — positioned via GSAP x/y */}
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          mixBlendMode: "difference",
          color: "white",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1.5px solid currentColor",
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 3,
            height: 3,
            marginLeft: -1.5,
            marginTop: -1.5,
            borderRadius: "50%",
            background: "currentColor",
          }}
        />
        {/* Cardinal tick marks */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: 1,
            height: 4,
            marginLeft: -0.5,
            background: "currentColor",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            width: 1,
            height: 4,
            marginLeft: -0.5,
            background: "currentColor",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: 4,
            height: 1,
            marginTop: -0.5,
            background: "currentColor",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 0,
            width: 4,
            height: 1,
            marginTop: -0.5,
            background: "currentColor",
          }}
        />
      </div>

      {/* Corner brackets — lock onto hovered cursor-target elements */}
      <div
        ref={topLeftRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderTop: "2px solid white",
          borderLeft: "2px solid white",
          mixBlendMode: "difference",
        }}
      />
      <div
        ref={topRightRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderTop: "2px solid white",
          borderRight: "2px solid white",
          mixBlendMode: "difference",
        }}
      />
      <div
        ref={bottomLeftRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderBottom: "2px solid white",
          borderLeft: "2px solid white",
          mixBlendMode: "difference",
        }}
      />
      <div
        ref={bottomRightRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderBottom: "2px solid white",
          borderRight: "2px solid white",
          mixBlendMode: "difference",
        }}
      />
    </div>
  );
}
