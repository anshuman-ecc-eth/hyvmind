import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BuzzLeaderboardEntry } from "../backend.d";
import {
  useGenerateBuzzSecret,
  useGetBuzzLeaderboard,
} from "../hooks/useQueries";
import ChessPuzzleGame from "./ChessPuzzleGame";
import FlyingBee from "./FlyingBee";
import PixelTransition from "./TextAnimations/PixelTransition";
import TextType from "./TextType";
import WordlePuzzleGame from "./WordlePuzzleGame";

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  "About",
  "Story",
  "Puzzles",
  "Settings",
  "Leaderboard",
  "Exit",
] as const;

const ABOUT_LINES = [
  "Our word for Legal AI is LAI.",
  "",
  "Easy to remember. No double meaning.",
  "",
  "It steals your work, packs it into parrot suits, and puts it on sale.",
  "",
  "Without attribution. Without compensation.",
  "",
  "It turns you into a passive consumer by devouring your contributions.",
  "",
  "Truth be told, LAI is not a business at all.",
  "",
  "It's a bad magic trick.",
  "",
  "You pay to have your attention diverted, so you don't notice the theft.",
  "",
  "Marketing teams say they're selling 'legal intelligence'.",
  "",
  "But they don't say how it is manufactured, or how its ingredients are sourced.",
  "",
  "Subscribers to LAI premium get fancier parrots, of course.",
  "",
  "But *even they* must verify each line.",
  "",
  "Because the law is adversarial.",
  "",
  "The end goal is to beat an opponent, not to reveal one's own weaknesses.",
  "",
  "Just to clarify, we're not anti-parrots.",
  "",
  "We use them everyday, largely for the most tedious parts of legal mimicking.",
  "",
  "That upsets the LAI folks.",
  "",
  "\"It sends the wrong message\", they say.",
  "",
  "Which is corpspeak for: \"Human thinking reduces our total addressable market.\"",
  "",
  "We've been in the game long enough to see through the PS.",
  "",
  "We've also tested the math.",
  "",
  "Productivity Gain = Old Work Time - (New Work Time + Verification Time)",
  "",
  "It's all measured in non-parrot hours.",
  "",
  "They're hoping you won't notice.",
  "",
  "So they can go on stealing with one hand and selling with the other.",
  "",
  "They're also testing you.",
  "",
  "If you're scared, they'll throw you into a shadow factory.",
  "",
  "If you're convinced, they'll sell you a bigger parrot.",
  "",
  "If you're neither scared nor convinced, you're one of us.",
  "",
  "Take the next exit from Grand Theft Intelligence Vice City.",
  "",
  "We'll see you at the sanctuary.",
];
const PUZZLE_MENU_ITEMS = ["Chess", "Wordle", "Back"] as const;

const CONTENT = {
  intro: [
    "welcome, fellow researcher",
    "these are trying times",
    "the world is making us run in opposite directions",
  ],
  postGame1: ["clearly, it's not easy"],
  choices: ["why though?", "what's the point?"],
  choice1Path: [
    "hmm...we're wondering too",
    "those yellow diamonds shouldn't be on different sides",
    "our investigations suggest the play of two contradictory forces",
  ],
  choice2Path: [
    "for now, survive as long as possible",
    "the point(s?) will become clear",
  ],
  preOutro: [
    "in research land, some days are easier than others",
    "the forces cancel out and we get a moment's break..",
    "to digest tiny bits of new information",
    "but chaos is never far behind",
  ],
  postGame2: [
    "the wise ones once mumbled..",
    '"the thing that removes obstacles is itself an irremovable obstacle"',
  ],
  choices2: ["dang, that's deep", "meh"],
  choice1bPath: ["glad you think so", "the wise ones have many riddles"],
  choice2bPath: [
    "we don't take them too seriously either",
    "all they do is mumble",
  ],
  preGame3: [
    "anyway, back to the story",
    "one day, as three of our scientists were driving to work",
    "their steering went wild and the road turned to ice",
  ],
  postGame3: [
    "they could not recover after hitting the first obstacle",
    "by the time help came, all three were in a state of deep sleep",
  ],
  choices3: ["are they dead?", "..."],
  choice1cPath: [
    "nope, just hibernating",
    "every now and then, they leave us a bunch of dream traces",
  ],
  choice1cSub: ["what's that?", "..."],
  choice1cSubPath: [
    "evidence mismatches, anomaly detections, disciplinary breaches..",
    "routine stuff..",
  ],
  choice2cPath: ["..."],
  outro: ["game not over"],
};

