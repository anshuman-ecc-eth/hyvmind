import { useEffect, useRef } from "react";
import { initGame } from "../lib/hyvmind-game/NodeWheelGame";
import { loadTextPools } from "../lib/hyvmind-game/textPools";
import type { GameInstance } from "../lib/hyvmind-game/types";

export interface GameCanvasProps {
  onGameOver?: (score: number) => void;
}

export default function GameCanvas({ onGameOver }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pools = loadTextPools();
    gameRef.current = initGame(container, pools, onGameOver ?? (() => {}));

    return () => {
      gameRef.current?.cleanup();
      gameRef.current = null;
    };
  }, [onGameOver]);

  return (
    <div
      ref={containerRef}
      data-ocid="game.canvas_target"
      className="w-full h-full"
    />
  );
}
