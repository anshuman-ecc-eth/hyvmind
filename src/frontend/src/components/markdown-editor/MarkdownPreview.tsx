import remarkObsidianBrowser from "@/utils/remarkObsidianBrowser";
import { useEffect, useState } from "react";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownPreviewProps {
  content: string;
}

// ---------------------------------------------------------------------------
// Async markdown parser using unified/remark pipeline
// ---------------------------------------------------------------------------

async function parseMarkdown(md: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm as any)
    .use(remarkObsidianBrowser as any)
    .use(remarkRehype as any)
    .use(rehypeStringify as any);
  const result = await processor.process(md);
  return String(result);
}

// ---------------------------------------------------------------------------
// MarkdownPreview
// ---------------------------------------------------------------------------

/**
 * Renders markdown content with full Obsidian feature support:
 * wikilinks, callouts, ==highlights==, #tags, embeds, and GFM tables/strikethrough.
 *
 * The `content` prop is expected to already have frontmatter stripped —
 * stripping is handled upstream (in EditorView) when opening files.
 */
export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    parseMarkdown(content).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-5 bg-background"
      data-ocid="markdown_preview.panel"
    >
      <div
        aria-label="Markdown preview"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled remark pipeline
        dangerouslySetInnerHTML={{ __html: html }}
        className={[
          "prose max-w-none",
          "text-foreground",
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
          "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-3",
          "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
          "[&_hr]:border-border [&_hr]:my-4",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
          "[&_li]:mb-1 [&_li]:text-foreground",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-3",
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:opacity-80",
          "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
          "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted [&_th]:text-left [&_th]:font-semibold",
          "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5",
          "[&_del]:line-through [&_del]:text-muted-foreground",
          "[&_img]:max-w-full [&_img]:rounded",
        ].join(" ")}
      />
    </div>
  );
}
