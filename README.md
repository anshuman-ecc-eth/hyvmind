# Hyvmind

Hyvmind is a shared note-taking space for legal researchers. It (1) incentivises collaboration through a dual in-app economy (Buzz and Trust), and (2) turns notes into compounding artifacts (legal knowledge graphs).

## Project Architecture

A knowledge graph application on the Internet Computer (ICP), with a Motoko backend and React/TypeScript frontend. Hyvmind's 'World' is an RPG style exploration game that acts as a gateway/onboarding experience before users access the main app.  

- **Backend** (`src/backend/`) — Motoko canisters on ICP, compiled with `moc`. Handles data persistence, user authentication (Internet Identity), graph storage, chat, and buzz token economy.
- **Frontend** (`src/frontend/`) — React 18 + TypeScript + Vite + Tailwind CSS. The app shell has a sidebar with five tabs (Notes, Graphs, Chat, Public, Settings) plus an admin-only Terminal.

New users first encounter the **Hyvmind World** game. Completing the game reveals the landing graph, and users can authenticate to access the full platform.

## Game World

The game is an NES-inspired pixel-art adventure that blends a top-down 2D RPG world with branching narratives, puzzles and minigames. Public graphs generate unique Perlin Noise Terrains which expand the World.

### Aesthetic

A vanilla JS/HTML game (no framework, no canvas — CSS-positioned sprites over a tilemap):

- **World**: 72×272 tiles (574×2176px), 8px tile size, collision map encoded in a PNG with color-coded terrain (green = walkable, blue = doors, red+blue = triggers)
- **Player**: Cultist character (3×4 animation frames, 32×36px), controlled by arrow keys/WASD or on-screen D-pad
- **NPCs**: Bava LPC wizard with 28-frame spell animation cycle at tile (16,170)
- **Doors**: Tile regions mapped to labels via `doors.json` — Z/X to enter, triggers back to the React app (puzzles, games, leaderboard, credits, about)
- **Triggers**: Proximity-based text popups + a password challenge system (`>>` prefix in `triggers.json`) with pattern-matching rules (e.g., `lai/` → "Correct!")
- **Audio**: `forest.mp3` background loop

### Structure

A React component (`TextGameModal.tsx`) rendered over the unauthenticated landing page:

- **Narrative**: Branching story about LAI (Legal AI) with player choices across multiple phases
- **Minigames**: Chess, Wordle, Up 1 Way, Thunder, Box Snake, Pillars 3D (via crisp-game-lib)
- **Score tracking**: Puzzle scores auto-accumulate; correct password answers trigger backend canister calls to generate on-chain buzz secrets viewable from the in-game Z popup

### Assets

| Asset | Author | License | Required credit |
|---|---|---|---|
| `forest.mp3` — background music | syncopika ([Bandcamp](https://greenbearmusic.bandcamp.com/album/bgm-fun-vol-5)) | [CC-BY 3.0](http://creativecommons.org/licenses/by/3.0/) | "syncopika" |
| `bottom.png` — world tiles | Ivan Voirol ([OpenGameArt](https://opengameart.org/content/tinyslates-16x16px-orthogonal-tileset-by-ivan-voirol)) | [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) | "Ivan Voirol" |
| `sprites/cultist_*.png` — player character | Antifarea | CC-BY | "Antifarea" |
| `crisp-game-lib` — mini-game framework ([Up 1 Way](src/frontend/public/assets/games/up1way.html), [Thunder](src/frontend/public/assets/games/thunder.html), [Box Snake](src/frontend/public/assets/games/boxsnake.html), [Pillars 3D](src/frontend/public/assets/games/pillars3d.html)) | [abagames](https://github.com/abagames/crisp-game-lib) | MIT | "abagames / crisp-game-lib" |

## Collaborative Annotations

Users can annotate web content to build structured legal knowledge graphs:

- **URL Importer** — Paste any URL to load and tokenize page content
- **Token Highlighting** — Select text spans and tag them as Law Entities (crimson #DC143C) or Interpretation Entities (orchid #DA70D6)
- **Persistent Highlights** — Annotations remain visible across sessions, eliminating the need to track highlighted spans
- **Attribute Editor** — Add structured metadata to tokens (names, types, cross-references)
- **Token Tree & Path Selector** — Navigate the annotation hierarchy via sidebar tree or typed path
- **Undo/Redo** — Full history for annotation operations
- **Export** — Published graphs include annotation data in the ontology

The annotation system integrates with the hierarchical node type chain: **Curation > Swarm > Location > Law Entity > Interp Entity > File**.

## App Pages

| Tab | Component | What you can do |
|---|---|---|
| **Notes** | `EditorView` | Full markdown editor with file tree sidebar, frontmatter editor, right-click context menu for node management (rename, delete, attributes, sources), ZIP download of curations |
| **Graphs** | `SourcesView` | Manage source graphs in list or diagram view; filter by node type and text; import/export graphs as ZIP; preview and publish as RDF/Turtle ontology |
| **Chat** | `SwarmsView` | Channel-based messaging organized by curation groups; unread badges; Telegram bridge integration |
| **Public** | `PublicGraphView` | Browse published knowledge graphs from all users; view interactive diagrams; save copies; open Turtle ontology; filter by node type |
| **Settings** | `SettingsView` | Edit profile (name, bio, avatar, social links); customize theme (25 tweakcn themes, font pairings, font size); manage Buzz balance and Trust transactions; create Buzz tokens |
| **Terminal** | `TerminalPage` | Admin-only CLI for backend queries: name resolution, ontology visualization (Turtle/Mermaid), archive commands, fuzzy finding, Telegram configuration |

## Build System

| Step | Command | Directory |
|---|---|---|
| Install frontend | `pnpm install --prefer-offline` | `src/frontend/` |
| Typecheck frontend | `pnpm typecheck` | `src/frontend/` |
| Lint/fix frontend | `pnpm fix` | `src/frontend/` |
| Build frontend | `pnpm build` | `src/frontend/` |
| Install backend | `mops install` | `src/backend/` |
| Typecheck backend | `mops check --fix` | `src/backend/` |
| Build backend | `mops build` | `src/backend/` |
| Generate bindings | `pnpm bindgen` | root |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, next-themes, recharts
- **Backend**: Motoko (ICP), mops package manager, caffeineai-authorization, caffeineai-user-approval
- **Game**: Vanilla JS (pixel world), crisp-game-lib (minigames)
- **Authentication**: Internet Identity (ICP)
- **Charts & Diagrams**: D3.js, ForceGraph3D, Mermaid, Voronoi, Recharts

## License

GNU General Public License v3.0 — see [LICENSE](./LICENSE).
