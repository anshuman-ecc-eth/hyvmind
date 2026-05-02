import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  isSaving: boolean;
}

// ---------------------------------------------------------------------------
// MarkdownEditor
// ---------------------------------------------------------------------------

export function MarkdownEditor({
  content,
  onChange,
  isSaving,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height to fill container — the container is flex so
  // we rely on the textarea itself stretching via flex-1.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div
      className="relative flex flex-col flex-1 min-h-0 bg-background"
      data-ocid="markdown_editor.panel"
    >
      {/* Save indicator — top-right corner */}
      <div
        className="absolute top-2 right-3 flex items-center gap-1 text-xs text-muted-foreground z-10 pointer-events-none"
        aria-live="polite"
        aria-label={isSaving ? "Saving…" : "Saved"}
        data-ocid="markdown_editor.loading_state"
      >
        {isSaving ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <Check size={11} />
            <span>Saved</span>
          </>
        )}
      </div>

      {/* Editor textarea */}
      <textarea
        ref={textareaRef}
        aria-label="Markdown editor"
        spellCheck={false}
        data-ocid="markdown_editor.textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "flex-1 w-full h-full resize-none bg-background text-foreground",
          "font-mono text-sm leading-relaxed",
          "px-4 py-4 pr-20", // right padding to avoid save indicator overlap
          "border-none outline-none focus:outline-none",
          "placeholder:text-muted-foreground",
        ].join(" ")}
        placeholder="Start writing markdown…"
      />
    </div>
  );
}
