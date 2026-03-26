# Hyvmind - QOL Swarm Forking System

## Current State
- joinSwarm() creates a fork but also adds caller to original swarm's swarmMembers (bug)
- No getAllData() or getOwnedData() backend functions exist
- 7 graph helper functions missing
- Frontend uses old hook names: useGetGraphData, useGetAllGraphData
- Backend interface uses old names: getGraphData, getMyOwnedGraphData

## Requested Changes (Diff)

### Add
- 7 graph helper functions in main.mo: createInterpretationTokenNodes, createLawTokenNodes, createLocationNodes, createSwarmNodes, createGraphNodes, createSwarmLinksFromLocationEdges, createCurationLinksFromSwarmLinks
- getAllData() public query function returning all non-archived GraphData
- getOwnedData() query function returning caller-owned OwnedGraphData

### Modify
- joinSwarm(): remove 6 lines that add caller to original swarm's swarmMembers
- backend.ts: rename getGraphData→getAllData, getMyOwnedGraphData→getOwnedData
- backend.d.ts: same renames
- useQueries.ts: rename hooks useGetGraphData→useGetOwnedData, useGetAllGraphData→useGetAllData; update actor calls
- All 14 frontend files that import the old hook names
- VoronoiDiagram.tsx, LandingGraphDiagram.tsx: rename anonymousActor.getGraphData→getAllData

### Remove
- Nothing removed; old stubs replaced

## Implementation Plan
1. Fix joinSwarm bug (done)
2. Add 7 graph helper functions (done)
3. Add getAllData() and getOwnedData() (done)
4. Rename backend.ts and backend.d.ts function signatures (done)
5. Rename hooks in useQueries.ts (done)
6. Update all consuming frontend files (done)
7. Validate and deploy
