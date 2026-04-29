import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChessPuzzles } from "../hooks/useChessPuzzles";
import { CHESS_UNICODE } from "../utils/chessPieces";
import { uciToSan } from "../utils/chessUtils";

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

function calculateScore(puzzleNumber: number): number {
  return 10 + puzzleNumber * 20;
}

/** Parse FEN board string into an 8×8 array (rank 8 = row 0, file a = col 0). */
function parseFenBoard(fen: string): (string | null)[][] {
  const boardPart = fen.split(" ")[0];
  const ranks = boardPart.split("/");
  return ranks.map((rank) => {
    const row: (string | null)[] = [];
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        const empties = Number.parseInt(ch, 10);
        for (let i = 0; i < empties; i++) row.push(null);
      } else {
        row.push(ch);
      }
    }
    return row;
  });
}

/** Render an 8×8 chess board from a FEN string. */
function ChessBoard({ fen }: { fen: string }) {
  const board = parseFenBoard(fen);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        width: "min(90vw, 400px)",
        height: "min(90vw, 400px)",
        margin: "0 auto",
        border: "2px solid var(--border)",
        flexShrink: 0,
      }}
      aria-label="Chess board"
    >
      {board.map((rank, rankIdx) =>
        rank.map((piece, fileIdx) => {
          const isLight = (rankIdx + fileIdx) % 2 === 0;
          const bg = isLight ? "#f0f0d8" : "#6b6b7b";
          const symbol = piece ? (CHESS_UNICODE[piece] ?? "") : "";
          const isWhitePiece = piece !== null && piece === piece.toUpperCase();
          return (
            <div
              key={`sq-${rankIdx * 8 + fileIdx}`}
              style={{
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(1rem, 4vw, 1.6rem)",
                lineHeight: 1,
                color: isWhitePiece ? "#ffffff" : "#111111",
                textShadow: isWhitePiece
                  ? "0 0 2px #000, 0 0 4px #000"
                  : "0 0 2px #fff, 0 0 4px #fff",
                userSelect: "none",
                cursor: "default",
                fontFamily:
                  '"Segoe UI Symbol", "Apple Color Emoji", sans-serif',
              }}
            >
              {symbol}
            </div>
          );
        }),
      )}
    </div>
  );
}

