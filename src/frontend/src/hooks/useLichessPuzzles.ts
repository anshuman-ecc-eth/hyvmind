import { useCallback, useEffect, useRef, useState } from "react";

export interface Puzzle {
  id: string;
  fen: string; // FEN before opponent's lastMove (puzzle start position from API)
  lastMove: string; // opponent's creating move in UCI
  solution: string[]; // raw solution from API (first element is opponent's last move)
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

/** Step 1: get puzzle ID from /api/puzzle/next */
async function fetchPuzzleMeta(): Promise<{ id: string } | null> {
  try {
    const res = await fetch("https://lichess.org/api/puzzle/next", {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const p = data.puzzle as Record<string, unknown> | undefined;
    if (!p?.id) return null;
    return { id: p.id as string };
  } catch (err) {
    console.error("fetchPuzzleMeta failed:", err);
    return null;
  }
}

/**
 * Step 2: get full puzzle data from /api/puzzle/{id}
 * The API returns puzzle.fen and puzzle.lastMove directly — no PGN parsing needed.
 * puzzle.fen is the board position BEFORE the opponent's creating move.
 * puzzle.lastMove is the opponent's creating move in UCI format.
 * puzzle.solution[0] is the opponent's creating move (same as lastMove).
 * puzzle.solution[1..] are the solver's moves.
 */
async function fetchPuzzleById(id: string): Promise<Puzzle | null> {
  try {
    const res = await fetch(`https://lichess.org/api/puzzle/${id}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const p = data.puzzle as Record<string, unknown> | undefined;
    if (!p) return null;

    const fen = p.fen as string | undefined;
    const lastMove = p.lastMove as string | undefined;
    const solution = (p.solution as string[]) ?? [];
    const rating = (p.rating as number) ?? 1500;
    const themes = (p.themes as string[]) ?? [];

    // Validate required fields
    if (!fen || !lastMove || !fen.trim() || !lastMove.trim()) {
      console.error("fetchPuzzleById: missing fen or lastMove", {
        id,
        fen,
        lastMove,
      });
      return null;
    }
    if (solution.length < 2) {
      console.error("fetchPuzzleById: solution too short", { id, solution });
      return null;
    }

    return {
      id,
      fen,
      lastMove,
      // Return raw solution from API — solution[0] is the opponent's last move (same as lastMove)
      // The game component is responsible for slicing solution[1..] for player moves
      solution,
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
