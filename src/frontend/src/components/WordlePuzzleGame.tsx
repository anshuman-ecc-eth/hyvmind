import { useCallback, useEffect, useRef, useState } from "react";

// ── 5-letter word list (common English words) ─────────────────────────────────
const WORDS: string[] = [
  "ABOUT",
  "ABOVE",
  "ABUSE",
  "ACTOR",
  "ACUTE",
  "ADMIT",
  "ADOPT",
  "ADULT",
  "AFTER",
  "AGAIN",
  "AGENT",
  "AGREE",
  "AHEAD",
  "ALARM",
  "ALBUM",
  "ALERT",
  "ALIKE",
  "ALIGN",
  "ALIVE",
  "ALLEY",
  "ALLOW",
  "ALONE",
  "ALONG",
  "ALTER",
  "ANGEL",
  "ANGER",
  "ANGLE",
  "ANGRY",
  "ANIME",
  "ANKLE",
  "ANNEX",
  "APART",
  "APPLE",
  "APPLY",
  "ARENA",
  "ARGUE",
  "ARISE",
  "ARMOR",
  "ARMY",
  "AROMA",
  "AROSE",
  "ARRAY",
  "ARROW",
  "ASIDE",
  "ASSET",
  "ATLAS",
  "ATTIC",
  "AUDIO",
  "AUDIT",
  "AVOID",
  "AWAKE",
  "AWARD",
  "AWARE",
  "AWFUL",
  "BADLY",
  "BAKER",
  "BASIC",
  "BASIS",
  "BATCH",
  "BEACH",
  "BEARD",
  "BEAST",
  "BEGIN",
  "BEING",
  "BELOW",
  "BENCH",
  "BERRY",
  "BLACK",
  "BLADE",
  "BLAME",
  "BLAND",
  "BLANK",
  "BLAST",
  "BLAZE",
  "BLEED",
  "BLEND",
  "BLESS",
  "BLIND",
  "BLOCK",
  "BLOOD",
  "BLOOM",
  "BLOWN",
  "BOARD",
  "BONUS",
  "BOOST",
  "BOUND",
  "BRAVE",
  "BREAD",
  "BREAK",
  "BREED",
  "BRICK",
  "BRIDE",
  "BRIEF",
  "BRING",
  "BROKE",
  "BROWN",
  "BRUSH",
  "BUILD",
  "BUILT",
  "BURST",
  "BUYER",
  "CABIN",
  "CABLE",
  "CAMEL",
  "CANDY",
  "CARGO",
  "CARRY",
  "CATCH",
  "CAUSE",
  "CHAIN",
  "CHAIR",
  "CHAOS",
  "CHARM",
  "CHASE",
  "CHEAP",
  "CHECK",
  "CHEEK",
  "CHESS",
  "CHEST",
  "CHIEF",
  "CHILD",
  "CHINA",
  "CIVIL",
  "CLAIM",
  "CLASH",
  "CLASS",
  "CLEAN",
  "CLEAR",
  "CLIMB",
  "CLING",
  "CLOCK",
  "CLOSE",
  "CLOUD",
  "COACH",
  "COAST",
  "COLOR",
  "COMIC",
  "COMMA",
  "CORAL",
  "COUNT",
  "COURT",
  "COVER",
  "CRAFT",
  "CRANE",
  "CRASH",
  "CRAZY",
  "CREAM",
  "CREEK",
  "CRISP",
  "CROSS",
  "CROWD",
  "CROWN",
  "CRUMB",
  "CRUSH",
  "CURVE",
  "CYCLE",
  "DAILY",
  "DANCE",
  "DATUM",
  "DEALT",
  "DECAY",
  "DELAY",
  "DEPOT",
  "DEPTH",
  "DERBY",
  "DEVIL",
  "DIRTY",
  "DISCO",
  "DIVER",
  "DIZZY",
  "DODGE",
  "DOING",
  "DONNA",
  "DOUBT",
  "DOUGH",
  "DRAFT",
  "DRAIN",
  "DRAMA",
  "DRANK",
  "DREAD",
  "DREAM",
  "DRESS",
  "DRIED",
  "DRINK",
  "DRIVE",
  "DROVE",
  "DROWN",
  "DRUNK",
  "DRYER",
  "DUMMY",
  "DUNNO",
  "DWELL",
  "DYING",
  "EAGER",
  "EARLY",
  "EARTH",
  "EIGHT",
  "ELITE",
  "EMPTY",
  "ENEMY",
  "ENJOY",
  "ENTER",
  "ENTRY",
  "EQUAL",
  "ERROR",
  "ESSAY",
  "EVENT",
  "EVERY",
  "EXACT",
  "EXIST",
  "EXTRA",
  "FABLE",
  "FAINT",
  "FAIRY",
  "FAITH",
  "FALSE",
  "FANCY",
  "FANNY",
  "FATAL",
  "FAULT",
  "FEAST",
  "FENCE",
  "FEVER",
  "FIBER",
  "FIELD",
  "FIERY",
  "FIFTH",
  "FIFTY",
  "FIGHT",
  "FILED",
  "FINAL",
  "FIRST",
  "FIXED",
  "FLAME",
  "FLASH",
  "FLASK",
  "FLEET",
  "FLESH",
  "FLOAT",
  "FLOOD",
  "FLOOR",
  "FLOUR",
  "FLUID",
  "FLUTE",
  "FOCAL",
  "FOCUS",
  "FOGGY",
  "FORCE",
  "FORGE",
  "FOUND",
  "FRAME",
  "FRANK",
  "FRAUD",
  "FRESH",
  "FRONT",
  "FROST",
  "FROZE",
  "FRUIT",
  "FULLY",
  "FUNNY",
  "GHOST",
  "GIANT",
  "GIVEN",
  "GLAND",
  "GLASS",
  "GLIDE",
  "GLOBE",
  "GLOOM",
  "GLOSS",
  "GLOVE",
  "GOING",
  "GRACE",
  "GRADE",
  "GRAIN",
  "GRAND",
  "GRANT",
  "GRAPH",
  "GRASP",
  "GRASS",
  "GRAVE",
  "GREAT",
  "GREED",
  "GREEN",
  "GREET",
  "GRIEF",
  "GRILL",
  "GRIME",
  "GRIND",
  "GROAN",
  "GROPE",
  "GROUP",
  "GROVE",
  "GROWN",
  "GUARD",
  "GUEST",
  "GUIDE",
  "GUILD",
  "GUILE",
  "GUISE",
  "GULCH",
  "GUSTO",
  "HABIT",
  "HAPPY",
  "HARSH",
  "HEART",
  "HEAVY",
  "HEDGE",
  "HEIST",
  "HELLO",
  "HENCE",
  "HERBY",
  "HEROIC",
  "HINGE",
  "HIRED",
  "HOLLY",
  "HONOR",
  "HOPED",
  "HORSE",
  "HOTEL",
  "HOUSE",
  "HUMID",
  "HUMOR",
  "HURRY",
  "IDEAL",
  "IMAGE",
  "IMPLY",
  "INDEX",
  "INFER",
  "INPUT",
  "INTER",
  "INTRO",
  "IRONY",
  "ISSUE",
  "JOKER",
  "JOLLY",
  "JUDGE",
  "JUICE",
  "JUICY",
  "JUMBO",
  "KARMA",
  "KAYAK",
  "KNACK",
  "KNEEL",
  "KNIFE",
  "KNOCK",
  "KNOWN",
  "LABEL",
  "LANCE",
  "LARGE",
  "LASER",
  "LATER",
  "LAUGH",
  "LAYER",
  "LEAFY",
  "LEARN",
  "LEGAL",
  "LEVEL",
  "LIGHT",
  "LIKED",
  "LIMIT",
  "LINER",
  "LOCAL",
  "LODGE",
  "LOGIC",
  "LOOSE",
  "LOWER",
  "LUCKY",
  "LUNAR",
  "LYRIC",
  "MAGIC",
  "MAJOR",
  "MAKER",
  "MANOR",
  "MAPLE",
  "MARCH",
  "MARRY",
  "MATCH",
  "MAYOR",
  "MEDIA",
  "MERCY",
  "MERGE",
  "MERIT",
  "METAL",
  "METER",
  "MIGHT",
  "MINOR",
  "MINUS",
  "MIXED",
  "MODEL",
  "MONEY",
  "MONTH",
  "MORAL",
  "MOUNT",
  "MOUSE",
  "MOUTH",
  "MOVED",
  "MOVIE",
  "MURKY",
  "MUSIC",
  "NAIVE",
  "NAVAL",
  "NERVE",
  "NEVER",
  "NIGHT",
  "NOBLE",
  "NOISE",
  "NORTH",
  "NOTED",
  "NOVEL",
  "NYLON",
  "OCCUR",
  "OCTAL",
  "OFFER",
  "OFTEN",
  "OLIVE",
  "ORDER",
  "OTHER",
  "OUGHT",
  "OUTER",
  "OWNER",
  "OXIDE",
  "OZONE",
  "PAINT",
  "PANIC",
  "PAPER",
  "PARTY",
  "PASTA",
  "PATCH",
  "PAUSE",
  "PEACE",
  "PEARL",
  "PEDAL",
  "PENNY",
  "PETAL",
  "PHASE",
  "PHONE",
  "PHOTO",
  "PIANO",
  "PIECE",
  "PILOT",
  "PIXEL",
  "PIZZA",
  "PLACE",
  "PLAIN",
  "PLANE",
  "PLANT",
  "PLATE",
  "PLAZA",
  "PLEAD",
  "PLUCK",
  "PLUMB",
  "PLUME",
  "PLUMP",
  "PLUNGE",
  "POEM",
  "POINT",
  "POLAR",
  "POSED",
  "POWER",
  "PRESS",
  "PRICE",
  "PRIDE",
  "PRIME",
  "PRINT",
  "PRIOR",
  "PRIZE",
  "PROBE",
  "PRONE",
  "PROUD",
  "PROVE",
  "PROWL",
  "PULSE",
  "PUPIL",
  "PURSE",
  "QUEEN",
  "QUERY",
  "QUEST",
  "QUEUE",
  "QUICK",
  "QUIET",
  "QUOTA",
  "QUOTE",
  "RADAR",
  "RAISE",
  "RANGE",
  "RAPID",
  "RATIO",
  "REACH",
  "READY",
  "REALM",
  "REBEL",
  "RECUR",
  "REGAL",
  "REIGN",
  "RELAX",
  "REMIX",
  "REPAY",
  "REPEL",
  "REPLY",
  "RIDER",
  "RIDGE",
  "RIGHT",
  "RISKY",
  "RIVAL",
  "RIVET",
  "ROBOT",
  "ROCKY",
  "ROUGE",
  "ROUGH",
  "ROUND",
  "ROUTE",
  "ROWDY",
  "ROYAL",
  "RUGBY",
  "RULER",
  "RURAL",
  "SADLY",
  "SAINT",
  "SALAD",
  "SAUCE",
  "SAVED",
  "SCALE",
  "SCARE",
  "SCENE",
  "SCOPE",
  "SCORE",
  "SCOUT",
  "SEIZE",
  "SENSE",
  "SERVE",
  "SETUP",
  "SEVEN",
  "SHADE",
  "SHAKE",
  "SHALL",
  "SHAME",
  "SHAPE",
  "SHARE",
  "SHARK",
  "SHARP",
  "SHEEP",
  "SHEER",
  "SHELF",
  "SHIFT",
  "SHINE",
  "SHIRT",
  "SHOCK",
  "SHOOT",
  "SHORT",
  "SHOUT",
  "SIGHT",
  "SINCE",
  "SIXTH",
  "SKILL",
  "SKULL",
  "SLATE",
  "SLAVE",
  "SLEEK",
  "SLEEP",
  "SLICE",
  "SLIDE",
  "SLOPE",
  "SMART",
  "SMILE",
  "SMOKE",
  "SNACK",
  "SNAKE",
  "SOLAR",
  "SOLID",
  "SOLVE",
  "SORRY",
  "SOUND",
  "SOUTH",
  "SPACE",
  "SPARK",
  "SPEAK",
  "SPEED",
  "SPEND",
  "SPICE",
  "SPILL",
  "SPINE",
  "SPORT",
  "SPRAY",
  "SQUAD",
  "STACK",
  "STAFF",
  "STAGE",
  "STAKE",
  "STAND",
  "STARE",
  "START",
  "STATE",
  "STAVE",
  "STEAL",
  "STEEL",
  "STEEP",
  "STERN",
  "STICK",
  "STILL",
  "STOCK",
  "STONE",
  "STOOD",
  "STORE",
  "STORM",
  "STORY",
  "STOVE",
  "STRAP",
  "STRAY",
  "STRIP",
  "STUDY",
  "STUCK",
  "STYLE",
  "SUGAR",
  "SUITE",
  "SUNNY",
  "SUPER",
  "SURGE",
  "SWAMP",
  "SWEAR",
  "SWEEP",
  "SWEET",
  "SWEPT",
  "SWIFT",
  "SWORD",
  "SWORN",
  "TABLE",
  "TASTE",
  "TEACH",
  "THEME",
  "THERE",
  "THESE",
  "THING",
  "THINK",
  "THIRD",
  "THORN",
  "THOSE",
  "THREE",
  "THREW",
  "THROW",
  "THUMB",
  "TIGER",
  "TIGHT",
  "TIMER",
  "TIRED",
  "TITLE",
  "TODAY",
  "TOKEN",
  "TORCH",
  "TOTAL",
  "TOUCH",
  "TOUGH",
  "TOWER",
  "TOXIC",
  "TRACE",
  "TRACK",
  "TRADE",
  "TRAIL",
  "TRAIN",
  "TRAIT",
  "TRAMP",
  "TRASH",
  "TREAT",
  "TREND",
  "TRIAL",
  "TRICK",
  "TRIED",
  "TROOP",
  "TRUCK",
  "TRULY",
  "TRUMP",
  "TRUST",
  "TRUTH",
  "TULIP",
  "TUMOR",
  "TWIST",
  "TYPED",
  "ULTRA",
  "UNDER",
  "UNIFY",
  "UNION",
  "UNITE",
  "UNTIL",
  "UPPER",
  "UPSET",
  "URBAN",
  "USAGE",
  "USHER",
  "UTTER",
  "VAGUE",
  "VALID",
  "VALOR",
  "VALUE",
  "VALVE",
  "VAULT",
  "VERSE",
  "VIRAL",
  "VISIT",
  "VISTA",
  "VITAL",
  "VIVID",
  "VOCAL",
  "VOICE",
  "VOTER",
  "WAGON",
  "WASTE",
  "WATCH",
  "WATER",
  "WEARY",
  "WEAVE",
  "WEDGE",
  "WEIRD",
  "WHACK",
  "WHALE",
  "WHEAT",
  "WHEEL",
  "WHERE",
  "WHILE",
  "WHITE",
  "WHOLE",
  "WHOSE",
  "WIDER",
  "WITCH",
  "WOMAN",
  "WOMEN",
  "WORLD",
  "WORRY",
  "WORSE",
  "WORST",
  "WORTH",
  "WOULD",
  "WRITE",
  "WRONG",
  "WROTE",
  "YACHT",
  "YIELD",
  "YOUNG",
  "YOUTH",
  "ZEBRA",
  "ZONAL",
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;
const TIMER_START = 60;

// Stable key arrays for the fixed-size grid (avoids noArrayIndexKey lint rule)
const ROW_KEYS = ["r0", "r1", "r2", "r3", "r4", "r5"] as const;
const CELL_KEYS = ["c0", "c1", "c2", "c3", "c4"] as const;

type LetterColor = "green" | "yellow" | "gray" | "empty";

interface WordlePuzzleGameProps {
  onComplete: (score: number) => void;
  onExit: () => void;
  heading?: string;
}

const BTN_STYLE: React.CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: "0.6rem",
  letterSpacing: "0.15em",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0",
};

function getRandomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function checkGuess(guess: string, target: string): LetterColor[] {
  const result: LetterColor[] = Array(WORD_LENGTH).fill("gray");
  const targetArr = target.split("");
  const guessArr = guess.split("");
  // First pass: greens
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "green";
      targetArr[i] = "#";
      guessArr[i] = "*";
    }
  }
  // Second pass: yellows
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === "*") continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = "yellow";
      targetArr[idx] = "#";
    }
  }
  return result;
}

const CELL_COLOR: Record<LetterColor, string> = {
  green: "#6aaa64",
  yellow: "#c9b458",
  gray: "#787c7e",
  empty: "transparent",
};

export default function WordlePuzzleGame({
  onComplete,
  onExit,
  heading = "Wordle",
}: WordlePuzzleGameProps) {
  const [score, setScore] = useState(0);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIMER_START);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<"guesses" | "time">(
    "guesses",
  );
  const [guesses, setGuesses] = useState<string[]>([]);
  const [colors, setColors] = useState<LetterColor[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [targetWord, setTargetWord] = useState(() => getRandomWord());
  const [feedback, setFeedback] = useState("");
  const [solved, setSolved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver || solved) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          setGameOverReason("time");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameOver, solved]);

  // ── Focus hidden input ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameOver) inputRef.current?.focus();
  }, [gameOver]);

  // ── Handle submit guess ────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    const g = currentGuess.toUpperCase();
    if (g.length !== WORD_LENGTH) return;
    if (!WORDS.includes(g)) {
      setFeedback("Not in word list");
      setTimeout(() => setFeedback(""), 1200);
      return;
    }
    const result = checkGuess(g, targetWord);
    const newGuesses = [...guesses, g];
    const newColors = [...colors, result];
    setGuesses(newGuesses);
    setColors(newColors);
    setCurrentGuess("");

    if (g === targetWord) {
      // Correct!
      if (timerRef.current) clearInterval(timerRef.current);
      const pts = timeLeft;
      setScore((s) => s + pts);
      setSolved(true);
      setFeedback(`+${pts}!`);
      setTimeout(() => {
        // Next word
        setSolved(false);
        setGuesses([]);
        setColors([]);
        setCurrentGuess("");
        setFeedback("");
        setTargetWord(getRandomWord());
        setPuzzleNumber((n) => n + 1);
        // NOTE: timer intentionally NOT reset between puzzles per spec
      }, 1200);
    } else if (newGuesses.length >= MAX_GUESSES) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setGameOverReason("guesses");
      setFeedback(targetWord);
    }
  }, [currentGuess, guesses, colors, targetWord, timeLeft]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        submitGuess();
      } else if (e.key === "Backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setCurrentGuess((prev) =>
          prev.length < WORD_LENGTH ? prev + e.key.toUpperCase() : prev,
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameOver, submitGuess]);

  // ── Reset (try again) ──────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    setScore(0);
    setPuzzleNumber(1);
    setGuesses([]);
    setColors([]);
    setCurrentGuess("");
    setFeedback("");
    setTargetWord(getRandomWord());
    setTimeLeft(TIMER_START);
    setGameOver(false);
    setSolved(false);
  }, []);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const pxStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
  };

  const cellSize = "min(13vw, 48px)";

  // ── Grid rows to render ───────────────────────────────────────────────────
  const rows: { letters: string[]; rowColors: LetterColor[] }[] = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    if (r < guesses.length) {
      rows.push({
        letters: guesses[r].split(""),
        rowColors: colors[r],
      });
    } else if (r === guesses.length && !gameOver) {
      // Active row
      const letters = currentGuess.split("");
      while (letters.length < WORD_LENGTH) letters.push("");
      rows.push({
        letters,
        rowColors: Array(WORD_LENGTH).fill("empty") as LetterColor[],
      });
    } else {
      rows.push({
        letters: ["", "", "", "", ""],
        rowColors: Array(WORD_LENGTH).fill("empty") as LetterColor[],
      });
    }
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-start gap-3 pt-4 pb-4 px-2 select-none overflow-auto"
      data-ocid="wordle_puzzle.game"
    >
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none"
        style={{ width: 1, height: 1 }}
        value={currentGuess}
        readOnly
        onChange={(e) => {
          const val = e.target.value.toUpperCase().slice(0, WORD_LENGTH);
          setCurrentGuess(val);
        }}
      />

      {/* Heading */}
      <div
        className="text-foreground"
        style={{ ...pxStyle, fontSize: "1rem", letterSpacing: "0.15em" }}
      >
        {heading}
      </div>

      {/* Stats row */}
      <div
        className="flex gap-5 text-muted-foreground"
        style={{ ...pxStyle, fontSize: "0.55rem", letterSpacing: "0.1em" }}
      >
        <span data-ocid="wordle_puzzle.puzzle_number">#{puzzleNumber}</span>
        <span data-ocid="wordle_puzzle.score">Score: {score}</span>
        <span
          data-ocid="wordle_puzzle.timer"
          style={{ color: timeLeft <= 10 ? "var(--destructive)" : undefined }}
        >
          {timeLeft}s
        </span>
      </div>

      {/* Feedback */}
      <div
        style={{
          ...pxStyle,
          fontSize: "0.55rem",
          letterSpacing: "0.1em",
          minHeight: "1.4em",
          color: feedback.startsWith("+")
            ? "var(--primary)"
            : feedback === ""
              ? "transparent"
              : "var(--destructive)",
        }}
        data-ocid="wordle_puzzle.feedback"
      >
        {feedback || "."}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1" data-ocid="wordle_puzzle.grid">
        {rows.map((row, ri) => (
          <div key={ROW_KEYS[ri]} className="flex gap-1">
            {row.letters.map((letter, ci) => {
              const col = row.rowColors[ci];
              const isEmpty = col === "empty";
              return (
                <div
                  key={`${ROW_KEYS[ri]}-${CELL_KEYS[ci]}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isEmpty ? "transparent" : CELL_COLOR[col],
                    border: isEmpty
                      ? "2px solid var(--border)"
                      : `2px solid ${CELL_COLOR[col]}`,
                    ...pxStyle,
                    fontSize: "calc(min(13vw, 48px) * 0.35)",
                    color: isEmpty ? "var(--foreground)" : "#ffffff",
                    fontWeight: "bold",
                    transition: "background-color 0.15s",
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back button during active game */}
      {!gameOver && (
        <button
          type="button"
          data-ocid="wordle_puzzle.cancel_button"
          className="transition-colors hover:text-muted-foreground text-foreground mt-1"
          style={BTN_STYLE}
          onClick={onExit}
        >
          Back
        </button>
      )}

      {/* Game over */}
      {gameOver && (
        <div
          className="flex flex-col items-center gap-4 mt-2"
          data-ocid="wordle_puzzle.game_over"
        >
          <div
            style={{
              ...pxStyle,
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              color: "var(--destructive)",
            }}
          >
            {gameOverReason === "time" ? "Time's up!" : "No more guesses!"}
          </div>
          {gameOverReason === "guesses" && feedback && (
            <div
              style={{
                ...pxStyle,
                fontSize: "0.55rem",
                letterSpacing: "0.1em",
                color: "var(--muted-foreground)",
              }}
            >
              Word: {feedback}
            </div>
          )}
          <div className="flex gap-6">
            <button
              type="button"
              data-ocid="wordle_puzzle.try_again_button"
              className="transition-colors hover:text-muted-foreground text-foreground"
              style={BTN_STYLE}
              onClick={handleTryAgain}
            >
              Try again
            </button>
            <button
              type="button"
              data-ocid="wordle_puzzle.submit_button"
              className="transition-colors hover:text-muted-foreground text-foreground"
              style={BTN_STYLE}
              onClick={() => onComplete(score)}
            >
              Submit score
            </button>
            <button
              type="button"
              data-ocid="wordle_puzzle.back_button"
              className="transition-colors hover:text-muted-foreground text-foreground"
              style={BTN_STYLE}
              onClick={onExit}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