export default function ChessPuzzleGame({
  onComplete,
  onExit,
}: ChessPuzzleGameProps) {
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [targetRating, setTargetRating] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(20);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<
    "incorrect" | "timeout" | null
  >(null);
  /** FEN of the puzzle start position (after opponent's last move). Set only when ready. */
  const [boardFen, setBoardFen] = useState<string | null>(null);
  /** Human-readable opponent move in SAN or UCI fallback */
  const [opponentMoveSan, setOpponentMoveSan] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentPuzzle, loading, error, fetchNext } =
    useChessPuzzles(targetRating);

  // ── Puzzle loaded: set board FEN and opponent move display ───────────────
  useEffect(() => {
    if (!currentPuzzle) return;
    setBoardFen(currentPuzzle.fen);
    setTimeLeft(20);
    setUserInput("");
    setFeedback(null);

    // Convert lastMove UCI → SAN using the pre-move position
    try {
      const san = uciToSan(currentPuzzle.preMovefen, currentPuzzle.lastMove);
      setOpponentMoveSan(san);
    } catch {
      setOpponentMoveSan(currentPuzzle.lastMove || null);
    }

    inputRef.current?.focus();
  }, [currentPuzzle]);

  // ── Timer countdown — ONLY starts when board is fully ready ─────────────
  useEffect(() => {
    // Do not start if any of: game over, no puzzle, no board, still loading
    if (gameOver || !currentPuzzle || boardFen === null || loading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
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
  }, [currentPuzzle, boardFen, gameOver, loading]);

  // ── Move submission ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!currentPuzzle || !boardFen || gameOver) return;
    const san = userInput.trim();
    if (!san) return;

    try {
      const chess = new Chess(boardFen);
      const move = chess.move(san);
      if (!move) throw new Error("Invalid move");

      const uci = move.from + move.to + (move.promotion ?? "");
      const expected = currentPuzzle.solution[0];

      if (uci === expected) {
        if (timerRef.current) clearInterval(timerRef.current);
        const points = calculateScore(puzzleNumber);
        const newScore = score + points;
        setScore(newScore);
        setFeedback(`Correct! +${points}`);
        setBoardFen(null); // hide board while loading next

        feedbackTimeoutRef.current = setTimeout(() => {
          setPuzzleNumber((n) => n + 1);
          setTargetRating((r) => r + 100);
          void fetchNext();
        }, 1500);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameOver(true);
        setGameOverReason("incorrect");
        setFeedback("Incorrect!");
      }
    } catch {
      setFeedback("Invalid move — try again");
      setUserInput("");
    }
  }, [
    currentPuzzle,
    boardFen,
    gameOver,
    userInput,
    score,
    puzzleNumber,
    fetchNext,
  ]);

  // ── Reset handler ────────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setPuzzleNumber(1);
    setScore(0);
    setTargetRating(1000);
    setTimeLeft(20);
    setUserInput("");
    setFeedback(null);
    setGameOver(false);
    setGameOverReason(null);
    setBoardFen(null);
    setOpponentMoveSan(null);
    void fetchNext();
  }, [fetchNext]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const timerColor =
    timeLeft <= 5 ? "text-destructive" : "text-muted-foreground";

  // ── Loading state (initial fetch) ────────────────────────────────────────
  if (loading && !currentPuzzle) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-12 font-mono"
        data-ocid="chess_puzzle.loading_state"
      >
        <div className="text-foreground text-sm animate-pulse">
          Fetching puzzle...
        </div>
        <button
          type="button"
          className="text-muted-foreground text-xs underline mt-4 hover:text-foreground transition-colors"
          onClick={onExit}
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
          className="text-muted-foreground text-xs underline hover:text-foreground transition-colors"
          onClick={onExit}
          data-ocid="chess_puzzle.cancel_button"
        >
          BACK
        </button>
      </div>
    );
  }

  // ── Game over ────────────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <div
        className="flex flex-col items-center gap-6 py-6 font-mono"
        data-ocid="chess_puzzle.game_over"
      >
        {boardFen && <ChessBoard fen={boardFen} />}

        <div className="flex flex-col items-center gap-2 mt-2">
          <div
            className="text-destructive text-base font-bold tracking-widest"
            data-ocid="chess_puzzle.error_state"
          >
            {gameOverReason === "timeout" ? "TIME'S UP!" : "INCORRECT!"}
          </div>
          <div className="text-foreground text-sm">
            Final Score: <span className="font-bold text-primary">{score}</span>
          </div>
          <div className="text-muted-foreground text-xs">
            Puzzles solved: {puzzleNumber - 1}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            className="text-muted-foreground text-xs tracking-widest hover:text-foreground transition-colors"
            onClick={handleTryAgain}
            data-ocid="chess_puzzle.cancel_button"
          >
            TRY AGAIN
          </button>
          {score > 0 && (
            <button
              type="button"
              className="text-primary text-xs tracking-widest hover:opacity-80 transition-opacity font-bold"
              onClick={() => onComplete(score)}
              data-ocid="chess_puzzle.submit_button"
            >
              SUBMIT SCORE
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main game ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center gap-3 py-4 font-mono"
      data-ocid="chess_puzzle.panel"
    >
      {/* Header row */}
      <div className="flex items-center justify-between w-full max-w-[400px] text-xs text-muted-foreground px-1">
        <span data-ocid="chess_puzzle.puzzle_number">#{puzzleNumber}</span>
        <span>
          Score: <span className="text-foreground font-bold">{score}</span>
        </span>
        <span>Rating: {targetRating}</span>
        <span
          className={`font-bold tabular-nums ${timerColor}`}
          data-ocid="chess_puzzle.timer"
        >
          {timeLeft}s
        </span>
      </div>

      {/* Board or loading placeholder */}
      {boardFen ? (
        <ChessBoard fen={boardFen} />
      ) : (
        <div
          className="flex items-center justify-center text-muted-foreground text-xs animate-pulse"
          style={{ width: "min(90vw, 400px)", height: "min(90vw, 400px)" }}
          data-ocid="chess_puzzle.loading_state"
        >
          Loading board...
        </div>
      )}

      {/* Opponent's last move — shown only when board is ready */}
      {boardFen && opponentMoveSan && (
        <div className="text-xs text-muted-foreground tracking-wide">
          Opponent played:{" "}
          <span className="text-foreground font-bold">{opponentMoveSan}</span>
        </div>
      )}

      {/* SAN input hint */}
      {boardFen && (
        <div className="text-muted-foreground text-xs tracking-wide">
          Your Move..{" "}
          <span className="opacity-50">(SAN notation, e.g. Qxf7)</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 w-full max-w-[400px]">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Your Move.."
          disabled={gameOver || !boardFen}
          className="flex-1 bg-background border border-border text-foreground font-mono text-sm px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-40"
          style={{ letterSpacing: "0.05em" }}
          autoComplete="off"
          spellCheck={false}
          data-ocid="chess_puzzle.input"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={gameOver || !userInput.trim() || !boardFen}
          className="bg-primary text-primary-foreground font-mono text-xs tracking-widest px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
          data-ocid="chess_puzzle.submit_button"
        >
          ENTER
        </button>
      </div>

      {/* Feedback */}
      <div
        className="h-5 text-xs font-bold tracking-widest"
        style={{
          color: feedback?.startsWith("Correct")
            ? "oklch(65% 0.15 150)"
            : feedback
              ? "var(--destructive)"
              : "transparent",
        }}
        data-ocid="chess_puzzle.success_state"
      >
        {feedback ?? "·"}
      </div>

      {/* Exit */}
      <button
        type="button"
        className="text-muted-foreground text-xs underline hover:text-foreground transition-colors mt-1"
        onClick={onExit}
        data-ocid="chess_puzzle.cancel_button"
      >
        EXIT
      </button>
    </div>
  );
}
