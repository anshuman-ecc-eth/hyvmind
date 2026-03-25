# Hyvmind

## Current State

The app has a full terminal page (`TerminalPage.tsx`) with slash-command execution, mutation hooks, and graph data access. Navigation between views is handled via `handleViewChange` in `App.tsx`. The `cmdk` library is already installed and used via `src/frontend/src/components/ui/command.tsx`.

## Requested Changes (Diff)

### Add
- `src/frontend/src/components/CommandPalette.tsx` — modal component using `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem` from `ui/command.tsx`. Two groups: Navigation and Terminal Commands. Accepts `open`, `onOpenChange`, `onViewChange`, `onExecuteCommand` props.
- Keyboard shortcut listener in `App.tsx` — Ctrl+P / Cmd+P toggles `commandPaletteOpen` state, calls `event.preventDefault()`.
- `handleExecuteCommand` in `App.tsx` — receives a raw command string (e.g. `/help`, `/find term`), executes it by routing through the terminal command handlers, shows a toast with the result. This requires adding the mutation hooks and graph data at the App.tsx level.

### Modify
- `App.tsx` — add `commandPaletteOpen` state, keyboard listener effect, `handleExecuteCommand` handler, and render `<CommandPalette>` in the tree (only when authenticated).

### Remove
- Nothing.

## Implementation Plan

1. Create `CommandPalette.tsx`:
   - Import `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` from `@/components/ui/command`
   - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onViewChange: (view: ViewType) => void`, `onExecuteCommand: (command: string) => void`
   - Navigation commands array: `{ id, label, view }` for graph, tree, terminal, swarms, collectibles, buzz
   - Terminal commands array: `{ id, label, description, command }` for /help, /find, /ont, /filter, /c, /s, /l, /i, /archive
   - On nav item select: call `onViewChange(item.view)` then `onOpenChange(false)`
   - On terminal item select: call `onExecuteCommand(item.command)` then `onOpenChange(false)`
   - Style: `font-mono`, dashed borders matching the app's dark terminal aesthetic

2. Update `App.tsx`:
   - Add `commandPaletteOpen` state
   - Add `useEffect` for Ctrl+P / Cmd+P with `preventDefault`
   - Add `handleExecuteCommand(command: string)` — parses the command string and shows a toast with the result. For simple read commands (help, find, filter, ont) it can navigate to terminal and pass the command as a pre-populated query. For write commands (c, s, l, i), executing silently requires the same mutation hooks used in TerminalPage — add `useCreateCuration`, `useCreateSwarm`, `useCreateLocation`, `useCreateInterpretationToken` at App.tsx level and call `executeCommand` from `terminalCommands.ts`. Show success/error via `toast()` from sonner.
   - Render `<CommandPalette>` inside the authenticated section
   - Import ViewType and expose it to CommandPalette

3. The `ViewType` type is defined locally in `App.tsx` — CommandPalette.tsx should accept `view` as a string or define the same subset locally.
