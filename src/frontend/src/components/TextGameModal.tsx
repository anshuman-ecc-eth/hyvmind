import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BuzzLeaderboardEntry } from "../backend.d";
import {
  useGenerateBuzzSecret,
  useGetBuzzLeaderboard,
} from "../hooks/useQueries";
import ChessPuzzleGame from "./ChessPuzzleGame";
import FlyingBee from "./FlyingBee";
import MapsOverlay from "./MapsOverlay";
import PixelTransition from "./TextAnimations/PixelTransition";
import TextType from "./TextType";
import WordlePuzzleGame from "./WordlePuzzleGame";

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_ITEMS = ["Enter World", "Go to App", "Credits"] as const;
const LEFT_MENU_ITEMS = ["Story", "Settings", "Back"] as const;

const ABOUT_LINES = [
  "This is a long rant about LAI.",
  "",
  "That's our word for Legal AI.",
  "",
  "Easy to remember. No double meaning.",
  "",
  "It steals your work, packs it into parrot suits and sells it for profit.",
  "",
  "Without attribution. Without compensation.",
  "",
  "It turns you into a passive consumer of your own intellect.",
  "",
  "To be honest, LAI is not a business.",
  "",
  "It's a bad magic trick.",
  "",
  "You pay to have your attention diverted so you don't notice the theft.",
  "",
  "Marketing teams say they're selling 'legal intelligence'.",
  "",
  "But they don't say how it is manufactured, or from where its ingredients are sourced.",
  "",
  "Subscribers to LAI premium get fancier parrots, of course.",
  "",
  "But *even they* must verify each line of the output.",
  "",
  "That's because legal language is adversarial.",
  "",
  "The end goal is to beat an opponent, not to reveal one's own weaknesses.",
  "",
  "(Hint: anything that can be automated is a weakness)",
  "",
  "Just to clarify, we're not anti-parrots.",
  "",
  "They're quite helpful with the tedious stuff, but they treat the law as math.",
  "",
  "Not as a form of reasoning that absorbs all other forms of reasoning without losing itself.",
  "",
  "No amount of compute can teach them the difference.",
  "",
  "And at any rate, parrots will never make rules for humans.",
  "",
  "That's why we don't trust them with the real stuff.",
  "",
  "And that's why the LAI folks hate us.",
  "",
  '"It sends the wrong message", they say.',
  "",
  'What they really mean is: "Human thinking reduces our total addressable market."',
  "",
  "We've been in the game long enough to see through the corpslop.",
  "",
  "We've also tested the key equation.",
  "",
  "Productivity Gain = Old Work Time - (New Work Time + Verification Time)",
  "",
  "Each variable is measured in non-parrot hours. That's why they're freaking out.",
  "",
  "In order for the 'business model' to work, they must sell with one hand what they steal with another.",
  "",
  "At this point, they have no other option but to test you.",
  "",
  "If you're scared, they'll throw you into a shadow factory.",
  "",
  "If you're convinced, they'll sell you a bigger parrot.",
  "",
  "If you're neither scared nor convinced..",
  "",
  "..then you're a threat.",
];
const PUZZLE_MENU_ITEMS = ["Chess", "Wordle", "Back"] as const;
const GAMES_MENU_ITEMS = [
  "Up 1 Way",
  "Thunder",
  "Box Snake",
  "Pillars 3D",
  "Back",
] as const;

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
  | { type: "hyvmind" }
  | { type: "credits" }
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

// ── Credits Screen ──────────────────────────────────────────────────────────────

function CreditsScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  return (
    <div className="flex-1 flex flex-col items-center gap-4 px-6 py-4 overflow-y-auto select-none">
      <div
        className="text-foreground tracking-widest"
        style={{ fontFamily: '"Press Start 2P", monospace', fontSize: "0.9em" }}
      >
        Credits
      </div>
      <div
        className="text-muted-foreground text-center"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.5em",
          lineHeight: "1.8",
          letterSpacing: "0.05em",
        }}
      >
        Thanks to the following artists for making this project possible:
      </div>
      <div
        className="flex flex-col items-start gap-4 w-full max-w-md"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.7em",
          lineHeight: "1.8",
          letterSpacing: "0.05em",
        }}
      >
        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">forest.mp3 — BGM</span>
          <a
            href="https://greenbearmusic.bandcamp.com/album/bgm-fun-vol-5"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
          >
            syncopika
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              alignSelf: "flex-start",
            }}
          >
            CC-BY 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">bottom.png — world tiles</span>
          <a
            href="https://opengameart.org/content/tinyslates-16x16px-orthogonal-tileset-by-ivan-voirol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
          >
            Ivan Voirol
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              alignSelf: "flex-start",
            }}
          >
            CC-BY 4.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">
            sprites/cultist_*.png — player
          </span>
          <span className="text-foreground">Antifarea</span>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              alignSelf: "flex-start",
            }}
          >
            CC-BY
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">
            crisp-game-lib — mini-game framework
          </span>
          <a
            href="https://github.com/abagames/crisp-game-lib"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
          >
            abagames
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              alignSelf: "flex-start",
            }}
          >
            MIT
          </span>
        </div>

        <div className="w-full" style={{ height: "4px" }} />

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — body</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert,
            Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani,
            Johannes Sjölund (wulax), Stephen Challener (Redshrike)
          </span>
          <a
            href="https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — head</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            bluecarrot16, Benjamin K. Smith (BenCreating), Stephen Challener
            (Redshrike)
          </span>
          <a
            href="https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — face</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            JaidynReiman, ElizaWy, Stephen Challener (Redshrike)
          </span>
          <a
            href="https://github.com/ElizaWy/LPC/tree/main/Characters/Head"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            GitHub (ElizaWy)
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            OGA-BY 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — hat</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            Napsio (Vitruvian Studio), Michael Whitlock (bigbeargames), Tracy
          </span>
          <a
            href="https://opengameart.org/content/lpc-celestial-wizard-hats"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            CC-BY 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — boots</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            JaidynReiman, bluecarrot16, Nila122
          </span>
          <a
            href="https://opengameart.org/content/lpc-clothes-and-hair"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 2.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — hair</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            Yamilian, bluecarrot16
          </span>
          <a
            href="https://opengameart.org/content/lpc-heroine-2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — mustache</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            JaidynReiman, Thane Brimhall (pennomi), laetissima
          </span>
          <a
            href="https://opengameart.org/content/lpc-base-character-expressions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — vest</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            bluecarrot16, Thane Brimhall (pennomi), laetissima, Stephen
            Challener (Redshrike), Johannes Sjölund (wulax)
          </span>
          <a
            href="https://opengameart.org/content/lpc-2-characters"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>

        <div className="flex flex-col items-start gap-1 w-full">
          <span className="text-foreground">sprites/bava/ — jacket</span>
          <span className="text-foreground" style={{ fontSize: "0.85em" }}>
            bluecarrot16
          </span>
          <a
            href="https://opengameart.org/content/lpc-gentleman"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground underline"
            style={{ fontSize: "0.85em" }}
          >
            OpenGameArt
          </a>
          <span
            className="text-muted-foreground"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "1px 6px",
              fontSize: "0.7em",
              alignSelf: "flex-start",
            }}
          >
            CC-BY-SA 3.0 / GPL 3.0
          </span>
        </div>
      </div>
      <button
        type="button"
        className="text-foreground transition-colors hover:text-muted-foreground"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.55em",
          letterSpacing: "0.15em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          marginTop: "4px",
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
  onSettings: () => void;
  onExit: () => void;
  onEnter: () => void;
  onCredits: () => void;
  showScoreConfirmation?: boolean;
  setShowScoreConfirmation?: (v: boolean) => void;
  setSecretCode?: (v: string | null) => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

