/**
 * Browser-safe remark plugin for Obsidian markdown syntax.
 * Handles: [[wikilinks]], ==highlights==, #tags, and > [!callout] callouts.
 * No Node.js APIs — fully browser-compatible.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Process inline Obsidian syntax in a text string.
 * Returns an array of text/html AST nodes.
 */
function processInlineText(value: string): any[] {
  const nodes: any[] = [];
  const pattern =
    /(\[\[([^\]]+)\]\])|(==([^=]+)==)|(#([a-zA-Z0-9_/-]+)(?=\s|$|[^a-zA-Z0-9_/-]))|(\{([^}]+)\})/g;
  let last = 0;
  let match: RegExpExecArray | null;

  match = pattern.exec(value);
  while (match !== null) {
    if (match.index > last) {
      nodes.push({ type: "text", value: value.slice(last, match.index) });
    }

    if (match[1]) {
      // [[wikilink]] or [[wikilink|alias]]
      const raw = match[2];
      const pipeIdx = raw.indexOf("|");
      const target = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
      const label = pipeIdx >= 0 ? raw.slice(pipeIdx + 1) : raw;
      nodes.push({
        type: "html",
        value: `<a class="wikilink" href="#${encodeURIComponent(target)}">${escapeHtml(label)}</a>`,
      });
    } else if (match[3]) {
      // ==highlight==
      nodes.push({
        type: "html",
        value: `<mark>${escapeHtml(match[4])}</mark>`,
      });
    } else if (match[5]) {
      // #tag
      const tag = match[6];
      nodes.push({
        type: "html",
        value: `<a class="tag" href="#tag-${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`,
      });
    } else if (match[7]) {
      // {name} cross-reference
      const name = match[8];
      nodes.push({
        type: "html",
        value: `<a class="ref-link" href="#${encodeURIComponent(name)}">${escapeHtml(name)}</a>`,
      });
    }

    last = match.index + match[0].length;
    match = pattern.exec(value);
  }

  if (last < value.length) {
    nodes.push({ type: "text", value: value.slice(last) });
  }

  return nodes;
}

const CALLOUT_RE = /^\[!(\w+)\][-+]?\s*(.*)?$/;

/**
 * Walk the AST recursively and apply a visitor function.
 * Avoids the need to import unist-util-visit as a named module.
 */
function walk(
  node: any,
  parent: any,
  index: number,
  visitor: (node: any, parent: any, index: number) => void,
): void {
  visitor(node, parent, index);
  if (Array.isArray(node.children)) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      walk(node.children[i], node, i, visitor);
    }
  }
}

/**
 * Browser-safe remark plugin that implements core Obsidian markdown features.
 */
export default function remarkObsidianBrowser() {
  return (tree: any) => {
    // Phase 1: Transform callout blockquotes
    walk(tree, null, 0, (node: any, parent: any, index: number) => {
      if (node.type !== "blockquote" || !parent) return;
      const first = node.children?.[0];
      if (!first || first.type !== "paragraph") return;
      const firstText = first.children?.[0];
      if (!firstText || firstText.type !== "text") return;

      const lines = firstText.value.split("\n");
      const calloutMatch = lines[0].trim().match(CALLOUT_RE);
      if (!calloutMatch) return;

      const calloutType = calloutMatch[1].toLowerCase();
      const calloutTitle = calloutMatch[2]?.trim() || calloutType;

      // Remaining lines in first paragraph (after [!type] line)
      const restFirst = lines.slice(1).join("\n").trim();

      // Collect body paragraphs
      const bodyParts: string[] = [];
      if (restFirst) bodyParts.push(`<p>${escapeHtml(restFirst)}</p>`);
      for (const child of node.children.slice(1)) {
        if (child.type === "paragraph") {
          const text = (child.children ?? [])
            .map((c: any) => {
              if (c.type === "text") return escapeHtml(c.value);
              if (c.type === "html") return c.value;
              return "";
            })
            .join("");
          if (text) bodyParts.push(`<p>${text}</p>`);
        }
      }

      const html = `<div class="callout ${calloutType}"><div class="callout-title"><em class="callout-icon"></em>${escapeHtml(calloutTitle)}</div>${bodyParts.join("")}</div>`;

      parent.children.splice(index, 1, { type: "html", value: html });
    });

    // Phase 2: Transform inline text nodes (wikilinks, highlights, tags)
    walk(tree, null, 0, (node: any, parent: any, index: number) => {
      if (node.type !== "text" || !parent || !Array.isArray(parent.children))
        return;
      const processed = processInlineText(node.value);
      if (processed.length === 1 && processed[0].type === "text") return;
      parent.children.splice(index, 1, ...processed);
    });
  };
}
