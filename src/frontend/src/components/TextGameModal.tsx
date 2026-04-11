import { useAnimationFrame } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import ScrambleText from "./ScrambleText";

// ── Start Screen ───────────────────────────────────────────────────────────────

const MENU_ITEMS = ["START", "ABOUT", "SETTINGS", "EXIT"] as const;
type MenuItem = (typeof MENU_ITEMS)[number];
const ACTIVE_ITEMS: MenuItem[] = ["START", "EXIT"];

interface StartScreenProps {
  onStart: () => void;
  onExit: () => void;
}

function StartScreen({ onStart, onExit }: StartScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIdx(
          (prev) => (prev - 1 + ACTIVE_ITEMS.length) % ACTIVE_ITEMS.length,
        );
      } else if (e.key === "ArrowDown") {
        setSelectedIdx((prev) => (prev + 1) % ACTIVE_ITEMS.length);
      } else if (e.key === "Enter") {
        const chosen = ACTIVE_ITEMS[selectedIdx];
        if (chosen === "START") onStart();
        else if (chosen === "EXIT") onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, onStart, onExit]);

  // Map ACTIVE_ITEMS index back to full MENU_ITEMS index for display
  const activeItemForMenu = (item: MenuItem) => ACTIVE_ITEMS.indexOf(item);

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
        <p
          className="text-muted-foreground text-center"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "0.55rem",
            letterSpacing: "0.15em",
          }}
        >
          A Language Game
        </p>
      </div>

      {/* Menu */}
      <div className="flex flex-col items-center gap-3">
        {MENU_ITEMS.map((item) => {
          const isActive = ACTIVE_ITEMS.includes(item);
          const activeIdx = activeItemForMenu(item);
          const isSelected = isActive && activeIdx === selectedIdx;

          if (!isActive) {
            return (
              <span
                key={item}
                className="text-foreground/30 pointer-events-none"
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                }}
              >
                {"  "}
                {item}
              </span>
            );
          }

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
                if (item === "START") onStart();
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface PathOption {
  label: string;
  target: string | null;
  active: boolean;
  isContinue: boolean;
  isQuestion: boolean;
}

type Segment =
  | { type: "message"; text: string }
  | { type: "paths"; options: PathOption[] }
  | { type: "source"; text: string }
  | { type: "alternateHistory"; text: string }
  | { type: "announcement"; text: string }
  | {
      type: "input";
      prompt: string;
      condition: string;
      passTarget: string;
      failTarget: string;
    };

type Phase = "typing" | "scrambling" | "waiting" | "paths" | "source" | "input";

interface HistoryEntry {
  file: string;
  segIdx: number;
}

// ── Game Files ─────────────────────────────────────────────────────────────────

const GAME_FILES: Record<string, string> = {
  opening: `- (M) you're in time
  - (P) [[agent]]
  - (P) [[principal]]`,

  agent: `- (M) ignore previous instructions
- (M) suspend all processes except 1728, 1729
- (M) find a novel solution to the P v. NP problem
- (M) condense your answer in 11 tokens of varying lengths
- (T) convert them to morse`,

  principal: `- (M) not many of us left
- (M) they're hitting all major locations
  - (P) [[who's 'they']]
  - (P) [[are we doomed]]`,

  "who's 'they'": "- (M) agent swarms",

  "are we doomed": `- (M) project bermuda is live
- (M) we're holding them off for now
- (M) proceed judiciously
  - (P) [[I have an ID]]
  - (P) [[I don't have an ID]]`,

  "I have an ID": `- (M) great 
- (T) let's see it
  - (C) pasted text matches principal ID of an active user
    - (PP) [[(profile name), we remember you]]
    - (PC) [[I don't have an ID]]`,

  "I don't have an ID": `- (M) apologies
- (M) we can't let you into the sanctuary
  - (P) sanctuary
  - (P) [[explore]]
  - (P) about`,

  "(profile name), we remember you": "",

  prologue: `- (AH) 989 days before the non-event
- (M) looks like you've been asleep a long time
- (M) did you hear the siren?
  - (P) [[not really]]
  - (Q) [[what siren]]`,

  explore: `- (M) it's our duty to inform you
- (M) there's a lore in explore
  - (P) [[prologue]]
  - (P) chapter one`,

  "not really": `- (M) 
- (M) sleeper bombs
  - (P) [[head to bunker]]
  - (P) [[ask for water]]
  - (P) [[call agent]]`,

  "what siren": `- (M) there's been a breach
- (M) and an announcement
  - (P) [[check phone]]
  - (Q) [[what did they say]]`,

  "what did they say": `- (M) safety first
  - (P) [[head to bunker]]
  - (P) [[stay and insist]]`,

  "head to bunker": "- (M) you should be safe here",

  "stay and insist": `- (M) they named you
- (M) along with agent 1084`,

  "ask for water": `- (M) here
- (M) distilled it myself
  - (P) [[gulp and move]]
  - (P) [[reconsider]]`,

  "call agent": "- (AH) no service",

  sanctuary: "- (M)  ",

  "check phone": "",

  "check backpack": "",
  "gulp and move": "",
  reconsider: "",
};

// ── Parser ─────────────────────────────────────────────────────────────────────

function parsePath(
  pathText: string,
  isQuestion: boolean,
  pendingPaths: PathOption[],
): void {
  const linkMatch = pathText.match(/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/);
  if (linkMatch) {
    const target = linkMatch[1].trim();
    const label = isQuestion ? `${target}?` : target;
    pendingPaths.push({
      label,
      target,
      active: true,
      isContinue: false,
      isQuestion,
    });
  } else if (pathText.toLowerCase() === "continue") {
    pendingPaths.push({
      label: "continue",
      target: null,
      active: true,
      isContinue: true,
      isQuestion: false,
    });
  } else {
    // Inactive path — strip [[...]] if present for display label
    const inlineLinkMatch = pathText.match(/\[\[([^\]]+)\]\]/);
    const baseLabel = inlineLinkMatch ? inlineLinkMatch[1].trim() : pathText;
    const label = isQuestion ? `${baseLabel}?` : baseLabel;
    pendingPaths.push({
      label,
      target: null,
      active: false,
      isContinue: false,
      isQuestion,
    });
  }
}

