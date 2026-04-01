import { useAnimationFrame } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  text: string;
  delayMs?: number;
}

interface UseTypewriterResult {
  displayText: string;
  isComplete: boolean;
}

export function useTypewriter({
  text,
  delayMs = 30,
}: UseTypewriterOptions): UseTypewriterResult {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const charIndexRef = useRef(0);
  const accumRef = useRef(0);
  const doneRef = useRef(false);

  // Reset when text changes — refs are intentionally reset here
  // biome-ignore lint/correctness/useExhaustiveDependencies: text is the intentional trigger; refs are reset side effects
  useEffect(() => {
    charIndexRef.current = 0;
    accumRef.current = 0;
    doneRef.current = false;
    setDisplayText("");
    setIsComplete(false);
  }, [text]);

  useAnimationFrame((_, delta) => {
    if (doneRef.current) return;
    accumRef.current += delta;
    if (accumRef.current >= delayMs) {
      accumRef.current = 0;
      const next = charIndexRef.current + 1;
      charIndexRef.current = next;
      setDisplayText(text.slice(0, next));
      if (next >= text.length) {
        doneRef.current = true;
        setIsComplete(true);
      }
    }
  });

  return { displayText, isComplete };
}
