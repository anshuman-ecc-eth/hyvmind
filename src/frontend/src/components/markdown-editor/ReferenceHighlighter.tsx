import { forwardRef, useMemo } from "react";

interface ReferenceHighlighterProps {
  content: string;
  cursorPos: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ReferenceHighlighter = forwardRef<
  HTMLPreElement,
  ReferenceHighlighterProps
>(function ReferenceHighlighter({ content, cursorPos }, ref) {
  const processed = useMemo(() => {
    // Escape full content for XSS safety
    const escaped = escapeHtml(content);

    // Check for pending {@ pattern before cursor in raw content
    const textBefore = content.slice(0, cursorPos);
    const hasPending = /\{@([^}]*)$/.test(textBefore);

    let result = escaped;

    if (hasPending) {
      // Wrap the pending {@... trigger (no closing brace yet)
      result = result.replace(
        /\{@([^}]*)/g,
        '<span class="ref-pending">{@$1</span>',
      );
    }

    // Replace complete {name} patterns — skip {@ to avoid double-matching
    result = result.replace(
      /\{([^}@][^}]*)\}/g,
      '<span class="ref-accent">{$1}</span>',
    );

    return result;
  }, [content, cursorPos]);

  return (
    <pre
      ref={ref}
      className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-all font-mono text-sm leading-relaxed px-4 py-4 pr-20 bg-transparent"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: content is pre-escaped via escapeHtml before span injection
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
});

export default ReferenceHighlighter;
