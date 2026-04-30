import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow, PieceDropHandlerArgs } from "react-chessboard";
import { useChessPuzzles } from "../hooks/useChessPuzzles";

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

// Flat 50 points per puzzle
function calculateScore(_n: number): number {
  return 50;
}

const PIECE_SYMBOLS: Record<string, string> = {
  q: "♕",
  r: "♖",
  b: "♗",
  n: "♘",
};

export default function ChessPuzzleGame({
  onComplete,
  onExit,
}: ChessPuzzleGameProps) {
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [targetRating, setTargetRating] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<
    "timeout" | "incorrect" | null
  >(null);
  const [promotionState, setPromotionState] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Step 1: persistent chess state
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { currentPuzzle, loading, error, fetchNext } =
    useChessPuzzles(targetRating);

  // boardFen is the puzzle position (after opponent's premove) — kept as fallback
  const boardFen = currentPuzzle?.fen ?? null;

  // Board orientation: inverted so White pieces appear at the bottom when White is the solver
  const sideToMove = boardFen?.split(" ")[1] ?? "w";
  const boardOrientation = sideToMove === "w" ? "black" : "white";

  // Last-move arrow: blue arrow showing the opponent's move that created the puzzle position
  const lastMoveArrow: Arrow[] =
    currentPuzzle?.lastMove && currentPuzzle.lastMove.length >= 4
      ? [
          {
            startSquare: currentPuzzle.lastMove.slice(0, 2),
            endSquare: currentPuzzle.lastMove.slice(2, 4),
            color: "#60a5fa",
          },
        ]
      : [];

  // ── Step 4: Validate a move against the full solution sequence ───────────
  const validateMove = useCallback(
    (move: ReturnType<Chess["move"]>): boolean => {
      if (!move || !currentPuzzle || !chessInstance) return false;

      const uci = move.from + move.to + (move.promotion ?? "");
      const expected = currentPuzzle.solution[moveIndex];

      if (uci === expected) {
        const newIndex = moveIndex + 1;
        setMoveIndex(newIndex);
        setFeedback("Correct!");
        setChessInstance(new Chess(chessInstance.fen()));

        const remaining = currentPuzzle.solution.length - newIndex;
        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          const points = calculateScore(puzzleNumber);
          setScore((s) => s + points);
          setTimeout(() => {
            setPuzzleNumber((n) => n + 1);
            void fetchNext();
          }, 1500);
          return true;
        }

        // Auto-play opponent reply using a fresh clone to avoid stale closure
        setTimeout(() => {
          const reply = currentPuzzle.solution[newIndex];
          const newChess = new Chess(chessInstance.fen());
          newChess.move({
            from: reply.slice(0, 2),
            to: reply.slice(2, 4),
            promotion: reply.length === 5 ? reply[4] : undefined,
          });
          setMoveIndex((i) => i + 1);
          setChessInstance(new Chess(newChess.fen()));
        }, 500);

        return true;
      }

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setGameOverReason("incorrect");
      setFeedback("Incorrect!");
      return true;
    },
    [currentPuzzle, puzzleNumber, moveIndex, chessInstance, fetchNext],
  );

  // ── Step 5: Handle drag-and-drop piece drop ──────────────────────────────
  const handlePieceDrop = useCallback(
    ({
      piece: _piece,
      sourceSquare,
      targetSquare,
    }: PieceDropHandlerArgs): boolean => {
      if (!currentPuzzle || gameOver || !chessInstance || promotionState)
        return false;
      if (!targetSquare) return false;
      // Clone the instance so the original state is unchanged until validateMove commits
      const chess = new Chess(chessInstance.fen());
      try {
        const move = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
        if (!move) return false;
        // Detect pawn promotion — let user pick piece
        if (move.promotion) {
          setPromotionState({ from: move.from, to: move.to });
          return false;
        }
        return validateMove(move);
      } catch {
        return false;
      }
    },
    [chessInstance, currentPuzzle, gameOver, promotionState, validateMove],
  );

  // ── Step 6: Complete a promotion with chosen piece ───────────────────────
  const completePromotion = useCallback(
    (pieceType: string) => {
      if (!promotionState || !chessInstance) return;
      const chess = new Chess(chessInstance.fen());
      const move = chess.move({
        from: promotionState.from,
        to: promotionState.to,
        promotion: pieceType,
      });
      setPromotionState(null);
      if (move) {
        const uci = move.from + move.to + pieceType;
        const expected = currentPuzzle?.solution[moveIndex];
        if (uci === expected) {
          const newIndex = moveIndex + 1;
          setMoveIndex(newIndex);
          setFeedback("Correct!");
          setChessInstance(new Chess(chess.fen()));

          const remaining = (currentPuzzle?.solution.length ?? 0) - newIndex;
          if (remaining === 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            const points = calculateScore(puzzleNumber);
            setScore((s) => s + points);
            setTimeout(() => {
              setPuzzleNumber((n) => n + 1);
              void fetchNext();
            }, 1500);
          } else {
            // Auto-play opponent reply
            setTimeout(() => {
              if (!currentPuzzle) return;
              const reply = currentPuzzle.solution[newIndex];
              const newChess = new Chess(chess.fen());
              newChess.move({
                from: reply.slice(0, 2),
                to: reply.slice(2, 4),
                promotion: reply.length === 5 ? reply[4] : undefined,
              });
              setMoveIndex((i) => i + 1);
              setChessInstance(new Chess(newChess.fen()));
            }, 500);
          }
        } else {
          if (feedbackTimeoutRef.current)
            clearTimeout(feedbackTimeoutRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setGameOver(true);
          setGameOverReason("incorrect");
          setFeedback("Incorrect!");
        }
      }
    },
    [
      promotionState,
      chessInstance,
      currentPuzzle,
      puzzleNumber,
      moveIndex,
      fetchNext,
    ],
  );

  // ── Step 7: Timer — starts only when puzzle + board are fully ready ──────
  useEffect(() => {
    if (gameOver || !currentPuzzle || !boardFen || loading || promotionState)
      return;
    setTimeLeft(60);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (feedbackTimeoutRef.current)
            clearTimeout(feedbackTimeoutRef.current);
          setGameOver(true);
          setGameOverReason("timeout");
          setFeedback("Time's up!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentPuzzle, boardFen, gameOver, loading, promotionState]);

  // ── Reset / try again ────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setPuzzleNumber(1);
    setScore(0);
    setTargetRating(1000);
    setTimeLeft(60);
    setFeedback("");
    setGameOver(false);
    setGameOverReason(null);
    setPromotionState(null);
    setChessInstance(null);
    setMoveIndex(0);
    void fetchNext();
  }, [fetchNext]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // ── Step 3: Initialize chess instance when puzzle loads ──────────────────
  useEffect(() => {
    if (currentPuzzle?.fen) {
      setChessInstance(new Chess(currentPuzzle.fen));
      setMoveIndex(0);
    }
  }, [currentPuzzle?.fen]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading || !boardFen) {
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

  // ── Error state ──────────────────────────────────────────────────────────
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

  // ── Step 8+9: Game over state ─────────────────────────────────────────────
  if (gameOver) {
    // Build solution arrows (Atzingen style: green=player, blue=opponent)
    const solutionArrows: Arrow[] = currentPuzzle
      ? currentPuzzle.solution.map((move, i) => ({
          startSquare: move.slice(0, 2),
          endSquare: move.slice(2, 4),
          color: i % 2 === 0 ? "#4ade80" : "#60a5fa",
        }))
      : [];

    const correctMoveHint =
      gameOverReason === "incorrect" && currentPuzzle
        ? (() => {
            const sol =
              currentPuzzle.solution[moveIndex] ?? currentPuzzle.solution[0];
            const hintFrom = sol.slice(0, 2).toUpperCase();
            const hintTo = sol.slice(2, 4).toUpperCase();
            return `Correct move was: ${hintFrom}→${hintTo}`;
          })()
        : null;

    return (
      <div
        className="flex flex-col items-center gap-4 py-4 font-mono w-full"
        data-ocid="chess_puzzle.game_over"
      >
        {/* Board at final position */}
        <Chessboard
          options={{
            position: chessInstance?.fen() ?? boardFen,
            boardOrientation,
            allowDragging: false,
            boardStyle: {
              width: "min(90vw, 400px)",
              height: "min(90vw, 400px)",
            },
            darkSquareStyle: { backgroundColor: "#6b6b7b" },
            lightSquareStyle: { backgroundColor: "#f0f0d8" },
            arrows: [...lastMoveArrow, ...solutionArrows],
          }}
        />

        {/* Correct move hint text */}
        {correctMoveHint && (
          <div className="text-sm font-mono mt-2 text-muted-foreground">
            {correctMoveHint}
          </div>
        )}

        <div className="flex flex-col items-center gap-2 mt-1">
          <div
            className="text-destructive font-bold text-lg tracking-widest"
            data-ocid="chess_puzzle.error_state"
          >
            {gameOverReason === "timeout" ? "TIME'S UP!" : "INCORRECT!"}
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
            onClick={handleTryAgain}
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

  // ── Step 10: Main game ────────────────────────────────────────────────────
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
        <span>Rating: {targetRating}</span>
        <span
          className={`text-xl font-bold tabular-nums ${
            timeLeft <= 5 ? "text-destructive" : "text-foreground"
          }`}
          data-ocid="chess_puzzle.timer"
        >
          {timeLeft}s
        </span>
      </div>

      {/* Promotion piece selector */}
      {promotionState && (
        <div className="flex gap-2" data-ocid="chess_puzzle.promotion_selector">
          {["q", "r", "b", "n"].map((piece) => (
            <button
              key={piece}
              type="button"
              onClick={() => completePromotion(piece)}
              className="w-12 h-12 bg-primary text-primary-foreground rounded hover:opacity-80 text-xl"
              data-ocid={`chess_puzzle.promotion_${piece}`}
            >
              {PIECE_SYMBOLS[piece]}
            </button>
          ))}
        </div>
      )}

      {/* Chessboard — position driven by chessInstance */}
      <Chessboard
        options={{
          position: chessInstance?.fen() ?? boardFen ?? "start",
          boardOrientation,
          onPieceDrop: handlePieceDrop,
          arrows: lastMoveArrow,
          allowDragging: !gameOver && !promotionState,
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
        data-ocid="chess_puzzle.success_state"
        style={{
          color: feedback.startsWith("Correct")
            ? "oklch(65% 0.15 150)"
            : feedback
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
