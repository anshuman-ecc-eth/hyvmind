import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PathOption {
  label: string;
  target: string | null;
  active: boolean;
  isContinue: boolean;
}

type Segment =
  | { type: "message"; text: string }
  | { type: "paths"; options: PathOption[] }
  | { type: "source"; text: string };

type Phase = "typing" | "waiting" | "paths" | "source";

interface HistoryEntry {
  file: string;
  segIdx: number;
}

// ── Game Files ─────────────────────────────────────────────────────────────────

const GAME_FILES: Record<string, string> = {
  opening: `- (M) welcome to hyvmind
- (P) [[play]]
- (P) [[explore]]`,

  play: `- (M) the social contract is expiring
- (M) we must rewrite the terms...
- (P) [[state]]
- (P) [[citizen]]`,

  explore: `- (M) there's a lore in explore...
- (P) [[past]]
- (P) [[present]]
- (P) [[future]]`,

  state: `- (M) you must preserve the law...
- (P) [[constitution]]
- (P) [[contract]]
- (P) [[crime]]`,

  citizen: `- (M) you must respect the law, except when
- (M) it breaks a higher law...
- (P) [[constitution]]
- (P) [[contract]]
- (P) [[crime]]
- (P) [[conscience]]`,

  past: `- (M) several decades before [[the event]], a series of [[debates]] took place
- (M) eleven participants and their arguments stood out...
- (P) [[the historian]]
- (P) [[the philosopher]]
- (P) [[the storyteller]]
- (P) [[the logician]]
- (P) [[the priest]]
- (P) [[the lawyer]]
- (P) [[the mathematician]]
- (P) [[the leader]]
- (P) [[the artist]]
- (P) [[the labourer]]
- (P) [[the mediator]]
- (M) before [[the three disagreements]], it was common practice to give each [[citizen]] two choices before a debate...
- (P) [[calculus of voices]] or remain [[silent]]
- (M) a detailed list of the most urgent questions was drawn up
- (M) this practice continued, with minor and major [[interruptions]] for some years
- (M) before [[the first disagreement]] brought it to an abrupt halt`,

  present:
    "- (M) after [[the third disagreement]], the [[calculus of voices]] was discontinued",

  future: "",

  "the three disagreements": `- (P) [[the first disagreement]]
- (P) [[the second disagreement]]
- (P) [[the third disagreement]]`,

  "calculus of voices": "",
  conscience: "",
  constitution: "",
  contract: "",
  crime: "",
};

const TYPEWRITER_DELAY = 30;

// ── Parser ─────────────────────────────────────────────────────────────────────

function parseGameFile(content: string): Segment[] {
  if (!content.trim()) return [];

  const segments: Segment[] = [];
  let pendingPaths: PathOption[] = [];

  const flushPaths = () => {
    if (pendingPaths.length > 0) {
      segments.push({ type: "paths", options: [...pendingPaths] });
      pendingPaths = [];
    }
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/^\s*-\s*/, "").trim();
    if (!line) continue;

    const parts = line.split(/(?=\([MPS]\))/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("(M)")) {
        flushPaths();
        const text = trimmed.slice(3).trim();
        if (text) segments.push({ type: "message", text });
      } else if (trimmed.startsWith("(P)")) {
        const pathText = trimmed.slice(3).trim();
        // Exact [[file]] match → active path
        const linkMatch = pathText.match(/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/);
        if (linkMatch) {
          const target = linkMatch[1].trim();
          pendingPaths.push({
            label: target,
            target,
            active: true,
            isContinue: false,
          });
        } else if (pathText.toLowerCase() === "continue") {
          pendingPaths.push({
            label: "continue",
            target: null,
            active: true,
            isContinue: true,
          });
        } else {
          // Mixed text with [[links]] — treat as inactive
          pendingPaths.push({
            label: pathText,
            target: null,
            active: false,
            isContinue: false,
          });
        }
      } else if (trimmed.startsWith("(S)")) {
        flushPaths();
        const text = trimmed.slice(3).trim();
        if (text) segments.push({ type: "source", text });
      }
    }
  }

  flushPaths();
  return segments;
}

// ── Message Text Renderer ──────────────────────────────────────────────────────

