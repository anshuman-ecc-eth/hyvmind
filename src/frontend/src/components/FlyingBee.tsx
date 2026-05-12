import gsap from "gsap";
import { useEffect, useRef } from "react";

interface FlyingBeeProps {
  modalRef: React.RefObject<HTMLDivElement | null>;
  yRef: React.RefObject<HTMLSpanElement | null>;
  visible: boolean;
}

export default function FlyingBee({ modalRef, yRef, visible }: FlyingBeeProps) {
  const beeRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<
    "idle" | "entering" | "perched" | "fleeing" | "returning"
  >("idle");
  const mouseViewport = useRef({ x: 0, y: 0 });
  const beeViewport = useRef({ x: 0, y: 0 });
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const getPerchViewport = () => {
    if (!yRef.current) return null;
    const r = yRef.current.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
  };

  const getCornerViewport = () => {
    if (!modalRef.current) return { x: 0, y: 0 };
    const mr = modalRef.current.getBoundingClientRect();
    const corners: Array<{ x: number; y: number }> = [
      { x: mr.left - 40, y: mr.top - 40 },
      { x: mr.right + 40, y: mr.top - 40 },
      { x: mr.left - 40, y: mr.bottom + 40 },
      { x: mr.right + 40, y: mr.bottom + 40 },
    ];
    return corners[Math.floor(Math.random() * 4)];
  };

  const getEscapeViewport = () => {
    if (!modalRef.current) return { x: 0, y: 0 };
    const mr = modalRef.current.getBoundingClientRect();
    const sides: Array<{ x: number; y: number }> = [
      { x: mr.left - 60, y: mr.top + Math.random() * mr.height },
      { x: mr.right + 60, y: mr.top + Math.random() * mr.height },
      { x: mr.left + Math.random() * mr.width, y: mr.top - 60 },
      { x: mr.left + Math.random() * mr.width, y: mr.bottom + 60 },
    ];
    return sides[Math.floor(Math.random() * 4)];
  };

  const vpToBee = (vx: number, vy: number) => {
    if (!wrapperRef.current?.parentElement) return { x: vx, y: vy };
    const pr = wrapperRef.current.parentElement.getBoundingClientRect();
    return { x: vx - pr.left, y: vy - pr.top };
  };

  const buildZigzag = (
    fx: number,
    fy: number,
    tx: number,
    ty: number,
    n = 5,
  ) => {
    const frames: Array<{ x: number; y: number; d: number; r: string }> = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const bx = fx + (tx - fx) * t;
      const by = fy + (ty - fy) * t;
      const zx = (i % 2 === 0 ? 1 : -1) * (15 + Math.random() * 25);
      const zy = (i % 3 === 0 ? 1 : -1) * (10 + Math.random() * 20);
      frames.push({
        x: bx + zx,
        y: by + zy,
        d: 0.08 + Math.random() * 0.07,
        r: `+=${(Math.random() - 0.5) * 30}`,
      });
    }
    frames.push({ x: tx, y: ty, d: 0.05, r: "+=5" });
    return frames;
  };

  const updateBeeViewport = () => {
    if (!beeRef.current) return;
    const r = beeRef.current.getBoundingClientRect();
    beeViewport.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const killBee = () => {
    if (beeRef.current) gsap.killTweensOf(beeRef.current);
  };

  const animatePathVp = (
    tvx: number,
    tvy: number,
    zigs: number,
    onDone?: () => void,
  ) => {
    if (!beeRef.current) return;
    killBee();
    const curX = gsap.getProperty(beeRef.current, "x") as number;
    const curY = gsap.getProperty(beeRef.current, "y") as number;
    const target = vpToBee(tvx, tvy);
    const frames = buildZigzag(curX, curY, target.x, target.y, zigs);
    const tl = gsap.timeline({ onComplete: onDone });
    for (const f of frames) {
      tl.to(beeRef.current!, {
        x: f.x,
        y: f.y,
        rotation: f.r,
        duration: f.d,
        ease: "power1.out",
        onUpdate: updateBeeViewport,
      });
    }
  };

  const startPerch = () => {
    if (!beeRef.current) return;
    statusRef.current = "perched";
    gsap.to(beeRef.current, {
      rotation: 5,
      y: "+=2",
      duration: 1.0,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    updateBeeViewport();
  };

  const flee = () => {
    statusRef.current = "fleeing";
    const ep = getEscapeViewport();
    animatePathVp(ep.x, ep.y, 4, () => {
      if (returnTimer.current) clearTimeout(returnTimer.current);
      returnTimer.current = setTimeout(() => {
        if (statusRef.current === "fleeing") returnToPerch();
      }, 1500);
    });
  };

  const returnToPerch = () => {
    const pp = getPerchViewport();
    if (!pp) return;
    statusRef.current = "returning";
    animatePathVp(pp.x, pp.y, 5, () => {
      startPerch();
    });
  };

  const enter = () => {
    if (!beeRef.current || !loadedRef.current) return;
    if (statusRef.current !== "idle") return;
    const pp = getPerchViewport();
    if (!pp) return;
    statusRef.current = "entering";
    const cp = getCornerViewport();
    const beePos = vpToBee(cp.x, cp.y);
    gsap.set(beeRef.current, {
      x: beePos.x,
      y: beePos.y,
      rotation: 0,
      opacity: 1,
    });
    animatePathVp(pp.x, pp.y, 6, () => {
      startPerch();
    });
  };

  const hide = () => {
    if (!beeRef.current) return;
    killBee();
    gsap.to(beeRef.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        statusRef.current = "idle";
        if (returnTimer.current) {
          clearTimeout(returnTimer.current);
          returnTimer.current = null;
        }
      },
    });
  };

  const fleeRef = useRef(flee);
  fleeRef.current = flee;
  const enterRef = useRef(enter);
  enterRef.current = enter;
  const hideRef = useRef(hide);
  hideRef.current = hide;

  useEffect(() => {
    if (visible && statusRef.current === "idle") {
      const t = setTimeout(() => enterRef.current(), 100);
      return () => clearTimeout(t);
    }
    if (!visible && statusRef.current !== "idle") {
      hideRef.current();
    }
  }, [visible]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      mouseViewport.current = { x: e.clientX, y: e.clientY };
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [modalRef]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (statusRef.current === "perched" || statusRef.current === "entering") {
        const dx = mouseViewport.current.x - beeViewport.current.x;
        const dy = mouseViewport.current.y - beeViewport.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 120) fleeRef.current();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <img
        ref={beeRef}
        src="/assets/generated/pixel-bee.svg"
        alt=""
        onLoad={() => {
          loadedRef.current = true;
          if (statusRef.current === "idle") enterRef.current();
        }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "28px",
          height: "19px",
          imageRendering: "pixelated",
          opacity: 0,
        }}
      />
    </div>
  );
}