function StartScreen({
  onStart,
  onSettings,
  onExit,
  onEnter,
  onCredits,
  showScoreConfirmation,
  setShowScoreConfirmation,
  setSecretCode,
  modalRef,
}: StartScreenProps) {
  const yRef = useRef<HTMLSpanElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [subMenu, setSubMenu] = useState<"main" | "left">("main");
  const [leftSelectedIdx, setLeftSelectedIdx] = useState(0);
  const [beeReady, setBeeReady] = useState(false);

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
          if (chosen === "Enter World") onEnter();
          else if (chosen === "Go to App") onExit();
          else if (chosen === "Credits") onCredits();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, subMenu, onEnter, onCredits, onExit]);

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center gap-8 select-none">
      {subMenu === "main" && (
        <FlyingBee
          modalRef={modalRef}
          yRef={yRef}
          onReady={() => setBeeReady(true)}
        />
      )}
      {!beeReady && subMenu === "main" && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex gap-[2px]">
            {Array.from({ length: 16 }).map((_, i) => {
              const id = `bee-loading-${i}`;
              return (
                <span
                  key={id}
                  className="text-foreground"
                  style={{
                    fontSize: "0.55em",
                    animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                  }}
                >
                  █
                </span>
              );
            })}
          </div>
        </div>
      )}
      {/* Content box — flat, no card */}
      <div className="flex flex-col items-center" data-zone="content">
        {/* Title / Puzzles heading */}
        {subMenu === "main" ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <PixelTransition
                firstContent={
                  <div
                    className="text-white tracking-widest"
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
                    className="text-neutral-400"
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
                pixelColor="#ffffff"
                pixelSize={6}
                animationStepDuration={0.3}
              />
            </div>
          </>
        ) : (
          <div
            className="text-white tracking-widest"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "1em",
              letterSpacing: "0.15em",
            }}
          >
            "Sanctuary"
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
                    className={`transition-all duration-150 ${isSelected ? "text-white scale-105" : "text-neutral-400 opacity-50 hover:text-white hover:scale-105"}`}
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
                      if (item === "Enter World") onEnter();
                      else if (item === "Go to App") onExit();
                      else if (item === "Credits") onCredits();
                    }}
                  >
                    {isSelected ? `> ${item}` : `  ${item}`}
                  </button>
                );
              })
            : LEFT_MENU_ITEMS.map((item, activeIdx) => {
                const isSelected = activeIdx === leftSelectedIdx;
                return (
                  <button
                    key={item}
                    type="button"
                    data-ocid={`text_game.start_screen.left_${item.toLowerCase().replace("-", "_")}`}
                    className={`transition-all duration-150 ${isSelected ? "text-white scale-105" : "text-neutral-400 opacity-50 hover:text-white hover:scale-105"}`}
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
                      setLeftSelectedIdx(activeIdx);
                      if (item === "Story") onStart();
                      else if (item === "Settings") onSettings();
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
            className="text-white text-center mt-4"
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
              className="mt-3 text-neutral-400 hover:text-white text-xs"
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

// ── About Overlay ────────────────────────────────────────────────────────────

interface AboutOverlayProps {
  onBack: () => void;
}

function AboutOverlay({ onBack }: AboutOverlayProps) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const lines = ABOUT_LINES.filter((l) => l.trim() !== "");
  const total = lines.length;
  const isLast = step >= total - 1;

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
      if (e.key === "z" || e.key === "Z") {
        if (!isLast) advance();
      } else if (e.key === "x" || e.key === "X") {
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, isLast, onBack]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="px-6 py-4 rounded" style={{ background: "#000" }}>
        <p
          className="text-foreground text-center leading-relaxed"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.7em",
            letterSpacing: "0.05em",
            lineHeight: "2",
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
      <div className="flex flex-col items-center gap-3">
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#7ab0c0",
            letterSpacing: "0.5px",
            background: "#000",
            padding: "6px 14px",
            borderRadius: "2px",
          }}
        >
          {isLast ? "[X] close" : "[Z] continue  [X] close"}
        </div>
        <div className="flex gap-4">
          {!isLast && (
            <button
              type="button"
              onClick={() => {
                if (!done) return;
                const next = step + 1;
                if (next >= total) return;
                setStep(next);
                setDone(false);
              }}
              className="active:scale-95 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.5)",
                border: "2px solid #888",
                color: "#000",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Z
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="active:scale-95 transition-transform"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              border: "2px solid #888",
              color: "#000",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Games Overlay ────────────────────────────────────────────────────────────

interface GamesOverlayProps {
  selectedIdx: number;
  onSelect: (i: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onUp1Way: () => void;
  onThunder: () => void;
  onBoxSnake: () => void;
  onPillars3d: () => void;
  score: number;
}

function GamesOverlay({
  selectedIdx,
  onSelect,
  onBack,
  onUp1Way,
  onThunder,
  onBoxSnake,
  onPillars3d,
  score,
}: GamesOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        onSelect(
          (prev: number) =>
            (prev - 1 + GAMES_MENU_ITEMS.length) % GAMES_MENU_ITEMS.length,
        );
      } else if (e.key === "ArrowDown") {
        onSelect((prev: number) => (prev + 1) % GAMES_MENU_ITEMS.length);
      } else if (e.key === "Enter") {
        const chosen = GAMES_MENU_ITEMS[selectedIdx];
        if (chosen === "Up 1 Way") onUp1Way();
        else if (chosen === "Thunder") onThunder();
        else if (chosen === "Box Snake") onBoxSnake();
        else if (chosen === "Pillars 3D") onPillars3d();
        else if (chosen === "Back") onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedIdx,
    onSelect,
    onUp1Way,
    onThunder,
    onBoxSnake,
    onPillars3d,
    onBack,
  ]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div
        className="text-foreground tracking-widest"
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "1em",
          letterSpacing: "0.15em",
        }}
      >
        Games
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {GAMES_MENU_ITEMS.map((item, i) => {
          const isSelected = i === selectedIdx;
          return (
            <button
              key={item}
              type="button"
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
                onSelect(i);
                if (item === "Up 1 Way") onUp1Way();
                else if (item === "Thunder") onThunder();
                else if (item === "Box Snake") onBoxSnake();
                else if (item === "Pillars 3D") onPillars3d();
                else if (item === "Back") onBack();
              }}
            >
              {isSelected ? `> ${item}` : `  ${item}`}
            </button>
          );
        })}
      </div>
      {score > 0 && (
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.45em",
            color: "#888",
            letterSpacing: "0.1em",
            marginTop: "8px",
          }}
        >
          Score: {score}
        </div>
      )}
    </div>
  );
}

