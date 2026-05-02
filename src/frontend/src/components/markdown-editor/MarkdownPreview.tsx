// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownPreviewProps {
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip YAML frontmatter block from the top of a markdown string. */
function stripFrontmatter(raw: string): string {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) return raw;
  const afterOpening = trimmed.slice(3);
  const closingIdx = afterOpening.indexOf("\n---");
  if (closingIdx === -1) return raw;
  return afterOpening.slice(closingIdx + 4);
}

/**
 * Minimal markdown → HTML converter.
 * Handles: h1-h6, **bold**, *italic*, `code`, ---, blank-line paragraphs.
 * Does NOT use a full markdown library to keep the bundle small.
 */
function parseMarkdown(md: string): string {
  const lines = md.split("\n");
  const htmlLines: string[] = [];
  let inParagraph = false;

  const flushParagraph = () => {
    if (inParagraph) {
      htmlLines.push("</p>");
      inParagraph = false;
    }
  };

  const inlineFormat = (line: string): string => {
    // Escape HTML entities first
    let out = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // **bold**
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // *italic*  (avoid matching **)
    out = out.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    // `code`
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  };

  for (const rawLine of lines) {
    const line = rawLine;

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      htmlLines.push("<hr />");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      htmlLines.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // Blank line → close paragraph
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    // Regular text — accumulate into <p>
    const formatted = inlineFormat(line);
    if (!inParagraph) {
      htmlLines.push(`<p>${formatted}`);
      inParagraph = true;
    } else {
      // Append with a line break inside the paragraph
      htmlLines[htmlLines.length - 1] += `<br />${formatted}`;
    }
  }

  flushParagraph();
  return htmlLines.join("\n");
}

// ---------------------------------------------------------------------------
// MarkdownPreview
// ---------------------------------------------------------------------------

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const body = stripFrontmatter(content);
  const html = parseMarkdown(body);

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-5 bg-background"
      data-ocid="markdown_preview.panel"
    >
      <div
        aria-label="Markdown preview"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown parser
        dangerouslySetInnerHTML={{ __html: html }}
        className={[
          "prose max-w-none",
          "text-foreground",
          // Heading styles via Tailwind prose-like utility overrides
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-foreground",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-foreground",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-foreground",
          "[&_h4]:text-base [&_h4]:font-medium [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-foreground",
          "[&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:text-foreground",
          "[&_h6]:text-sm [&_h6]:text-muted-foreground [&_h6]:mb-1 [&_h6]:mt-2",
          "[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-foreground",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          "[&_em]:italic [&_em]:text-foreground",
          "[&_code]:font-mono [&_code]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-sm [&_code]:text-foreground",
          "[&_hr]:border-border [&_hr]:my-4",
        ].join(" ")}
      />
    </div>
  );
}
