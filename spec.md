# Hyvmind

## Current State
- App is hard-locked to dark mode via `forcedTheme="dark"` on `ThemeProvider` and a `document.documentElement.classList.add("dark")` `useEffect` in `App.tsx`
- `index.css` only defines dark-mode tokens in `:root` and `.dark` (identical); no `.light` class tokens exist
- Header logo: single path to `megrim_transparent...png` (white text, transparent bg — dark mode only)
- Light-mode logo available: `megrim_logo-converted-019d5bd0...webp` (dark text on white/transparent bg)
- `ThemeProvider` from `next-themes` is already installed but unused for actual theme switching
- Settings modal (`ProfileSettingsModal.tsx`) has no theme toggle

## Requested Changes (Diff)

### Add
- Light theme CSS tokens in `index.css` under `.light` class: full inversion of dark palette (white bg → black text, dark bg → white bg, same monospace aesthetic)
- Theme context/hook: `useTheme` from `next-themes` to read/toggle theme, persisted via `localStorage`
- Theme toggle button in nav bar (always visible — sun/moon icon button next to existing controls)
- Theme toggle in Settings modal (`ProfileSettingsModal.tsx`) — a section with label and toggle switch

### Modify
- `App.tsx`: Remove `forcedTheme="dark"` from `ThemeProvider`; remove `document.documentElement.classList.add("dark")` effect; set `defaultTheme="dark"` and `enableSystem={false}`
- `Header.tsx`: Add theme toggle icon button; conditionally render dark or light logo based on current theme
- `ProfileSettingsModal.tsx`: Add Appearance section with theme toggle

### Remove
- Hard-coded `forcedTheme="dark"` from `ThemeProvider` in `App.tsx`
- Hard-coded `classList.add("dark")` useEffect in `App.tsx`

## Implementation Plan
1. Add `.light` CSS variable block in `index.css` — full inversion: `--background: 100% 0 0`, `--foreground: 0% 0 0`, light borders, etc.
2. Modify `App.tsx`: remove forced dark mode, set `defaultTheme="dark"` with `enableSystem={false}` and `storageKey="hyvmind-theme"`
3. Modify `Header.tsx`: import `useTheme` from `next-themes`; add sun/moon toggle button; switch logo src based on `theme === "light"`
4. Modify `ProfileSettingsModal.tsx`: import `useTheme`; add Appearance section with a labeled toggle between dark/light
