import { Chess } from "chess.js";

/**
 * Convert a UCI move string (e.g. "e2e4", "e7e8q") to SAN notation using the
 * board position described by `fen`.
 * Returns the original UCI string as a fallback if conversion fails.
 */
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}
