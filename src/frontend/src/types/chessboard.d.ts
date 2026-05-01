// Type declarations for @chrisoakman/chessboardjs (UMD, window global)
interface ChessboardConfig {
  position?: string;
  orientation?: "white" | "black";
  draggable?: boolean;
  dropOffBoard?: "snapback" | "trash";
  onDrop?: (
    source: string,
    target: string,
    piece: string,
    newPos: Record<string, string>,
    oldPos: Record<string, string>,
    orientation: string,
  ) => "snapback" | "trash" | undefined;
  pieceTheme?: string;
}

interface ChessboardInstance {
  position(fen?: string): string | undefined;
  orientation(side?: "white" | "black"): string | undefined;
  destroy(): void;
}

// The library attaches itself to window.Chessboard after loading
declare const Chessboard: (
  id: string | HTMLElement,
  config: string | ChessboardConfig,
) => ChessboardInstance;