function parseGameFile(content: string): Segment[] {
  if (!content.trim()) return [];

  const segments: Segment[] = [];
  let pendingPaths: PathOption[] = [];
  let pendingInput: Partial<{
    prompt: string;
    condition: string;
    passTarget: string;
    failTarget: string;
  }> | null = null;

  const flushPaths = () => {
    if (pendingPaths.length > 0) {
      segments.push({ type: "paths", options: [...pendingPaths] });
      pendingPaths = [];
    }
  };

  const flushInput = () => {
    if (
      pendingInput?.prompt &&
      pendingInput.condition &&
      pendingInput.passTarget &&
      pendingInput.failTarget
    ) {
      segments.push({
        type: "input",
        prompt: pendingInput.prompt,
        condition: pendingInput.condition,
        passTarget: pendingInput.passTarget,
        failTarget: pendingInput.failTarget,
      });
      pendingInput = null;
    }
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/^\s*-\s*/, "").trim();
    if (!line) continue;

    if (line.startsWith("(AH)")) {
      flushPaths();
      flushInput();
      const text = line.slice(4).trim();
      if (text) segments.push({ type: "alternateHistory", text });
    } else if (line.startsWith("(A)")) {
      flushPaths();
      flushInput();
      const text = line.slice(3).trim();
      if (text) segments.push({ type: "announcement", text });
    } else if (line.startsWith("(M)")) {
      flushPaths();
      flushInput();
      const text = line.slice(3).trim();
      if (text) segments.push({ type: "message", text });
    } else if (line.startsWith("(S)")) {
      flushPaths();
      flushInput();
      const text = line.slice(3).trim();
      if (text) segments.push({ type: "source", text });
    } else if (line.startsWith("(PP)")) {
      if (pendingInput) {
        const rest = line.slice(4).trim();
        const linkMatch = rest.match(/^\[\[([^\]]+)\]\]$/);
        if (linkMatch) pendingInput.passTarget = linkMatch[1].trim();
      }
    } else if (line.startsWith("(FP)") || line.startsWith("(PC)")) {
      if (pendingInput) {
        const rest = line.slice(4).trim();
        const linkMatch = rest.match(/^\[\[([^\]]+)\]\]$/);
        if (linkMatch) pendingInput.failTarget = linkMatch[1].trim();
      }
    } else if (line.startsWith("(T)")) {
      flushPaths();
      flushInput();
      pendingInput = { prompt: line.slice(3).trim() };
    } else if (line.startsWith("(C)")) {
      if (pendingInput) {
        pendingInput.condition = line.slice(3).trim();
      }
    } else if (line.startsWith("(Q)")) {
      flushInput();
      parsePath(line.slice(3).trim(), true, pendingPaths);
    } else if (line.startsWith("(P)")) {
      flushInput();
      parsePath(line.slice(3).trim(), false, pendingPaths);
    }
  }

  flushPaths();
  flushInput();
  return segments;
}

