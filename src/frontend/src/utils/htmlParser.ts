/**
 * Parses HTML content and extracts structured text (with defuddle if available).
 * Falls back to a recursive DOM walker that preserves headings, paragraphs, and lists.
 */
import Defuddle from "defuddle";

export interface ParsedHTML {
  title: string;
  text: string;
  tokens: string[];
  url: string;
}

// ---------------------------------------------------------------------------
// Part A — defuddle extraction with markdown:true
// ---------------------------------------------------------------------------

function extractWithDefuddle(doc: Document): string | null {
  try {
    const result = new Defuddle(doc, { markdown: true }).parse();
    // When markdown:true, content is the markdown string
    const text = result?.content ?? null;
    return text && text.trim().length > 50 ? text : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Part B — Recursive DOM walker fallback
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
    const text = el.textContent?.trim() ?? "";
    return text ? `- ${text}\n` : "";
  }

  // Blockquote
  if (tag === "BLOCKQUOTE") {
    const text = el.textContent?.trim() ?? "";
    return text ? `> ${text}\n\n` : "";
  }

  // Inline elements — return flat text
  if (["SPAN", "A", "EM", "STRONG", "B", "I", "CODE"].includes(tag)) {
    return el.textContent ?? "";
  }

  // Block containers — recurse children
  const childText = Array.from(el.childNodes).map(walkNode).join("");

  if (["DIV", "SECTION", "ARTICLE", "MAIN"].includes(tag)) {
    const trimmed = childText.trim();
    return trimmed ? `${trimmed}\n\n` : "";
  }

  // UL, OL, TABLE, and everything else — just recurse
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
  ]) {
    for (const el of Array.from(clone.querySelectorAll(tag))) {
      el.remove();
    }
  }

  const raw = walkNode(clone.body ?? clone.documentElement);

  // Normalize: collapse 3+ newlines → double newline, trim
  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Part C — tokenizer that preserves newline tokens
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
  const doc = parser.parseFromString(html, "text/html");

  const title = extractTitle(doc);

  // Try defuddle first (markdown output), fall back to structured walker
  let text = extractWithDefuddle(doc);
  if (!text) {
    text = extractStructuredText(doc);
  }

  const tokens = tokenize(text);

  return { title, text, tokens, url };
}
