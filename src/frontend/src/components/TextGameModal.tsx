import { useEffect, useRef, useState } from "react";

interface TextGameModalProps {
  onComplete: () => void;
}

type Screen = "welcome" | "choose" | "end";
type Path = "law" | "language" | null;

const WELCOME_TEXT = "welcome to hyvmind...";
const TYPEWRITER_DELAY = 40;

const END_TEXT: Record<"law" | "language", string> = {
  law: "you seek order in the archive...",
  language: "you seek meaning in the margins...",
};

export default function TextGameModal({ onComplete }: TextGameModalProps) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [typedText, setTypedText] = useState("");
  const [selectedPath, setSelectedPath] = useState<0 | 1>(0); // 0=law, 1=language
  const [chosenPath, setChosenPath] = useState<Path>(null);
  const [endTyped, setEndTyped] = useState("");
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter for welcome screen
  useEffect(() => {
    if (screen !== "welcome") return;
    let i = 0;
    setTypedText("");
    const tick = () => {
      if (i < WELCOME_TEXT.length) {
        i++;
        setTypedText(WELCOME_TEXT.slice(0, i));
        typeTimerRef.current = setTimeout(tick, TYPEWRITER_DELAY);
      }
    };
    typeTimerRef.current = setTimeout(tick, TYPEWRITER_DELAY);
    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    };
  }, [screen]);

  // Typewriter for end screen
  useEffect(() => {
    if (screen !== "end" || !chosenPath) return;
    const text = END_TEXT[chosenPath];
    let i = 0;
    setEndTyped("");
    const tick = () => {
      if (i < text.length) {
        i++;
        setEndTyped(text.slice(0, i));
        typeTimerRef.current = setTimeout(tick, TYPEWRITER_DELAY);
      } else {
        // After typing completes, wait then call onComplete
        endTimerRef.current = setTimeout(onComplete, 1800);
      }
    };
    typeTimerRef.current = setTimeout(tick, TYPEWRITER_DELAY);
    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, [screen, chosenPath, onComplete]);

  // Keyboard handler (window-level, handles Enter and arrow keys)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen === "welcome") {
        if (e.key === "Enter") {
          setScreen("choose");
        }
      } else if (screen === "choose") {
        if (e.key === "ArrowLeft") {
          setSelectedPath(0);
        } else if (e.key === "ArrowRight") {
          setSelectedPath(1);
        } else if (e.key === "Enter") {
          const path = selectedPath === 0 ? "law" : "language";
          setChosenPath(path);
          setScreen("end");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, selectedPath]);

  // Tap/click anywhere on modal = same as pressing Enter
  const handleModalClick = () => {
    if (screen === "welcome") {
      setScreen("choose");
    } else if (screen === "choose") {
      const path = selectedPath === 0 ? "law" : "language";
      setChosenPath(path);
      setScreen("end");
    }
    // "end" screen auto-completes via typewriter timer, no tap needed
  };

  const paths = ["law", "language"] as const;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events are handled via window.addEventListener above
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center font-mono cursor-pointer"
      data-ocid="text_game.modal"
      onClick={handleModalClick}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl px-8">
        {screen === "welcome" && (
          <div className="text-center">
            <span className="text-foreground text-lg tracking-wide">
              {typedText}
            </span>
            <span
              className="inline-block w-[0.6ch] h-[1.1em] bg-foreground align-bottom ml-[1px]"
              style={{
                animation: "terminal-blink 1s step-end infinite",
              }}
            />
          </div>
        )}

        {screen === "choose" && (
          <div className="text-center flex flex-col items-center gap-6">
            <p className="text-foreground text-lg tracking-wide">
              choose your path
            </p>
            <div className="flex items-center gap-8">
              {paths.map((path, idx) => (
                <button
                  type="button"
                  key={path}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPath(idx as 0 | 1);
                    const chosen = idx === 0 ? "law" : "language";
                    setChosenPath(chosen);
                    setScreen("end");
                  }}
                  className={`font-mono text-base tracking-wider px-2 py-1 border transition-colors ${
                    selectedPath === idx
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                  data-ocid={`text_game.${path}.button`}
                >
                  {selectedPath === idx ? `> [ ${path} ]` : `[ ${path} ]`}
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "end" && (
          <div className="text-center">
            <span className="text-foreground text-lg tracking-wide">
              {endTyped}
            </span>
            {endTyped.length <
              (chosenPath ? END_TEXT[chosenPath].length : 0) && (
              <span
                className="inline-block w-[0.6ch] h-[1.1em] bg-foreground align-bottom ml-[1px]"
                style={{ animation: "terminal-blink 1s step-end infinite" }}
              />
            )}
          </div>
        )}
      </div>

      {/* Fixed instruction line at bottom */}
      <div className="pb-8 text-muted-foreground text-xs tracking-widest select-none">
        enter to continue&nbsp;&nbsp;&nbsp;arrow keys to select
      </div>
    </div>
  );
}
