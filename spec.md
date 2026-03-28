# Hyvmind

## Current State
The main 3D graph visualization uses `GraphScene3D.tsx` (344 lines) built with `@react-three/fiber`, isometric camera, `OrbitControls`, and manual node/edge rendering. `GraphView.tsx` manages all state: nodes, links, filtering, search, subgraph mode, keyboard navigation, and UI panels.

Dependencies currently installed: `@react-three/fiber`, `@react-three/drei`, `three`. Missing: `react-force-graph-3d`, `three-spritetext`.

## Requested Changes (Diff)

### Add
- `react-force-graph-3d` and `three-spritetext` to `package.json` dependencies
- `src/frontend/src/components/ForceGraph3D.tsx` — new component wrapping `react-force-graph-3d` with:
  - SpriteText labels (via `nodeThreeObject` + `nodeThreeObjectExtend`)
  - Hover highlighting: hovered/selected node turns `#FFD700`, unconnected nodes/links dim
  - Click-to-focus: `centerAt()` + `zoom()` on node click
  - Fit-to-canvas: `zoomToFit()` triggered on subgraph mode transitions
  - Existing color scheme: curation `#FF7043`, swarm `#42A5F5`, location `#66BB6A`, lawToken `#BA68C8`, interpretationToken `#FFB74D`, sublocation `#4DB6AC`
  - Link labels for interpretation token edges
  - Dark background `#0a0a0a`, `showNavInfo={false}`

### Modify
- `src/frontend/src/pages/GraphView.tsx` — replace `GraphScene3D` import/usage with `ForceGraph3D`; pass `graphRef`; use `subgraphMode ? subgraphData : mainGraphData` for conditional graph data

### Remove
- `src/frontend/src/components/GraphScene3D.tsx` (replaced entirely by `ForceGraph3D.tsx`)

## Implementation Plan
1. Add `react-force-graph-3d` and `three-spritetext` to `src/frontend/package.json`
2. Create `ForceGraph3D.tsx` with all features described above
3. Update `GraphView.tsx` to use `ForceGraph3D` instead of `GraphScene3D`
4. Remove `GraphScene3D.tsx`
