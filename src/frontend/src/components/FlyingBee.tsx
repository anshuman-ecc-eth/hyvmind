import gsap from "gsap";
import { useEffect, useRef } from "react";

interface FlyingBeeProps {
  modalRef: React.RefObject<HTMLDivElement | null>;
  yRef: React.RefObject<HTMLSpanElement | null>;
}

export default function FlyingBee({ modalRef, yRef }: FlyingBeeProps) {
  const beeRef = useRef<HTMLImageElement>(null);
  const statusRef = useRef<
    "idle" | "entering" | "perched" | "fleeing" | "returning"
  >("idle");
  const mouseRef = useRef({ x: 0, y: 0 });
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPerch = () => {
    if (!yRef.current) return null;
    const yr = yRef.current.getBoundingClientRect();
    const titleEl = yRef.current.parentElement;
    if (!titleEl) return { x: yr.left - 6, y: yr.top - 18 };
    const tr = titleEl.getBoundingClientRect();
    return { x: yr.left - 6, y: tr.top - 18 };
  };

  const getCorner = () => {
    if (!modalRef.current) return { x: 0, y: 0 };
    const mr = modalRef.current.getBoundingClientRect();
    const corners = [
      { x: mr.left - 40, y: mr.top - 40 },
      { x: mr.right + 40, y: mr.top - 40 },
      { x: mr.left - 40, y: mr.bottom + 40 },
      { x: mr.right + 40, y: mr.bottom + 40 },
    ];
    return corners[Math.floor(Math.random() * 4)];
  };

  const getEscape = () => {
    if (!modalRef.current) return { x: 0, y: 0 };
    const mr = modalRef.current.getBoundingClientRect();
    const sides = [
      { x: mr.left - 60, y: mr.top + Math.random() * mr.height },
      { x: mr.right + 60, y: mr.top + Math.random() * mr.height },
      { x: mr.left + Math.random() * mr.width, y: mr.top - 60 },
      { x: mr.left + Math.random() * mr.width, y: mr.bottom + 60 },
    ];
    return sides[Math.floor(Math.random() * 4)];
  };

  const zigzag = (fx: number, fy: number, tx: number, ty: number, n = 5) => {
    const out: Array<{ x: number; y: number; d: number }> = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const bx = fx + (tx - fx) * t;
      const by = fy + (ty - fy) * t;
      out.push({
        x: bx + (i % 2 === 0 ? 1 : -1) * (15 + Math.random() * 25),
        y: by + (i % 3 === 0 ? 1 : -1) * (10 + Math.random() * 20),
        d: 0.08 + Math.random() * 0.07,
      });
    }
    out.push({ x: tx, y: ty, d: 0.05 });
    return out;
  };

  const gsapFly = (tx: number, ty: number, zigs: number, cb?: () => void) => {
    if (!beeRef.current) return;
    gsap.killTweensOf(beeRef.current);
    const x = gsap.getProperty(beeRef.current, "x") as number;
    const y = gsap.getProperty(beeRef.current, "y") as number;
    const frames = zigzag(x, y, tx, ty, zigs);
    const tl = gsap.timeline({ onComplete: cb });
    for (const f of frames) {
      tl.to(beeRef.current, {
        x: f.x,
        y: f.y,
        rotation: `+=${(Math.random() - 0.5) * 30}`,
        duration: f.d,
        ease: "power1.out",
      });
    }
  };

  const startPerch = () => {
    if (!beeRef.current) return;
    statusRef.current = "perched";
  };

  const doFlee = () => {
    statusRef.current = "fleeing";
    const ep = getEscape();
    gsapFly(ep.x, ep.y, 4, () => {
      if (returnTimer.current) clearTimeout(returnTimer.current);
      returnTimer.current = setTimeout(() => {
        if (statusRef.current === "fleeing") doReturn();
      }, 1500);
    });
  };

  const doReturn = () => {
    const pp = getPerch();
    if (!pp) return;
    statusRef.current = "returning";
    gsapFly(pp.x, pp.y, 5, startPerch);
  };

  const doEnter = () => {
    if (!beeRef.current) return;
    const pp = getPerch();
    if (!pp) return;
    statusRef.current = "entering";
    const cp = getCorner();
    gsap.set(beeRef.current, { x: cp.x, y: cp.y, rotation: 0, opacity: 1 });
    gsapFly(pp.x, pp.y, 6, startPerch);
  };

  const fleeRef = useRef(doFlee);
  fleeRef.current = doFlee;
  const enterRef = useRef(doEnter);
  enterRef.current = doEnter;

  useEffect(() => {
    const t = setTimeout(() => enterRef.current(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [modalRef]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (statusRef.current === "perched" || statusRef.current === "entering") {
        if (!beeRef.current) {
          raf = requestAnimationFrame(loop);
          return;
        }
        const br = beeRef.current.getBoundingClientRect();
        const bx = br.left + br.width / 2;
        const by = br.top + br.height / 2;
        if (
          Math.sqrt(
            (mouseRef.current.x - bx) ** 2 + (mouseRef.current.y - by) ** 2,
          ) < 120
        ) {
          fleeRef.current();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        inset: 0,
      }}
    >
      <img
        ref={beeRef}
        src="/assets/generated/pixel-bee.svg"
        alt=""
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "28px",
          height: "auto",
          imageRendering: "pixelated",
          opacity: 0,
        }}
      />
    </div>
  );
}
