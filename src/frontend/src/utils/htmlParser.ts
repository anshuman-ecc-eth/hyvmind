/**
 * Parses HTML content and extracts clean text (with defuddle if available).
 */
export interface ParsedHTML {
  title: string;
  text: string;
  tokens: string[];
  url: string;
}

async function extractWithDefuddle(doc: Document): Promise<string | null> {
  try {
    const mod = await import("defuddle");
    // defuddle exports differ by version — try all known shapes
    const Defuddle = mod.default ?? (mod as Record<string, unknown>).Defuddle;
    if (typeof Defuddle === "function") {
      const fn = Defuddle as unknown as (doc: Document) => {
        content?: string;
        textContent?: string;
      };
      const result = fn(doc);
      return result?.content ?? result?.textContent ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function extractTitle(doc: Document): string {
  const titleEl = doc.querySelector("title");
  if (titleEl?.textContent?.trim()) return titleEl.textContent.trim();
  const h1 = doc.querySelector("h1");
  if (h1?.textContent?.trim()) return h1.textContent.trim();
  return "Untitled";
}

function extractBodyText(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;
  for (const tag of ["script", "style", "nav", "footer", "aside", "noscript"]) {
    for (const el of clone.querySelectorAll(tag)) {
      el.remove();
    }
  }
  return (clone.body?.textContent ?? "").trim();
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

export async function parseHTML(
  html: string,
  url: string,
): Promise<ParsedHTML> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = extractTitle(doc);

  let text = await extractWithDefuddle(doc);
  if (!text || text.trim().length < 50) {
    text = extractBodyText(doc);
  }

  text = text.replace(/\s{3,}/g, "\n\n").trim();
  const tokens = tokenize(text);

  return { title, text, tokens, url };
}