// ── Types ──────────────────────────────────────────────────────────────────────

type MusicMode = "on" | "off";

interface GameSettings {
  skipMessages: boolean;
  music: MusicMode;
}

type Phase =
  | { type: "idle" }
  | { type: "about" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "generating" }
  | { type: "intro"; step: number }
  | { type: "game1" }
  | { type: "postGame1"; step: number }
  | { type: "choices"; selected: 0 | 1 }
  | { type: "choice1"; step: number }
  | { type: "choice2"; step: number }
  | { type: "preOutro"; step: number }
  | { type: "game2" }
  | { type: "postGame2"; step: number }
  | { type: "choices2"; selected: 0 | 1 }
  | { type: "choice1b"; step: number }
  | { type: "choice2b"; step: number }
  | { type: "preGame3"; step: number }
  | { type: "game3" }
  | { type: "postGame3"; step: number }
  | { type: "choices3"; selected: 0 | 1 }
  | { type: "choice1c"; step: number }
  | { type: "choice1cSub"; selected: 0 | 1 }
  | { type: "choice1cSubPath"; step: number }
  | { type: "choice2c"; step: number }
  | { type: "outro"; step: number }
  | { type: "chess" }
  | { type: "chessGameOver"; score: number }
  | { type: "wordle" }
  | { type: "finalExit" };

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    case "postGame2":
      return CONTENT.postGame2[phase.step];
    case "choice1b":
      return CONTENT.choice1bPath[phase.step];
    case "choice2b":
      return CONTENT.choice2bPath[phase.step];
    case "preGame3":
      return CONTENT.preGame3[phase.step];
    case "postGame3":
      return CONTENT.postGame3[phase.step];
    case "choice1c":
      return CONTENT.choice1cPath[phase.step];
    case "choice1cSubPath":
      return CONTENT.choice1cSubPath[phase.step];
    case "choice2c":
      return CONTENT.choice2cPath[phase.step];
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
  heading?: string;
}

function SettingsScreen({
  settings,
  onUpdateSettings,
  onBack,
  heading,
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
          const values: MusicMode[] = ["on", "off"];
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
      label: "Narrative",
      value: settings.skipMessages ? "OFF" : "ON",
    },
    { key: "music", label: "Sound", value: settings.music.toUpperCase() },
    { key: "back", label: "Back" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
      <div
        className="text-foreground tracking-widest"
        style={{ fontFamily: '"Press Start 2P", monospace', fontSize: "1em" }}
      >
        {heading ?? "Settings"}
      </div>
      <div className="flex flex-col items-start gap-2">
        {rows.map((row, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={row.key}
              type="button"
              data-ocid={`text_game.settings.${row.key}`}
              className={`transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground opacity-50 hover:text-foreground"}`}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6em",
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
                  const values: MusicMode[] = ["on", "off"];
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
  leaderboard: BuzzLeaderboardEntry[];
  onBack: () => void;
  heading?: string;
}

function LeaderboardScreen({
  leaderboard,
  onBack,
  heading,
}: LeaderboardScreenProps) {
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
        style={{ fontFamily: '"Press Start 2P", monospace', fontSize: "1em" }}
      >
        {heading ?? "Leaderboard"}
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
              fontSize: "0.55em",
              letterSpacing: "0.1em",
            }}
          >
            No scores yet
          </div>
        ) : (
          leaderboard.map((entry, idx) => (
            <div
              key={entry.principal.toString()}
              data-ocid={`text_game.leaderboard.item.${idx + 1}`}
              className="text-foreground"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6em",
                letterSpacing: "0.1em",
                display: "flex",
                gap: "1rem",
              }}
            >
              <span className="text-muted-foreground">{idx + 1}.</span>
              <span style={{ minWidth: "80px" }}>
                {entry.profileName ?? "Anonymous"}
              </span>
              <span>{(Number(entry.score) / 10_000_000).toFixed(7)}</span>
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
          fontSize: "0.6em",
          letterSpacing: "0.15em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
        }}
        onClick={onBack}
      >
        {"> Back"}
      </button>
    </div>
  );
}