function renderMessageText(
  text: string,
  navigate: (file: string) => void,
): React.ReactNode {
  // Split on *italic* and [[link]] patterns
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

// ── Component ──────────────────────────────────────────────────────────────────

interface TextGameModalProps {
  onComplete: () => void;
}

export default function TextGameModal({ onComplete }: TextGameModalProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<Phase>("typing");
  const [displayText, setDisplayText] = useState("");
  const [messageKey, setMessageKey] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedActiveIdx, setSelectedActiveIdx] = useState(0);
  // current file name for history
  const [currentFile, setCurrentFile] = useState("opening");

  const phaseRef = useRef<Phase>("typing");
  const segIdxRef = useRef(0);
  const segmentsRef = useRef<Segment[]>([]);
  const selectedActiveIdxRef = useRef(0);
  const currentFileRef = useRef("opening");

  // Navigation history stack
  const historyRef = useRef<HistoryEntry[]>([]);

  const navigateRef = useRef<(file: string) => void>(() => {});
  const advanceRef = useRef<() => void>(() => {});
  const retraceRef = useRef<() => void>(() => {});
  const confirmPathRef = useRef<(activeIdx: number) => void>(() => {});
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const _startSeg = useCallback((seg: Segment) => {
    selectedActiveIdxRef.current = 0;
    setSelectedActiveIdx(0);
    if (seg.type === "message") {
      phaseRef.current = "typing";
      setPhase("typing");
      setDisplayText("");
      setMessageKey((k) => k + 1);
    } else if (seg.type === "paths") {
      phaseRef.current = "paths";
      setPhase("paths");
    } else {
      phaseRef.current = "source";
      setPhase("source");
    }
  }, []);

  navigateRef.current = (file: string) => {
    const content = GAME_FILES[file];
    // Missing file or empty string → end game
    if (content === undefined || content.trim() === "") {
      onCompleteRef.current();
      return;
    }
    const segs = parseGameFile(content);
    if (segs.length === 0) {
      onCompleteRef.current();
      return;
    }
    // Push current state to history before navigating
    historyRef.current.push({
      file: currentFileRef.current,
      segIdx: segIdxRef.current,
    });
    currentFileRef.current = file;
    setCurrentFile(file);
    segmentsRef.current = segs;
    setSegments(segs);
    segIdxRef.current = 0;
    setSegIdx(0);
    _startSeg(segs[0]);
  };

  advanceRef.current = () => {
    const next = segIdxRef.current + 1;
    if (next >= segmentsRef.current.length) {
      onCompleteRef.current();
      return;
    }
    // Push current position to history
    historyRef.current.push({
      file: currentFileRef.current,
      segIdx: segIdxRef.current,
    });
    segIdxRef.current = next;
    setSegIdx(next);
    _startSeg(segmentsRef.current[next]);
  };

  retraceRef.current = () => {
    const entry = historyRef.current.pop();
    if (!entry) return;
    const content = GAME_FILES[entry.file] ?? "";
    const segs = parseGameFile(content);
    if (segs.length === 0) return;
    currentFileRef.current = entry.file;
    setCurrentFile(entry.file);
    segmentsRef.current = segs;
    setSegments(segs);
    segIdxRef.current = entry.segIdx;
    setSegIdx(entry.segIdx);
    _startSeg(segs[entry.segIdx]);
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
    if (e.shiftKey && e.key === "X") {
      onCompleteRef.current();
      return;
    }
    if (e.shiftKey && e.key === "S") {
      historyRef.current = [];
      navigateRef.current("opening");
      return;
    }

    const p = phaseRef.current;

    if (e.key === "Enter") {
      if (p === "typing") {
        const seg = segmentsRef.current[segIdxRef.current];
        if (seg?.type === "message") {
          setDisplayText(seg.text);
          phaseRef.current = "waiting";
          setPhase("waiting");
        }
      } else if (p === "waiting" || p === "source") {
        advanceRef.current();
      } else if (p === "paths") {
        confirmPathRef.current(selectedActiveIdxRef.current);
      }
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

  // Initial load
  useEffect(() => {
    navigateRef.current("opening");
  }, []);

  // Typewriter with pause support
  // biome-ignore lint/correctness/useExhaustiveDependencies: messageKey is an intentional trigger key
  useEffect(() => {
    if (phaseRef.current !== "typing") return;
    const seg = segmentsRef.current[segIdxRef.current];
    if (seg?.type !== "message") return;
    const text = seg.text;

    // Check if message starts with "..."
    // We handle "..." prefix by showing dots one-by-one first
    const DOTS = "...";
    let charIndex = 0;
    let dotPhase = text.startsWith(DOTS);
    let dotCount = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (dotPhase) {
        // Show dots one by one, 333ms apart
        dotCount++;
        setDisplayText(DOTS.slice(0, dotCount));
        if (dotCount < 3) {
          timer = setTimeout(tick, 333);
        } else {
          dotPhase = false;
          charIndex = 3; // start after the three dots
          timer = setTimeout(tick, TYPEWRITER_DELAY);
        }
      } else {
        charIndex++;
        setDisplayText(text.slice(0, charIndex));
        if (charIndex < text.length) {
          timer = setTimeout(tick, TYPEWRITER_DELAY);
        } else {
          phaseRef.current = "waiting";
          setPhase("waiting");
        }
      }
    };

    const initialDelay = dotPhase ? 333 : TYPEWRITER_DELAY;
    if (dotPhase) {
      // Start with first dot
      dotCount = 1;
      setDisplayText(".");
      timer = setTimeout(tick, 333);
    } else {
      timer = setTimeout(tick, initialDelay);
    }

    return () => clearTimeout(timer);
  }, [messageKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleBackgroundClick = () => {
    const p = phaseRef.current;
    if (p === "typing") {
      const seg = segmentsRef.current[segIdxRef.current];
      if (seg?.type === "message") {
        setDisplayText(seg.text);
        phaseRef.current = "waiting";
        setPhase("waiting");
      }
    } else if (p === "waiting" || p === "source") {
      advanceRef.current();
    }
    // paths phase: no-op on background click
  };

  const navigate = useCallback((file: string) => {
    navigateRef.current(file);
  }, []);

  const currentSeg = segments[segIdx];
  const pathsData = currentSeg?.type === "paths" ? currentSeg : null;
  const activePaths = pathsData?.options.filter((o) => o.active) ?? [];

  // Suppress unused variable warning — currentFile is used for history tracking
  void currentFile;
  // retraceRef kept for keyboard shortcut support
  void retraceRef;

  return (
    <>
      {/* Semi-transparent backdrop — landing page visible behind */}
      <div className="fixed inset-0 z-40 bg-background/70" />

      {/* Floating window */}
      <div
        className="fixed z-50 font-mono flex flex-col border border-dashed border-border bg-background"
        style={{ inset: "5%" }}
        data-ocid="text_game.modal"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-dashed border-border px-3 py-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground tracking-wider">
            /language-game
          </span>
          <button
            type="button"
            data-ocid="text_game.close_button"
            className="font-mono text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            onClick={onComplete}
            aria-label="Close text game"
          >
            [×]
          </button>
        </div>

        {/* Game content — clickable area to advance */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled via window listener above */}
        <div
          className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden px-8 gap-6"
          onClick={handleBackgroundClick}
        >
          <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-6">
            {/* Message */}
            {(phase === "typing" || phase === "waiting") &&
              currentSeg?.type === "message" && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <p className="text-foreground text-base leading-relaxed tracking-wide text-center">
                    {phase === "typing" ? (
                      <>
                        {renderMessageText(displayText, navigate)}
                        <span
                          className="inline-block w-[0.55ch] h-[1em] bg-foreground align-middle ml-[2px]"
                          style={{
                            animation: "terminal-blink 1s step-end infinite",
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {renderMessageText(currentSeg.text, navigate)}
                        <span
                          className="inline-block w-[0.55ch] h-[1em] bg-foreground align-middle ml-[2px]"
                          style={{
                            animation: "terminal-blink 1s step-end infinite",
                          }}
                        />
                      </>
                    )}
                  </p>
                </div>
              )}

            {/* Paths */}
            {phase === "paths" && pathsData && (
              // biome-ignore lint/a11y/useKeyWithClickEvents: arrow keys handled globally
              <div
                className="flex flex-col items-center gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-foreground text-base leading-relaxed tracking-wide text-center">
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
                          className="font-mono text-sm tracking-wider px-3 py-1 border border-dashed border-muted-foreground/20 text-muted-foreground/30"
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
                        className={`font-mono text-sm tracking-wider px-3 py-1 border transition-colors ${
                          isSelected
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:border-muted-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmPathRef.current(activeIndex);
                        }}
                      >
                        {isSelected ? `> [ ${opt.label} ]` : `[ ${opt.label} ]`}
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
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {currentSeg.text}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instruction bar */}
        <div className="pb-4 pt-2 text-muted-foreground text-xs tracking-widest text-center flex-shrink-0 border-t border-dashed border-border">
          {phase === "paths"
            ? "up/down to select  ·  enter to confirm  ·  × to close  ·  shift+s to restart"
            : "tap or enter to continue  ·  × to close  ·  shift+s to restart"}
        </div>
      </div>
    </>
  );
}
