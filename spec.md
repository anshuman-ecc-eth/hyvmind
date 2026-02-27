# Specification

## Summary
**Goal:** Make the `getGraphData()` backend function publicly accessible without authentication.

**Planned changes:**
- In `backend/main.mo`, remove the `{ caller }` binding from the `getGraphData()` query function signature, replacing it with `{ }`
- Delete the `AccessControl.hasPermission` check and the `Runtime.trap("Unauthorized: ...")` guard block from `getGraphData()`

**User-visible outcome:** The landing page's graph diagram loads for anonymous (unauthenticated) visitors without triggering an authorization error.