// ── Start Screen ───────────────────────────────────────────────────────────────

interface StartScreenProps {
  onStart: () => void;
  onAbout: () => void;
  onChess: () => void;
  onWordle: () => void;
  onSettings: () => void;
  onHiScores: () => void;
  onExit: () => void;
  showScoreConfirmation?: boolean;
  setShowScoreConfirmation?: (v: boolean) => void;
  setSecretCode?: (v: string | null) => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

function StartScreen({
  onStart,
  onAbout,
  onChess,
  onWordle,
  onSettings,
  onHiScores,
  onExit,
  showScoreConfirmation,
  setShowScoreConfirmation,
  setSecretCode,
  modalRef,
}: StartScreenProps) {
  const yRef = useRef<HTMLSpanElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [subMenu, setSubMenu] = useState<"main" | "puzzles">("main");
  const [puzzleSelectedIdx, setPuzzleSelectedIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (subMenu === "main") {
        if (e.key === "ArrowUp") {
          setSelectedIdx(
            (prev) => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
          );
        } else if (e.key === "ArrowDown") {
          setSelectedIdx((prev) => (prev + 1) % MENU_ITEMS.length);
        } else if (e.key === "Enter") {
          const chosen = MENU_ITEMS[selectedIdx];
          if (chosen === "About") onAbout();
          else if (chosen === "Story") onStart();
          else if (chosen === "Puzzles") {
            setSubMenu("puzzles");
            setPuzzleSelectedIdx(0);
          } else if (chosen === "Settings") onSettings();
          else if (chosen === "Leaderboard") onHiScores();
          else if (chosen === "Exit") onExit();
        }
      } else {
        if (e.key === "ArrowUp") {
          setPuzzleSelectedIdx(
            (prev) =>
              (prev - 1 + PUZZLE_MENU_ITEMS.length) % PUZZLE_MENU_ITEMS.length,
          );
        } else if (e.key === "ArrowDown") {
          setPuzzleSelectedIdx((prev) => (prev + 1) % PUZZLE_MENU_ITEMS.length);
        } else if (e.key === "Enter") {
          const chosen = PUZZLE_MENU_ITEMS[puzzleSelectedIdx];
          if (chosen === "Chess") onChess();
          else if (chosen === "Wordle") onWordle();
          else if (chosen === "Back") setSubMenu("main");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedIdx,
    puzzleSelectedIdx,
    subMenu,
    onStart,
    onAbout,
    onChess,
    onWordle,
    onSettings,
    onHiScores,
    onExit,
  ]);

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center gap-8 select-none">
      {subMenu === "main" && <FlyingBee modalRef={modalRef} yRef={yRef} />}
      {/* Content box — flat, no card */}
      <div className="flex flex-col items-center" data-zone="content">
        {/* Title / Puzzles heading */}
        {subMenu === "main" ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <PixelTransition
                firstContent={
                  <div
                    className="text-foreground tracking-widest"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: "2em",
                      lineHeight: 1,
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label="HYVMIND"
                  >
                    <span>H</span>
                    <span
                      ref={yRef}
                      style={{
                        fontSize: "1.25em",
                        verticalAlign: "middle",
                        lineHeight: 1,
                      }}
                    >
                      Y
                    </span>
                    <span>V</span>
                    <span>M</span>
                    <span>I</span>
                    <span>N</span>
                    <span>D</span>
                  </div>
                }
                secondContent={
                  <div
                    className="text-muted-foreground"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: "0.65em",
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ whiteSpace: "nowrap" }}>
                      a digital sanctuary
                    </div>
                    <div style={{ whiteSpace: "nowrap" }}>
                      for legal researchers
                    </div>
                  </div>
                }
                pixelColor="var(--foreground)"
                pixelSize={6}
                animationStepDuration={0.3}
              />
            </div>
          </>
        ) : (
          <div
            className="text-foreground tracking-widest"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "1em",
              letterSpacing: "0.15em",
            }}
          >
            Puzzles
          </div>
        )}

        {/* Menu */}
        <div className="flex flex-col items-center gap-1.5 mt-6">
          {subMenu === "main"
            ? MENU_ITEMS.map((item, activeIdx) => {
                const isSelected = activeIdx === selectedIdx;
                return (
                  <button
                    key={item}
                    type="button"
                    data-ocid={`text_game.start_screen.${item.toLowerCase().replace("-", "_")}`}
                    className={`transition-all duration-150 ${isSelected ? "text-foreground scale-105" : "text-muted-foreground opacity-50 hover:text-foreground hover:scale-105"}`}
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: "0.65em",
                      letterSpacing: "0.2em",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                    }}
                    onClick={() => {
                      setSelectedIdx(activeIdx);
                      if (item === "About") onAbout();
                      else if (item === "Story") onStart();
                      else if (item === "Puzzles") {
                        setSubMenu("puzzles");
                        setPuzzleSelectedIdx(0);
                      } else if (item === "Settings") onSettings();
                      else if (item === "Leaderboard") onHiScores();
                      else if (item === "Exit") onExit();
                    }}
                  >
                    {isSelected ? `> ${item}` : `  ${item}`}
                  </button>
                );
              })
            : PUZZLE_MENU_ITEMS.map((item, activeIdx) => {
                const isSelected = activeIdx === puzzleSelectedIdx;
                return (
                  <button
                    key={item}
                    type="button"
                    data-ocid={`text_game.start_screen.puzzle_${item.toLowerCase()}`}
                    className={`transition-all duration-150 ${isSelected ? "text-foreground scale-105" : "text-muted-foreground opacity-50 hover:text-foreground hover:scale-105"}`}
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: "0.65em",
                      letterSpacing: "0.2em",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                    }}
                    onClick={() => {
                      setPuzzleSelectedIdx(activeIdx);
                      if (item === "Chess") onChess();
                      else if (item === "Wordle") onWordle();
                      else if (item === "Back") setSubMenu("main");
                    }}
                  >
                    {isSelected ? `> ${item}` : `  ${item}`}
                  </button>
                );
              })}
        </div>
        {showScoreConfirmation && (
          <div
            className="text-foreground text-center mt-4"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "0.5em",
              letterSpacing: "0.1em",
            }}
          >
            <div className="mb-2">SCORE SAVED!</div>
            <div className="text-yellow-500 mb-2">BUZZ CODE GENERATED</div>
            <button
              type="button"
              className="mt-3 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => {
                setShowScoreConfirmation?.(false);
                setSecretCode?.(null);
              }}
            >
              [DISMISS]
            </button>
          </div>
        )}
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
                fontSize: "0.6em",
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

