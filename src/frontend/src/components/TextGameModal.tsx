import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import MagnetLines from "./Backgrounds/MagnetLines";

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_ITEMS = ["ENTER", "SETTINGS", "HI-SCORES", "EXIT"] as const;

const CONTENT = {
  intro: [
    "welcome, fellow researcher",
    "these are trying times",
    "the world is making us run in opposite directions",
  ],
  postGame1: ["clearly, it's not easy"],
  choices: ["why opposite directions?", "what's the point?"],
  choice1Path: [
    "exactly, we're wondering too",
    "those yellow diamonds shouldn't be on opposite sides",
    "our investigations suggest two contradictory forces",
  ],
  choice2Path: ["for now, survive as long as possible", "the points will come"],
  preOutro: [
    "sometimes the forces cancel out and we get a moment's break",
    "but chaos is never far behind",
  ],
  outro: ["game not over"],
};

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

// ── Types ──────────────────────────────────────────────────────────────────────

type MusicMode = "on" | "off" | "override";

interface GameSettings {
  skipMessages: boolean;
  music: MusicMode;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

type Phase =
  | { type: "idle" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "nameEntry"; score: number }
  | { type: "intro"; step: number }
  | { type: "game1" }
  | { type: "postGame1"; step: number }
  | { type: "choices"; selected: 0 | 1 }
  | { type: "choice1"; step: number }
  | { type: "choice2"; step: number }
  | { type: "game2" }
  | { type: "preOutro"; step: number }
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
      return CONTENT.postGame1[phase.step];
    case "choice1":
      return CONTENT.choice1Path[phase.step];
    case "choice2":
      return CONTENT.choice2Path[phase.step];
    case "preOutro":
      return CONTENT.preOutro[phase.step];
    case "outro":
      return CONTENT.outro[phase.step];
    default:
      return "";
  }
}

// ── Settings Screen ────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onBack: () => void;
}

