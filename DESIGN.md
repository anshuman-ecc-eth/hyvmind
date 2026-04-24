# Design Brief

## Direction

NES-inspired Pixel Art Annotation Editor — A retro 8-bit web content annotator with persistent token highlights and three-column hierarchical editor for creating legal knowledge graphs.

## Tone

Brutalist retro-futuristic with pixel-perfect dashed borders and monospace typography; intentional lack of softness creates a tool-like, "no-nonsense" aesthetic focused on precise annotation work.

## Differentiation

Persistent token highlights in semantic colors (crimson for law entities, orchid for interpretation tokens) remain visible after creation—eliminating the need to track highlighted spans across interactions.

## Color Palette

| Token              | OKLCH          | Role                           |
| ------------------ | -------------- | ------------------------------ |
| background         | oklch(0% 0 0)  | Dark canvas for content        |
| card               | oklch(0% 0 0)  | Panel backgrounds              |
| foreground         | oklch(100% 0 0) | Body text, labels              |
| primary            | oklch(100% 0 0) | UI buttons, active states      |
| token-law          | #DC143C        | Crimson law entity highlight   |
| token-interp       | #DA70D6        | Orchid interpretation highlight |
| border             | oklch(20% 0 0) | Dashed pixel borders           |
| muted              | oklch(15% 0 0) | Secondary text, disabled state |

## Typography

- Display: JetBrains Mono — all UI text (pixel-perfect fixed width)
- Body: JetBrains Mono — content, attributes, token names
- Scale: header 12px, panel-title 10px, body 9px, monospace utilities 8px

## Elevation & Depth

Three-column layout with consistent 2px dashed borders creating visual separation; no shadows or gradients—depth via spatial arrangement and color contrast only.

## Structural Zones

| Zone       | Background           | Border                         | Notes                                   |
| ---------- | -------------------- | ------------------------------ | --------------------------------------- |
| Header     | oklch(0% 0 0)        | border-b-2 dashed oklch(20% 0) | Undo/Redo, Save Draft, Convert buttons |
| Sidebar    | oklch(8% 0 0)        | border-r-2 dashed              | URL importer, path selector, token tree |
| Main       | oklch(2% 0 0)        | border-r-2 dashed              | Tokenized text with persistent colors  |
| Details    | oklch(8% 0 0)        | border-l-2 dashed              | Token name, type, refs, attributes     |
| Drafts     | card                 | border-2 dashed                | List in SourcesView                    |

## Spacing & Rhythm

Strict 4px grid: panels 16px padding, section dividers 16px gaps, micro-elements 8px margins; consistent 2px borders throughout create visual rhythm and reinforce pixel-art aesthetic.

## Component Patterns

- Buttons: 2px solid borders, no border-radius, uppercase text, crimson/orchid semantic colors
- Inputs: 2px solid border, pixel font, transparent focus ring
- Badges: crimson (law) / orchid (interp), 2px borders, uppercase
- Token highlights: persistent background + border-bottom, semantic color stops

## Motion

- Entrance: None (snap-load panel state)
- Hover: Border color transition from muted to foreground (50ms)
- Decorative: Terminal blink on token name input focus (optional)

## Constraints

- All text monospace—no variable fonts
- No border-radius (0px throughout)
- No shadows or blur effects
- Token highlights persist after creation (no fade-out)
- Paths typed manually with validation, not auto-suggested

## Signature Detail

Crimson (#DC143C) and orchid (#DA70D6) persistent token highlights create visual semantics at a glance—red = legal foundation, purple = derived interpretation—embedding the hierarchical knowledge structure into the visual language itself.
