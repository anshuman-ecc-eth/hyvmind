import { useAnimationFrame } from "motion/react";
import { useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?";

function randomChar(): string {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

interface ScrambleTextProps {
  text: string;
  duration?: number;
  onComplete?: () => void;
  cursor?: React.ReactNode;
}

export default function ScrambleText({
  text,
  duration = 800,
  onComplete,
  cursor,
}: ScrambleTextProps) {
  const [displayChars, setDisplayChars] = useState<string[]>(() =>
    Array.from(text).map((c) => (c === " " ? " " : randomChar())),
  );
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset when text changes — refs are intentionally reset here
  // biome-ignore lint/correctness/useExhaustiveDependencies: text is the intentional trigger; refs are reset side effects
  useEffect(() => {
    elapsedRef.current = 0;
    doneRef.current = false;
    setDisplayChars(
      Array.from(text).map((c) => (c === " " ? " " : randomChar())),
    );
  }, [text]);

  useAnimationFrame((_, delta) => {
    if (doneRef.current) return;
    elapsedRef.current += delta;
    const progress = Math.min(elapsedRef.current / duration, 1);

    const next = Array.from(text).map((char, i) => {
      if (char === " ") return " ";
      if (progress > i / text.length) return char;
      return randomChar();
    });

    setDisplayChars(next);

    if (progress >= 1) {
      doneRef.current = true;
      onCompleteRef.current?.();
    }
  });

  return (
    <p className="text-game-font text-foreground text-base leading-relaxed tracking-wide text-center">
      {displayChars.join("")}
      {cursor}
    </p>
  );
}