// ── TypewriterDisplay ───────────────────────────────────────────────────────────

interface TypewriterDisplayProps {
  target: string;
  onComplete: () => void;
  scrambleDone: boolean;
  onAdvance?: () => void;
}

function TypewriterDisplay({
  target,
  onComplete,
  scrambleDone,
  onAdvance,
}: TypewriterDisplayProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 px-8 select-none cursor-pointer"
      onClick={scrambleDone ? onAdvance : undefined}
      onKeyDown={
        scrambleDone
          ? (e) => {
              if (e.key !== "Tab") onAdvance?.();
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
          fontSize: "0.7em",
          letterSpacing: "0.05em",
          lineHeight: "2",
          maxWidth: "80%",
          fontWeight: "400",
        }}
      >
        <TextType
          text={target}
          typingSpeed={25}
          showCursor
          hideCursorWhileTyping
          cursorCharacter="█"
          cursorBlinkDuration={0.4}
          loop={false}
          onSentenceComplete={onComplete}
        />
      </p>
    </div>
  );
}

// ── About Screen ────────────────────────────────────────────────────────────────

function AboutScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const lines = ABOUT_LINES.filter((l) => l.trim() !== "");
  const total = lines.length;

  const advance = useCallback(() => {
    if (!done) return;
    setDone(false);
    if (step + 1 >= total) {
      onBack();
    } else {
      setStep((prev) => prev + 1);
    }
  }, [done, step, total, onBack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 select-none cursor-pointer"
      onClick={advance}
      onKeyDown={
        done
          ? (e) => {
              if (e.key !== "Tab") advance();
            }
          : undefined
      }
      // biome-ignore lint/a11y/useSemanticElements: intentional overlay
      role="button"
      tabIndex={0}
    >
      <p
        className="text-foreground text-center leading-relaxed"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.7em",
          letterSpacing: "0.05em",
          lineHeight: "2",
          maxWidth: "80%",
          fontWeight: "400",
        }}
      >
        <TextType
          key={step}
          text={lines[step]}
          typingSpeed={25}
          showCursor
          hideCursorWhileTyping
          cursorCharacter="█"
          cursorBlinkDuration={0.4}
          loop={false}
          onSentenceComplete={() => setDone(true)}
        />
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
  const modalRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Secret code generated after game completion
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showScoreConfirmation, setShowScoreConfirmation] = useState(false);
  const { mutateAsync: generateBuzzSecret } = useGenerateBuzzSecret();

  // Phase state
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [scrambleComplete, setScrambleComplete] = useState(false);

  // Settings (persisted)
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem("hyvmind_textgame_settings");
    return saved
      ? (JSON.parse(saved) as GameSettings)
      : { skipMessages: false, music: "off" };
  });

  // Leaderboard (persisted)
  const { data: leaderboardEntries } = useGetBuzzLeaderboard();

  // Game scores for this session
  const [_gameScores, setGameScores] = useState({
    game1: 0,
    game2: 0,
    game3: 0,
  });

  // Whether each iframe game has finished loading
  const [gameLoaded, setGameLoaded] = useState<Record<string, boolean>>({});

  // Reset loaded state when entering a new game
  useEffect(() => {
    if (
      phase.type === "game1" ||
      phase.type === "game2" ||
      phase.type === "game3"
    ) {
      setGameLoaded({ [phase.type]: false });
    }
  }, [phase.type]);

  // Override audio (island-puzzle-mystery.ogg)
  const [overrideAudio] = useState<HTMLAudioElement | null>(() => {
    const audio = new Audio("/assets/island-puzzle-mystery.ogg");
    audio.loop = true;
    return audio;
  });

  // Score awaiting auto-generation of buzz secret
  const [generatingScore, setGeneratingScore] = useState<number | null>(null);

  // ── Persist settings & leaderboard ────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem("hyvmind_textgame_settings", JSON.stringify(settings));
  }, [settings]);

  // ── Audio: play/pause based on sound setting ──────────────────────────────

  useEffect(() => {
    if (!overrideAudio) return;
    if (settings.music === "on") {
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

  const handleOpenAbout = useCallback(() => {
    setPhase({ type: "about" });
  }, []);

  const handleStartChess = useCallback(() => {
    setPhase({ type: "chess" });
  }, []);

  const handleChessComplete = useCallback((score: number) => {
    setGeneratingScore(score);
    setPhase({ type: "generating" });
  }, []);

  const handleStartWordle = useCallback(() => {
    setPhase({ type: "wordle" });
  }, []);

  const handleWordleComplete = useCallback((score: number) => {
    setGeneratingScore(score);
    setPhase({ type: "generating" });
  }, []);

  const handleCloseSubScreen = useCallback(() => {
    setPhase({ type: "idle" });
  }, []);

  // ── Phase: idle → intro (or game1 if skipMessages) ────────────────────────

  const handleStart = useCallback(() => {
    if (settings.skipMessages) {
      setPhase({ type: "game1" });
    } else {
      setPhase({ type: "intro", step: 0 });
    }
    setScrambleComplete(false);
    setGameScores({ game1: 0, game2: 0, game3: 0 });
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
        setGameScores((prev) => ({ ...prev, game2: score2 }));
        if (settings.skipMessages) {
          setPhase({ type: "game3" });
        } else {
          setPhase({ type: "postGame2", step: 0 });
          setScrambleComplete(false);
        }
      } else if (e.data?.type === "slalom-game-over") {
        const score3 = (e.data.score as number) || 0;
        setGameScores((prev) => {
          const totalScore = prev.game1 + prev.game2 + score3;
          setGeneratingScore(totalScore);
          setPhase({ type: "generating" });
          return { ...prev, game3: score3 };
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [settings]);

  // ── Auto-generate buzz secret when generatingScore is set ─────────────────

  useEffect(() => {
    if (generatingScore === null) return;
    let cancelled = false;
    (async () => {
      try {
        const secret = await generateBuzzSecret(
          BigInt(Math.round(generatingScore)),
        );
        if (!cancelled) {
          setSecretCode(secret);
          setShowScoreConfirmation(true);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to generate buzz secret:", err);
      }
      if (!cancelled) {
        setGeneratingScore(null);
        setPhase({ type: "idle" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [generatingScore, generateBuzzSecret]);

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
          setPhase({ type: "preOutro", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "choice2":
        if (phase.step < CONTENT.choice2Path.length - 1) {
          setPhase({ type: "choice2", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "preOutro", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "preOutro":
        if (phase.step < CONTENT.preOutro.length - 1) {
          setPhase({ type: "preOutro", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game2" });
        }
        break;
      case "postGame2":
        if (phase.step < CONTENT.postGame2.length - 1) {
          setPhase({ type: "postGame2", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "choices2", selected: 0 });
        }
        break;
      case "choice1b":
        if (phase.step < CONTENT.choice1bPath.length - 1) {
          setPhase({ type: "choice1b", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "preGame3", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "choice2b":
        if (phase.step < CONTENT.choice2bPath.length - 1) {
          setPhase({ type: "choice2b", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "preGame3", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "preGame3":
        if (phase.step < CONTENT.preGame3.length - 1) {
          setPhase({ type: "preGame3", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "game3" });
        }
        break;
      case "postGame3":
        if (phase.step < CONTENT.postGame3.length - 1) {
          setPhase({ type: "postGame3", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "choices3", selected: 0 });
        }
        break;
      case "choice1c":
        if (phase.step < CONTENT.choice1cPath.length - 1) {
          setPhase({ type: "choice1c", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "choice1cSub", selected: 0 });
        }
        break;
      case "choice1cSubPath":
        if (phase.step < CONTENT.choice1cSubPath.length - 1) {
          setPhase({ type: "choice1cSubPath", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "outro", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "choice2c":
        if (phase.step < CONTENT.choice2cPath.length - 1) {
          setPhase({ type: "choice2c", step: phase.step + 1 });
          setScrambleComplete(false);
        } else {
          setPhase({ type: "outro", step: 0 });
          setScrambleComplete(false);
        }
        break;
      case "outro":
        // "game not over" — auto-closes after scramble
        break;
    }
  }, [phase, scrambleComplete]);

  // ── Choice confirmation handlers ───────────────────────────────────────────

  const handleChoiceConfirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "choice2", step: 0 });
      setScrambleComplete(false);
    }
  }, []);

  const handleChoice2Confirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1b", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "choice2b", step: 0 });
      setScrambleComplete(false);
    }
  }, []);

  const handleChoice3Confirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1c", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "choice2c", step: 0 });
      setScrambleComplete(false);
    }
  }, []);

  const handleChoice1cSubConfirm = useCallback((index: number) => {
    if (index === 0) {
      setPhase({ type: "choice1cSubPath", step: 0 });
      setScrambleComplete(false);
    } else {
      setPhase({ type: "outro", step: 0 });
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
      "postGame2",
      "choice1b",
      "choice2b",
      "preGame3",
      "postGame3",
      "choice1c",
      "choice1cSubPath",
      "choice2c",
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

  const bgmParam = settings.music === "off" ? "?bgm=off" : "";

  const renderContent = () => {
    switch (phase.type) {
      case "idle":
        return (
          <StartScreen
            modalRef={modalRef}
            onStart={handleStart}
            onAbout={handleOpenAbout}
            onChess={handleStartChess}
            onWordle={handleStartWordle}
            onSettings={handleOpenSettings}
            onHiScores={handleOpenLeaderboard}
            onExit={handleExit}
            showScoreConfirmation={showScoreConfirmation}
            setShowScoreConfirmation={setShowScoreConfirmation}
            setSecretCode={setSecretCode}
          />
        );

      case "about":
        return <AboutScreen onBack={handleCloseSubScreen} />;

      case "settings":
        return (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={setSettings}
            onBack={handleCloseSubScreen}
            heading="Settings"
          />
        );

      case "leaderboard":
        return (
          <LeaderboardScreen
            leaderboard={leaderboardEntries ?? []}
            onBack={handleCloseSubScreen}
            heading="Leaderboard"
          />
        );

      case "generating":
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <div
              className="text-foreground"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.65em",
                letterSpacing: "0.1em",
              }}
            >
              Generating secret...
            </div>
            <div className="flex gap-[2px]">
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative blocks, order never changes
                  key={i}
                  className="text-foreground"
                  style={{
                    fontSize: "0.55em",
                    animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                  }}
                >
                  █
                </span>
              ))}
            </div>
          </div>
        );

      case "intro":
      case "postGame1":
      case "choice1":
      case "choice2":
      case "preOutro":
      case "postGame2":
      case "choice1b":
      case "choice2b":
      case "preGame3":
      case "postGame3":
      case "choice1c":
      case "choice1cSubPath":
      case "choice2c": {
        return (
          <TypewriterDisplay
            key={`${phase.type}-${"step" in phase ? phase.step : 0}`}
            target={getCurrentMessage(phase)}
            onComplete={() => setScrambleComplete(true)}
            scrambleDone={scrambleComplete}
            onAdvance={handleAdvance}
          />
        );
      }

      case "outro": {
        // "game not over" — auto-closes when scramble finishes
        return (
          <TypewriterDisplay
            key="outro-0"
            target={CONTENT.outro[0]}
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

      case "choices2":
        return (
          <ChoiceMenu
            options={CONTENT.choices2}
            selected={phase.selected}
            onSelect={(i) =>
              setPhase({ type: "choices2", selected: i as 0 | 1 })
            }
            onConfirm={handleChoice2Confirm}
          />
        );

      case "choices3":
        return (
          <ChoiceMenu
            options={CONTENT.choices3}
            selected={phase.selected}
            onSelect={(i) =>
              setPhase({ type: "choices3", selected: i as 0 | 1 })
            }
            onConfirm={handleChoice3Confirm}
          />
        );

      case "choice1cSub":
        return (
          <ChoiceMenu
            options={CONTENT.choice1cSub}
            selected={phase.selected}
            onSelect={(i) =>
              setPhase({ type: "choice1cSub", selected: i as 0 | 1 })
            }
            onConfirm={handleChoice1cSubConfirm}
          />
        );

      case "game1":
        return (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div
              className={`flex-1 flex items-center justify-center bg-background ${isLight ? "p-2" : "p-0"}`}
            >
              {!gameLoaded.game1 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex gap-[2px]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative blocks, order never changes
                        key={i}
                        className="text-foreground"
                        style={{
                          fontSize: "0.55em",
                          animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                        }}
                      >
                        █
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <iframe
                src={`/assets/rebirth.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Rebirth"
                data-ocid="text_game.game1_iframe"
                onLoad={() =>
                  setGameLoaded((prev) => ({ ...prev, game1: true }))
                }
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
              {!gameLoaded.game2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex gap-[2px]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative blocks, order never changes
                        key={i}
                        className="text-foreground"
                        style={{
                          fontSize: "0.55em",
                          animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                        }}
                      >
                        █
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <iframe
                src={`/assets/squarebar.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Square Bar"
                data-ocid="text_game.game2_iframe"
                onLoad={() =>
                  setGameLoaded((prev) => ({ ...prev, game2: true }))
                }
              />
            </div>
          </div>
        );

      case "game3":
        return (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div
              className={`flex-1 flex items-center justify-center bg-background ${isLight ? "p-2" : "p-0"}`}
            >
              {!gameLoaded.game3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex gap-[2px]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative blocks, order never changes
                        key={i}
                        className="text-foreground"
                        style={{
                          fontSize: "0.55em",
                          animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                        }}
                      >
                        █
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <iframe
                src={`/assets/slalom.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Slalom"
                data-ocid="text_game.game3_iframe"
                onLoad={() =>
                  setGameLoaded((prev) => ({ ...prev, game3: true }))
                }
              />
            </div>
          </div>
        );

      case "chess":
        return (
          <ChessPuzzleGame
            onComplete={handleChessComplete}
            onExit={() => setPhase({ type: "idle" })}
            heading="Chess"
          />
        );

      case "wordle":
        return (
          <WordlePuzzleGame
            onComplete={handleWordleComplete}
            onExit={() => setPhase({ type: "idle" })}
            heading="Wordle"
          />
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
        ref={modalRef}
        className="fixed z-50 font-mono flex flex-col border border-dashed border-border bg-background"
        style={{ inset: 0, fontSize: "80%" }}
        data-ocid="text_game.modal"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-dashed border-border px-3 py-1 flex-shrink-0">
          <span
            className="text-foreground/50"
            style={{
              fontSize: "0.5em",
              letterSpacing: "0.3em",
              fontFamily: '"Press Start 2P", monospace',
            }}
          >
            in (uneven) development
          </span>
          <button
            type="button"
            data-ocid="text_game.close_button"
            className="text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "0.5em",
              letterSpacing: "0.3em",
            }}
            onClick={() => {
              if (overrideAudio) {
                overrideAudio.pause();
                overrideAudio.currentTime = 0;
              }
              onComplete();
            }}
            aria-label="Close text game"
          >
            X
          </button>
        </div>

        {renderContent()}

        {/* Buzz Secret Banner — persists until dismissed */}
        {secretCode && (
          <div
            className="border-t border-dashed border-border bg-muted/20 px-4 py-3 flex flex-col gap-2 flex-shrink-0"
            data-ocid="text_game.buzz_secret_panel"
          >
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-xs tracking-wide text-foreground select-all break-all min-w-0"
                data-ocid="text_game.buzz_secret_code"
              >
                {secretCode}
              </code>
              <button
                type="button"
                className={`transition-colors px-2 py-1 border border-border text-xs shrink-0 ${
                  copiedCode
                    ? "opacity-50 pointer-events-none text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontFamily: '"Press Start 2P", monospace' }}
                data-ocid="text_game.buzz_secret_copy_button"
                aria-label={copiedCode ? "Copied" : "Copy secret code"}
                disabled={copiedCode}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secretCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  } catch {
                    // clipboard unavailable — silently ignore
                  }
                }}
              >
                {copiedCode ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border text-xs shrink-0"
                data-ocid="text_game.buzz_secret_dismiss_button"
                aria-label="Dismiss secret code"
                onClick={() => setSecretCode(null)}
              >
                [×]
              </button>
            </div>
            <div
              className="text-muted-foreground"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.35em",
                letterSpacing: "0.1em",
              }}
            >
              SAVE THIS CODE! VALID FOR 24 HOURS. REDEEM IN SETTINGS → WALLET.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
