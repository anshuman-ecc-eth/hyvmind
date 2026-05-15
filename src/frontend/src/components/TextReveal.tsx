import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TextRevealProps {
  lines: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export default function TextReveal({
  lines,
  containerRef,
  className = "",
}: TextRevealProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {lines.map((line, i) =>
        line.trim() === "" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative lines, order never changes
          <div key={i} className="h-4" />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static lines list, order never changes
          <RevealLine key={i} containerRef={containerRef}>
            {line}
          </RevealLine>
        ),
      )}
    </div>
  );
}

function RevealLine({
  containerRef,
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: container, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-foreground leading-relaxed"
      style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "0.6em",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </motion.div>
  );
}
