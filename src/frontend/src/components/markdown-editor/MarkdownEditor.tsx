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
// MarkdownEditor
// ---------------------------------------------------------------------------

export function MarkdownEditor({
  content,
  onChange,
  isSaving,
  nodes = [],
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const highlightPreRef = useRef<HTMLPreElement>(null);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearchText, setDropdownSearchText] = useState("");
  const [dropdownCenter, setDropdownCenter] = useState<{
    top: number;
    left: number;
  } | null>(null);
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
    (node: ResolvableNode) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBefore = content.slice(0, cursorPos);
      const atIndex = textBefore.lastIndexOf("{@");
      if (atIndex < 0) return;
      const leafName =
        node.nodeType === "interpEntity"
          ? node.name.replace(/\.md$/, "")
          : node.name;
      const refText =
        node.parentPath !== "(root)"
          ? `${node.parentPath} @ ${leafName}`
          : leafName;
      const newContent = `${content.slice(0, atIndex)}{${refText}}${content.slice(cursorPos)}`;
      onChange(newContent);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newPos = atIndex + refText.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      });
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
          setHighlightedIndex(0);
          setDropdownOpen(true);
          const rect = editorRef.current?.getBoundingClientRect();
          if (rect) {
            setDropdownCenter({
              top: rect.top + rect.height / 2,
              left: rect.left + rect.width / 2,
            });
          }
        } else {
          setDropdownOpen(false);
        }
      } else {
        setDropdownOpen(false);
      }
    }
    onChange(newContent);
  };

  const handleClose = useCallback(() => {
    setDropdownOpen(false);
    textareaRef.current?.focus();
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setDropdownSearchText(text);
    setHighlightedIndex(0);
  }, []);

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
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        const newStart = result.newStart ?? result.newCursor ?? start;
        const newEnd = result.newEnd ?? result.newCursor ?? newStart;
        textareaRef.current.setSelectionRange(newStart, newEnd);
        textareaRef.current.focus();
      });
    },
    [content, onChange],
  );

  return (
    <>
      <style>{`
        textarea[data-ocid="markdown_editor.textarea"] {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        textarea[data-ocid="markdown_editor.textarea"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={editorRef}
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
                onScroll={handleScroll}
                onContextMenu={(e) => e.stopPropagation()}
                className={[
                  "relative bg-transparent text-transparent caret-foreground cursor-default",
                  "flex-1 w-full h-full resize-none",
                  "font-mono text-sm leading-relaxed",
                  "px-4 py-4 pr-20",
                  "border-none outline-none focus:outline-none",
                  "placeholder:text-muted-foreground",
                  "whitespace-pre-wrap break-all",
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
          editorCenter={dropdownCenter}
          highlightedIndex={highlightedIndex}
          onSelect={insertReference}
          onHighlightChange={setHighlightedIndex}
          onSearchTextChange={handleSearchTextChange}
          onClose={handleClose}
        />
      </div>
    </>
  );
}
