# Hyvmind — Sublocation Feature (Backend Build A)

## Current State
The backend has: Curation, Swarm, Location, LawToken, InterpretationToken node types. No Sublocation type exists. `GraphData` and `OwnedGraphData` have no `sublocations` field. `getNodeSwarmId` handles 4 node types. `resetAllData` clears 10+ maps but has no sublocation maps. `createLawTokensForLocation` creates LawTokens from `{curly bracket}` content.

## Requested Changes (Diff)

### Add
- `Sublocation` type: `id, title, content, originalTokenSequence, creator, timestamps` (no parentSwarmId, no parentLawTokenId)
- `sublocationMap: Map<NodeId, Sublocation>` storage
- `sublocationLawTokenRelations: Map<NodeId, List<NodeId>>` storage (bidirectional: sublocation→lawTokenIds and lawToken→sublocationIds)
- `createSublocation(title, content, originalTokenSequence, parentLawTokenIds: [NodeId])` public function
- `createLawTokensForSublocation(sublocation, creator)` private function — same splitByCurlyBrackets pattern as createLawTokensForLocation
- `sublocations` field to `GraphData` and `OwnedGraphData` types
- Sublocation case in `getNodeSwarmId`: traverse attached LawToken → parentLocationId → Location → parentSwarmId
- Sublocation cleanup in `resetAllData`
- Sublocation filter + return in `getGraphData`
- Sublocation filter + return in `getMyOwnedGraphData`

### Modify
- `GraphData` type — add `sublocations: [Sublocation]`
- `OwnedGraphData` type — add `sublocations: [Sublocation]`
- `getNodeSwarmId` — add Sublocation case
- `resetAllData` — clear sublocationMap and sublocationLawTokenRelations
- `getGraphData` — filter archived sublocations, include in return
- `getMyOwnedGraphData` — filter owned sublocations, include in return

### Remove
- Nothing removed

## Implementation Plan
1. Add `Sublocation` type after LawToken type (after line 66)
2. Add sublocationMap and sublocationLawTokenRelations after archivedNodes map (after line 175)
3. Add `sublocations` field to GraphData (after line 245) and OwnedGraphData (after line 255)
4. Add `createSublocation` and `createLawTokensForSublocation` functions after `createLawTokensForLocation` (after line 1298)
5. Add Sublocation case to `getNodeSwarmId` (after LawToken case, line ~801)
6. Add sublocation cleanup to `resetAllData` (after line 1144)
7. Add sublocation filtering and return to `getGraphData` and `getMyOwnedGraphData`
