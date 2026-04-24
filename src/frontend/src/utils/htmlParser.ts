/**
 * Parses HTML content and extracts structured text.
 * Preserves headings, paragraphs, citations, and footnotes.
 */

export interface ParsedHTML {
  title: string;
  text: string;
  tokens: string[];
  url: string;
}

// ---------------------------------------------------------------------------
// Part A — Recursive DOM walker
// ---------------------------------------------------------------------------

function headingPrefix(tag: string): string {
  const level = Number.parseInt(tag[1], 10);
  return `${"#".repeat(level)} `;
}

function walkNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  // Headings
  if (/^H[1-6]$/.test(tag)) {
    const text = el.textContent?.trim() ?? "";
    return text ? `${headingPrefix(tag)}${text}\n\n` : "";
  }

  // Paragraph
  if (tag === "P") {
    const text = el.textContent?.trim() ?? "";
    return text ? `${text}\n\n` : "";
  }

  // Line break
  if (tag === "BR") return "\n";

  // List item
  if (tag === "LI") {
    const text = Array.from(el.childNodes).map(walkNode).join("").trim();
    return text ? `- ${text}\n` : "";
  }

  // Blockquote
  if (tag === "BLOCKQUOTE") {
    const text = el.textContent?.trim() ?? "";
    return text ? `> ${text}\n\n` : "";
  }

  // Inline elements — return text with proper spacing
  if (["SPAN", "A", "EM", "STRONG", "B", "I", "CODE"].includes(tag)) {
    const text = el.textContent ?? "";
    return text.trim();
  }

  // Block containers — recurse children
  const childText = Array.from(el.childNodes).map(walkNode).join("");

  if (["DIV", "SECTION", "ARTICLE", "MAIN"].includes(tag)) {
    const children = Array.from(el.childNodes)
      .map(walkNode)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return children.length > 0 ? `${children.join("\n\n")}\n\n` : "";
  }

  // UL, OL, TABLE, and everything else — just recurse
  if (tag === "UL" || tag === "OL") {
    const items = Array.from(el.querySelectorAll(":scope > li"))
      .map((li, i) => {
        const text = Array.from(li.childNodes).map(walkNode).join("").trim();
        const prefix = tag === "OL" ? `${i + 1}.` : "-";
        return text ? `${prefix} ${text}` : "";
      })
      .filter((t) => t.length > 0);
    return items.length > 0 ? `${items.join("\n")}\n\n` : "";
  }

  // TABLE and everything else — just recurse
  return childText;
}

function extractStructuredText(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;

  // Remove non-content elements
  for (const tag of [
    "script",
    "style",
    "nav",
    "footer",
    "aside",
    "header",
    "noscript",
    "iframe",
    "svg",
    "sup",
  ]) {
    for (const el of Array.from(clone.querySelectorAll(tag))) {
      el.remove();
    }
  }

  // Remove footnotes div separately
  for (const el of Array.from(
    clone.querySelectorAll("div#footnotes, [id='footnotes']"),
  )) {
    el.remove();
  }

  const raw = walkNode(clone.body ?? clone.documentElement);

  // Normalize: collapse 3+ newlines → double newline, trim
  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

function extractFootnotes(doc: Document): string {
  const footnotesDiv = doc.querySelector("div#footnotes, [id='footnotes']");
  if (!footnotesDiv) return "";
  const items = Array.from(footnotesDiv.querySelectorAll("li"))
    .map((li, i) => {
      const text = Array.from(li.childNodes)
        .map((node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.classList.contains("footnote-backref")) return "";
            return el.textContent ?? "";
          }
          return "";
        })
        .join("")
        .trim();
      return text ? `[${i + 1}] ${text}` : "";
    })
    .filter((t) => t.length > 0);
  return items.length > 0
    ? `\n\n---\n\nFootnotes:\n\n${items.join("\n\n")}`
    : "";
}

// ---------------------------------------------------------------------------
// Part B — tokenizer that preserves newline tokens
// ---------------------------------------------------------------------------

export function tokenize(text: string): string[] {
  // Split on runs of spaces/tabs but keep newline sequences as tokens.
  // Result: word tokens + "\n" / "\n\n" tokens (pure space separators dropped).
  return text
    .split(/([ \t]+|\n+)/)
    .filter((t) => t.length > 0 && !/^[ \t]+$/.test(t));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function extractTitle(doc: Document): string {
  const titleEl = doc.querySelector("title");
  if (titleEl?.textContent?.trim()) return titleEl.textContent.trim();
  const h1 = doc.querySelector("h1");
  if (h1?.textContent?.trim()) return h1.textContent.trim();
  return "Untitled";
}

export async function parseHTML(
  html: string,
  url: string,
): Promise<ParsedHTML> {
  const parser = new DOMParser();

  // Strip HTML comments before parsing
  const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, "");
  const doc = parser.parseFromString(cleanHtml, "text/html");

  const title = extractTitle(doc);

  // Extract main content
  let text = extractStructuredText(doc);

  const footnotes = extractFootnotes(doc);
  const fullText = text + footnotes;

  return { title, text: fullText, tokens: tokenize(fullText), url };
}
