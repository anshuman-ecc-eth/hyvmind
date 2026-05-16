import { AnimatePresence, motion } from "motion/react";

interface TextRevealProps {
  line: string;
  lineIndex: number;
  direction: number;
}

const variants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0 }),
};

export default function TextReveal({
  line,
  lineIndex,
  direction,
}: TextRevealProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={lineIndex}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="text-foreground text-center leading-relaxed px-2 w-full"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.6em",
          letterSpacing: "0.05em",
        }}
      >
        {line}
      </motion.div>
    </AnimatePresence>
  );
}