// ── Puzzles Overlay ───────────────────────────────────────────────────────────

interface PuzzlesOverlayProps {
  selectedIdx: number;
  onSelect: (i: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onChess: () => void;
  onWordle: () => void;
  score?: number;
}

function PuzzlesOverlay({
  selectedIdx,
  onSelect,
  onBack,
  onChess,
  onWordle,
  score,
}: PuzzlesOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        onSelect(
          (selectedIdx - 1 + PUZZLE_MENU_ITEMS.length) %
            PUZZLE_MENU_ITEMS.length,
        );
      } else if (e.key === "ArrowDown") {
        onSelect((selectedIdx + 1) % PUZZLE_MENU_ITEMS.length);
      } else if (e.key === "Enter") {
        const chosen = PUZZLE_MENU_ITEMS[selectedIdx];
        if (chosen === "Chess") onChess();
        else if (chosen === "Wordle") onWordle();
        else if (chosen === "Back") onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, onSelect, onChess, onWordle, onBack]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
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
      <div className="flex flex-col items-center gap-1.5">
        {PUZZLE_MENU_ITEMS.map((item, i) => {
          const isSelected = i === selectedIdx;
          return (
            <button
              key={item}
              type="button"
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
                onSelect(i);
                if (item === "Chess") onChess();
                else if (item === "Wordle") onWordle();
                else if (item === "Back") onBack();
              }}
            >
              {isSelected ? `> ${item}` : `  ${item}`}
            </button>
          );
        })}
      </div>
      {score !== undefined && score > 0 && (
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.45em",
            color: "#888",
            letterSpacing: "0.1em",
            marginTop: "8px",
          }}
        >
          Score: {score}
        </div>
      )}
    </div>
  );
}

// ── Lab Diagrams Overlay ─────────────────────────────────────────────────────────

const LAB_DIAGRAMS = [
  "from attention to trust.svg",
  "the legal intelligence market.svg",
];

