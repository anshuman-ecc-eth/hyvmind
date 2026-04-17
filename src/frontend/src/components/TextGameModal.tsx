import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_ITEMS = ["ENTER", "EXIT"] as const;

const CONTENT = {
  intro: [
    "welcome, fellow researcher",
    "these are trying times",
    "the world expects us to run in opposite directions",
  ],
  postGame1: "clearly, it's not easy",
  choices: [
    "why are we running in opposite directions?",
    "what's the point of this?",
  ],
  choice1Path: [
    "our best researchers have found the root cause",
    "broken incentive structures",
    "its kinda obvious when you think about it",
    "those yellow diamonds had no business being on two different sides",
  ],
  choice2Path: "well, to fix broken incentive structures",
  outro: ["reach yes but overreach not, we must", "game not over"],
};

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase =
  | { type: "idle" }
  | { type: "intro"; step: number }
  | { type: "game1" }
  | { type: "postGame1" }
  | { type: "choices"; selected: 0 | 1 }
  | { type: "choice1"; step: number }
  | { type: "choice2" }
  | { type: "game2" }
  | { type: "outro"; step: number }
  | { type: "finalExit" };

// ── Helpers ────────────────────────────────────────────────────────────────────

function randomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function getCurrentMessage(phase: Phase): string {
  switch (phase.type) {
    case "intro":
      return CONTENT.intro[phase.step];
    case "postGame1":
      return CONTENT.postGame1;
    case "choice1":
      return CONTENT.choice1Path[phase.step];
    case "choice2":
      return CONTENT.choice2Path;
    case "outro":
      return CONTENT.outro[phase.step];
    case "finalExit":
      return CONTENT.outro[1]; // "game not over"
    default:
      return "";
  }
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

// ── Choice Menu ────────────────────────────────────────────────────────────────

interface ChoiceMenuProps {
  options: string[];
  selected: 0 | 1;
  onSelect: (i: 0 | 1) => void;
  onConfirm: (i: number) => void;
}

function ChoiceMenu({
  options,
  selected,
  onSelect,
  onConfirm,
}: ChoiceMenuProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        onSelect(selected === 1 ? 0 : 0);
      } else if (e.key === "ArrowDown") {
        onSelect(selected === 0 ? 1 : 1);
      } else if (e.key === "Enter") {
        onConfirm(selected);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, onSelect, onConfirm]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 select-none px-8">
      <div
        className="flex flex-col items-start gap-4"
        style={{ maxWidth: "80%" }}
      >
        {options.map((option, idx) => {
          const isSelected = idx === selected;
          return (
            <button
              key={option}
              type="button"
              data-ocid={`text_game.choice.${idx}`}
              className={`text-left transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6rem",
                letterSpacing: "0.05em",
                lineHeight: "2",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
              }}
              onClick={() => {
                onSelect(idx as 0 | 1);
                onConfirm(idx);
              }}
            >
              {isSelected ? `> ${option}` : `  ${option}`}
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
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [scrambleComplete, setScrambleComplete] = useState(false);

  const handleExit = useCallback(() => {
    onCompleteRef.current();
  }, []);

  // ── Phase: idle → intro ────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setPhase({ type: "intro", step: 0 });
    setScrambleComplete(false);
  }, []);

  // ── Game completion via postMessage ────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "rebirth-game-over") {
        setPhase({ type: "postGame1" });
        setScrambleComplete(false);
      } else if (e.data?.type === "squarebar-game-over") {
        setPhase({ type: "outro", step: 0 });
        setScrambleComplete(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Unified advance handler ────────────────────────────────────────────────

  const handleAdvance = useCallback(() => {
    if (!scrambleComplete) return;
    switch (phase.type) {
      case "intro":
        if (phase.step < 2) {
          setPhase({ type: "intro", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game1" });
        }
        break;
      case "postGame1":
        setPhase({ type: "choices", selected: 0 });
        break;
      case "choice1":
        if (phase.step < 3) {
          setPhase({ type: "choice1", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game2" });
        }
        break;
      case "choice2":
        setPhase({ type: "game2" });
        break;
      case "outro":
        if (phase.step === 0) {
          setPhase({ type: "outro", step: 1 });
          setScrambleComplete(false);
        }
        break;
    }
  }, [phase, scrambleComplete]);

  // ── Choice confirmation handler ────────────────────────────────────────────

  const handleChoiceConfirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "choice2" });
      setScrambleComplete(false);
    }
  }, []);

  // ── Keyboard listener for text phases ─────────────────────────────────────

  useEffect(() => {
    const textPhases = ["intro", "postGame1", "choice1", "choice2", "outro"];
    if (!textPhases.includes(phase.type)) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      handleAdvance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase.type, handleAdvance]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (phase.type) {
      case "idle":
        return (
          <StartScreen
            onStart={handleStart}
            onExit={handleExit}
            lastScore={lastScore}
          />
        );

      case "intro":
      case "postGame1":
      case "choice1":
      case "choice2":
      case "outro": {
        const isFinalMessage = phase.type === "outro" && phase.step === 1;
        return (
          <ScrambleDisplay
            key={`${phase.type}-${phase.type === "intro" ? phase.step : phase.type === "choice1" ? phase.step : phase.type === "outro" ? phase.step : phase.type}`}
            target={getCurrentMessage(phase)}
            revealDurationMs={1000}
            tickMs={50}
            onComplete={
              isFinalMessage
                ? () => onCompleteRef.current()
                : () => setScrambleComplete(true)
            }
            scrambleDone={scrambleComplete}
            onAdvance={isFinalMessage ? undefined : handleAdvance}
          />
        );
      }

      case "choices":
        return (
          <ChoiceMenu
            options={CONTENT.choices}
            selected={phase.selected}
            onSelect={(i) =>
              setPhase({ type: "choices", selected: i as 0 | 1 })
            }
            onConfirm={handleChoiceConfirm}
          />
        );

      case "game1":
        return (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div
              className={`flex-1 flex items-center justify-center bg-background ${isLight ? "p-2" : "p-0"}`}
            >
              <iframe
                src="/assets/rebirth.html"
                allow="autoplay"
                className="w-full h-full border-0"
                title="Rebirth"
                data-ocid="text_game.game1_iframe"
              />
            </div>
          </div>
        );

      case "game2":
        return (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div
              className={`flex-1 flex items-center justify-center bg-background ${isLight ? "p-2" : "p-0"}`}
            >
              <iframe
                src="/assets/squarebar.html"
                allow="autoplay"
                className="w-full h-full border-0"
                title="Square Bar"
                data-ocid="text_game.game2_iframe"
              />
            </div>
          </div>
        );
    }
  };

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

        {renderContent()}
      </div>
    </>
  );
}