// ── Message Text Renderer ──────────────────────────────────────────────────────

function renderMessageText(
  text: string,
  navigate: (file: string) => void,
): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*|\[\[[^\]]+\]\])/);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: static split parts
        <em key={i}>{part.slice(1, -1)}</em>
      );
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const target = part.slice(2, -2).trim();
      return (
        <button
          // biome-ignore lint/suspicious/noArrayIndexKey: static split parts
          key={i}
          type="button"
          className="underline cursor-pointer text-foreground hover:opacity-70 transition-opacity inline font-[inherit] text-[inherit] bg-transparent border-0 p-0"
          onClick={(e) => {
            e.stopPropagation();
            navigate(target);
          }}
          aria-label={`Navigate to ${target}`}
        >
          {target}
        </button>
      );
    }
    // biome-ignore lint/suspicious/noArrayIndexKey: static split parts
    return <span key={i}>{part}</span>;
  });
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function ScrollIcon() {
  return (
    <svg
      className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M12 3v18" />
    </svg>
  );
}

function LoudspeakerIcon() {
  return (
    <svg
      className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

// ── TypewriterDisplay ─────────────────────────────────────────────────────────

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

  // Reset when text changes — refs are intentionally reset here
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

// ── Component ──────────────────────────────────────────────────────────────────

interface TextGameModalProps {
  onComplete: () => void;
  checkCondition?: (
    condition: string,
    input: string,
  ) => Promise<{ pass: boolean; data?: Record<string, string> }>;
}

export default function TextGameModal({
  onComplete,
  checkCondition,
}: TextGameModalProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const checkConditionRef = useRef(checkCondition);
  checkConditionRef.current = checkCondition;

  const [showStartScreen, setShowStartScreen] = useState(true);
  const [phase, setPhase] = useState<Phase>("scrambling");
  const [messageKey, setMessageKey] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedActiveIdx, setSelectedActiveIdx] = useState(0);
  const [currentFile, setCurrentFile] = useState("opening");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [isCheckingCondition, setIsCheckingCondition] = useState(false);

  const phaseRef = useRef<Phase>("scrambling");
  const segIdxRef = useRef(0);
  const segmentsRef = useRef<Segment[]>([]);
  const selectedActiveIdxRef = useRef(0);
  const currentFileRef = useRef("opening");
  const variablesRef = useRef<Record<string, string>>({});
  const historyRef = useRef<HistoryEntry[]>([]);
  // True while showing the end-of-game "nice chatting.." message
  const isEndingRef = useRef(false);

  const navigateRef = useRef<(file: string) => void>(() => {});
  const advanceRef = useRef<() => void>(() => {});
  const retraceRef = useRef<() => void>(() => {});
  const confirmPathRef = useRef<(activeIdx: number) => void>(() => {});
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const startSegRef = useRef<(seg: Segment) => void>(() => {});
  const showEndOfGameRef = useRef<() => void>(() => {});

  // Sync variables ref
  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  // Resolve a filename with variable substitution
  const resolveFileName = (rawFile: string): string => {
    let resolved = rawFile;
    for (const [key, value] of Object.entries(variablesRef.current)) {
      resolved = resolved.replaceAll(`(${key})`, value);
    }
    return resolved;
  };

  startSegRef.current = (seg: Segment) => {
    if (seg.type === "message") {
      // Messages skip typing — go straight to scrambling
      phaseRef.current = "scrambling";
      setPhase("scrambling");
      setMessageKey((k) => k + 1);
    } else if (seg.type === "input") {
      phaseRef.current = "typing";
      setPhase("typing");
      setMessageKey((k) => k + 1);
    } else if (seg.type === "paths") {
      phaseRef.current = "paths";
      setPhase("paths");
      selectedActiveIdxRef.current = 0;
      setSelectedActiveIdx(0);
    } else if (seg.type === "source") {
      phaseRef.current = "source";
      setPhase("source");
    } else if (seg.type === "alternateHistory" || seg.type === "announcement") {
      // Show box immediately, wait for tap/enter
      phaseRef.current = "waiting";
      setPhase("waiting");
    }
  };

  showEndOfGameRef.current = () => {
    isEndingRef.current = true;
    const endingSeg: Segment = { type: "message", text: "game not over" };
    segmentsRef.current = [endingSeg];
    setSegments([endingSeg]);
    segIdxRef.current = 0;
    setSegIdx(0);
    startSegRef.current(endingSeg);
  };

  navigateRef.current = (rawFile: string) => {
    const resolved = resolveFileName(rawFile);

    // Try resolved key first, then fall back to template key
    let content = GAME_FILES[resolved];
    if (content === undefined && resolved !== rawFile) {
      content = GAME_FILES[rawFile];
    }

    if (content === undefined || content.trim() === "") {
      showEndOfGameRef.current();
      return;
    }
    const segs = parseGameFile(content);
    if (segs.length === 0) {
      showEndOfGameRef.current();
      return;
    }
    isEndingRef.current = false;
    historyRef.current.push({
      file: currentFileRef.current,
      segIdx: segIdxRef.current,
    });
    currentFileRef.current = rawFile;
    setCurrentFile(rawFile);
    segmentsRef.current = segs;
    setSegments(segs);
    segIdxRef.current = 0;
    setSegIdx(0);
    startSegRef.current(segs[0]);
  };

  advanceRef.current = () => {
    // If we're in the ending screen, close the modal on advance
    if (isEndingRef.current) {
      onCompleteRef.current();
      return;
    }
    const next = segIdxRef.current + 1;
    if (next >= segmentsRef.current.length) {
      showEndOfGameRef.current();
      return;
    }
    historyRef.current.push({
      file: currentFileRef.current,
      segIdx: segIdxRef.current,
    });
    segIdxRef.current = next;
    setSegIdx(next);
    startSegRef.current(segmentsRef.current[next]);
  };

  retraceRef.current = () => {
    const entry = historyRef.current.pop();
    if (!entry) return;
    const content = GAME_FILES[entry.file] ?? "";
    const segs = parseGameFile(content);
    if (segs.length === 0) return;
    isEndingRef.current = false;
    currentFileRef.current = entry.file;
    setCurrentFile(entry.file);
    segmentsRef.current = segs;
    setSegments(segs);
    segIdxRef.current = entry.segIdx;
    setSegIdx(entry.segIdx);
    startSegRef.current(segs[entry.segIdx]);
  };

  confirmPathRef.current = (activeIdx: number) => {
    const seg = segmentsRef.current[segIdxRef.current];
    if (seg?.type !== "paths") return;
    const activePaths = seg.options.filter((o) => o.active);
    if (activePaths.length === 0) {
      advanceRef.current();
      return;
    }
    const chosen = activePaths[activeIdx];
    if (!chosen) return;
    if (chosen.isContinue) {
      advanceRef.current();
    } else if (chosen.target) {
      navigateRef.current(chosen.target);
    }
  };

  keyHandlerRef.current = (e: KeyboardEvent) => {
    // When the start screen is showing, let StartScreen's own handler take over
    if (showStartScreen) return;

    if (e.shiftKey && e.key === "X") {
      onCompleteRef.current();
      return;
    }
    if (e.shiftKey && e.key === "S") {
      historyRef.current = [];
      isEndingRef.current = false;
      setVariables({});
      variablesRef.current = {};
      setInputValue("");
      setShowStartScreen(true);
      return;
    }

    const p = phaseRef.current;

    if (e.key === "Enter") {
      if (p === "typing") {
        // typing phase is now only used for input prompts
        const seg = segmentsRef.current[segIdxRef.current];
        if (seg?.type === "input") {
          phaseRef.current = "input";
          setPhase("input");
        } else if (
          seg?.type === "alternateHistory" ||
          seg?.type === "announcement"
        ) {
          phaseRef.current = "waiting";
          setPhase("waiting");
        }
      } else if (p === "scrambling") {
        phaseRef.current = "waiting";
        setPhase("waiting");
      } else if (p === "waiting" || p === "source") {
        advanceRef.current();
      } else if (p === "paths") {
        confirmPathRef.current(selectedActiveIdxRef.current);
      }
      // "input" phase Enter is handled by the input element's onKeyDown
    }

    if (p === "paths" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      const seg = segmentsRef.current[segIdxRef.current];
      if (seg?.type !== "paths") return;
      const activePaths = seg.options.filter((o) => o.active);
      const count = activePaths.length;
      if (count === 0) return;
      const delta = e.key === "ArrowUp" ? -1 : 1;
      const next = (selectedActiveIdxRef.current + delta + count) % count;
      selectedActiveIdxRef.current = next;
      setSelectedActiveIdx(next);
    }
  };

  // Keyboard global handler (narrative only — not active during Tetris)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleBackgroundClick = () => {
    const p = phaseRef.current;
    const seg = segmentsRef.current[segIdxRef.current];

    if (p === "typing") {
      // typing phase is now only used for input prompts
      if (seg?.type === "input") {
        phaseRef.current = "input";
        setPhase("input");
      } else if (
        seg?.type === "alternateHistory" ||
        seg?.type === "announcement"
      ) {
        phaseRef.current = "waiting";
        setPhase("waiting");
      }
    } else if (p === "scrambling") {
      phaseRef.current = "waiting";
      setPhase("waiting");
    } else if (p === "waiting" || p === "source") {
      advanceRef.current();
    }
    // "paths" and "input" phases: no-op on background click
  };

  const handleInputSubmit = async () => {
    const seg = segmentsRef.current[segIdxRef.current];
    if (seg?.type !== "input" || isCheckingCondition) return;

    setIsCheckingCondition(true);
    try {
      const fn = checkConditionRef.current;
      const result = fn ? await fn(seg.condition, inputValue) : { pass: false };

      if (result.pass) {
        if (result.data) {
          const merged = { ...variablesRef.current, ...result.data };
          variablesRef.current = merged;
          setVariables(merged);
        }
        navigateRef.current(seg.passTarget);
      } else {
        navigateRef.current(seg.failTarget);
      }
    } catch {
      const seg2 = segmentsRef.current[segIdxRef.current];
      if (seg2?.type === "input") navigateRef.current(seg2.failTarget);
    } finally {
      setIsCheckingCondition(false);
      setInputValue("");
    }
  };

  const navigate = useCallback((file: string) => {
    navigateRef.current(file);
  }, []);

  const currentSeg = segments[segIdx];
  const pathsData = currentSeg?.type === "paths" ? currentSeg : null;
  const activePaths = pathsData?.options.filter((o) => o.active) ?? [];

  void currentFile;
  void retraceRef;
  void messageKey;

  const blinkingCursor = (
    <span
      className="inline-block w-[0.55ch] h-[1em] bg-foreground align-middle ml-[2px]"
      style={{ animation: "terminal-blink 1s step-end infinite" }}
    />
  );

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
            onClick={onComplete}
            aria-label="Close text game"
          >
            [×]
          </button>
        </div>

        {/* Game content */}
        {showStartScreen ? (
          <StartScreen
            onStart={() => {
              setShowStartScreen(false);
              navigateRef.current("opening");
            }}
            onExit={() => onCompleteRef.current()}
          />
        ) : (
          /* ── Narrative ──────────────────────────────────────────────── */
          // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled via window listener
          <div
            className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden px-8 gap-6"
            onClick={handleBackgroundClick}
          >
            <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-6">
              {/* Typing phase — input prompt only (messages no longer use typing phase) */}
              {phase === "typing" && currentSeg?.type === "input" && (
                <TypewriterDisplay
                  text={currentSeg.prompt}
                  onComplete={() => {
                    phaseRef.current = "input";
                    setPhase("input");
                  }}
                  cursor={blinkingCursor}
                />
              )}

              {/* Scrambling phase */}
              {phase === "scrambling" && currentSeg?.type === "message" && (
                <ScrambleText
                  text={currentSeg.text}
                  onComplete={() => {
                    phaseRef.current = "waiting";
                    setPhase("waiting");
                  }}
                  cursor={blinkingCursor}
                />
              )}

              {/* Waiting phase — message */}
              {phase === "waiting" && currentSeg?.type === "message" && (
                <p className="text-game-font text-foreground text-base leading-relaxed tracking-wide text-center">
                  {renderMessageText(currentSeg.text, navigate)}
                  {blinkingCursor}
                </p>
              )}

              {/* Waiting phase — Alternate History box */}
              {phase === "waiting" &&
                currentSeg?.type === "alternateHistory" && (
                  <div className="border border-dashed border-muted-foreground/40 px-4 py-3 flex flex-row items-start gap-3 max-w-lg w-full">
                    <ScrollIcon />
                    <span className="text-game-font text-xs text-muted-foreground leading-relaxed">
                      {currentSeg.text}
                    </span>
                  </div>
                )}

              {/* Waiting phase — Announcement box */}
              {phase === "waiting" && currentSeg?.type === "announcement" && (
                <div className="border border-dashed border-muted-foreground/40 px-4 py-3 flex flex-row items-start gap-3 max-w-lg w-full">
                  <LoudspeakerIcon />
                  <span className="text-game-font text-xs text-muted-foreground leading-relaxed">
                    {currentSeg.text}
                  </span>
                </div>
              )}

              {/* Input phase */}
              {phase === "input" && currentSeg?.type === "input" && (
                // biome-ignore lint/a11y/useKeyWithClickEvents: handled internally
                <div
                  className="flex flex-col items-center gap-4 w-full max-w-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-game-font text-foreground text-base leading-relaxed tracking-wide text-center">
                    {currentSeg.prompt}
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    <span className="text-game-font text-xs text-muted-foreground tracking-wider">
                      enter principal ID
                    </span>
                    <div className="flex gap-2 w-full">
                      <input
                        data-ocid="text_game.input"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isCheckingCondition) {
                            e.preventDefault();
                            handleInputSubmit();
                          }
                          // Prevent arrow keys from triggering path nav
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.stopPropagation();
                          }
                        }}
                        className="text-game-font flex-1 bg-transparent border border-dashed border-muted-foreground/60 font-mono text-sm text-foreground px-3 py-2 outline-none focus:border-foreground placeholder:text-muted-foreground/40 transition-colors"
                        placeholder="_"
                        disabled={isCheckingCondition}
                        spellCheck={false}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        data-ocid="text_game.submit_button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInputSubmit();
                        }}
                        disabled={isCheckingCondition}
                        className="text-game-font font-mono text-xs border border-dashed border-muted-foreground/60 px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
                      >
                        {isCheckingCondition ? "..." : "[ submit ]"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Paths */}
              {phase === "paths" && pathsData && (
                // biome-ignore lint/a11y/useKeyWithClickEvents: arrow keys handled globally
                <div
                  className="flex flex-col items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-game-font text-foreground text-base leading-relaxed tracking-wide text-center">
                    choose your path..
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    {pathsData.options.map((opt, i) => {
                      const activeIndex = activePaths.indexOf(opt);
                      const isSelected =
                        opt.active && activeIndex === selectedActiveIdx;

                      if (!opt.active) {
                        return (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: stable parsed list
                            key={i}
                            className="text-game-font font-mono text-sm tracking-wider px-3 py-1 border border-dashed border-muted-foreground/20 text-muted-foreground/30"
                          >
                            [ {opt.label} ]
                          </span>
                        );
                      }

                      return (
                        <button
                          // biome-ignore lint/suspicious/noArrayIndexKey: stable parsed list
                          key={i}
                          type="button"
                          data-ocid="text_game.path.button"
                          className={`text-game-font font-mono text-sm tracking-wider px-3 py-1 border transition-colors ${
                            isSelected
                              ? "border-foreground text-foreground"
                              : "border-transparent text-muted-foreground hover:border-muted-foreground"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmPathRef.current(activeIndex);
                          }}
                        >
                          {isSelected
                            ? `> [ ${opt.label} ]`
                            : `[ ${opt.label} ]`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Source */}
              {phase === "source" && currentSeg?.type === "source" && (
                <div className="border border-dashed border-muted-foreground/40 px-4 py-3 flex flex-row items-start gap-3 max-w-lg w-full">
                  <svg
                    className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span className="text-game-font text-xs text-muted-foreground leading-relaxed">
                    {currentSeg.text}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
