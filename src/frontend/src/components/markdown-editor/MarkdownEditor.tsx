import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  generateCallout,
  generateFootnote,
  generateTable,
  generateTaskItem,
  insertAtCursor,
  wrapSelection,
} from "@/utils/markdownInsertions";
import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

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

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  /**
   * handleInsert: apply an insertion transform to the current content,
   * then restore cursor / selection after React re-renders.
   */
  const handleInsert = useCallback(
    (
      transform: (
        content: string,
        start: number,
        end: number,
      ) => {
        newContent: string;
        newStart?: number;
        newEnd?: number;
        newCursor?: number;
      },
    ) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const result = transform(content, start, end);
      onChange(result.newContent);
      // Restore selection after re-render
      setTimeout(() => {
        if (!textareaRef.current) return;
        const newStart = result.newStart ?? result.newCursor ?? start;
        const newEnd = result.newEnd ?? result.newCursor ?? newStart;
        textareaRef.current.setSelectionRange(newStart, newEnd);
        textareaRef.current.focus();
      }, 0);
    },
    [content, onChange],
  );

  return (
    <div
      className="relative flex flex-col flex-1 min-h-0 bg-background"
      data-ocid="markdown_editor.panel"
    >
      {/* Save indicator — top-right corner */}
      <div
        className="absolute top-2 right-3 flex items-center gap-1 text-xs text-muted-foreground z-10 pointer-events-none"
        aria-live="polite"
        aria-label={isSaving ? "Saving\u2026" : "Saved"}
        data-ocid="markdown_editor.loading_state"
      >
        {isSaving ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            <span>Saving\u2026</span>
          </>
        ) : (
          <>
            <Check size={11} />
            <span>Saved</span>
          </>
        )}
      </div>

      {/* Editor textarea wrapped in context menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <textarea
            ref={textareaRef}
            aria-label="Markdown editor"
            spellCheck={false}
            data-ocid="markdown_editor.textarea"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onContextMenu={(e) => e.stopPropagation()}
            className={[
              "flex-1 w-full h-full resize-none bg-background text-foreground",
              "font-mono text-sm leading-relaxed",
              "px-4 py-4 pr-20",
              "border-none outline-none focus:outline-none",
              "placeholder:text-muted-foreground",
            ].join(" ")}
            placeholder="Start writing markdown\u2026"
          />
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 font-mono text-xs">
          {/* Headings */}
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "# ", "\n", ""))
            }
          >
            Heading 1
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "## ", "\n", ""))
            }
          >
            Heading 2
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "### ", "\n", ""))
            }
          >
            Heading 3
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Formatting */}
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "**", "**"))
            }
          >
            Bold
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "_", "_"))
            }
          >
            Italic
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "~~", "~~"))
            }
          >
            Strikethrough
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "==", "=="))
            }
          >
            Highlight
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "`", "`"))
            }
          >
            Inline Code
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Lists */}
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "- ", "\n", ""))
            }
          >
            Bullet List
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "1. ", "\n", ""))
            }
          >
            Numbered List
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) =>
                insertAtCursor(c, s, generateTaskItem(false), "\n", ""),
              )
            }
          >
            Task Item
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) =>
                insertAtCursor(c, s, generateTaskItem(true), "\n", ""),
              )
            }
          >
            Checked Task
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Inserts */}
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) =>
                insertAtCursor(c, s, generateTable(), "\n\n", "\n\n"),
              )
            }
          >
            Table
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) =>
                insertAtCursor(c, s, generateFootnote(c), "", ""),
              )
            }
          >
            Footnote
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) => insertAtCursor(c, s, "---", "\n", "\n"))
            }
          >
            Horizontal Rule
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Callouts submenu */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>Callout</ContextMenuSubTrigger>
            <ContextMenuSubContent className="font-mono text-xs">
              {[
                "Note",
                "Warning",
                "Tip",
                "Important",
                "Caution",
                "Info",
                "Success",
                "Danger",
              ].map((type) => (
                <ContextMenuItem
                  key={type}
                  onSelect={() =>
                    handleInsert((c, s) =>
                      insertAtCursor(
                        c,
                        s,
                        generateCallout(type.toLowerCase()),
                        "\n\n",
                        "\n\n",
                      ),
                    )
                  }
                >
                  {type}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          {/* Links */}
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "[", "](url)"))
            }
          >
            Link
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s, e) => wrapSelection(c, s, e, "[[", "]]"))
            }
          >
            Wikilink
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              handleInsert((c, s) =>
                insertAtCursor(c, s, "![alt](url)", "", ""),
              )
            }
          >
            Image
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
