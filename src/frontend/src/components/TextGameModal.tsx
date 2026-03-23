import { useEffect, useRef, useState } from "react";

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

// ── Game Files ─────────────────────────────────────────────────────────────────

const GAME_FILES: Record<string, string> = {
  opening: `- (M) welcome to hyvmind...
- (P) [[law]]
- (P) [[language]]`,

  law: "",

  language: `- (M) we could start with the big question,
- (M) ...what is language?
- (P) [[sphota theory]]
- (P) [[general linguistics]]`,

  "sphota theory": `- (M) What is language?
- (M) The traditional answer of some of the Indian grammarians is that it is *sphota*, the real vehicle of meaning.
- (M) In fact, the Indian grammarians' theory of *sphota* has been acclaimed...
- (M) as one of the most important contributions to the central problem of general linguistics as well as of philosophy of language.
- (P) [[general linguistics]]
- (P) philosophy of language
- (P) continue
- (M) The theory in its rudimentary form maintains that a word or a sentence...
- (M) is not just a concatenation made up of different sound units arranged in a particular order,
- (M) ...but a single whole, a single symbol which bears a meaning.
- (M) I have used the words 'just' and 'bears' here purposefully, since at this stage...
- (M) when I am trying to formulate a general idea of *sphota* it is difficult to be more precise than this.
- (S) Bimal Krishna Matilal, "The Word and the World", Chapter 7.`,

  "general linguistics": `- (M) Of all social institutions, language is least amenable to initiative.
- (M) It blends with the life of society, and the latter, inert by nature, is a prime conservative force.
- (M) But to say that language is a product of social forces does not suffice to show clearly that it is unfree;
- (M) ...remembering that it is always the heritage of the preceding period, we must add that these social forces are linked with time.
- (P) social time
- (P) social forces
- (M) Language is checked not only by the weight of the collectivity but also by time.
- (M) These two are inseparable.
- (S) Ferdinand De Saussure, "Course in General Linguistics", Chapter 2, translator: Wade Baskin`,
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
        // Strip pipe alias: [[file|display]] → use file as both target and label
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

// ── Italic renderer ────────────────────────────────────────────────────────────

function renderWithItalics(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/);
  return parts.map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static split parts
      <em key={i}>{part.slice(1, -1)}</em>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static split parts
      <span key={i}>{part}</span>
    ),
  );
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

  const phaseRef = useRef<Phase>("typing");
  const segIdxRef = useRef(0);
  const segmentsRef = useRef<Segment[]>([]);
  const selectedActiveIdxRef = useRef(0);

  const navigateRef = useRef<(file: string) => void>(() => {});
  const advanceRef = useRef<() => void>(() => {});
  const confirmPathRef = useRef<(activeIdx: number) => void>(() => {});
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const _startSeg = (seg: Segment, _allSegs: Segment[], _idx: number) => {
    selectedActiveIdxRef.current = 0;
    setSelectedActiveIdx(0);
    if (seg.type === "message") {
      phaseRef.current = "typing";
      setPhase("typing");
      setDisplayText("");
      setMessageKey((k) => k + 1);
    } else if (seg.type === "paths") {
      // Always show the paths segment (active paths are selectable,
      // inactive paths are shown greyed out). If there are no active paths,
      // Enter/tap will advance past this block.
      phaseRef.current = "paths";
      setPhase("paths");
    } else {
      phaseRef.current = "source";
      setPhase("source");
    }
  };

  navigateRef.current = (file: string) => {
    const content = GAME_FILES[file] ?? "";
    const segs = parseGameFile(content);
    if (segs.length === 0) {
      onCompleteRef.current();
      return;
    }
    segmentsRef.current = segs;
    setSegments(segs);
    segIdxRef.current = 0;
    setSegIdx(0);
    _startSeg(segs[0], segs, 0);
  };

  advanceRef.current = () => {
    const next = segIdxRef.current + 1;
    if (next >= segmentsRef.current.length) {
      onCompleteRef.current();
      return;
    }
    segIdxRef.current = next;
    setSegIdx(next);
    _startSeg(segmentsRef.current[next], segmentsRef.current, next);
  };

  confirmPathRef.current = (activeIdx: number) => {
    const seg = segmentsRef.current[segIdxRef.current];
    if (seg?.type !== "paths") return;
    const activePaths = seg.options.filter((o) => o.active);
    if (activePaths.length === 0) {
      // All paths inactive — treat like a continue
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

  useEffect(() => {
    navigateRef.current("opening");
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messageKey is an intentional trigger key
  useEffect(() => {
    if (phaseRef.current !== "typing") return;
    const seg = segmentsRef.current[segIdxRef.current];
    if (seg?.type !== "message") return;
    const text = seg.text;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setDisplayText(text.slice(0, i));
      if (i < text.length) {
        timer = setTimeout(tick, TYPEWRITER_DELAY);
      } else {
        phaseRef.current = "waiting";
        setPhase("waiting");
      }
    };
    timer = setTimeout(tick, TYPEWRITER_DELAY);
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

  const currentSeg = segments[segIdx];
  const pathsData = currentSeg?.type === "paths" ? currentSeg : null;
  const activePaths = pathsData?.options.filter((o) => o.active) ?? [];

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled via window listener above
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center font-mono cursor-pointer select-none"
      data-ocid="text_game.modal"
      onClick={handleBackgroundClick}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-8 gap-6">
        {/* Message */}
        {(phase === "typing" || phase === "waiting") &&
          currentSeg?.type === "message" && (
            <p className="text-foreground text-base leading-relaxed tracking-wide text-center">
              {phase === "typing" ? (
                <>
                  {renderWithItalics(displayText)}
                  <span
                    className="inline-block w-[0.55ch] h-[1em] bg-foreground align-middle ml-[2px]"
                    style={{ animation: "terminal-blink 1s step-end infinite" }}
                  />
                </>
              ) : (
                <>
                  {renderWithItalics(currentSeg.text)}
                  <span
                    className="inline-block w-[0.55ch] h-[1em] bg-foreground align-middle ml-[2px]"
                    style={{ animation: "terminal-blink 1s step-end infinite" }}
                  />
                </>
              )}
            </p>
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

      {/* Instruction bar */}
      <div className="pb-8 text-muted-foreground text-xs tracking-widest text-center">
        {phase === "paths"
          ? "up/down to select  ·  enter to confirm  ·  shift+x to end  ·  shift+s to restart"
          : "enter to continue  ·  shift+x to end  ·  shift+s to restart"}
      </div>
    </div>
  );
}
