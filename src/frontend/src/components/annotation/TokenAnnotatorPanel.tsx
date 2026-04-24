import { useEffect, useRef, useState } from "react";
import type { TokenAnnotation } from "../../types/annotation";

const LAW_COLOR = "#DC143C";
const INTERP_COLOR = "#DA70D6";
const LAW_BG = "rgba(220,20,60,0.18)";
const INTERP_BG = "rgba(218,112,214,0.18)";

interface Props {
  tokens: string[];
  annotations: TokenAnnotation[];
  onSelectionComplete: (
    start: number,
    end: number,
    selectedText: string,
  ) => void;
}

interface FloatingButton {
  x: number;
  y: number;
  start: number;
  end: number;
  text: string;
}

function getTokenColor(annotations: TokenAnnotation[], idx: number) {
  for (const ann of annotations) {
    if (idx >= ann.start && idx <= ann.end) {
      return ann.tag === "lawEntity"
        ? { bg: LAW_BG, border: LAW_COLOR }
        : { bg: INTERP_BG, border: INTERP_COLOR };
    }
  }
  return null;
}

export function TokenAnnotatorPanel({
  tokens,
  annotations,
  onSelectionComplete,
}: Props) {
  const [floatingBtn, setFloatingBtn] = useState<FloatingButton | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);

  // Click outside clears selection UI
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFloatingBtn(null);
        setSelStart(null);
        setSelEnd(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

    // Walk token spans to find which token indices are selected
    const spans = Array.from(
      containerRef.current.querySelectorAll<HTMLSpanElement>("[data-ti]"),
    );
    const selectedIndices: number[] = [];

    for (const span of spans) {
      const range = document.createRange();
      range.selectNode(span);
      if (sel.containsNode(span, true)) {
        const ti = Number(span.dataset.ti);
        selectedIndices.push(ti);
      }
    }

    if (selectedIndices.length === 0) return;

    const start = Math.min(...selectedIndices);
    const end = Math.max(...selectedIndices);
    const selectedText = tokens.slice(start, end + 1).join(" ");

    // Position floating button near selection
    const rects = sel.getRangeAt(0).getClientRects();
    const lastRect = rects[rects.length - 1];
    const containerRect = containerRef.current.getBoundingClientRect();

    if (lastRect) {
      setFloatingBtn({
        x: lastRect.right - containerRect.left,
        y: lastRect.bottom - containerRect.top + 6,
        start,
        end,
        text: selectedText,
      });
    }

    setSelStart(start);
    setSelEnd(end);
  }

  function handleCreateToken() {
    if (floatingBtn) {
      onSelectionComplete(floatingBtn.start, floatingBtn.end, floatingBtn.text);
      setFloatingBtn(null);
      setSelStart(null);
      setSelEnd(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative select-text"
      data-ocid="token-annotator.panel"
      onMouseUp={handleMouseUp}
    >
      <div className="font-mono text-sm leading-8 whitespace-pre-wrap break-words text-foreground">
        {tokens.map((token, idx) => {
          const style = getTokenColor(annotations, idx);
          const isSelected =
            selStart !== null &&
            selEnd !== null &&
            idx >= selStart &&
            idx <= selEnd &&
            !style;
          const tokenKey = `t${idx}-${token.slice(0, 8)}`;
          return (
            <span key={tokenKey}>
              <span
                data-ti={idx}
                style={
                  style
                    ? {
                        backgroundColor: style.bg,
                        boxShadow: `0 0 0 1px ${style.border}`,
                        padding: "1px 2px",
                        margin: "0 1px",
                        cursor: "pointer",
                      }
                    : isSelected
                      ? {
                          backgroundColor: "rgba(255,255,255,0.15)",
                          padding: "1px 2px",
                          margin: "0 1px",
                        }
                      : {
                          padding: "1px 2px",
                          margin: "0 1px",
                        }
                }
              >
                {token}
              </span>
              {idx < tokens.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>

      {/* Floating Create Token button */}
      {floatingBtn && (
        <button
          data-ocid="token-annotator.create_token_button"
          type="button"
          style={{
            position: "absolute",
            left: floatingBtn.x,
            top: floatingBtn.y,
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
          onClick={handleCreateToken}
          className="border-2 border-primary bg-background text-primary font-mono text-xs px-2 py-1 uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          + Create Token
        </button>
      )}
    </div>
  );
}
