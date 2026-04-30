import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";
import { useChessPuzzles } from "../hooks/useChessPuzzles";
import type { Puzzle } from "../hooks/useChessPuzzles";

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

export default function ChessPuzzleGame({
  onComplete,
  onExit,
}: ChessPuzzleGameProps) {
  // === STEP 1: STATE ===
  const [game, setGame] = useState<Chess | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    currentPuzzle: fetchedPuzzle,
    loading,
    error,
    fetchNext,
  } = useChessPuzzles();

  // Sync fetchedPuzzle into local state
  useEffect(() => {
    if (fetchedPuzzle) setCurrentPuzzle(fetchedPuzzle);
  }, [fetchedPuzzle]);

  // === STEP 2: BOARD ORIENTATION ===
  // After puzzle FEN is applied, it is the solver's turn.
  // sideToMove "w" → White is solver → boardOrientation "white" (white pieces at bottom)
  const sideToMove = game?.fen().split(" ")[1] ?? "w";
  const boardOrientation: "white" | "black" =
    sideToMove === "w" ? "white" : "black";

  // === STEP 3: loadPuzzle ===
  // The puzzle.fen already represents the position AFTER the opponent's lastMove
  // (confirmed by useChessPuzzles.ts: fen = fenData.fen which is after initialPly moves).
  // We simply load that FEN directly — no need to re-apply lastMove.
  const loadPuzzle = useCallback(() => {
    if (!currentPuzzle) return;
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFeedback("");
    setIsCorrect(null);
  }, [currentPuzzle]);

  // === STEP 6: PUZZLE LOAD EFFECT ===
  useEffect(() => {
    if (currentPuzzle) loadPuzzle();
  }, [currentPuzzle, loadPuzzle]);

  // === STEP 4: handlePieceDrop ===
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!game || !currentPuzzle || gameOver) return false;
      if (!targetSquare) return false;

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (!move) return false;

      const uci = move.from + move.to + (move.promotion ?? "");
      const expected = currentPuzzle.solution[0];

      if (uci === expected) {
        setIsCorrect(true);
        setFeedback("Correct!");

        if (currentPuzzle.solution.length === 1) {
          // Puzzle complete — single move solution
          if (timerRef.current) clearInterval(timerRef.current);
          setScore((s) => s + 50);
          setPuzzleNumber((n) => n + 1);
          setTimeout(() => {
            void fetchNext();
          }, 1200);
        } else {
          // Auto-play opponent's response (solution[1]) after 500ms
          setTimeout(() => {
            const reply = currentPuzzle.solution[1];
            game.move({
              from: reply.slice(0, 2),
              to: reply.slice(2, 4),
              promotion: reply[4] ?? undefined,
            });
            setCurrentPuzzle((prev) =>
              prev ? { ...prev, solution: prev.solution.slice(2) } : null,
            );
            setGame(new Chess(game.fen()));
            setFeedback("");
            setIsCorrect(null);
          }, 500);
        }
        return true;
      }
      setFeedback("Incorrect!");
      setIsCorrect(false);
      setGameOver(true);
      return true;
    },
    [game, currentPuzzle, gameOver, fetchNext],
  );

  // === STEP 5: TIMER EFFECT ===
  // `game` is intentionally omitted from deps to avoid resetting the timer
  // on every board state change — we only want to reset when the puzzle changes.
  useEffect(() => {
    if (gameOver || !currentPuzzle) return;
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
    // Intentionally omit `game` to avoid resetting timer on every game state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPuzzle, gameOver]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // === STEP 7: LAST MOVE ARROW ===
  const lastMoveArrow =
    currentPuzzle?.lastMove && currentPuzzle.lastMove.length >= 4
      ? [
          {
            startSquare: currentPuzzle.lastMove.slice(0, 2),
            endSquare: currentPuzzle.lastMove.slice(2, 4),
            color: "#60a5fa",
          },
        ]
      : [];

  // === STEP 8: RENDER ===

  // Loading state
  if (loading || !game) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 font-mono"
        data-ocid="chess_puzzle.loading_state"
      >
        <div className="text-foreground text-sm animate-pulse">
          Loading puzzle...
        </div>
        <button
          type="button"
          onClick={onExit}
          className="text-muted-foreground text-xs underline mt-4 hover:text-foreground transition-colors"
          data-ocid="chess_puzzle.cancel_button"
        >
          BACK
        </button>
      </div>
    );
  }

  // Error state
  if (error && !currentPuzzle) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-12 font-mono"
        data-ocid="chess_puzzle.error_state"
      >
        <div className="text-destructive text-sm text-center px-4">{error}</div>
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

  // Game over state
  if (gameOver) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-4 font-mono w-full"
        data-ocid="chess_puzzle.game_over"
      >
        <Chessboard
          options={{
            position: game.fen(),
            boardOrientation,
            allowDragging: false,
            boardStyle: {
              width: "min(90vw, 400px)",
              height: "min(90vw, 400px)",
            },
            darkSquareStyle: { backgroundColor: "#6b6b7b" },
            lightSquareStyle: { backgroundColor: "#f0f0d8" },
            arrows: lastMoveArrow,
          }}
        />

        <div className="flex flex-col items-center gap-2 mt-1">
          <div
            className="text-destructive font-bold text-lg tracking-widest"
            data-ocid="chess_puzzle.error_state"
          >
            {feedback === "Time's up!" ? "TIME'S UP!" : "INCORRECT!"}
          </div>
          <div className="text-foreground text-sm">
            Puzzles solved:{" "}
            <span className="font-bold">{puzzleNumber - 1}</span>
          </div>
          <div className="text-foreground text-sm">
            Final score: <span className="font-bold text-primary">{score}</span>
          </div>
        </div>

        <div className="flex gap-4 mt-2">
          <button
            type="button"
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setScore(0);
              setPuzzleNumber(1);
              setGameOver(false);
              setFeedback("");
              setIsCorrect(null);
              setGame(null);
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

  // Active game
  return (
    <div
      className="flex flex-col items-center gap-3 py-4 font-mono w-full"
      data-ocid="chess_puzzle.panel"
    >
      {/* Header row */}
      <div className="flex items-center justify-between w-full max-w-[400px] text-xs text-muted-foreground">
        <span data-ocid="chess_puzzle.puzzle_number">#{puzzleNumber}</span>
        <span>
          Score: <span className="text-foreground font-bold">{score}</span>
        </span>
        <span
          className={`text-xl font-bold tabular-nums ${
            timeLeft <= 10 ? "text-destructive" : "text-foreground"
          }`}
          data-ocid="chess_puzzle.timer"
        >
          {timeLeft}s
        </span>
      </div>

      {/* Chessboard */}
      <Chessboard
        options={{
          position: game.fen(),
          boardOrientation,
          onPieceDrop: handlePieceDrop,
          arrows: lastMoveArrow,
          allowDragging: !gameOver,
          boardStyle: {
            width: "min(90vw, 400px)",
            height: "min(90vw, 400px)",
          },
          darkSquareStyle: { backgroundColor: "#6b6b7b" },
          lightSquareStyle: { backgroundColor: "#f0f0d8" },
          clearArrowsOnPositionChange: false,
        }}
      />

      {/* Feedback */}
      <div
        className="text-sm text-center min-h-[1.5rem]"
        data-ocid={
          isCorrect === true
            ? "chess_puzzle.success_state"
            : isCorrect === false
              ? "chess_puzzle.error_state"
              : "chess_puzzle.feedback"
        }
        style={{
          color:
            isCorrect === true
              ? "oklch(65% 0.15 150)"
              : isCorrect === false
                ? "var(--destructive)"
                : "transparent",
        }}
      >
        {feedback || "·"}
      </div>

      {/* Exit */}
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