function LabDiagramsOverlay({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step >= LAB_DIAGRAMS.length - 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z") {
        if (!isLast) setStep((prev) => prev + 1);
      } else if (e.key === "x" || e.key === "X") {
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLast, onBack]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none">
      <img
        src={`/assets/hyvmind/lab diagrams/${LAB_DIAGRAMS[step]}`}
        alt={`Diagram ${step + 1}`}
        className="max-w-full max-h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute bottom-6 flex flex-col items-center gap-3">
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#7ab0c0",
            letterSpacing: "0.5px",
            background: "#000",
            padding: "6px 14px",
            borderRadius: "2px",
          }}
        >
          {isLast ? "[X] close" : "[Z] continue  [X] close"}
        </div>
        <div className="flex gap-4">
          {!isLast && (
            <button
              type="button"
              onClick={() => setStep((prev) => prev + 1)}
              className="active:scale-95 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.5)",
                border: "2px solid #888",
                color: "#000",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Z
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="active:scale-95 transition-transform"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              border: "2px solid #888",
              color: "#000",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            X
          </button>
        </div>
      </div>
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

  // Whether the hyvmind game is still loading its assets
  const [hyvmindLoading, setHyvmindLoading] = useState(true);
  const hyvmindLoadingStartRef = useRef(0);

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

  // Score awaiting auto-generation of buzz secret
  const [generatingScore, setGeneratingScore] = useState<number | null>(null);

  // ── Persist settings & leaderboard ────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem("hyvmind_textgame_settings", JSON.stringify(settings));
  }, [settings]);

  // ── Hyvmind overlay state ──────────────────────────────────────────────────

  const hyvmindIframeRef = useRef<HTMLIFrameElement>(null);
  const [hyvmindOverlay, setHyvmindOverlay] = useState<string | null>(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [gameIdx, setGameIdx] = useState(0);
  const [unsubmittedScore, setUnsubmittedScore] = useState(0);
  const [gamesLoaded, setGamesLoaded] = useState<Record<string, boolean>>({});
  const hyvmindOverlayRef = useRef<string | null>(null);
  const unsubmittedScoreRef = useRef(0);
  hyvmindOverlayRef.current = hyvmindOverlay;
  unsubmittedScoreRef.current = unsubmittedScore;

  const handleHyvmindResume = useCallback(() => {
    console.log("handleHyvmindResume called, ref=", hyvmindIframeRef.current);
    setHyvmindOverlay(null);
    // Send score update to game
    const win = hyvmindIframeRef.current?.contentWindow;
    win?.postMessage(
      { type: "hyvmind-score-update", score: unsubmittedScoreRef.current },
      "*",
    );
    const send = () => {
      const w = hyvmindIframeRef.current?.contentWindow;
      console.log("sending hyvmind-resume, contentWindow=", w);
      w?.postMessage({ type: "hyvmind-resume" }, "*");
    };
    send();
    setTimeout(send, 200);
    setTimeout(send, 600);
    setTimeout(() => {
      hyvmindIframeRef.current?.focus();
    }, 100);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExit = useCallback(() => {
    onCompleteRef.current();
  }, []);

  const handleOpenSettings = useCallback(() => {
    setPhase({ type: "settings" });
  }, []);

  const handleOpenCredits = useCallback(() => {
    setPhase({ type: "credits" });
  }, []);

  const handleChessComplete = useCallback((score: number) => {
    setGeneratingScore(score);
    setPhase({ type: "generating" });
  }, []);

  const handleStartHyvmind = useCallback(() => {
    setPhase({ type: "hyvmind" });
    setHyvmindLoading(true);
    hyvmindLoadingStartRef.current = Date.now();
  }, []);

  // Focus the hyvmind iframe once it becomes visible after loading
  useEffect(() => {
    if (!hyvmindLoading && phase.type === "hyvmind") {
      const el = hyvmindIframeRef.current;
      if (el) {
        el.focus();
        el.contentWindow?.postMessage({ type: "hyvmind-focus" }, "*");
      }
    }
  }, [hyvmindLoading, phase.type]);

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
      if (e.data?.type === "crisp-game-over") {
        const receivedScore = (e.data.score as number) || 0;
        if (hyvmindOverlayRef.current?.startsWith("games")) {
          setUnsubmittedScore((prev) => prev + receivedScore);
          setHyvmindOverlay("games");
        } else if (phase.type === "game1") {
          setGameScores((prev) => ({ ...prev, game1: receivedScore }));
          if (settings.skipMessages) {
            setPhase({ type: "game2" });
          } else {
            setPhase({ type: "postGame1", step: 0 });
            setScrambleComplete(false);
          }
        } else if (phase.type === "game2") {
          setGameScores((prev) => ({ ...prev, game2: receivedScore }));
          if (settings.skipMessages) {
            setPhase({ type: "game3" });
          } else {
            setPhase({ type: "postGame2", step: 0 });
            setScrambleComplete(false);
          }
        } else if (phase.type === "game3") {
          setGameScores((prev) => {
            const total = prev.game1 + prev.game2 + receivedScore;
            setGeneratingScore(total);
            setPhase({ type: "generating" });
            return { ...prev, game3: receivedScore };
          });
        }
      } else if (e.data?.type === "hyvmind-loaded") {
        const elapsed = Date.now() - hyvmindLoadingStartRef.current;
        const minTime = 800;
        if (elapsed >= minTime) {
          setHyvmindLoading(false);
        } else {
          setTimeout(() => setHyvmindLoading(false), minTime - elapsed);
        }
      } else if (e.data?.type === "hyvmind-nav") {
        const target = e.data.target as string;
        const overlayMap: Record<string, string> = {
          "House of Puzzles": "puzzles",
          "House of Rant": "about",
          "House of Games": "games",
          "The Ranting Well": "about",
          Laboratory: "lab-diagrams",
          Leaderboard: "leaderboard",
          maps: "maps",
        };
        setHyvmindOverlay(overlayMap[target] || target);
        setPuzzleIdx(0);
        setGameIdx(0);
        setGamesLoaded({});
      } else if (e.data?.type === "hyvmind-submit-score") {
        const score = unsubmittedScoreRef.current;
        setUnsubmittedScore(0);
        if (score === 0) {
          hyvmindIframeRef.current?.contentWindow?.postMessage(
            { type: "hyvmind-popup", msg: "No score to submit." },
            "*",
          );
          return;
        }
        hyvmindIframeRef.current?.contentWindow?.postMessage(
          { type: "hyvmind-generating" },
          "*",
        );
        generateBuzzSecret(BigInt(Math.round(score)))
          .then((secret) => {
            hyvmindIframeRef.current?.contentWindow?.postMessage(
              { type: "hyvmind-buzz-secret", secret, score },
              "*",
            );
          })
          .catch((err) => {
            console.error("Failed to generate buzz secret:", err);
            hyvmindIframeRef.current?.contentWindow?.postMessage(
              { type: "hyvmind-buzz-secret", secret: null, score },
              "*",
            );
          });
      } else if (e.data?.type === "hyvmind-copy-secrets") {
        const secretsStr = (
          e.data.secrets as Array<{ secret: string; score: number }>
        )
          .map((s) => `Buzz: ${s.secret} (Score: ${s.score})`)
          .join("\n");
        navigator.clipboard.writeText(secretsStr).catch(() => {});
      } else if (e.data?.type === "hyvmind-close") {
        setHyvmindOverlay(null);
        setUnsubmittedScore(0);
        setPhase({ type: "idle" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [settings, generateBuzzSecret, phase.type]);

  // ── Sync unsubmittedScore to hyvmind iframe ────────────────────────────────

  useEffect(() => {
    const win = hyvmindIframeRef.current?.contentWindow;
    if (win) {
      win.postMessage(
        { type: "hyvmind-score-update", score: unsubmittedScore },
        "*",
      );
    }
  }, [unsubmittedScore]);

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
            onSettings={handleOpenSettings}
            onExit={handleExit}
            onEnter={handleStartHyvmind}
            onCredits={handleOpenCredits}
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

      case "credits":
        return <CreditsScreen onBack={handleCloseSubScreen} />;

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
                src={`/assets/games/up1way.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Up 1 Way"
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
                src={`/assets/games/thunder.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Thunder"
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
                src={`/assets/games/boxsnake.html${bgmParam}`}
                allow="autoplay"
                className="w-full h-full border-0"
                title="Box Snake"
                data-ocid="text_game.game3_iframe"
                onLoad={() =>
                  setGameLoaded((prev) => ({ ...prev, game3: true }))
                }
              />
            </div>
          </div>
        );

      case "hyvmind":
        return (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {hyvmindLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
                <div
                  className="text-foreground"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: "0.65em",
                    letterSpacing: "0.1em",
                  }}
                >
                  Loading...
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
            )}
            <div
              className="flex-1 flex items-center justify-center overflow-auto"
              style={{
                display: hyvmindLoading
                  ? "none"
                  : hyvmindOverlay === null
                    ? undefined
                    : "none",
              }}
            >
              <iframe
                ref={hyvmindIframeRef}
                src="/assets/hyvmind/index.html"
                tabIndex={-1}
                className="border-0"
                style={{
                  background: "transparent",
                  width: "1200px",
                  height: "800px",
                  flexShrink: 0,
                }}
                title="HYVMIND"
                allow="autoplay"
                data-ocid="text_game.hyvmind_iframe"
              />
            </div>
            {hyvmindOverlay === "puzzles" && (
              <PuzzlesOverlay
                selectedIdx={puzzleIdx}
                onSelect={setPuzzleIdx}
                onBack={handleHyvmindResume}
                onChess={() => setHyvmindOverlay("chess")}
                onWordle={() => setHyvmindOverlay("wordle")}
                score={unsubmittedScore}
              />
            )}
            {hyvmindOverlay === "about" && (
              <AboutOverlay onBack={handleHyvmindResume} />
            )}
            {hyvmindOverlay === "leaderboard" && (
              <LeaderboardScreen
                leaderboard={leaderboardEntries ?? []}
                onBack={handleHyvmindResume}
              />
            )}
            {hyvmindOverlay === "lab-diagrams" && (
              <LabDiagramsOverlay onBack={handleHyvmindResume} />
            )}
            {hyvmindOverlay === "maps" && (
              <MapsOverlay onBack={handleHyvmindResume} />
            )}
            {hyvmindOverlay === "games" && (
              <GamesOverlay
                selectedIdx={gameIdx}
                onSelect={(i) =>
                  setGameIdx(typeof i === "function" ? i(gameIdx) : i)
                }
                onBack={handleHyvmindResume}
                onUp1Way={() => {
                  setHyvmindOverlay("games-up1way");
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLIFrameElement>(
                          'iframe[title="Up 1 Way"]',
                        )
                        ?.focus(),
                    200,
                  );
                }}
                onThunder={() => {
                  setHyvmindOverlay("games-thunder");
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLIFrameElement>(
                          'iframe[title="Thunder"]',
                        )
                        ?.focus(),
                    200,
                  );
                }}
                onBoxSnake={() => {
                  setHyvmindOverlay("games-boxsnake");
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLIFrameElement>(
                          'iframe[title="Box Snake"]',
                        )
                        ?.focus(),
                    200,
                  );
                }}
                onPillars3d={() => {
                  setHyvmindOverlay("games-pillars3d");
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLIFrameElement>(
                          'iframe[title="Pillars 3D"]',
                        )
                        ?.focus(),
                    200,
                  );
                }}
                score={unsubmittedScore}
              />
            )}
            {["up1way", "thunder", "boxsnake", "pillars3d"].map((game) => {
              const overlayKey = `games-${game}`;
              const titles: Record<string, string> = {
                up1way: "Up 1 Way",
                thunder: "Thunder",
                boxsnake: "Box Snake",
                pillars3d: "Pillars 3D",
              };
              return (
                hyvmindOverlay === overlayKey && (
                  <div
                    key={game}
                    className="flex-1 relative flex flex-col overflow-hidden"
                  >
                    <div className="flex-1 flex items-center justify-center bg-background p-0">
                      {!gamesLoaded[game] && (
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
                        src={`/assets/games/${game}.html${bgmParam}`}
                        allow="autoplay"
                        className="w-full h-full border-0"
                        title={titles[game]}
                        tabIndex={-1}
                        onLoad={() =>
                          setGamesLoaded((prev) => ({
                            ...prev,
                            [game]: true,
                          }))
                        }
                      />
                    </div>
                  </div>
                )
              );
            })}
            {hyvmindOverlay === "chess" && (
              <ChessPuzzleGame
                onComplete={(score) => {
                  setUnsubmittedScore((prev) => prev + score);
                }}
                onExit={() => setHyvmindOverlay("puzzles")}
                heading="Chess"
              />
            )}
            {hyvmindOverlay === "wordle" && (
              <WordlePuzzleGame
                onComplete={(score) => {
                  setUnsubmittedScore((prev) => prev + score);
                }}
                onExit={() => setHyvmindOverlay("puzzles")}
                heading="Wordle"
              />
            )}
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
              onComplete();
            }}
            aria-label="Close text game"
          >
            X
          </button>
        </div>

        <div
          className="relative flex-1 flex flex-col min-h-0"
          style={
            {
              "--foreground": "#ffffff",
              "--muted-foreground": "#9e9e9e",
              "--background": "#0a0a0a",
              "--border": "#222222",
              "--muted": "#1a1a1a",
              "--card": "#111111",
              "--card-foreground": "#ffffff",
            } as React.CSSProperties
          }
        >
          <img
            src="/assets/forest background.png"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 1 }}
          />
          <div className="relative z-10 flex-1 flex flex-col min-h-0">
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
                  SAVE THIS CODE! VALID FOR 24 HOURS. REDEEM IN SETTINGS →
                  WALLET.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
