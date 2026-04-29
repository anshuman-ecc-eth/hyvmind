import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChessPuzzles } from "../hooks/useChessPuzzles";
import { CHESS_UNICODE } from "../utils/chessPieces";

interface ChessPuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

function calculateScore(puzzleNumber: number): number {
  return 10 + puzzleNumber * 20;
}

/** Parse FEN board string into an 8x8 array (rank 8 = index 0, file a = index 0). */
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

/** Apply a UCI move to a FEN string and return the resulting FEN. */
function applyUciMove(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    chess.move({ from, to, promotion });
    return chess.fen();
  } catch {
    return null;
  }
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
        width: "100%",
        maxWidth: 360,
        aspectRatio: "1 / 1",
        margin: "0 auto",
        border: "2px solid var(--border)",
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
                fontSize: "1.6rem",
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
  const [targetRating, setTargetRating] = useState(1500);
  const [timeLeft, setTimeLeft] = useState(20);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<
    "incorrect" | "timeout" | null
  >(null);
  const [boardFen, setBoardFen] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentPuzzle, loading, error, fetchNext } =
    useChessPuzzles(targetRating);

  // Fetch first puzzle on mount — fetchNext is stable (useCallback with no changing deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchNext();
  }, [fetchNext]); // fetchNext is a stable callback from useChessPuzzles

  // When puzzle changes, apply opponent move and update boardFen
  useEffect(() => {
    if (!currentPuzzle) return;
    const result = applyUciMove(currentPuzzle.fen, currentPuzzle.opponentMove);
    setBoardFen(result ?? currentPuzzle.fen);
    setTimeLeft(20);
    setUserInput("");
    setFeedback(null);
    inputRef.current?.focus();
  }, [currentPuzzle]);

  // Timer countdown
  useEffect(() => {
    if (gameOver || !currentPuzzle || loading) return;

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
  }, [currentPuzzle, gameOver, loading]);

  const handleSubmit = useCallback(() => {
    if (!currentPuzzle || !boardFen || gameOver) return;
    const san = userInput.trim();
    if (!san) return;

    try {
      const chess = new Chess(boardFen);
      const move = chess.move(san);
      if (!move) throw new Error("Invalid move");

      // Construct UCI from the Move object
      const uci = move.from + move.to + (move.promotion ?? "");
      const expected = currentPuzzle.solution[0];

      if (uci === expected) {
        // Correct!
        if (timerRef.current) clearInterval(timerRef.current);
        const points = calculateScore(puzzleNumber);
        const newScore = score + points;
        setScore(newScore);
        setFeedback(`Correct! +${points}`);

        feedbackTimeoutRef.current = setTimeout(() => {
          setPuzzleNumber((n) => n + 1);
          setTargetRating((r) => r + 100);
          void fetchNext();
        }, 1500);
      } else {
        // Wrong move — game over
        if (timerRef.current) clearInterval(timerRef.current);
        setGameOver(true);
        setGameOverReason("incorrect");
        setFeedback("Incorrect!");
      }
    } catch {
      // chess.js throws on invalid SAN
      setFeedback("Invalid move");
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const timerColor =
    timeLeft <= 5 ? "text-destructive" : "text-muted-foreground";

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading && !currentPuzzle) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-12 font-mono"
        data-ocid="chess_puzzle.loading_state"
      >
        <div className="text-foreground text-sm animate-pulse">
          Fetching puzzles...
        </div>
        <button
          type="button"
          className="text-muted-foreground text-xs underline mt-4"
          onClick={onExit}
          data-ocid="chess_puzzle.cancel_button"
        >
          BACK
        </button>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !currentPuzzle) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-12 font-mono"
        data-ocid="chess_puzzle.error_state"
      >
        <div className="text-destructive text-sm">{error}</div>
        <button
          type="button"
          className="text-muted-foreground text-xs underline"
          onClick={onExit}
          data-ocid="chess_puzzle.cancel_button"
        >
          BACK
        </button>
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────────────────
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
            onClick={onExit}
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

  // ── Main Game ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center gap-4 py-4 font-mono"
      data-ocid="chess_puzzle.panel"
    >
      {/* Header row: puzzle #, score, rating, timer */}
      <div className="flex items-center justify-between w-full max-w-[360px] text-xs text-muted-foreground px-1">
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

      {/* Board */}
      {boardFen ? (
        <ChessBoard fen={boardFen} />
      ) : (
        <div className="text-muted-foreground text-xs animate-pulse">
          Loading board...
        </div>
      )}

      {/* Instruction */}
      <div className="text-muted-foreground text-xs tracking-wide">
        Enter your move in SAN notation (e.g. Qxf7)
      </div>

      {/* Input row */}
      <div className="flex gap-2 w-full max-w-[360px]">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="SAN MOVE..."
          disabled={gameOver}
          className="flex-1 bg-background border border-border text-foreground font-mono text-sm px-3 py-2 uppercase placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          style={{ letterSpacing: "0.1em" }}
          autoComplete="off"
          spellCheck={false}
          data-ocid="chess_puzzle.input"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={gameOver || !userInput.trim()}
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