function SettingsScreen({
  settings,
  onUpdateSettings,
  onBack,
}: SettingsScreenProps) {
  const SETTINGS_ITEMS = ["skipMessages", "music", "back"] as const;
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIdx(
          (prev) => (prev - 1 + SETTINGS_ITEMS.length) % SETTINGS_ITEMS.length,
        );
      } else if (e.key === "ArrowDown") {
        setSelectedIdx((prev) => (prev + 1) % SETTINGS_ITEMS.length);
      } else if (e.key === "Enter") {
        const item = SETTINGS_ITEMS[selectedIdx];
        if (item === "back") {
          onBack();
        } else if (item === "skipMessages") {
          onUpdateSettings({
            ...settings,
            skipMessages: !settings.skipMessages,
          });
        } else if (item === "music") {
          const values: MusicMode[] = ["on", "off", "override"];
          const currentIdx = values.indexOf(settings.music);
          const nextIdx = (currentIdx + 1) % values.length;
          onUpdateSettings({ ...settings, music: values[nextIdx] });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, settings, onUpdateSettings, onBack, SETTINGS_ITEMS]);

  const rows: {
    key: (typeof SETTINGS_ITEMS)[number];
    label: string;
    value?: string;
  }[] = [
    {
      key: "skipMessages",
      label: "SKIP MESSAGES",
      value: settings.skipMessages ? "ON" : "OFF",
    },
    { key: "music", label: "MUSIC", value: settings.music.toUpperCase() },
    { key: "back", label: "BACK" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
      <div
        className="text-foreground tracking-widest"
        style={{ fontFamily: '"Press Start 2P", monospace', fontSize: "1rem" }}
      >
        SETTINGS
      </div>
      <div className="flex flex-col items-start gap-4">
        {rows.map((row, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={row.key}
              type="button"
              data-ocid={`text_game.settings.${row.key}`}
              className={`transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
              }}
              onClick={() => {
                setSelectedIdx(idx);
                if (row.key === "back") {
                  onBack();
                } else if (row.key === "skipMessages") {
                  onUpdateSettings({
                    ...settings,
                    skipMessages: !settings.skipMessages,
                  });
                } else if (row.key === "music") {
                  const values: MusicMode[] = ["on", "off", "override"];
                  const currentIdx = values.indexOf(settings.music);
                  onUpdateSettings({
                    ...settings,
                    music: values[(currentIdx + 1) % values.length],
                  });
                }
              }}
            >
              {isSelected ? "> " : "  "}
              {row.label}
              {row.value !== undefined ? ` [${row.value}]` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Leaderboard Screen ─────────────────────────────────────────────────────────

interface LeaderboardScreenProps {
  leaderboard: LeaderboardEntry[];
  onBack: () => void;
}

function LeaderboardScreen({ leaderboard, onBack }: LeaderboardScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
      <div
        className="text-foreground tracking-widest"
        style={{ fontFamily: '"Press Start 2P", monospace', fontSize: "1rem" }}
      >
        HIGH SCORES
      </div>
      <div
        className="flex flex-col items-start gap-4"
        style={{ minWidth: "220px" }}
      >
        {leaderboard.length === 0 ? (
          <div
            className="text-muted-foreground"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "0.55rem",
              letterSpacing: "0.1em",
            }}
          >
            NO SCORES YET
          </div>
        ) : (
          leaderboard.map((entry, idx) => (
            <div
              key={entry.date}
              data-ocid={`text_game.leaderboard.item.${idx + 1}`}
              className="text-foreground"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                display: "flex",
                gap: "1rem",
              }}
            >
              <span className="text-muted-foreground">{idx + 1}.</span>
              <span style={{ minWidth: "80px" }}>{entry.name}</span>
              <span>{entry.score}</span>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        data-ocid="text_game.leaderboard.back_button"
        className="text-foreground transition-colors hover:text-muted-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
        }}
        onClick={onBack}
      >
        {"> BACK"}
      </button>
    </div>
  );
}

// ── Name Entry Screen ──────────────────────────────────────────────────────────

interface NameEntryScreenProps {
  score: number;
  onSubmit: (name: string) => void;
}

function NameEntryScreen({ score, onSubmit }: NameEntryScreenProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && name.length > 0) {
        onSubmit(name.toUpperCase());
      } else if (e.key === "Backspace") {
        setName((prev) => prev.slice(0, -1));
      } else if (
        e.key.length === 1 &&
        /^[a-zA-Z0-9]$/.test(e.key) &&
        name.length < 10
      ) {
        setName((prev) => (prev + e.key).toUpperCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [name, onSubmit]);

  const paddedName = name.padEnd(10, "_");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
      <div
        className="text-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
        }}
      >
        NEW HIGH SCORE!
      </div>
      <div
        className="text-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "1.2rem",
        }}
      >
        {score}
      </div>
      <div className="flex flex-col items-center gap-3">
        <div
          className="text-muted-foreground"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.55rem",
            letterSpacing: "0.15em",
          }}
        >
          ENTER NAME:
        </div>
        <div
          className="text-foreground"
          data-ocid="text_game.name_entry.input"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
          }}
        >
          {`> ${paddedName}`}
        </div>
      </div>
      <div
        className="text-muted-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.45rem",
          letterSpacing: "0.15em",
        }}
      >
        PRESS ENTER TO SAVE
      </div>
    </div>
  );
}

// ── Start Screen ───────────────────────────────────────────────────────────────

interface StartScreenProps {
  onStart: () => void;
  onSettings: () => void;
  onHiScores: () => void;
  onExit: () => void;
  leaderboard: LeaderboardEntry[];
}

function StartScreen({
  onStart,
  onSettings,
  onHiScores,
  onExit,
  leaderboard,
}: StartScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { resolvedTheme } = useTheme();
  const themeLineColor =
    resolvedTheme?.endsWith("-light") || resolvedTheme === "light"
      ? "color-mix(in srgb, var(--foreground) 18%, transparent)"
      : "color-mix(in srgb, var(--foreground) 35%, transparent)";

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
        else if (chosen === "SETTINGS") onSettings();
        else if (chosen === "HI-SCORES") onHiScores();
        else if (chosen === "EXIT") onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, onStart, onSettings, onHiScores, onExit]);

  // Show top score under title if leaderboard has entries
  const topScore = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="relative overflow-hidden flex-1">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <MagnetLines
          containerSize="100%"
          lineColor={themeLineColor}
          rows={18}
          columns={18}
          lineWidth="1vmin"
          lineHeight="6vmin"
          baseAngle={-10}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8 select-none">
        {/* Content box — solid background, isolated from magnetic lines */}
        <div className="bg-card border border-border rounded-2xl px-10 py-8 flex flex-col items-center gap-6 shadow-lg">
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

          {/* Top score */}
          {topScore !== null && (
            <div
              className="text-muted-foreground"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.55rem",
                letterSpacing: "0.15em",
              }}
            >
              best: {topScore.name} {topScore.score}
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
                  data-ocid={`text_game.start_screen.${item.toLowerCase().replace("-", "_")}`}
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
                    else if (item === "SETTINGS") onSettings();
                    else if (item === "HI-SCORES") onHiScores();
                    else if (item === "EXIT") onExit();
                  }}
                >
                  {isSelected ? `> ${item}` : `  ${item}`}
                </button>
              );
            })}
          </div>
        </div>
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
        onSelect(0);
      } else if (e.key === "ArrowDown") {
        onSelect(1);
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

  // Phase state
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [scrambleComplete, setScrambleComplete] = useState(false);

  // Settings (persisted)
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem("hyvmind_textgame_settings");
    return saved
      ? (JSON.parse(saved) as GameSettings)
      : { skipMessages: false, music: "on" };
  });

  // Leaderboard (persisted)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem("hyvmind_textgame_leaderboard");
    return saved ? (JSON.parse(saved) as LeaderboardEntry[]) : [];
  });

  // Game scores for this session
  const [gameScores, setGameScores] = useState({ game1: 0, game2: 0 });

  // Override audio (island-puzzle-mystery.ogg)
  const [overrideAudio] = useState<HTMLAudioElement | null>(() => {
    const audio = new Audio("/assets/island-puzzle-mystery.ogg");
    audio.loop = true;
    return audio;
  });

  // Pending score awaiting name entry
  const [pendingScore, setPendingScore] = useState<number | null>(null);

  // ── Persist settings & leaderboard ────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem("hyvmind_textgame_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      "hyvmind_textgame_leaderboard",
      JSON.stringify(leaderboard),
    );
  }, [leaderboard]);

  // ── Override audio: play/pause based on music setting ─────────────────────
  // The component is only mounted when the modal is open, so we just need to
  // react to settings.music changes. Start/stop immediately on every change.

  useEffect(() => {
    if (!overrideAudio) return;
    if (settings.music === "override") {
      overrideAudio.play().catch(() => {
        // Autoplay may be blocked; silently ignore
      });
    } else {
      overrideAudio.pause();
      overrideAudio.currentTime = 0;
    }
  }, [settings.music, overrideAudio]);

  // ── Audio cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (overrideAudio) {
        overrideAudio.pause();
        overrideAudio.currentTime = 0;
      }
    };
  }, [overrideAudio]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExit = useCallback(() => {
    if (overrideAudio) {
      overrideAudio.pause();
      overrideAudio.currentTime = 0;
    }
    onCompleteRef.current();
  }, [overrideAudio]);

  const handleOpenSettings = useCallback(() => {
    setPhase({ type: "settings" });
  }, []);

  const handleOpenLeaderboard = useCallback(() => {
    setPhase({ type: "leaderboard" });
  }, []);

  const handleCloseSubScreen = useCallback(() => {
    setPhase({ type: "idle" });
  }, []);

  const handleNameSubmit = useCallback(
    (name: string) => {
      if (pendingScore !== null) {
        const newEntry: LeaderboardEntry = {
          name,
          score: pendingScore,
          date: new Date().toISOString(),
        };
        setLeaderboard((prev) =>
          [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 3),
        );
        setPendingScore(null);
      }
      setPhase({ type: "idle" });
    },
    [pendingScore],
  );

  // ── Phase: idle → intro (or game1 if skipMessages) ────────────────────────

  const handleStart = useCallback(() => {
    if (settings.skipMessages) {
      setPhase({ type: "game1" });
    } else {
      setPhase({ type: "intro", step: 0 });
    }
    setScrambleComplete(false);
    setGameScores({ game1: 0, game2: 0 });
  }, [settings.skipMessages]);

  // ── Game completion via postMessage ────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "rebirth-game-over") {
        const score1 = (e.data.score as number) || 0;
        setGameScores((prev) => ({ ...prev, game1: score1 }));
        if (settings.skipMessages) {
          setPhase({ type: "game2" });
        } else {
          setPhase({ type: "postGame1", step: 0 });
          setScrambleComplete(false);
        }
      } else if (e.data?.type === "squarebar-game-over") {
        const score2 = (e.data.score as number) || 0;
        const totalScore = gameScores.game1 + score2;
        setGameScores((prev) => ({ ...prev, game2: score2 }));

        const qualifies =
          leaderboard.length < 3 ||
          totalScore > leaderboard[leaderboard.length - 1].score;

        if (qualifies) {
          setPendingScore(totalScore);
          setPhase({ type: "nameEntry", score: totalScore });
        } else if (settings.skipMessages) {
          onCompleteRef.current();
        } else {
          setPhase({ type: "preOutro", step: 0 });
          setScrambleComplete(false);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [settings, gameScores.game1, leaderboard]);

  // ── Unified advance handler ────────────────────────────────────────────────

  const handleAdvance = useCallback(() => {
    if (!scrambleComplete) return;
    switch (phase.type) {
      case "intro":
        if (phase.step < CONTENT.intro.length - 1) {
          setPhase({ type: "intro", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game1" });
        }
        break;
      case "postGame1":
        if (phase.step < CONTENT.postGame1.length - 1) {
          setPhase({ type: "postGame1", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "choices", selected: 0 });
        }
        break;
      case "choice1":
        if (phase.step < CONTENT.choice1Path.length - 1) {
          setPhase({ type: "choice1", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game2" });
        }
        break;
      case "choice2":
        if (phase.step < CONTENT.choice2Path.length - 1) {
          setPhase({ type: "choice2", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game2" });
        }
        break;
      case "preOutro":
        if (phase.step < CONTENT.preOutro.length - 1) {
          setPhase({ type: "preOutro", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "outro", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "outro":
        // outro is just "game not over" — auto-closes after scramble
        break;
    }
  }, [phase, scrambleComplete]);

  // ── Choice confirmation handler ────────────────────────────────────────────

  const handleChoiceConfirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "choice2", step: 0 });
      setScrambleComplete(false);
    }
  }, []);

  // ── Keyboard listener for text phases ─────────────────────────────────────

  useEffect(() => {
    const textPhases = [
      "intro",
      "postGame1",
      "choice1",
      "choice2",
      "preOutro",
      "outro",
    ];
    if (!textPhases.includes(phase.type)) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      handleAdvance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase.type, handleAdvance]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const bgmParam =
    settings.music === "override"
      ? "?bgm=off&se=off"
      : settings.music === "off"
        ? "?bgm=off"
        : "";

  const renderContent = () => {
    switch (phase.type) {
      case "idle":
        return (
          <StartScreen
            onStart={handleStart}
            onSettings={handleOpenSettings}
            onHiScores={handleOpenLeaderboard}
            onExit={handleExit}
            leaderboard={leaderboard}
          />
        );

      case "settings":
        return (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={setSettings}
            onBack={handleCloseSubScreen}
          />
        );

      case "leaderboard":
        return (
          <LeaderboardScreen
            leaderboard={leaderboard}
            onBack={handleCloseSubScreen}
          />
        );

      case "nameEntry":
        return (
          <NameEntryScreen score={phase.score} onSubmit={handleNameSubmit} />
        );

      case "intro":
      case "postGame1":
      case "choice1":
      case "choice2":
      case "preOutro": {
        return (
          <ScrambleDisplay
            key={`${phase.type}-${"step" in phase ? phase.step : 0}`}
            target={getCurrentMessage(phase)}
            revealDurationMs={1000}
            tickMs={50}
            onComplete={() => setScrambleComplete(true)}
            scrambleDone={scrambleComplete}
            onAdvance={handleAdvance}
          />
        );
      }

      case "outro": {
        // "game not over" — auto-closes when scramble finishes
        return (
          <ScrambleDisplay
            key="outro-0"
            target={CONTENT.outro[0]}
            revealDurationMs={1000}
            tickMs={50}
            onComplete={() => onCompleteRef.current()}
            scrambleDone={scrambleComplete}
            onAdvance={undefined}
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
                src={`/assets/rebirth.html${bgmParam}`}
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
                src={`/assets/squarebar.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Square Bar"
                data-ocid="text_game.game2_iframe"
              />
            </div>
          </div>
        );

      default:
        return null;
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
            onClick={() => {
              if (overrideAudio) {
                overrideAudio.pause();
                overrideAudio.currentTime = 0;
              }
              onComplete();
            }}
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
