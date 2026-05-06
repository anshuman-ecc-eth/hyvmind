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
import type { EditorNode } from "@/types/markdownEditor";
import {
  generateCallout,
  generateFootnote,
  generateTable,
  generateTaskItem,
  insertAtCursor,
  wrapSelection,
} from "@/utils/markdownInsertions";
import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReferenceDropdown from "./ReferenceDropdown";
import type { ResolvableNode } from "./ReferenceDropdown";
import ReferenceHighlighter from "./ReferenceHighlighter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  isSaving: boolean;
  nodes?: EditorNode[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateCursorRect(
  ta: HTMLTextAreaElement,
  cursorPos: number,
): DOMRect {
  const text = ta.value.slice(0, cursorPos);
  const mirror = document.createElement("div");
  const style = getComputedStyle(ta);
  mirror.style.cssText = `
    position: fixed; top: 0; left: 0; visibility: hidden; overflow: hidden;
    white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;
    font-family: ${style.fontFamily};
    font-size: ${style.fontSize};
    line-height: ${style.lineHeight};
    padding: ${style.padding};
    letter-spacing: ${style.letterSpacing};
    width: ${ta.clientWidth}px;
  `;
  const span = document.createElement("span");
  span.textContent = text;
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const rect = span.getBoundingClientRect();
  document.body.removeChild(mirror);
  return new DOMRect(rect.left, rect.bottom, 0, 0);
}

// ---------------------------------------------------------------------------
// MarkdownEditor
// ---------------------------------------------------------------------------

export function MarkdownEditor({
  content,
  onChange,
  isSaving,
  nodes = [],
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightPreRef = useRef<HTMLPreElement>(null);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearchText, setDropdownSearchText] = useState("");
  const [dropdownAnchorRect, setDropdownAnchorRect] = useState<DOMRect | null>(
    null,
  );
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Compute resolvable nodes with parent path
  const dropdownNodes = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return nodes.map((node) => {
      const path: string[] = [];
      let current: EditorNode | undefined = node;
      while (current?.parentId) {
        const parent = nodeMap.get(current.parentId);
        if (parent) path.unshift(parent.name);
        current = parent;
      }
      return {
        id: node.id,
        name: node.name,
        nodeType: node.nodeType,
        parentPath: path.length > 0 ? path.join(" @ ") : "(root)",
      } as ResolvableNode;
    });
  }, [nodes]);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Reference dropdown handlers
  // ---------------------------------------------------------------------------

  const insertReference = useCallback(
    (nodeName: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBefore = content.slice(0, cursorPos);
      const atIndex = textBefore.lastIndexOf("{@");
      if (atIndex < 0) return;
      const newContent = `${content.slice(0, atIndex)}{${nodeName}}${content.slice(cursorPos)}`;
      onChange(newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = atIndex + nodeName.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
      setDropdownOpen(false);
    },
    [content, onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const ta = textareaRef.current;
    if (ta) {
      const cursorPos = ta.selectionStart;
      const textBefore = newContent.slice(0, cursorPos);
      const atIndex = textBefore.lastIndexOf("{@");
      if (atIndex >= 0) {
        const afterAt = textBefore.slice(atIndex + 2);
        if (!afterAt.includes("}")) {
          setDropdownSearchText(afterAt);
          setDropdownAnchorRect(calculateCursorRect(ta, cursorPos));
          setHighlightedIndex(0);
          setDropdownOpen(true);
        } else {
          setDropdownOpen(false);
        }
      } else {
        setDropdownOpen(false);
      }
    }
    onChange(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!dropdownOpen) return;
    const filtered = dropdownNodes.filter((n) =>
      n.name.toLowerCase().includes(dropdownSearchText.toLowerCase()),
    );
    if (filtered.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          insertReference(filtered[highlightedIndex].name);
        }
        break;
      case "Escape":
        e.preventDefault();
        setDropdownOpen(false);
        break;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightPreRef.current) {
      highlightPreRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightPreRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

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
          <div className="relative flex-1 min-h-0 bg-background">
            <ReferenceHighlighter
              ref={highlightPreRef}
              content={content}
              cursorPos={textareaRef.current?.selectionStart ?? 0}
            />
            <textarea
              ref={textareaRef}
              aria-label="Markdown editor"
              spellCheck={false}
              data-ocid="markdown_editor.textarea"
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              onContextMenu={(e) => e.stopPropagation()}
              className={[
                "relative bg-transparent text-transparent caret-foreground",
                "flex-1 w-full h-full resize-none",
                "font-mono text-sm leading-relaxed",
                "px-4 py-4 pr-20",
                "border-none outline-none focus:outline-none",
                "placeholder:text-muted-foreground",
              ].join(" ")}
              placeholder="Start writing markdown\u2026"
            />
          </div>
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

      <ReferenceDropdown
        open={dropdownOpen}
        searchText={dropdownSearchText}
        nodes={dropdownNodes}
        anchorRect={dropdownAnchorRect}
        highlightedIndex={highlightedIndex}
        onSelect={insertReference}
        onHighlightChange={setHighlightedIndex}
        onClose={() => setDropdownOpen(false)}
      />
    </div>
  );
}
