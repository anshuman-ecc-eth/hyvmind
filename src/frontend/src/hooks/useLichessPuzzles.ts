import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Puzzle {
  id: string;
  fen: string; // FEN AFTER opponent's lastMove (puzzle start position)
  lastMove: string; // opponent's creating move in UCI
  solution: string[]; // solver moves only (opponent setup move already sliced off)
  rating: number;
  themes: string[];
}

interface UseLichessPuzzlesReturn {
  puzzle: Puzzle | null;
  loading: boolean;
  error: string | null;
  fetchNext: () => Promise<void>;
}

const UA = "Hyvmind/1.0 (hyvmind.app)";
const HEADERS = { Accept: "application/json", "User-Agent": UA };
const CACHE_SIZE = 3;

/**
 * Compute puzzle FEN and lastMove from a Lichess /api/puzzle/{id} response.
 * The Lichess API returns a PGN + initialPly.  We replay the game to
 * initialPly half-moves to get the base position, then apply move[initialPly]
 * which is the opponent's last move that created the puzzle.
 */
function computePuzzlePosition(
  pgn: string,
  initialPly: number,
): { fen: string; lastMove: string } | null {
  try {
    const parser = new Chess();
    parser.loadPgn(pgn);
    const history = parser.history({ verbose: true });
    if (history.length === 0 || initialPly < 1) return null;

    // Replay to (initialPly - 1) to get pre-move position
    const pre = new Chess();
    for (let i = 0; i < initialPly - 1 && i < history.length; i++) {
      pre.move(history[i].san);
    }

    // The move at index (initialPly - 1) is the opponent's creating move
    const lastMoveObj = history[initialPly - 1];
    if (!lastMoveObj) return null;
    const lastMove =
      lastMoveObj.from + lastMoveObj.to + (lastMoveObj.promotion ?? "");

    // Apply that move to get the puzzle-start FEN
    pre.move(lastMoveObj.san);
    return { fen: pre.fen(), lastMove };
  } catch (err) {
    console.error("computePuzzlePosition failed:", err);
    return null;
  }
}

/** Step 1: get puzzle ID (and solution/themes) from /api/puzzle/next */
async function fetchPuzzleMeta(): Promise<{
  id: string;
  rating: number;
  solution: string[];
  themes: string[];
} | null> {
  try {
    const res = await fetch("https://lichess.org/api/puzzle/next", {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const p = data.puzzle as Record<string, unknown> | undefined;
    if (!p?.id) return null;
    return {
      id: p.id as string,
      rating: (p.rating as number) ?? 1500,
      solution: (p.solution as string[]) ?? [],
      themes: (p.themes as string[]) ?? [],
    };
  } catch (err) {
    console.error("fetchPuzzleMeta failed:", err);
    return null;
  }
}

/** Step 2: get PGN + initialPly from /api/puzzle/{id}, compute FEN */
async function fetchPuzzleById(id: string): Promise<Puzzle | null> {
  try {
    const res = await fetch(`https://lichess.org/api/puzzle/${id}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const p = data.puzzle as Record<string, unknown> | undefined;
    const g = data.game as Record<string, unknown> | undefined;
    if (!p || !g) return null;

    const pgn = g.pgn as string;
    const initialPly = p.initialPly as number;
    const solution = (p.solution as string[]) ?? [];
    const rating = (p.rating as number) ?? 1500;
    const themes = (p.themes as string[]) ?? [];

    if (!pgn || typeof initialPly !== "number") return null;

    const pos = computePuzzlePosition(pgn, initialPly);
    if (!pos) return null;

    // Validate required fields
    if (!pos.fen || !pos.lastMove || solution.length < 2) {
      console.error("fetchPuzzleById: missing required fields", {
        pos,
        solution,
      });
      return null;
    }

    return {
      id,
      fen: pos.fen,
      lastMove: pos.lastMove,
      // solution[0] from Lichess is the opponent's last move (same as lastMove).
      // Slice it off so solution[0] is the first move the solver must play.
      solution: solution.slice(1),
      rating,
      themes,
    };
  } catch (err) {
    console.error("fetchPuzzleById failed:", err);
    return null;
  }
}

/** Fetch one puzzle with retry (up to 2 retries, exponential backoff) */
async function fetchOnePuzzle(retries = 2): Promise<Puzzle | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const meta = await fetchPuzzleMeta();
      if (!meta) throw new Error("fetchPuzzleMeta returned null");
      const puzzle = await fetchPuzzleById(meta.id);
      if (puzzle) return puzzle;
      throw new Error("fetchPuzzleById returned null");
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      } else {
        console.error("fetchOnePuzzle: all retries exhausted", err);
      }
    }
  }
  return null;
}

export function useLichessPuzzles(): UseLichessPuzzlesReturn {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Puzzle[]>([]);
  const fillingRef = useRef(false);

  const fillCache = useCallback(async () => {
    if (fillingRef.current) return;
    fillingRef.current = true;
    try {
      while (cacheRef.current.length < CACHE_SIZE) {
        const p = await fetchOnePuzzle();
        if (p) {
          cacheRef.current = [...cacheRef.current, p];
        } else {
          break;
        }
      }
    } finally {
      fillingRef.current = false;
    }
  }, []);

  const fetchNext = useCallback(async () => {
    // Pop from cache if available
    if (cacheRef.current.length > 0) {
      const [next, ...rest] = cacheRef.current;
      cacheRef.current = rest;
      setPuzzle(next);
      setError(null);
      setLoading(false);
      void fillCache();
      return;
    }

    // If background fill is running, wait for it
    if (fillingRef.current) {
      setLoading(true);
      await new Promise<void>((resolve) => {
        const iv = setInterval(() => {
          if (cacheRef.current.length > 0 || !fillingRef.current) {
            clearInterval(iv);
            resolve();
          }
        }, 200);
      });
      if (cacheRef.current.length > 0) {
        const [next, ...rest] = cacheRef.current;
        cacheRef.current = rest;
        setPuzzle(next);
        setError(null);
        setLoading(false);
        void fillCache();
        return;
      }
    }

    // Direct fetch as fallback
    setLoading(true);
    setError(null);
    try {
      const p = await fetchOnePuzzle();
      if (p) {
        setPuzzle(p);
        setError(null);
      } else {
        setError("Failed to load puzzle. Check your connection.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      void fillCache();
    }
  }, [fillCache]);

  useEffect(() => {
    void fetchNext();
  }, [fetchNext]);

  return { puzzle, loading, error, fetchNext };
}
