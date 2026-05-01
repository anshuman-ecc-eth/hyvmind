import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLichessPuzzles } from "../hooks/useLichessPuzzles";
import type { Puzzle } from "../hooks/useLichessPuzzles";

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

// ── Piece Unicode ──────────────────────────────────────────────────────────────

const UNICODE: Record<string, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

function fenToPosition(fen: string): Record<string, string> {
  const pos: Record<string, string> = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, ri) => {
    let ci = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        ci += Number.parseInt(ch);
        continue;
      }
      const rank = 8 - ri;
      const file = String.fromCharCode(97 + ci);
      pos[`${file}${rank}`] =
        `${ch === ch.toUpperCase() ? "w" : "b"}${ch.toUpperCase()}`;
      ci++;
    }
  });
  return pos;
}

// ── Arrow SVG overlay ──────────────────────────────────────────────────────────

interface ArrowDef {
  from: string;
  to: string;
  color: string;
}

function squareCenter(sq: string, orient: "white" | "black"): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number.parseInt(sq[1]) - 1;
  const col = orient === "white" ? file : 7 - file;
  const row = orient === "white" ? 7 - rank : rank;
  return [col * 12.5 + 6.25, row * 12.5 + 6.25];
}

function ArrowOverlay({
  arrows,
  orient,
}: { arrows: ArrowDef[]; orient: "white" | "black" }) {
  if (!arrows.length) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <defs>
        {arrows.map((a) => (
          <marker
            key={`m-${a.from}${a.to}`}
            id={`ah-${a.from}${a.to}`}
            markerWidth="4"
            markerHeight="4"
            refX="3"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill={a.color} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => {
        const [x1, y1] = squareCenter(a.from, orient);
        const [x2, y2] = squareCenter(a.to, orient);
        return (
          <line
            key={`l-${a.from}${a.to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={a.color}
            strokeWidth="2.5"
            strokeOpacity="0.78"
            markerEnd={`url(#ah-${a.from}${a.to})`}
          />
        );
      })}
    </svg>
  );
}

// ── Drag-and-drop board ────────────────────────────────────────────────────────

interface BoardProps {
  position: Record<string, string>;
  orientation: "white" | "black";
  arrows?: ArrowDef[];
  allowInteraction?: boolean;
  onDrop?: (from: string, to: string) => "snapback" | "accept";
}

function ChessBoard({
  position,
  orientation,
  arrows = [],
  allowInteraction = true,
  onDrop,
}: BoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const boardSize = "min(88vw, 400px)";

  const ranks =
    orientation === "white"
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8];
  const files =
    orientation === "white"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];

  const handleDragStart = (sq: string) => {
    if (!allowInteraction || !position[sq]) return;
    setDragging(sq);
  };

  const handleDragOver = (e: React.DragEvent, sq: string) => {
    e.preventDefault();
    setDragOver(sq);
  };

  const handleDrop = (e: React.DragEvent, sq: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging === sq || !onDrop) {
      setDragging(null);
      return;
    }
    const result = onDrop(dragging, sq);
    if (result === "snapback") {
      // Piece stays; no position update needed (position prop unchanged)
    }
    setDragging(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div
      style={{
        position: "relative",
        width: boardSize,
        height: boardSize,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          width: "100%",
          height: "100%",
          border: "2px solid #555",
        }}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const sq = `${file}${rank}`;
            const fileIdx = file.charCodeAt(0) - 97;
            const isLight = (fileIdx + rank) % 2 !== 0;
            const piece = position[sq];
            const isDragSource = sq === dragging;
            const isDropTarget = sq === dragOver;
            return (
              <div
                key={sq}
                onDragOver={(e) => allowInteraction && handleDragOver(e, sq)}
                onDrop={(e) => allowInteraction && handleDrop(e, sq)}
                style={{
                  backgroundColor: isDropTarget
                    ? "oklch(75% 0.18 80 / 0.55)"
                    : isLight
                      ? "#f0f0d8"
                      : "#6b6b7b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  transition: "background-color 0.1s",
                }}
              >
                {piece && (
                  <span
                    draggable={allowInteraction}
                    onDragStart={() => handleDragStart(sq)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: "block",
                      fontSize: "clamp(1.1rem, 4vw, 2rem)",
                      lineHeight: 1,
                      cursor: allowInteraction ? "grab" : "default",
                      userSelect: "none",
                      opacity: isDragSource ? 0.3 : 1,
                      filter:
                        piece[0] === "w"
                          ? "drop-shadow(0 1px 1px rgba(0,0,0,0.5))"
                          : "drop-shadow(0 1px 2px rgba(0,0,0,0.7))",
                      transition: "opacity 0.1s",
                    }}
                  >
                    {UNICODE[piece] ?? ""}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>
      <ArrowOverlay arrows={arrows} orient={orientation} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChessPuzzleGame({
  onComplete,
  onExit,
}: ChessPuzzleGameProps) {
  const {
    puzzle: fetchedPuzzle,
    loading,
    error,
    fetchNext,
  } = useLichessPuzzles();

  const [score, setScore] = useState(0);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showingSolution, setShowingSolution] = useState(false);
  const [position, setPosition] = useState<Record<string, string>>({});
  const [arrows, setArrows] = useState<ArrowDef[]>([]);

  const gameRef = useRef<Chess | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const puzzleRef = useRef<Puzzle | null>(null);
  const solutionTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const orientationRef = useRef<"white" | "black">("white");

  // Load puzzle when fetchedPuzzle changes
  const loadPuzzle = useCallback((p: Puzzle) => {
    // Store raw puzzle — solution[0] is opponent's last move, solution[1..] are player moves
    puzzleRef.current = p;
    try {
      const chess = new Chess(p.fen);
      // Apply opponent's last move (solution[0] === lastMove) to reach puzzle start position
      chess.move({
        from: p.lastMove.slice(0, 2),
        to: p.lastMove.slice(2, 4),
        promotion: p.lastMove[4] ?? undefined,
      });
      gameRef.current = chess;

      // Orientation: solver plays the side to move after opponent's last move
      const sideToMove = chess.fen().split(" ")[1];
      orientationRef.current = sideToMove === "w" ? "white" : "black";

      setPosition(fenToPosition(chess.fen()));
      // Show opponent's last move as blue arrow
      setArrows([
        {
          from: p.lastMove.slice(0, 2),
          to: p.lastMove.slice(2, 4),
          color: "#60a5fa",
        },
      ]);
      setFeedback("");
    } catch (err) {
      console.error("loadPuzzle failed:", err);
    }
  }, []);

  useEffect(() => {
    if (fetchedPuzzle) loadPuzzle(fetchedPuzzle);
  }, [fetchedPuzzle, loadPuzzle]);

  // Timer — starts after puzzle loads, stops on game over or solution animation
  useEffect(() => {
    if (gameOver || !fetchedPuzzle || !gameRef.current || showingSolution)
      return;
    setTimeLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          setFeedback("Time's up!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedPuzzle, gameOver, showingSolution]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      for (const id of solutionTimeoutsRef.current) clearTimeout(id);
    };
  }, []);

  const animateSolution = useCallback(() => {
    const p = puzzleRef.current;
    if (!p) return;
    setShowingSolution(true);
    // Reset to pre-lastMove FEN and replay all moves including lastMove + solution
    const solutionGame = new Chess(p.fen);
    const allMoves = [p.lastMove, ...p.solution.slice(1)]; // solution[0] = lastMove, skip duplicate
    const ids: ReturnType<typeof setTimeout>[] = [];
    allMoves.forEach((uci, i) => {
      const id = setTimeout(() => {
        try {
          solutionGame.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] ?? undefined,
          });
          setPosition(fenToPosition(solutionGame.fen()));
          setArrows([
            {
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              color: i % 2 === 0 ? "#60a5fa" : "#4ade80",
            },
          ]);
        } catch {
          /* skip */
        }
        if (i === allMoves.length - 1) {
          const finalId = setTimeout(() => setShowingSolution(false), 1000);
          solutionTimeoutsRef.current.push(finalId);
        }
      }, i * 1000);
      ids.push(id);
    });
    solutionTimeoutsRef.current = ids;
  }, []);

  // solution[1..] are player moves; solution[0] is opponent's last move (already applied in loadPuzzle)
  // puzzleRef.current tracks sliced solution as player progresses through multi-move puzzles
  const applyMove = useCallback(
    (uci: string) => {
      const p = puzzleRef.current;
      const chess = gameRef.current;
      if (!p || !chess) return;

      // playerMoves = solution starting from index 1 (skip opponent's setup move at index 0)
      // But after the first correct move, we track remaining moves in puzzleRef with sliced arrays
      // We use a separate field to track whether we've already sliced
      const playerSolution = p.solution;
      const expected = playerSolution[0];

      if (uci !== expected) {
        if (timerRef.current) clearInterval(timerRef.current);
        setFeedback("Incorrect!");
        animateSolution();
        setGameOver(true);
        return;
      }

      // Correct move
      setArrows([]);
      if (playerSolution.length === 1) {
        // Last move in puzzle — puzzle complete
        if (timerRef.current) clearInterval(timerRef.current);
        setScore((s) => s + 50);
        setFeedback("+50");
        setTimeout(() => {
          setPuzzleNumber((n) => n + 1);
          setFeedback("");
          void fetchNext();
        }, 1200);
      } else {
        // Auto-play opponent reply
        setFeedback("Correct!");
        const reply = playerSolution[1];
        setTimeout(() => {
          try {
            chess.move({
              from: reply.slice(0, 2),
              to: reply.slice(2, 4),
              promotion: reply[4] ?? undefined,
            });
            // Advance solution: remove the correct player move + opponent reply
            puzzleRef.current = { ...p, solution: playerSolution.slice(2) };
            setPosition(fenToPosition(chess.fen()));
            setArrows([
              {
                from: reply.slice(0, 2),
                to: reply.slice(2, 4),
                color: "#60a5fa",
              },
            ]);
            setFeedback("");
          } catch (err) {
            console.error("opponent reply failed:", err);
          }
        }, 500);
      }
    },
    [animateSolution, fetchNext],
  );

  // Adjust puzzleRef so it points to player moves (slice off solution[0] which is lastMove)
  // This is done once when the puzzle first loads, tracking via a separate approach:
  // We store solution[1..] in puzzleRef so applyMove always compares against the right index.
  useEffect(() => {
    const p = fetchedPuzzle;
    if (!p) return;
    // solution[0] is opponent's lastMove — player starts from solution[1]
    puzzleRef.current = { ...p, solution: p.solution.slice(1) };
  }, [fetchedPuzzle]);

  const handleDrop = useCallback(
    (from: string, to: string): "snapback" | "accept" => {
      const chess = gameRef.current;
      const p = puzzleRef.current;
      if (!chess || !p || gameOver || showingSolution) return "snapback";

      const move = chess.move({ from, to, promotion: "q" });
      if (!move) return "snapback";

      setPosition(fenToPosition(chess.fen()));
      const uci = move.from + move.to + (move.promotion ?? "");
      applyMove(uci);
      return "accept";
    },
    [gameOver, showingSolution, applyMove],
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────

  if (loading || (!fetchedPuzzle && !error)) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 font-mono gap-4"
        data-ocid="chess_puzzle.loading_state"
      >
        <div className="text-foreground text-sm animate-pulse">
          Loading puzzle...
        </div>
        <button
          type="button"
          onClick={onExit}
          className="text-muted-foreground text-xs underline hover:text-foreground transition-colors"
          data-ocid="chess_puzzle.cancel_button"
        >
          BACK
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-12 font-mono"
        data-ocid="chess_puzzle.error_state"
      >
        <div className="text-destructive text-sm text-center px-4">{error}</div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onExit}
            className="text-muted-foreground text-xs underline hover:text-foreground transition-colors"
            data-ocid="chess_puzzle.cancel_button"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={() => void fetchNext()}
            className="text-primary text-xs underline hover:opacity-80 transition-opacity"
            data-ocid="chess_puzzle.retry_button"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (gameOver && !showingSolution) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-4 font-mono w-full"
        data-ocid="chess_puzzle.game_over"
      >
        <ChessBoard
          position={position}
          orientation={orientationRef.current}
          arrows={arrows}
          allowInteraction={false}
        />
        <div className="flex flex-col items-center gap-1 mt-1">
          <div
            className="text-destructive font-bold text-lg tracking-widest"
            data-ocid="chess_puzzle.error_state"
          >
            {feedback === "Time's up!" ? "TIME'S UP!" : "INCORRECT!"}
          </div>
          <div className="text-muted-foreground text-sm">
            Puzzles solved:{" "}
            <span className="text-foreground font-bold">
              {puzzleNumber - 1}
            </span>
          </div>
          <div className="text-muted-foreground text-sm">
            Final score: <span className="text-primary font-bold">{score}</span>
          </div>
        </div>
        <div className="flex gap-5 mt-1">
          <button
            type="button"
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              for (const id of solutionTimeoutsRef.current) clearTimeout(id);
              setScore(0);
              setPuzzleNumber(1);
              setTimeLeft(60);
              setGameOver(false);
              setFeedback("");
              setShowingSolution(false);
              setArrows([]);
              setPosition({});
              void fetchNext();
            }}
            className="text-muted-foreground text-xs tracking-widest hover:text-foreground transition-colors"
            data-ocid="chess_puzzle.cancel_button"
          >
            TRY AGAIN
          </button>
          {score > 0 && (
            <button
              type="button"
              onClick={() => onComplete(score)}
              className="text-primary text-xs tracking-widest font-bold hover:opacity-80 transition-opacity"
              data-ocid="chess_puzzle.submit_button"
            >
              SUBMIT SCORE
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="text-muted-foreground text-xs tracking-widest hover:text-foreground transition-colors"
            data-ocid="chess_puzzle.exit_button"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (showingSolution) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-4 font-mono w-full"
        data-ocid="chess_puzzle.solution_animation"
      >
        <div className="flex items-center justify-between w-full max-w-[400px] text-xs text-muted-foreground">
          <span>#{puzzleNumber}</span>
          <span>
            Score: <span className="text-foreground font-bold">{score}</span>
          </span>
        </div>
        <ChessBoard
          position={position}
          orientation={orientationRef.current}
          arrows={arrows}
          allowInteraction={false}
        />
        <div
          className="text-sm text-center text-muted-foreground animate-pulse"
          data-ocid="chess_puzzle.feedback"
        >
          Showing solution...
        </div>
      </div>
    );
  }

  // Active game
  return (
    <div
      className="flex flex-col items-center gap-3 py-4 font-mono w-full"
      data-ocid="chess_puzzle.panel"
    >
      <div className="flex items-center justify-between w-full max-w-[400px] text-xs text-muted-foreground">
        <span data-ocid="chess_puzzle.puzzle_number">#{puzzleNumber}</span>
        <span>
          Score: <span className="text-foreground font-bold">{score}</span>
        </span>
        <span
          className={`text-xl font-bold tabular-nums ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}
          data-ocid="chess_puzzle.timer"
        >
          {timeLeft}s
        </span>
      </div>
      <ChessBoard
        position={position}
        orientation={orientationRef.current}
        arrows={arrows}
        allowInteraction={!gameOver && !showingSolution}
        onDrop={handleDrop}
      />
      <div
        className={`text-sm text-center min-h-[1.5rem] ${feedback === "Correct!" || feedback.startsWith("+") ? "text-green-500" : feedback ? "text-destructive" : "text-transparent"}`}
        data-ocid="chess_puzzle.feedback"
      >
        {feedback || "·"}
      </div>
      <button
        type="button"
        onClick={onExit}
        className="text-muted-foreground text-xs underline hover:text-foreground transition-colors mt-1"
        data-ocid="chess_puzzle.cancel_button"
      >
        BACK
      </button>
    </div>
  );
}
