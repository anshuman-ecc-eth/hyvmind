import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useCallback, useEffect, useRef } from "react";

gsap.registerPlugin(SplitText);

const SCRAMBLE = "!@#$%^&*()abcdefghijklmnopqrstuvwxyz";

interface ShuffleTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "p" | "span" | "h1" | "h2";
  [key: string]: unknown;
}

export default function ShuffleText({
  text,
  className = "",
  style = {},
  as: Tag = "div",
  ...rest
}: ShuffleTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false);
  const splitRef = useRef<SplitText | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !text) return;

    try {
      splitRef.current = new SplitText(el, {
        type: "chars",
        charsClass: "shuffle-char",
      });
      const chars = splitRef.current.chars;
      if (chars && chars.length > 0) {
        for (const ch of chars) {
          (ch as HTMLElement).style.display = "inline-block";
          (ch as HTMLElement).style.position = "relative";
        }
      }
    } catch {
      // SplitText may fail on empty strings
    }

    return () => {
      try {
        splitRef.current?.revert();
      } catch {
        /* noop */
      }
      splitRef.current = null;
    };
  }, [text]);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el || playingRef.current) return;

    const chars = Array.from(el.querySelectorAll<HTMLElement>(".shuffle-char"));
    if (!chars.length) return;

    playingRef.current = true;

    const originals = chars.map((ch) => ch.textContent ?? "");

    // Quick scramble phase — set random chars
    for (const ch of chars) {
      ch.textContent = SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    }

    const tl = gsap.timeline({
      onComplete: () => {
        playingRef.current = false;
      },
    });

    // Staggered settle: each character snaps to original at its own time
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const orig = originals[i];
      const delay = 0.05 + Math.random() * 0.12;
      tl.call(
        () => {
          ch.textContent = orig;
        },
        undefined,
        delay,
      );
    }

    // Also add a small x jitter settle for extra polish
    tl.to(
      chars,
      {
        x: 0,
        duration: 0.3,
        ease: "power3.out",
        stagger: { each: 0.02, from: "random" },
      },
      0,
    );
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ display: "inline-block", ...style }}
      onMouseEnter={handleMouseEnter}
      {...rest}
    >
      {text}
    </Tag>
  );
}
