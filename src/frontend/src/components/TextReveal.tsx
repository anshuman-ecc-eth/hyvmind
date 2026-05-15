import { AnimatePresence, motion } from "motion/react";

interface TextRevealProps {
  line: string;
  lineIndex: number;
}

export default function TextReveal({ line, lineIndex }: TextRevealProps) {
  return (
    <AnimatePresence>
      <motion.div
        key={lineIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="text-foreground text-center leading-relaxed px-2"
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
