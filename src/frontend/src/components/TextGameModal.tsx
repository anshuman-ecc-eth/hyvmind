import { useAnimationFrame } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./GameCanvas";
import ScrambleText from "./ScrambleText";

// ── Start Screen ───────────────────────────────────────────────────────────────

const MENU_ITEMS = ["ENTER", "EXIT"] as const;

interface StartScreenProps {
  onStart: () => void;
  onExit: () => void;
  lastScore: number | null;
}

function StartScreen({ onStart, onExit, lastScore }: StartScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIdx(
          (prev) => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
        );
      } else if (e.key === "ArrowDown") {
        setSelectedIdx((prev) => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === "Enter") {
        const chosen = MENU_ITEMS[selectedIdx];
        if (chosen === "ENTER") onStart();
        else if (chosen === "EXIT") onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, onStart, onExit]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
      {/* Title */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="text-foreground tracking-widest"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            display: "flex",
            alignItems: "center",
          }}
          aria-label="HYVMIND"
        >
          {"HYVMIND".split("").map((letter) =>
            letter === "Y" ? (
              <span
                key={letter}
                style={{
                  fontSize: "2.5rem",
                  verticalAlign: "middle",
                  lineHeight: 1,
                }}
              >
                {letter}
              </span>
            ) : (
              <span
                key={letter}
                style={{
                  fontSize: "2rem",
                  verticalAlign: "middle",
                  lineHeight: 1,
                }}
              >
                {letter}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Last score */}
      {lastScore !== null && (
        <div
          className="text-muted-foreground"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.55rem",
            letterSpacing: "0.15em",
          }}
        >
          last score: {lastScore}
        </div>
      )}

      {/* Menu */}
      <div className="flex flex-col items-center gap-3">
        {MENU_ITEMS.map((item, activeIdx) => {
          const isSelected = activeIdx === selectedIdx;
          return (
            <button
              key={item}
              type="button"
              data-ocid={`text_game.start_screen.${item.toLowerCase()}`}
              className={`transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
              }}
              onClick={() => {
                if (item === "ENTER") onStart();
                else if (item === "EXIT") onExit();
              }}
            >
              {isSelected ? `> ${item}` : `  ${item}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TypewriterDisplay (kept for potential future use) ─────────────────────────

interface TypewriterDisplayProps {
  text: string;
  delayMs?: number;
  onComplete: () => void;
  cursor?: React.ReactNode;
  className?: string;
}

function TypewriterDisplay({
  text,
  delayMs = 30,
  onComplete,
  cursor,
  className,
}: TypewriterDisplayProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [displayText, setDisplayText] = useState("");
  const charIndexRef = useRef(0);
  const accumRef = useRef(0);
  const doneRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text is the intentional trigger; refs are reset side effects
  useEffect(() => {
    charIndexRef.current = 0;
    accumRef.current = 0;
    doneRef.current = false;
    setDisplayText("");
  }, [text]);

  useAnimationFrame((_, delta) => {
    if (doneRef.current) return;
    accumRef.current += delta;
    if (accumRef.current >= delayMs) {
      accumRef.current = 0;
      const next = charIndexRef.current + 1;
      charIndexRef.current = next;
      setDisplayText(text.slice(0, next));
      if (next >= text.length) {
        doneRef.current = true;
        onCompleteRef.current();
      }
    }
  });

  return (
    <p
      className={
        className ??
        "text-game-font text-foreground text-base leading-relaxed tracking-wide text-center"
      }
    >
      {displayText}
      {cursor}
    </p>
  );
}

// Keep ScrambleText in scope so the import doesn't error
void ScrambleText;
void TypewriterDisplay;

// ── Component ──────────────────────────────────────────────────────────────────

interface TextGameModalProps {
  onComplete: () => void;
  checkCondition?: (
    condition: string,
    input: string,
  ) => Promise<{ pass: boolean; data?: Record<string, string> }>;
}

export default function TextGameModal({ onComplete }: TextGameModalProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [gameStarted, setGameStarted] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const handleStart = useCallback(() => {
    setGameStarted(true);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setLastScore(score);
    setGameStarted(false);
  }, []);

  const handleExit = useCallback(() => {
    onCompleteRef.current();
  }, []);

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 z-40 bg-background/70" />

      {/* Floating window */}
      <div
        className="fixed z-50 text-game-font font-mono flex flex-col border border-dashed border-border bg-background"
        style={{ inset: "5%" }}
        data-ocid="text_game.modal"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-dashed border-border px-3 py-1 flex-shrink-0">
          <span
            className="text-foreground/50"
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.3em",
              fontFamily: '"Press Start 2P", monospace',
            }}
          >
            in (uneven) development
          </span>
          <button
            type="button"
            data-ocid="text_game.close_button"
            className="text-game-font font-mono text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            onClick={() => onComplete()}
            aria-label="Close text game"
          >
            [×]
          </button>
        </div>

        {/* Game content */}
        {gameStarted ? (
          <GameCanvas onGameOver={handleGameOver} />
        ) : (
          <StartScreen
            onStart={handleStart}
            onExit={handleExit}
            lastScore={lastScore}
          />
        )}
      </div>
    </>
  );
}
