import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphData, backendInterface } from "../backend";
import { createActor } from "../backend";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TetrisGameProps {
  onGameOver: (score: number, collectedText: string[]) => void;
}

type TetrominoType = "I" | "O" | "L" | "J" | "T" | "S" | "Z";
type GameStatus =
  | "loading"
  | "playing"
  | "paused"
  | "gameover"
  | "transitioning";

interface Cell {
  filled: boolean;
  char: string;
}

interface Piece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
  chars: string[];
}

// ── Tetromino Shapes ──────────────────────────────────────────────────────────

const TETROMINOES: Record<TetrominoType, number[][][]> = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
  ],
  L: [
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
  ],
  J: [
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
    ],
  ],
  T: [
    [
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  ],
};

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const PIECE_TYPES: TetrominoType[] = ["I", "O", "L", "J", "T", "S", "Z"];
const HIGH_SCORE_KEY = "hyvmind_tetris_highscore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({ filled: false, char: " " })),
  );
}

function getShape(piece: Piece): number[][] {
  return TETROMINOES[piece.type][
    piece.rotation % TETROMINOES[piece.type].length
  ];
}

function getTextForPiece(
  type: TetrominoType,
  data: GraphData | null,
): string[] {
  if (!data) return ["?", "?", "?", "?"];
  let pool: string[] = [];
  switch (type) {
    case "I":
      pool = data.curations.map((c) => c.name);
      break;
    case "O":
      pool = data.swarms.map((s) => s.name);
      break;
    case "L":
    case "J":
      pool = data.locations.map((l) => l.title);
      break;
    case "T":
      pool = data.lawTokens.map((t) => t.tokenLabel);
      break;
    case "S":
    case "Z":
      pool = data.interpretationTokens.map((t) => t.title);
      break;
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (let i = 0; i < 4; i++) {
    result.push(shuffled[i] ?? "NO DATA");
  }
  return result;
}

function dropSpeedMs(level: number): number {
  return Math.max(80, 600 - (level - 1) * 50);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TetrisGame({ onGameOver }: TetrisGameProps) {
  const [gameStatus, setGameStatus] = useState<GameStatus>("loading");
  const [board, setBoard] = useState<Cell[][]>(emptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextType, setNextType] = useState<TetrominoType>("T");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [collectedText, setCollectedText] = useState<string[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  // Stable refs for game loop
  const boardRef = useRef<Cell[][]>(emptyBoard());
  const currentPieceRef = useRef<Piece | null>(null);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesRef = useRef(0);
  const collectedTextRef = useRef<string[]>([]);
  const gameStatusRef = useRef<GameStatus>("loading");
  const graphDataRef = useRef<GraphData | null>(null);
  const nextTypeRef = useRef<TetrominoType>("T");
  const rafRef = useRef<number | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Keep nextTypeRef synced
  useEffect(() => {
    nextTypeRef.current = nextType;
  }, [nextType]);

  // Load high score on mount
  useEffect(() => {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) setHighScore(Number.parseInt(stored, 10) || 0);
  }, []);

  // ── Anonymous data fetch ───────────────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      try {
        const anonymousActor = (await createActorWithConfig(
          createActor as Parameters<typeof createActorWithConfig>[0],
        )) as backendInterface;
        const data = await anonymousActor.getAllData();
        graphDataRef.current = data;
        setGraphData(data);
      } catch (e) {
        console.warn("TetrisGame: failed to fetch graph data", e);
      } finally {
        gameStatusRef.current = "playing";
        setGameStatus("playing");
      }
    };
    loadData();
  }, []);

  // ── Collision detection ────────────────────────────────────────────────────

  const checkCollision = useCallback(
    (piece: Piece, brd: Cell[][], dx = 0, dy = 0, newRot?: number): boolean => {
      const rot = newRot !== undefined ? newRot : piece.rotation;
      const shape =
        TETROMINOES[piece.type][rot % TETROMINOES[piece.type].length];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = piece.x + c + dx;
          const ny = piece.y + r + dy;
          if (nx < 0 || nx >= BOARD_COLS || ny >= BOARD_ROWS) return true;
          if (ny >= 0 && brd[ny][nx].filled) return true;
        }
      }
      return false;
    },
    [],
  );

  // ── Lock piece onto board ──────────────────────────────────────────────────

  const lockPiece = useCallback((piece: Piece, brd: Cell[][]): Cell[][] => {
    const newBoard = brd.map((row) => [...row]);
    const shape = getShape(piece);
    let charIdx = 0;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) {
          charIdx++;
          continue;
        }
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
          const text = piece.chars[charIdx % piece.chars.length] ?? "?";
          const ch = text.charAt(0).toUpperCase() || "@";
          newBoard[ny][nx] = { filled: true, char: ch };
        }
        charIdx++;
      }
    }
    return newBoard;
  }, []);

  // ── Clear completed lines ──────────────────────────────────────────────────

  const clearLines = useCallback(
    (
      brd: Cell[][],
    ): { newBoard: Cell[][]; cleared: number; texts: string[] } => {
      const texts: string[] = [];
      const remaining: Cell[][] = [];
      let cleared = 0;
      for (const row of brd) {
        if (row.every((cell) => cell.filled)) {
          cleared++;
          texts.push(...row.map((cell) => cell.char));
        } else {
          remaining.push(row);
        }
      }
      const empty = Array.from({ length: cleared }, () =>
        Array.from({ length: BOARD_COLS }, () => ({
          filled: false,
          char: " ",
        })),
      );
      return { newBoard: [...empty, ...remaining], cleared, texts };
    },
    [],
  );

  // ── Spawn piece ────────────────────────────────────────────────────────────

  const spawnPiece = useCallback((type: TetrominoType): Piece => {
    const chars = getTextForPiece(type, graphDataRef.current);
    const shape = TETROMINOES[type][0];
    const x = Math.floor((BOARD_COLS - shape[0].length) / 2);
    return { type, x, y: 0, rotation: 0, chars };
  }, []);

  // ── Game over ──────────────────────────────────────────────────────────────

  const triggerGameOver = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    gameStatusRef.current = "gameover";
    setGameStatus("gameover");

    const finalScore = scoreRef.current;
    const stored =
      Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10) || 0;
    if (finalScore > stored) {
      localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
      setHighScore(finalScore);
    }

    setTimeout(() => {
      gameStatusRef.current = "transitioning";
      setGameStatus("transitioning");
      setTimeout(() => {
        onGameOverRef.current(finalScore, collectedTextRef.current);
      }, 2000);
    }, 600);
  }, []);

  // ── Place next piece ───────────────────────────────────────────────────────

  const placeNextRef = useRef<(type: TetrominoType) => void>(() => {});

  placeNextRef.current = (type: TetrominoType) => {
    const piece = spawnPiece(type);
    const next = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    nextTypeRef.current = next;
    setNextType(next);
    if (checkCollision(piece, boardRef.current)) {
      triggerGameOver();
      return;
    }
    currentPieceRef.current = piece;
    setCurrentPiece({ ...piece });
  };

  // ── Drop tick ──────────────────────────────────────────────────────────────

  const dropTickRef = useRef<() => void>(() => {});

  dropTickRef.current = () => {
    const piece = currentPieceRef.current;
    if (!piece) return;

    if (checkCollision(piece, boardRef.current, 0, 1)) {
      // Lock piece
      const locked = lockPiece(piece, boardRef.current);
      const { newBoard, cleared, texts } = clearLines(locked);
      boardRef.current = newBoard;
      setBoard(newBoard.map((row) => [...row]));

      if (cleared > 0) {
        const addScore =
          [0, 100, 300, 500, 800][Math.min(cleared, 4)] * levelRef.current;
        scoreRef.current += addScore;
        setScore(scoreRef.current);
        linesRef.current += cleared;
        setLines(linesRef.current);
        collectedTextRef.current = [...collectedTextRef.current, ...texts];
        setCollectedText([...collectedTextRef.current]);
        const newLevel = Math.floor(linesRef.current / 10) + 1;
        levelRef.current = newLevel;
        setLevel(newLevel);
      }

      currentPieceRef.current = null;
      setCurrentPiece(null);

      setTimeout(() => {
        if (gameStatusRef.current === "playing") {
          placeNextRef.current(nextTypeRef.current);
        }
      }, 0);
    } else {
      const moved = { ...piece, y: piece.y + 1 };
      currentPieceRef.current = moved;
      setCurrentPiece({ ...moved });
    }
  };

  // ── Game loop ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus !== "playing") return;
    let lastTime = 0;

    const loop = (timestamp: number) => {
      if (gameStatusRef.current !== "playing") return;
      if (timestamp - lastTime > dropSpeedMs(levelRef.current)) {
        lastTime = timestamp;
        dropTickRef.current();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameStatus]);

  // ── Initial spawn ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus === "playing" && !currentPieceRef.current) {
      const t = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
      const n = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
      nextTypeRef.current = n;
      setNextType(n);
      placeNextRef.current(t);
    }
  }, [gameStatus]);

  // ── Keyboard controls ──────────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus !== "playing" && gameStatus !== "paused") return;

    const handleKey = (e: KeyboardEvent) => {
      if (gameStatusRef.current === "paused" && e.key !== "p" && e.key !== "P")
        return;
      const piece = currentPieceRef.current;
      if (!piece && e.key !== "p" && e.key !== "P") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!piece) return;
        if (!checkCollision(piece, boardRef.current, -1, 0)) {
          const moved = { ...piece, x: piece.x - 1 };
          currentPieceRef.current = moved;
          setCurrentPiece({ ...moved });
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!piece) return;
        if (!checkCollision(piece, boardRef.current, 1, 0)) {
          const moved = { ...piece, x: piece.x + 1 };
          currentPieceRef.current = moved;
          setCurrentPiece({ ...moved });
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        dropTickRef.current();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!piece) return;
        const newRot = (piece.rotation + 1) % TETROMINOES[piece.type].length;
        if (!checkCollision(piece, boardRef.current, 0, 0, newRot)) {
          const rotated = { ...piece, rotation: newRot };
          currentPieceRef.current = rotated;
          setCurrentPiece({ ...rotated });
        }
      } else if (e.key === " ") {
        e.preventDefault();
        if (!piece) return;
        let dy = 0;
        while (!checkCollision(piece, boardRef.current, 0, dy + 1)) dy++;
        const dropped = { ...piece, y: piece.y + dy };
        currentPieceRef.current = dropped;
        setCurrentPiece({ ...dropped });
        dropTickRef.current();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (gameStatusRef.current === "playing") {
          gameStatusRef.current = "paused";
          setGameStatus("paused");
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
        } else if (gameStatusRef.current === "paused") {
          gameStatusRef.current = "playing";
          setGameStatus("playing");
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameStatus, checkCollision]);

  // ── Build display board ────────────────────────────────────────────────────

  const displayBoard: Cell[][] = board.map((row) => [...row]);
  if (currentPiece) {
    const shape = getShape(currentPiece);
    let charIdx = 0;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) {
          charIdx++;
          continue;
        }
        const ny = currentPiece.y + r;
        const nx = currentPiece.x + c;
        if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
          const text =
            currentPiece.chars[charIdx % currentPiece.chars.length] ?? "?";
          const ch = text.charAt(0).toUpperCase() || "@";
          displayBoard[ny][nx] = { filled: true, char: ch };
        }
        charIdx++;
      }
    }
  }

  // Ghost piece
  let ghostY = currentPiece?.y ?? 0;
  if (currentPiece) {
    while (
      !checkCollision(
        currentPiece,
        boardRef.current,
        0,
        ghostY - currentPiece.y + 1,
      )
    )
      ghostY++;
  }
  const ghostCells = new Set<string>();
  if (currentPiece && ghostY !== currentPiece.y) {
    const shape = getShape(currentPiece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const ny = ghostY + r;
        const nx = currentPiece.x + c;
        if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
          ghostCells.add(`${ny},${nx}`);
        }
      }
    }
  }

  // Touch handlers
  const handleTouchLeft = (e: React.TouchEvent) => {
    e.preventDefault();
    const piece = currentPieceRef.current;
    if (!piece) return;
    if (!checkCollision(piece, boardRef.current, -1, 0)) {
      const moved = { ...piece, x: piece.x - 1 };
      currentPieceRef.current = moved;
      setCurrentPiece({ ...moved });
    }
  };
  const handleTouchRight = (e: React.TouchEvent) => {
    e.preventDefault();
    const piece = currentPieceRef.current;
    if (!piece) return;
    if (!checkCollision(piece, boardRef.current, 1, 0)) {
      const moved = { ...piece, x: piece.x + 1 };
      currentPieceRef.current = moved;
      setCurrentPiece({ ...moved });
    }
  };
  const handleTouchRotate = (e: React.TouchEvent) => {
    e.preventDefault();
    const piece = currentPieceRef.current;
    if (!piece) return;
    const newRot = (piece.rotation + 1) % TETROMINOES[piece.type].length;
    if (!checkCollision(piece, boardRef.current, 0, 0, newRot)) {
      const rotated = { ...piece, rotation: newRot };
      currentPieceRef.current = rotated;
      setCurrentPiece({ ...rotated });
    }
  };

  const nextShape = TETROMINOES[nextType][0];

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (gameStatus === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-game-font">
        <span
          className="text-foreground/70"
          style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
        >
          LOADING
        </span>
        <div className="flex gap-[2px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static loading bar
              key={i}
              className="text-foreground"
              style={{
                fontSize: "0.55rem",
                animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
              }}
            >
              █
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Game render ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full overflow-hidden">
      <div className="flex items-start gap-3 px-2">
        {/* Left stats panel */}
        <div
          className="flex flex-col gap-3 text-game-font"
          style={{ minWidth: "4.5rem" }}
        >
          <StatBlock label="SCORE" value={String(score)} />
          <StatBlock
            label="HI"
            value={String(Math.max(highScore, score))}
            dim
          />
          <StatBlock label="LEVEL" value={String(level)} />
          <StatBlock label="LINES" value={String(lines)} />
          {gameStatus === "paused" && (
            <span
              className="text-foreground/70 mt-1"
              style={{ fontSize: "0.42rem", letterSpacing: "0.1em" }}
            >
              PAUSED
            </span>
          )}
        </div>

        {/* Board */}
        <div
          className="border border-dashed border-foreground/30 relative"
          style={{ lineHeight: 1 }}
        >
          {displayBoard.map((row, ri) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable grid rows
            <div key={ri} className="flex">
              {row.map((cell, ci) => {
                const isActive =
                  currentPiece !== null &&
                  displayBoard[ri][ci].filled &&
                  !board[ri][ci].filled;
                const isGhost =
                  ghostCells.has(`${ri},${ci}`) &&
                  !board[ri][ci].filled &&
                  !isActive;
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable grid cells
                    key={ci}
                    className="text-game-font select-none"
                    style={{
                      fontSize: "0.6rem",
                      width: "1ch",
                      display: "inline-block",
                      textAlign: "center",
                      color: board[ri][ci].filled
                        ? "var(--foreground)"
                        : isActive
                          ? "color-mix(in srgb, var(--foreground) 90%, transparent)"
                          : isGhost
                            ? "color-mix(in srgb, var(--foreground) 20%, transparent)"
                            : "transparent",
                    }}
                  >
                    {board[ri][ci].filled
                      ? board[ri][ci].char
                      : isActive
                        ? cell.char
                        : isGhost
                          ? "·"
                          : "."}
                  </span>
                );
              })}
            </div>
          ))}

          {/* Overlay: game over / transitioning */}
          {(gameStatus === "gameover" || gameStatus === "transitioning") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85">
              <span
                className="text-game-font text-foreground"
                style={{ fontSize: "0.55rem", letterSpacing: "0.15em" }}
              >
                GAME OVER
              </span>
              <span
                className="text-game-font text-foreground/60"
                style={{ fontSize: "0.45rem" }}
              >
                {score} pts
              </span>
              {gameStatus === "transitioning" && (
                <span
                  className="text-game-font text-foreground/40"
                  style={{
                    fontSize: "0.38rem",
                    letterSpacing: "0.1em",
                    animation: "terminal-blink 0.6s step-end infinite",
                  }}
                >
                  LOADING NARRATIVE..
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right panel: next piece + collected data */}
        <div
          className="flex flex-col gap-3 text-game-font"
          style={{ minWidth: "4.5rem" }}
        >
          {/* Next preview */}
          <div className="flex flex-col gap-1">
            <span
              className="text-foreground/40"
              style={{ fontSize: "0.38rem", letterSpacing: "0.2em" }}
            >
              NEXT
            </span>
            <div>
              {nextShape.map((row, ri) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable preview rows
                <div key={ri} className="flex">
                  {row.map((cell, ci) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable preview cells
                      key={ci}
                      className="text-game-font"
                      style={{
                        fontSize: "0.6rem",
                        width: "1ch",
                        display: "inline-block",
                        textAlign: "center",
                        color: cell ? "var(--foreground)" : "transparent",
                      }}
                    >
                      {cell ? "█" : "."}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Collected text */}
          {collectedText.length > 0 && (
            <div className="flex flex-col gap-0">
              <span
                className="text-foreground/40"
                style={{ fontSize: "0.38rem", letterSpacing: "0.2em" }}
              >
                DATA
              </span>
              <div
                className="flex flex-col"
                style={{ maxHeight: "7rem", overflow: "hidden" }}
              >
                {collectedText.slice(-12).map((ch, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: display list
                    key={i}
                    className="text-foreground/50"
                    style={{ fontSize: "0.48rem" }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Controls hint */}
          <div className="flex flex-col gap-0 mt-auto pt-2">
            {["↑ rotate", "← → move", "↓ drop", "SPC hard", "P pause"].map(
              (hint) => (
                <span
                  key={hint}
                  className="text-foreground/25"
                  style={{ fontSize: "0.36rem", letterSpacing: "0.05em" }}
                >
                  {hint}
                </span>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Mobile touch controls — hidden on devices with fine pointer (desktop) */}
      <div className="mobile-controls flex gap-6 mt-4">
        <button
          type="button"
          aria-label="Move left"
          className="text-game-font text-foreground/60 border border-dashed border-foreground/30 px-4 py-2 active:opacity-50"
          style={{ fontSize: "0.6rem" }}
          onTouchStart={handleTouchLeft}
        >
          ◄
        </button>
        <button
          type="button"
          aria-label="Rotate"
          className="text-game-font text-foreground/60 border border-dashed border-foreground/30 px-4 py-2 active:opacity-50"
          style={{ fontSize: "0.6rem" }}
          onTouchStart={handleTouchRotate}
        >
          ↺
        </button>
        <button
          type="button"
          aria-label="Move right"
          className="text-game-font text-foreground/60 border border-dashed border-foreground/30 px-4 py-2 active:opacity-50"
          style={{ fontSize: "0.6rem" }}
          onTouchStart={handleTouchRight}
        >
          ►
        </button>
      </div>

      {/* Indexed nodes count */}
      {graphData && (
        <div className="mt-2">
          <span
            className="text-foreground/20"
            style={{ fontSize: "0.36rem", letterSpacing: "0.1em" }}
          >
            {graphData.curations.length +
              graphData.swarms.length +
              graphData.locations.length +
              graphData.lawTokens.length +
              graphData.interpretationTokens.length}{" "}
            nodes indexed
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  dim,
}: {
  label: string;
  value: string;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0">
      <span
        className="text-foreground/40"
        style={{ fontSize: "0.38rem", letterSpacing: "0.2em" }}
      >
        {label}
      </span>
      <span
        className={dim ? "text-foreground/50" : "text-foreground"}
        style={{ fontSize: "0.52rem" }}
      >
        {value}
      </span>
    </div>
  );
}
