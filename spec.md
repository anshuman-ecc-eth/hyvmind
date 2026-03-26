# Hyvmind — QoL Swarm Forking System

## Current State
- `Swarm` type has no `forkSource` or `forkPrincipal` fields
- `joinSwarm()` adds caller to `swarmMembers` and returns `async ()`
- No fork concept, no "My Forks" curation, no `pullFromSwarm`, no `getSwarmForks`
- `isSwarmCreatorOrMember()` grants write access to creator + QoL members
- `getMyOwnedGraphData()` returns nodes where `creator == caller`

## Requested Changes (Diff)

### Add
- `forkSource : ?NodeId` and `forkPrincipal : ?Principal` fields to `Swarm` type
- `ensureMyForksCuration(caller)` — finds or creates "My Forks" curation for caller, returns its NodeId
- `deepCopySwarmContent(sourceSwarmId, targetSwarmId, caller)` — copies all locations, law tokens (via `{...}` extraction), sublocations, and interpretation tokens; each copy gets a fresh ID via `generateId()`; forker becomes creator; votes/collectibles not copied
- `pullFromSwarm(targetSwarmId)` — checks membership, archives existing fork of target swarm, creates fresh fork
- `getSwarmForks(swarmId)` — query returning all swarms where `forkSource == swarmId`

### Modify
- `joinSwarm()` — keep existing `swarmMembers` add logic, ALSO call `ensureMyForksCuration`, create fork swarm record with `forkSource` and `forkPrincipal` set, call `deepCopySwarmContent`, return `async NodeId` (the fork's ID)
- `isSwarmCreatorOrMember()` — for forks (`forkSource != null`), only grant access if `swarm.creator == caller`; original swarms unchanged

### Remove
- Nothing removed

## Implementation Plan
1. Add `forkSource : ?NodeId` and `forkPrincipal : ?Principal` to `Swarm` type
2. Implement `ensureMyForksCuration(caller : Principal) : NodeId`
3. Implement `deepCopySwarmContent(sourceSwarmId : NodeId, targetSwarmId : NodeId, caller : Principal)` — processes in hierarchy order: locations → law tokens (from `{...}` patterns in location/sublocation content) → sublocations → interpretation tokens; maps old location IDs to new ones in a local buffer to wire parent references for law tokens and interpretation tokens
4. Modify `joinSwarm()` to return `async NodeId`, add fork creation after existing membership logic
5. Modify `isSwarmCreatorOrMember()` to check `forkSource` and restrict fork write access to fork creator only
6. Add `pullFromSwarm(targetSwarmId : NodeId) : async NodeId`
7. Add `getSwarmForks(swarmId : NodeId) : async [Swarm]` query
