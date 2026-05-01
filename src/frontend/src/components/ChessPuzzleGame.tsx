import "@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css";
import "jquery";
import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Puzzle } from "../hooks/useLichessPuzzles";
import { useLichessPuzzles } from "../hooks/useLichessPuzzles";

// @chrisoakman/chessboardjs is a UMD module that attaches to window.Chessboard
// after jQuery is loaded. We import jquery first as a side effect, then load
// the chessboard script dynamically so jQuery is on window when it runs.

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

// Lazily inject the chessboard.js UMD script once and resolve when ready
let scriptPromise: Promise<void> | null = null;
function loadChessboardScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    // If already loaded (HMR / re-mount)
    if (typeof window !== "undefined" && "Chessboard" in window) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = new URL(
      "@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js",
      import.meta.url,
    ).href;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load chessboard.js"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Typed accessor for the window global set by the UMD bundle
function getChessboard(): typeof Chessboard {
  // biome-ignore lint/suspicious/noExplicitAny: window global from UMD
  return (window as unknown as Record<string, unknown>)
    .Chessboard as typeof Chessboard;
}

export default function ChessPuzzleGame({
  onComplete,
  onExit,
}: ChessPuzzleGameProps) {
  const { puzzle, loading, error, fetchNext } = useLichessPuzzles();

  // ── State ────────────────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showingSolution, setShowingSolution] = useState(false);
  const [boardReady, setBoardReady] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const gameRef = useRef<Chess | null>(null);
  const boardRef = useRef<ChessboardInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const puzzleRef = useRef<Puzzle | null>(null);
  const solutionTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const orientationRef = useRef<"white" | "black">("white");
  // Ref to break circular dependency: applyMove → animateSolution
  const animateSolutionRef = useRef<() => void>(() => {});
  const applyMoveRef = useRef<(uci: string) => void>(() => {});

  // Load chessboard.js UMD script on mount
  useEffect(() => {
    loadChessboardScript()
      .then(() => setBoardReady(true))
      .catch((err) => console.error(err));
  }, []);

  // ── animateSolution ───────────────────────────────────────────────────────────
  const animateSolution = useCallback(() => {
    const p = puzzleRef.current;
    if (!p) return;
    setShowingSolution(true);

    const solutionGame = new Chess(p.fen);
    // allMoves = opponent's lastMove + all solution moves
    const allMoves = [p.lastMove, ...p.solution];

    // Reset board to the pre-lastMove FEN
    boardRef.current?.position(p.fen);

    // Clear any existing timeouts
    for (const id of solutionTimeoutsRef.current) clearTimeout(id);

    const ids: ReturnType<typeof setTimeout>[] = [];
    allMoves.forEach((uci, i) => {
      const id = setTimeout(() => {
        try {
          solutionGame.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] ?? undefined,
          });
          boardRef.current?.position(solutionGame.fen());
        } catch {
          /* skip illegal moves */
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

  // Keep refs in sync so handleDrop / applyMove always use latest closures
  animateSolutionRef.current = animateSolution;

  // ── handleDrop (chessboard.js onDrop signature) ───────────────────────────────
  const handleDrop = useCallback(
    (
      source: string,
      target: string,
      _piece: string,
      _newPos: Record<string, string>,
      _oldPos: Record<string, string>,
      _orientation: string,
    ): "snapback" | undefined => {
      const chess = gameRef.current;
      const p = puzzleRef.current;
      if (!chess || !p || gameOver || showingSolution) return "snapback";

      const move = chess.move({ from: source, to: target, promotion: "q" });
      if (!move) return "snapback";

      const uci = move.from + move.to + (move.promotion ?? "");
      applyMoveRef.current(uci);
      return undefined;
    },
    [gameOver, showingSolution],
  );

  // ── loadPuzzle ────────────────────────────────────────────────────────────────
  const loadPuzzle = useCallback(
    (p: Puzzle) => {
      puzzleRef.current = p;
      try {
        const chess = new Chess(p.fen);
        gameRef.current = chess;

        const sideToMove = p.fen.split(" ")[1];
        orientationRef.current = sideToMove === "w" ? "white" : "black";

        // Destroy previous board instance if any
        if (boardRef.current) {
          boardRef.current.destroy();
          boardRef.current = null;
        }

        const CB = getChessboard();
        const board = CB("chess-board-container", {
          position: p.fen,
          draggable: true,
          orientation: orientationRef.current,
          onDrop: handleDrop,
          pieceTheme:
            "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
        });
        boardRef.current = board;

        // Animate opponent's creating move then set solver's solution window
        setTimeout(() => {
          try {
            chess.move({
              from: p.lastMove.slice(0, 2),
              to: p.lastMove.slice(2, 4),
              promotion: p.lastMove[4] ?? undefined,
            });
            boardRef.current?.position(chess.fen());
            // solution[0] === lastMove (opponent's creating move); player starts at [1]
            puzzleRef.current = { ...p, solution: p.solution.slice(1) };
          } catch (err) {
            console.error("opponent lastMove failed:", err);
          }
        }, 300);

        setFeedback("");
      } catch (err) {
        console.error("loadPuzzle failed:", err);
      }
    },
    [handleDrop],
  );

  // ── applyMove ─────────────────────────────────────────────────────────────────
  const applyMove = useCallback(
    (uci: string) => {
      const chess = gameRef.current;
      const p = puzzleRef.current;
      if (!chess || !p) return;

      const playerSolution = p.solution;

      if (uci !== playerSolution[0]) {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameOver(true);
        setFeedback("Incorrect!");
        animateSolutionRef.current();
        return;
      }

      // Correct move
      if (playerSolution.length === 1) {
        // Puzzle complete
        if (timerRef.current) clearInterval(timerRef.current);
        const points = 50;
        setScore((s) => s + points);
        setFeedback(`+${points}!`);
        setTimeout(() => {
          setPuzzleNumber((n) => n + 1);
          setGameOver(false);
          setFeedback("");
          void fetchNext();
        }, 1200);
      } else {
        // Multi-move: auto-play opponent reply
        setFeedback("Correct!");
        const reply = playerSolution[1];
        setTimeout(() => {
          try {
            chess.move({
              from: reply.slice(0, 2),
              to: reply.slice(2, 4),
              promotion: reply[4] ?? undefined,
            });
            boardRef.current?.position(chess.fen());
            puzzleRef.current = { ...p, solution: playerSolution.slice(2) };
            setFeedback("");
          } catch (err) {
            console.error("opponent reply failed:", err);
          }
        }, 500);
      }
    },
    [fetchNext],
  );

  applyMoveRef.current = applyMove;

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Load puzzle once board script is ready and puzzle data arrives
  useEffect(() => {
    if (puzzle && boardReady) {
      setGameOver(false);
      setShowingSolution(false);
      setTimeLeft(60);
      loadPuzzle(puzzle);
    }
  }, [puzzle, boardReady, loadPuzzle]);

  // Timer — starts after puzzle loads, pauses on game over or solution animation
  useEffect(() => {
    if (gameOver || showingSolution || !puzzle || !boardReady) return;
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
  }, [puzzle, boardReady, gameOver, showingSolution]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      for (const id of solutionTimeoutsRef.current) clearTimeout(id);
      if (boardRef.current) {
        boardRef.current.destroy();
        boardRef.current = null;
      }
    };
  }, []);

  // ── RENDER ────────────────────────────────────────────────────────────────────

  // Loading state (waiting for puzzle data or board script)
  if (loading || !boardReady || (!puzzle && !error)) {
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

  // Error state
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

  // Game over (board still rendered for final position / after solution animation)
  if (gameOver && !showingSolution) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-4 font-mono w-full"
        data-ocid="chess_puzzle.game_over"
      >
        <div className="flex items-center justify-between w-full max-w-[min(88vw,400px)] text-xs text-muted-foreground">
          <span>Puzzle #{puzzleNumber}</span>
          <span>
            Score: <span className="text-foreground font-bold">{score}</span>
          </span>
        </div>
        <div
          id="chess-board-container"
          style={{ width: "min(88vw, 400px)", pointerEvents: "none" }}
        />
        <div className="flex flex-col items-center gap-1">
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
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            className="px-4 py-2 border border-border text-xs hover:bg-accent transition-colors"
            data-ocid="chess_puzzle.cancel_button"
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              for (const id of solutionTimeoutsRef.current) clearTimeout(id);
              if (boardRef.current) {
                boardRef.current.destroy();
                boardRef.current = null;
              }
              setScore(0);
              setPuzzleNumber(1);
              setGameOver(false);
              setFeedback("");
              setShowingSolution(false);
              setTimeLeft(60);
              void fetchNext();
            }}
          >
            TRY AGAIN
          </button>
          {score > 0 && (
            <button
              type="button"
              className="px-4 py-2 border border-border text-xs hover:bg-accent transition-colors"
              data-ocid="chess_puzzle.submit_button"
              onClick={() => onComplete(score)}
            >
              SUBMIT SCORE
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 border border-border text-xs hover:bg-accent transition-colors"
            data-ocid="chess_puzzle.exit_button"
            onClick={onExit}
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  // Solution animation state
  if (showingSolution) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-4 font-mono w-full"
        data-ocid="chess_puzzle.solution_animation"
      >
        <div className="flex items-center justify-between w-full max-w-[min(88vw,400px)] text-xs text-muted-foreground">
          <span>#{puzzleNumber}</span>
          <span>
            Score: <span className="text-foreground font-bold">{score}</span>
          </span>
        </div>
        <div
          id="chess-board-container"
          style={{ width: "min(88vw, 400px)", pointerEvents: "none" }}
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
      <div className="flex items-center justify-between w-full max-w-[min(88vw,400px)] text-xs text-muted-foreground">
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
      <div id="chess-board-container" style={{ width: "min(88vw, 400px)" }} />
      {feedback && (
        <div
          className={`text-sm text-center min-h-[1.5rem] ${
            feedback.startsWith("+") || feedback === "Correct!"
              ? "text-green-500 font-bold"
              : "text-destructive"
          }`}
          data-ocid="chess_puzzle.feedback"
        >
          {feedback}
        </div>
      )}
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
