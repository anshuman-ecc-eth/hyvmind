# Specification

## Summary
**Goal:** Filter `getGraphData` results by the caller's principal on the backend, so each user only sees nodes they created.

**Planned changes:**
- Update the Motoko backend `getGraphData` query to use `msg.caller` and return only Locations, LawTokens, InterpretationTokens, Curations, and Swarms whose creator field matches the caller's principal; anonymous callers receive empty arrays.
- Update `getGraphData()` calls in `frontend/src/pages/GraphView.tsx` and `frontend/src/pages/TreeView.tsx` to use the new filtered backend query.
- Include the caller's principal in the React Query cache key in both pages so data re-fetches correctly on login/logout.

**User-visible outcome:** When logged in, users see only the nodes they created in both GraphView and TreeView. When not logged in, the views render empty with no errors.
