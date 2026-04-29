import { useCallback, useRef, useState } from "react";

export interface Puzzle {
  id: string;
  fen: string;
  opponentMove: string; // UCI format, e.g. "e2e4"
  solution: string[]; // UCI format moves, the player's answer is solution[0]
  rating: number;
  themes: string[];
}

interface UseChessPuzzlesReturn {
  currentPuzzle: Puzzle | null;
  loading: boolean;
  error: string | null;
  fetchNext: () => Promise<void>;
}

function parsePuzzleFromApi(data: Record<string, unknown>): Puzzle | null {
  try {
    const puzzle = data.puzzle as Record<string, unknown>;
    const game = data.game as Record<string, unknown>;
    if (!puzzle || !game) return null;

    const solution = puzzle.solution as string[];
    const id = puzzle.id as string;
    const rating = puzzle.rating as number;
    const themes = (puzzle.themes as string[]) ?? [];

    // solution[0] is the opponent's move, remaining moves are the player's solution
    const opponentMove = solution[0];
    const playerSolution = solution.slice(1);

    // FEN is embedded in the puzzle object from /api/puzzle/next
    const fen = (puzzle.fen as string) || "";

    return {
      id,
      fen,
      opponentMove,
      solution: playerSolution,
      rating,
      themes,
    };
  } catch {
    return null;
  }
}

export function useChessPuzzles(
  initialTargetRating = 1500,
): UseChessPuzzlesReturn {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Puzzle[]>([]);
  const targetRatingRef = useRef(initialTargetRating);

  const fetchBatch = useCallback(
    async (targetRating: number): Promise<Puzzle[]> => {
      const fetchCount = 20;
      const promises = Array.from({ length: fetchCount }, () =>
        fetch("https://lichess.org/api/puzzle/next", {
          headers: { Accept: "application/json" },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      );
      const results = await Promise.allSettled(promises);
      const puzzles: Puzzle[] = [];
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const parsed = parsePuzzleFromApi(
            result.value as Record<string, unknown>,
          );
          if (parsed) {
            const ratingDiff = Math.abs(parsed.rating - targetRating);
            if (ratingDiff <= 400) {
              puzzles.push(parsed);
            }
          }
        }
      }
      return puzzles;
    },
    [],
  );

  const fetchNext = useCallback(async () => {
    // If we have cached puzzles, use the next one from cache
    if (cacheRef.current.length > 0) {
      const next = cacheRef.current.shift()!;
      setCurrentPuzzle(next);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const puzzles = await fetchBatch(targetRatingRef.current);
      if (puzzles.length === 0) {
        // Fallback: fetch a single puzzle without rating filter
        const fallback = await fetch("https://lichess.org/api/puzzle/next", {
          headers: { Accept: "application/json" },
        });
        if (fallback.ok) {
          const data = (await fallback.json()) as Record<string, unknown>;
          const parsed = parsePuzzleFromApi(data);
          if (parsed) {
            setCurrentPuzzle(parsed);
          } else {
            setError("Failed to parse puzzle");
          }
        } else {
          setError("Failed to fetch puzzle");
        }
      } else {
        const [first, ...rest] = puzzles;
        setCurrentPuzzle(first);
        cacheRef.current = rest;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchBatch]);

  return { currentPuzzle, loading, error, fetchNext };
}
