# Blog posts

The blog is fully static — no backend. Posts live in this folder
(`src/frontend/public/blogs/`), served by Vite in dev and copied
verbatim to `dist/` on build. The reader is `src/frontend/src/pages/BlogsView.tsx`,
opened from the hamburger menu → Blog. It fetches `blog.json` for the list, then
fetches each post's HTML, extracts the `<body>`, strips any `<style>` block, and
injects it via `dangerouslySetInnerHTML` (first-party HTML — a biome-ignore
comment covers the lint rule). Styling comes entirely from the reader's Tailwind
arbitrary-variant classes, so the HTML file only needs clean semantic markup.

## Adding a post

1. Take the platform export (e.g. Paragraph) and normalize it to clean standalone
   HTML5 with pandoc so nav/scripts collapse into semantic markup:
   `pandoc input.html -f html -t html5 --standalone -o "<Title>.html"`
2. Save it to this folder as `<Title>.html`. The filename must match the `file`
   field in `blog.json` exactly — spaces are fine.
3. Optional banner PNG in this folder (keyed by the `banner` field; renders
   full-column-width below the header).
4. Register the post in `blog.json`:
   - `id` — url-safe slug
   - `title` — display title
   - `author`
   - `published` / `lastEdited` — display strings, format `17 Aug, 26`
   - `file` — on-disk HTML filename (exact match)
   - `banner` — optional PNG filename
5. Verify heading text is authored in sentence case (e.g. `Word Objects`, not
   `Word objects`). The reader shows headings exactly as written — there is no
   uppercase transform.

## Aesthetic conventions (match the current published article)

- Reading column: `max-w-3xl` centered, `px-6 py-8`. List view: `max-w-4xl px-6`.
- Banner (if present): spans the full reading-column width — `w-full rounded`, `mb-6`,
  shown above the meta row.
- Meta row: right-aligned, two lines — `published {date}` / `last edited {date}` —
  `font-mono text-xs` muted-foreground, dashed bottom border.
- Headings h1–h6: **centered**, sentence case as authored, `mb-7 mt-7`.
  Sizes/weights: h1 `2xl bold`, h2 `xl semibold`, h3 `lg semibold`, h4 `base medium`,
  h5 `sm medium`, h6 `sm muted-foreground`.
- Paragraphs: `mb-3`, relaxed leading, foreground.
- Inline: `strong` bold, `em` italic; links `primary underline underline-offset-2`
  (hover 80% opacity); `del` strikethrough muted; `code` mono `sm` on `bg-muted`
  (preformatted blocks: `bg-muted p-3 rounded overflow-x-auto`, inner code
  transparent).
- Lists: `ul` disc / `ol` decimal, `pl-5 mb-3`; items `mb-1`.
- Blockquotes: left `border-l-4`, `bg-muted/50`, `px-4 py-3`, `my-4`, `rounded-r`,
  **muted, not italic, no decorative quote marks** — pandoc's bare
  `<blockquote><p>…</p></blockquote>` (current article uses unattributed
  standalone quotes).
- Tables: full-width bordered; `th` `bg-muted` left semibold, `td` bordered,
  `px-3 py-1.5`.
- Figures/images: `max-w-full rounded` (full column width); `src` may be a remote
  URL or a local relative path in this folder.
- Header: `AppPageHeader` shows title + `/ author` subtitle, a `‹ Blog` back
  button, X to close; Esc returns to the list, then closes the view.

## Pitfalls

- Dev needs no rebuild — Vite serves `public/` directly; prod build just copies it
  (this README ships too, harmlessly).
- A missing/mismatched `file` renders "Couldn't load this post."
- `lastEdited !== published` controls the "edited …" suffix shown in the list.