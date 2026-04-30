import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Puzzle {
  id: string;
  fen: string; // position AFTER opponent's last move (puzzle start)
  preMovefen: string; // position BEFORE opponent's last move
  lastMove: string; // opponent's last move in UCI notation
  rating: number;
  solution: string[]; // player solution moves in UCI notation; solution[0] is the expected first reply
  themes: string[];
}

interface UseChessPuzzlesReturn {
  currentPuzzle: Puzzle | null;
  loading: boolean;
  error: string | null;
  fetchNext: () => Promise<void>;
}

/**
 * Given a PGN string and the initialPly count from Lichess, replay the game
 * up to `initialPly` half-moves and return:
 *   - `preMovefen`: FEN before the final opponent move
 *   - `fen`: FEN after the final opponent move (the puzzle start position)
 *   - `lastMove`: UCI of the final opponent move
 */
function fenFromPuzzleData(
  pgn: string,
  initialPly: number,
): { fen: string; preMovefen: string; lastMove: string } | null {
  try {
    // Parse PGN to get the full move history
    const parser = new Chess();
    parser.loadPgn(pgn);
    const history = parser.history({ verbose: true });

    if (history.length === 0 || initialPly < 1) return null;

    // Replay up to initialPly half-moves from the start
    const replayer = new Chess();
    for (let i = 0; i < initialPly && i < history.length; i++) {
      replayer.move(history[i].san);
    }

    const fen = replayer.fen();

    // FEN one ply before (i.e., before the opponent's last move)
    const preReplayer = new Chess();
    for (let i = 0; i < initialPly - 1 && i < history.length; i++) {
      preReplayer.move(history[i].san);
    }
    const preMovefen = preReplayer.fen();

    // Derive lastMove in UCI from the verbose history entry
    const lastMoveObj = history[initialPly - 1];
    const lastMove = lastMoveObj
      ? `${lastMoveObj.from}${lastMoveObj.to}${lastMoveObj.promotion ?? ""}`
      : "";

    return { fen, preMovefen, lastMove };
  } catch {
    return null;
  }
}

/** Fetch step 1: get a puzzle ID from /api/puzzle/next */
async function fetchPuzzleMeta(): Promise<{
  id: string;
  rating: number;
  solution: string[];
  themes: string[];
} | null> {
  try {
    const res = await fetch("https://lichess.org/api/puzzle/next", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const puzzle = data.puzzle as Record<string, unknown> | undefined;
    if (!puzzle) return null;
    return {
      id: puzzle.id as string,
      rating: puzzle.rating as number,
      solution: (puzzle.solution as string[]) ?? [],
      themes: (puzzle.themes as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

/** Fetch step 2: get full puzzle data (including PGN) from /api/puzzle/:id */
async function fetchPuzzleById(id: string): Promise<Puzzle | null> {
  try {
    const res = await fetch(`https://lichess.org/api/puzzle/${id}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const puzzle = data.puzzle as Record<string, unknown> | undefined;
    const game = data.game as Record<string, unknown> | undefined;
    if (!puzzle || !game) return null;

    const pgn = game.pgn as string;
    const initialPly = puzzle.initialPly as number;
    const solution = (puzzle.solution as string[]) ?? [];
    const rating = puzzle.rating as number;
    const themes = (puzzle.themes as string[]) ?? [];

    if (!pgn || typeof initialPly !== "number") return null;

    const fenData = fenFromPuzzleData(pgn, initialPly);
    if (!fenData) return null;

    return {
      id,
      fen: fenData.fen,
      preMovefen: fenData.preMovefen,
      lastMove: fenData.lastMove,
      rating,
      // Lichess solution[0] is the opponent's last move; slice it so the component only sees the solver's moves.
      solution: solution.slice(1),
      themes,
    };
  } catch {
    return null;
  }
}

/** Fetch a single fully-resolved puzzle (two-step). Returns null on failure. */
async function fetchOnePuzzle(): Promise<Puzzle | null> {
  const meta = await fetchPuzzleMeta();
  if (!meta) return null;
  return fetchPuzzleById(meta.id);
}

const CACHE_SIZE = 5;

export function useChessPuzzles(
  initialTargetRating = 1000,
): UseChessPuzzlesReturn {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable refs — avoid stale closure issues
  const cacheRef = useRef<Puzzle[]>([]);
  const fillingRef = useRef(false); // prevent concurrent background fills
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _targetRatingRef = useRef(initialTargetRating); // kept for future rating-filter use

  /** Background-fill the cache up to CACHE_SIZE without changing loading state */
  const fillCache = useCallback(async () => {
    if (fillingRef.current) return;
    fillingRef.current = true;
    try {
      while (cacheRef.current.length < CACHE_SIZE) {
        const puzzle = await fetchOnePuzzle();
        if (puzzle) {
          cacheRef.current = [...cacheRef.current, puzzle];
        } else {
          // If a fetch fails during background fill, stop trying
          break;
        }
      }
    } finally {
      fillingRef.current = false;
    }
  }, []);

  /** Expose fetchNext — pop from cache or fetch immediately */
  const fetchNext = useCallback(async () => {
    if (cacheRef.current.length > 0) {
      const [next, ...rest] = cacheRef.current;
      cacheRef.current = rest;
      setCurrentPuzzle(next);
      setError(null);
      // Replenish cache in background
      void fillCache();
      return;
    }

    // CHANGE 3B: if a fill is already in-flight, poll until it delivers at least
    // one puzzle rather than blocking indefinitely on a second fetch.
    if (fillingRef.current) {
      setLoading(true);
      setError(null);
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (cacheRef.current.length > 0 || !fillingRef.current) {
            clearInterval(interval);
            resolve();
          }
        }, 200);
      });
      if (cacheRef.current.length > 0) {
        const [next, ...rest] = cacheRef.current;
        cacheRef.current = rest;
        setCurrentPuzzle(next);
        setError(null);
        setLoading(false);
        void fillCache();
        return;
      }
      // Fill finished but yielded nothing — fall through to direct fetch below
      setLoading(false);
    }

    // Cache empty and no fill in-flight — fetch one immediately (blocking)
    setLoading(true);
    setError(null);
    try {
      const puzzle = await fetchOnePuzzle();
      if (puzzle) {
        setCurrentPuzzle(puzzle);
      } else {
        setError("Failed to fetch puzzle. Check your connection.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      // Start filling cache after we have our first puzzle
      void fillCache();
    }
  }, [fillCache]);

  // On mount: fetch the first puzzle immediately, then fill cache.
  // fetchNext is stable (useCallback whose only dep is fillCache, which is also
  // stable), so this effectively runs once.
  useEffect(() => {
    void fetchNext();
  }, [fetchNext]);

  // Once currentPuzzle is set, stop showing loading spinner
  useEffect(() => {
    if (currentPuzzle) setLoading(false);
  }, [currentPuzzle]);

  return { currentPuzzle, loading, error, fetchNext };
}
