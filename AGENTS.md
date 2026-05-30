# Project Guidance

## User Preferences

[No preferences yet]

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- Terrain world vegetation uses baobab trees from **bluecarrot16** (OGA-BY 3.0+, single pack = coherent style)
  - Source: OpenTaxa project, hosted on OpenGameArt
  - Path: `/assets/lpc/baobab/lpc-baobab/`
  - 7 species, each 96x128 or 96x160 or 128x128 px

- Hyptosis trees_plants_rocks.png (CC-BY 3.0) was evaluated but not used; baobabs chosen for single-artist coherence.
  - The `trees_bushes/` directory contains extracted frames from Hyptosis (Adobe ImageReady), currently unused.

- Loading/transition overlays use `bg-black` with white Press Start 2P text + 16 blinking █ blocks (`terminal-blink` animation, 0.8s step-end, 0.05s stagger) or a white progress bar animation.

- Credits screen uses 3-tab layout via `@/components/ui/tabs` (Radix UI primitives). Tab triggers styled with white/50 bg, active state #fff3d4/#c89420, pixel-shadow border effect.

- Terrain world audio: whichbrandofmustartshallibuy.ogg (volume 0.1), started via `startBgMusic()` inside `worldBg.onload` callback (after image fully decoded). No autoplay attribute to prevent premature playback at default volume.

- Forest.mp3 in main game has volume 0.35; terrain BGM should be quieter (0.1) to not overpower.

- Boat sprites (rowboat.png): by shadowfinderstudios, Zabin, Daniel Eddeland (CC-BY-SA 4.0).
  - Source: https://opengameart.org/content/lpc-rowboat-topdown-4-directional-recolor-for-rpg

- algo-chip (MIT, abagames) is a procedural audio library used by crisp-game-lib mini-games for chiptune BGM generation. Not credited separately since main game uses forest.mp3.

- PixiJS is used only in boxsnake.html mini-game (WebGL 2D renderer). Not needed for main game or terrain worlds.
