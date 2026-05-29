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

- Terrain world vegetation uses **Hyptosis trees_plants_rocks.png** (CC-BY 3.0, single artist = coherent style)
  - Source: https://opengameart.org/content/lots-of-hyptosis-tiles-organized
  - Path: `/assets/lpc/hyptosis/trees_plants_rocks.png`
  - 512x512 px, 16x16 tiles of 32x32 px
  - All vegetation (trees, bushes, flowers, rocks, mushrooms) comes from this single sheet
