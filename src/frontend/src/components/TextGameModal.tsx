import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_ITEMS = ["ENTER", "EXIT"] as const;

const MESSAGES = [
  "welcome, fellow researcher",
  "this is an especially difficult time for us",
  "the world expects us to run in opposite directions",
] as const;

const EXIT_MESSAGE = "game not over";

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

// ── Types ──────────────────────────────────────────────────────────────────────

type MessagePhase = "idle" | "messages" | "game" | "exit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function randomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

// ── Start Screen ───────────────────────────────────────────────────────────────

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

// ── ScrambleDisplay ────────────────────────────────────────────────────────────

interface ScrambleDisplayProps {
  target: string;
  /** ms per scramble tick per character position */
  tickMs?: number;
  /** total ms to reveal all characters */
  revealDurationMs?: number;
  onComplete: () => void;
  scrambleDone: boolean;
  onAdvance?: () => void;
}

function ScrambleDisplay({
  target,
  tickMs = 50,
  revealDurationMs = 1000,
  onComplete,
  scrambleDone,
  onAdvance,
}: ScrambleDisplayProps) {
  const [display, setDisplay] = useState<string[]>(() =>
    Array.from({ length: target.length }, () => randomChar()),
  );
  const lockedRef = useRef<boolean[]>(new Array(target.length).fill(false));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Blinking cursor state — only active after scramble is done
  const [cursorVisible, setCursorVisible] = useState(false);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop cursor based on scrambleDone
  useEffect(() => {
    if (scrambleDone) {
      setCursorVisible(true);
      cursorIntervalRef.current = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 500);
    } else {
      setCursorVisible(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
    }
    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
    };
  }, [scrambleDone]);

  // On each new target: reset locked state and display
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset
  useEffect(() => {
    lockedRef.current = new Array(target.length).fill(false);
    setDisplay(Array.from({ length: target.length }, () => randomChar()));
  }, [target]);

  // RAF loop: randomly cycle unlocked characters
  useEffect(() => {
    let lastTick = performance.now();
    let raf: number;

    function loop(now: number) {
      const delta = now - lastTick;
      if (delta >= tickMs) {
        lastTick = now;
        setDisplay((prev) => {
          const next = [...prev];
          for (let i = 0; i < target.length; i++) {
            if (!lockedRef.current[i]) next[i] = randomChar();
          }
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target, tickMs]);

  // Progressive lock-in per character
  useEffect(() => {
    if (target.length === 0) {
      onCompleteRef.current();
      return;
    }
    const msPerChar = revealDurationMs / target.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < target.length; i++) {
      timers.push(
        setTimeout(() => {
          lockedRef.current[i] = true;
          setDisplay((prev) => {
            const next = [...prev];
            next[i] = target[i];
            return next;
          });
          if (i === target.length - 1) {
            onCompleteRef.current();
          }
        }, i * msPerChar),
      );
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [target, revealDurationMs]);

  const handleAdvance = useCallback(() => {
    if (!scrambleDone) return;
    // Stop cursor immediately on advance
    if (cursorIntervalRef.current) {
      clearInterval(cursorIntervalRef.current);
      cursorIntervalRef.current = null;
    }
    setCursorVisible(false);
    onAdvance?.();
  }, [scrambleDone, onAdvance]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 px-8 select-none cursor-pointer"
      onClick={scrambleDone ? handleAdvance : undefined}
      onKeyDown={
        scrambleDone
          ? (e) => {
              if (e.key !== "Tab") handleAdvance();
            }
          : undefined
      }
      // biome-ignore lint/a11y/useSemanticElements: intentional overlay
      role="button"
      tabIndex={0}
      aria-label="Advance message"
      data-ocid="text_game.message_display"
    >
      <p
        className="text-foreground text-center leading-relaxed"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.7rem",
          letterSpacing: "0.05em",
          lineHeight: "2",
          maxWidth: "80%",
        }}
      >
        {display.join("")}
        {scrambleDone && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              opacity: cursorVisible ? 1 : 0,
              marginLeft: "2px",
            }}
          >
            █
          </span>
        )}
      </p>
    </div>
  );
}

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

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const [lastScore] = useState<number | null>(null);

  // Phase state
  const [messagePhase, setMessagePhase] = useState<MessagePhase>("idle");
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [scrambleComplete, setScrambleComplete] = useState(false);

  // Game phase
  const [gameReadyForExit, setGameReadyForExit] = useState(false);
  const gameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exit phase: track whether scramble is done (used to trigger auto-close)
  const exitScrambleCompleteRef = useRef(false);

  // Exit phase scramble done state (for cursor)
  const [exitScrambleDone, setExitScrambleDone] = useState(false);

  const handleExit = useCallback(() => {
    onCompleteRef.current();
  }, []);

  // ── Phase: idle → messages ─────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setMessagePhase("messages");
    setCurrentMessageIndex(0);
    setScrambleComplete(false);
  }, []);

  // ── Phase: messages — advance to next or to game ───────────────────────────

  const handleAdvanceMessage = useCallback(() => {
    if (!scrambleComplete) return;
    const nextIndex = currentMessageIndex + 1;
    if (nextIndex < MESSAGES.length) {
      setCurrentMessageIndex(nextIndex);
      setScrambleComplete(false);
    } else {
      // All messages done → start game
      setMessagePhase("game");
      setGameReadyForExit(false);
      gameTimerRef.current = setTimeout(() => {
        setGameReadyForExit(true);
      }, 5000);
    }
  }, [scrambleComplete, currentMessageIndex]);

  // Keyboard listener for message phase
  useEffect(() => {
    if (messagePhase !== "messages") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      handleAdvanceMessage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [messagePhase, handleAdvanceMessage]);

  // ── Phase: game → exit ─────────────────────────────────────────────────────

  const handleGameClick = useCallback(() => {
    if (!gameReadyForExit) return;
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    setMessagePhase("exit");
    setExitScrambleDone(false);
    exitScrambleCompleteRef.current = false;
  }, [gameReadyForExit]);

  // ── Phase: exit → close ────────────────────────────────────────────────────

  const handleExitScrambleComplete = useCallback(() => {
    exitScrambleCompleteRef.current = true;
    setExitScrambleDone(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 2500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentTarget =
    messagePhase === "messages"
      ? MESSAGES[currentMessageIndex]
      : messagePhase === "exit"
        ? EXIT_MESSAGE
        : "";

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 z-40 bg-background/70" />

      {/* Floating window */}
      <div
        className="fixed z-50 font-mono flex flex-col border border-dashed border-border bg-background"
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
            className="font-mono text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            onClick={() => onComplete()}
            aria-label="Close text game"
          >
            [×]
          </button>
        </div>

        {/* ── Idle: Start Screen ── */}
        {messagePhase === "idle" && (
          <StartScreen
            onStart={handleStart}
            onExit={handleExit}
            lastScore={lastScore}
          />
        )}

        {/* ── Messages phase ── */}
        {messagePhase === "messages" && (
          <ScrambleDisplay
            key={currentMessageIndex}
            target={currentTarget}
            revealDurationMs={1000}
            tickMs={50}
            onComplete={() => setScrambleComplete(true)}
            scrambleDone={scrambleComplete}
            onAdvance={handleAdvanceMessage}
          />
        )}

        {/* ── Game phase ── */}
        {messagePhase === "game" && (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div
              className={`flex-1 flex items-center justify-center bg-background ${isLight ? "p-2" : "p-0"}`}
            >
              <iframe
                src="/assets/rebirth.html"
                allow="autoplay"
                className="w-full h-full border-0"
                title="Rebirth"
                data-ocid="text_game.game_iframe"
              />
            </div>

            {/* Transparent click-catcher overlay — active after 5s */}
            <div
              className="absolute inset-0 transition-opacity duration-700"
              style={{ pointerEvents: gameReadyForExit ? "auto" : "none" }}
              onClick={handleGameClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleGameClick();
              }}
              // biome-ignore lint/a11y/useSemanticElements: transparent click-catcher overlay
              role="button"
              tabIndex={gameReadyForExit ? 0 : -1}
              aria-label="Exit game"
              data-ocid="text_game.game_exit_overlay"
            />
          </div>
        )}

        {/* ── Exit phase ── */}
        {messagePhase === "exit" && (
          <ScrambleDisplay
            target={EXIT_MESSAGE}
            revealDurationMs={1000}
            tickMs={50}
            onComplete={handleExitScrambleComplete}
            scrambleDone={exitScrambleDone}
          />
        )}
      </div>
    </>
  );
}
