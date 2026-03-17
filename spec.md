# Hyvmind — /debug Terminal Command

## Current State
TerminalPage.tsx has a slash-command terminal with commands: /help, /clear, /find, /ont, /filter, /archive, and create commands (c, s, l, i, t). terminalMessages.ts provides formatted output helpers.

## Requested Changes (Diff)

### Add
- `formatDebugHelpText(isAdmin: boolean): string` in terminalMessages.ts — returns full debug help listing all 22 actions when isAdmin=true, or a short denial message when false
- `formatDebugError(message: string): string` in terminalMessages.ts — returns a formatted error string prefixed with an error emoji
- `handleDebug(action, fields)` async function in TerminalPage.tsx — admin-gated handler that dispatches to actor methods based on action, shows counts/summary then prompts Y/N for full JSON
- `/debug` command routing in handleSubmit
- Pending state handling for: Y/N JSON display prompt (`pendingDebugJson`) and reset confirmation (`debugResetPending`)

### Modify
- `handleHelp()` in TerminalPage.tsx — append debug help section to output when caller is admin
- useQueries import in TerminalPage.tsx — add `useIsCallerAdmin`, `useResetAllData`
- terminalMessages import in TerminalPage.tsx — add `formatDebugHelpText`, `formatDebugError`
- Hook instantiation block — add `const { data: isAdmin } = useIsCallerAdmin()` and `const resetAllData = useResetAllData()`

### Remove
Nothing removed.

## Implementation Plan

### terminalMessages.ts
Append two functions at the end:
1. `formatDebugError(message)` — returns `❌ Debug error: ${message}`
2. `formatDebugHelpText(isAdmin)` — if not admin returns denial string; if admin returns multi-line help listing all 22 actions with syntax and examples

### TerminalPage.tsx
1. Add `useIsCallerAdmin`, `useResetAllData` to useQueries import
2. Add `formatDebugHelpText`, `formatDebugError` to terminalMessages import
3. Add two state vars after `isArchiving` state: `pendingDebugJson: string | null` and `debugResetPending: boolean`
4. Add hook instances after `queryClient`: `const { data: isAdmin } = useIsCallerAdmin()` and `const resetAllData = useResetAllData()`
5. Modify `handleHelp` to conditionally append debug help when `isAdmin` is truthy
6. Add `handleDebug(action, fields)` async function — checks `isAdmin`, checks `actor`, then switches on action calling actor methods directly. For simple boolean/scalar results, adds success message. For array/object results, adds summary count message then calls `setPendingDebugJson` and adds Y/N prompt. For `reset`, sets `debugResetPending` and adds confirmation prompt.
7. In `handleSubmit`, immediately after `addMessage("command", input)` (before parseCommand), add:
   - If `pendingDebugJson !== null`: handle Y/N answer, clear state, return
   - If `debugResetPending`: handle "yes" confirmation (call `resetAllData.mutateAsync()`), clear state, return
8. After the `archive` command handler (line 755), add `debug` command routing: extract `argument` as action, `fields` as params, call `await handleDebug(action, fields)`

### 22 actions → actor method mapping
1. ownedgraph → `actor.getMyOwnedGraphData()`
2. allgraph → `actor.getGraphData()`
3. archived → `actor.getArchivedNodeIds()`
4. profile → `actor.getCallerUserProfile()`
5. role → `actor.getCallerUserRole()`
6. admin → `actor.isCallerAdmin()`
7. approved → `actor.isCallerApproved()`
8. approvals → `actor.listApprovals()`
9. swarmsbycreator → `actor.getSwarmsByCreator()`
10. leaderboard → `actor.getBuzzLeaderboard()`
11. mybuzz → `actor.getMyBuzzBalance()` (divide by 10_000_000 for display)
12. mintsets → `actor.getMintSettings()`
13. swarm (requires swarmId) → `actor.getSwarmMembers(swarmId)`
14. requests (requires swarmId) → `actor.getSwarmMembershipRequests(swarmId)`
15. updates (requires swarmId) → `actor.getSwarmUpdatesForUser(swarmId)`
16. unvoted (requires swarmId) → call `actor.getGraphData()`, filter locations by swarmId, collect their law tokens
17. vote (requires nodeId) → `actor.getVoteData(nodeId)`
18. editions (requires nodeId) → `actor.getCollectibleEditions(nodeId)`
19. userprofile (requires user principal string) → `actor.getUserProfile(user)`
20. userlawtokens → `actor.getMyOwnedGraphData()`, return `.lawTokens`
21. userinterp → `actor.getMyOwnedGraphData()`, return `.interpretationTokens`
22. reset → set `debugResetPending=true`, prompt "Type 'yes' to confirm reset:"

BigInt values should be serialized to strings in JSON.stringify (replacer function). Missing required params should call `formatDebugError` and return early.
