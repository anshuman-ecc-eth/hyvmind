# Hyvmind — GraphView 3D Conversion

## Current State
- `src/frontend/src/pages/GraphView.tsx` (~2627 lines) renders the graph using two HTML5 Canvas elements with a 2D context (main canvas + subgraph overlay canvas)
- Force-directed layout produces `node.x`, `node.y`; `node.level` encodes hierarchy depth (0=curation, increments per level, sublocations/interpretation tokens hardcoded at 4)
- All node interaction (click, hover, pan, zoom) is handled via raw mouse events on the canvas
- The 3D libraries (`three`, `@react-three/fiber`, `@react-three/drei`) are already installed but unused
- All UI panels (search, node details, legend/filters, visualization controls) are absolutely-positioned over the canvas and must be preserved as-is

## Requested Changes (Diff)

### Add
- `src/frontend/src/components/GraphScene3D.tsx` — new R3F component that replaces the two canvas elements
  - `Canvas` with `camera={{ position: [500, 500, 500], fov: 50 }}`
  - `OrbitControls` with `enableDamping`, `dampingFactor={0.05}`, `screenSpacePanning`, `minDistance={100}`, `maxDistance={3000}`
  - `ambientLight intensity={0.5}` + `directionalLight position={[10,10,5]} intensity={1}`
  - `Node3D` sub-component: sphere geometry, `meshStandardMaterial`, `Html` from drei for labels, `onClick`/`onPointerOver` handlers, scale 1.2x on hover
  - `Edge3D` sub-component: drei `Line`, dashed for `isInterpretationTokenEdge` edges
  - Z-axis: `Z_SCALE = 150`; `z = node.level * Z_SCALE + (Math.random() - 0.5) * 20` (computed once per node, stable using useMemo)
  - Accepts props: `nodes`, `links`, `filteredNodes`, `filteredLinks`, `subgraphNodes`, `subgraphLinks`, `nodeSize`, `edgeThickness`, `theme`, `resolvedTheme`, `hoveredNode`, `selectedNode`, `subgraphMode`, `focusedNode`, `onNodeClick`, `onNodeHover`
  - Renders `filteredNodes` (or `subgraphNodes` in subgraph mode) and their corresponding links
  - Node colors via the same `getNodeColor` logic already in GraphView
  - Label display using `@react-three/drei` `Html` component

### Modify
- `src/frontend/src/pages/GraphView.tsx`
  - Remove: `canvasRef`, `subgraphCanvasRef`, `renderCanvas`, `renderSubgraphCanvas`, `canvasToWorld`, `findNodeAtPosition`, `animationFrameRef`, all canvas mouse event handlers (handleMouseDown, handleMouseMove, handleMouseUp, handleWheel), the two canvas JSX elements
  - Replace: the absolute-positioned canvas wrapper divs with a single `<GraphScene3D>` wrapper div (absolute inset-0), passing all required props
  - Keep: all state variables (selectedNode, hoveredNode, subgraphMode, subgraphCenterNode, subgraphDepth, subgraphNodes, subgraphLinks, nodes, links, pan, zoom, nodeTypeFilters, searchQuery, searchResults, nodeSize, edgeThickness, edgeDistance, keyboardFocusedNodeId, fadeOpacity, etc.)
  - Keep: force-directed layout logic (computeForceLayout, computeSubgraphLayout)
  - Keep: all UI panels (Subgraph Selector, Node Details, Legend & Filters, Visualization Controls)
  - Keep: subgraph mode entry/exit logic, BFS build, fade transitions
  - Keep: keyboard navigation useEffect (arrow keys, panToNode)
  - Keep: search logic
  - Node click → `setSubgraphCenterNode` + `setSelectedNode` + `setSubgraphMode(true)` (same as current handleMouseDown for node-found case)
  - Node hover → `setHoveredNode`
  - Pan/zoom: handled by OrbitControls in R3F; remove canvas pan/zoom state from GraphView (or keep as unused)

### Remove
- `renderCanvas` and `renderSubgraphCanvas` useCallback functions
- `canvasToWorld` and `findNodeAtPosition` functions
- `animationFrameRef` ref and its useEffect
- `canvasRef` and `subgraphCanvasRef` refs
- `isPanning`, `panStart` state (pan now handled by OrbitControls)
- All `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`, `onWheel` canvas event handlers
- The two canvas JSX `<canvas>` elements and their wrapper divs
- The `spatialIndexRef` and `subgraphSpatialIndexRef` (no longer needed without 2D culling)

## Implementation Plan
1. Create `GraphScene3D.tsx` with R3F Canvas, OrbitControls, lights, Node3D, Edge3D
2. Export `getNodeColor` from GraphView or duplicate it in GraphScene3D (it maps node type string to hex color, already exists in GraphView)
3. Modify `GraphView.tsx`: remove canvas refs/handlers/render functions, replace canvas JSX with `<GraphScene3D>`, wire `onNodeClick` to existing node-selection + subgraph-entry logic, wire `onNodeHover` to `setHoveredNode`
4. Ensure z-positions are memoized (stable random offset per node, not recalculated on re-render)
5. Verify all UI panels still render correctly over the 3D canvas
