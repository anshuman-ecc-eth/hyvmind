// ---------------------------------------------------------------------------
// Markdown insertion helpers for context menu actions
// ---------------------------------------------------------------------------

/**
 * Wrap selected text with prefix/suffix, or insert both at cursor if no
 * selection. Returns the new content string and updated cursor bounds.
 */
export function wrapSelection(
  content: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
): { newContent: string; newStart: number; newEnd: number } {
  const before = content.slice(0, start);
  const selected = content.slice(start, end);
  const after = content.slice(end);
  const newContent = `${before}${prefix}${selected}${suffix}${after}`;
  return {
    newContent,
    newStart: start + prefix.length,
    newEnd: end + prefix.length,
  };
}

/**
 * Insert text at the cursor position with optional surrounding newlines.
 * `before` / `after` are prepended / appended to `insert` when provided.
 */
export function insertAtCursor(
  content: string,
  position: number,
  insert: string,
  before?: string,
  after?: string,
): { newContent: string; newCursor: number } {
  const head = content.slice(0, position);
  const tail = content.slice(position);
  const prefix = before ?? "";
  const suffix = after ?? "";
  const chunk = `${prefix}${insert}${suffix}`;
  return {
    newContent: `${head}${chunk}${tail}`,
    newCursor: position + chunk.length,
  };
}

/** Returns a 3-column × 3-row markdown table template. */
export function generateTable(): string {
  return [
    "| Column 1 | Column 2 | Column 3 |",
    "| -------- | -------- | -------- |",
    "| Cell     | Cell     | Cell     |",
    "| Cell     | Cell     | Cell     |",
  ].join("\n");
}

/**
 * Scan `content` for existing footnote references `[^n]` and return the
 * next available index (max existing + 1, or 1 if none found).
 */
export function findFootnoteIndex(content: string): number {
  const matches = content.match(/\[\^(\d+)\]/g);
  if (!matches) return 1;
  const indices = matches.map((m) => Number.parseInt(m.slice(2, -1), 10));
  return Math.max(...indices) + 1;
}

/** Returns a footnote reference string, e.g. `[^1]`. */
export function generateFootnote(content: string): string {
  const idx = findFootnoteIndex(content);
  return `[^${idx}]`;
}

/**
 * Returns a callout block template for the given type.
 * Example: generateCallout("warning") → "> [!WARNING]\n> Content"
 */
export function generateCallout(type: string): string {
  return `> [!${type.toUpperCase()}]\n> Content`;
}

/** Returns a task list item: `- [ ] ` or `- [x] `. */
export function generateTaskItem(checked: boolean): string {
  return checked ? "- [x] " : "- [ ] ";
}
