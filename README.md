# hyvmind.app

A shared note-taking space for legal researchers. Notes are organised as a five-level hierarchy and published as immutable legal knowledge graphs; the first thing a new user meets is a game.

Hyvmind is one project split across two origins. **xyz** ([`hyvmind.xyz`](https://www.hyvmind.xyz), [repo](https://github.com/anshuman-ecc-eth/hm-xyz)) is the social layer: posts, replies, citations. **app** is the knowledge layer: the editor, the graphs, the public read API. This README covers the knowledge layer and the seam that lets the social layer cite it. xyz's README covers its side of the same seam.

## Contents

- [Stack](#stack)
  - [Live deployments](#live-deployments)
- [Build & check](#build--check)
- [The knowledge model](#the-knowledge-model)
- [The app](#the-app)
- [The world](#the-world)
- [Public API & MCP](#public-api--mcp)
- [Roadmap: make the knowledge layer citable from xyz](#roadmap-make-the-knowledge-layer-citable-from-xyz)
  - [Goal](#goal)
  - [Constraints (verified, not assumed)](#constraints-verified-not-assumed)
  - [Decisions](#decisions)
  - [Phases](#phases)
  - [Not doing (and why)](#not-doing-and-why)
  - [Open items](#open-items)
  - [Reference — read shapes](#reference--read-shapes)
- [Economy](#economy)
- [License](#license)

---

## Stack

- **Backend** — a single Motoko persistent actor (`main.mo`, ~7.6k lines) on `mo:core`, compiled with `mops`. `Migration.mo` is an unused leftover from an earlier migration attempt; persistence comes from `--default-persistent-actors`; `EvmRecovery.mo` verifies MetaMask `personal_sign` on-canister over a vendored secp256k1.

- **Frontend** — React 19, TypeScript, Vite 5, Tailwind 3, Radix/shadcn, TanStack Query. Diagrams use force-graph; the world is vanilla Three.js served from `public/assets/voxel/`.

- **Auth** — Internet Identity via `@caffeineai/core-infrastructure`. The blog reader deliberately uses an anonymous agent: the password is the credential.

- **Data surface** — the same canister serves a public JSON API over `http_request` and an MCP JSON-RPC endpoint. No separate gateway, no proxy.

- **Deploy** — Caffeine cloud pipeline (`caffeine.toml`); `icp.yaml` + `deploy.sh` for a local `icp-cli` network.

```
src/backend/     main.mo, Migration.mo, EvmRecovery.mo, vendor/, dist/ (.wasm + .did)
src/frontend/    React app, public/assets/{games,hyvmind,lua,voxel}, env.json, dist/
scripts/         blog-admin.mjs, xyz-digest-check.mjs, fetch-juicebox-deployments.mjs
mops.toml        backend canister + toolchain pins
caffeine.toml    workspace manifest
icp.yaml         canisters for the local icp-cli network
AGENTS.md        repo conventions and hard-won pitfalls
DESIGN.md        visual brief for the annotation editor
```

### Live deployments

|  | app | xyz |
| --- | --- | --- |
| Origin | `https://hyvmind.app` | `https://www.hyvmind.xyz` |
| Frontend canister | `4g6ye-oqaaa-aaaam-qfamq-cai` | `2qsaq-7qaaa-aaaan-q6y3q-cai` |
| Backend canister | `4p5ty-yyaaa-aaaam-qfana-cai` | `2xtge-siaaa-aaaan-q6y3a-cai` |
| II derivation origin | `https://hyvmind---hierarchical-knowledge-graph-application-a15.caffeine.xyz` | `https://hmxyz-i85.caffeine.xyz` |

The two origins are deliberate and they do not share principals — see [Constraints](#constraints-verified-not-assumed).

## Build & check

```
cd src/backend && mops check --fix      # typecheck
cd src/backend && mops build            # -> src/backend/dist/backend.{wasm,did}
pnpm bindgen                            # -> src/frontend/src/backend.{ts,d.ts}

cd src/frontend && pnpm typecheck
cd src/frontend && pnpm fix             # biome
cd src/frontend && pnpm build
```

Bindings are generated from `src/backend/dist/backend.did` — **any backend signature change requires `mops build` + `pnpm bindgen`**, or the frontend silently disagrees with the canister.

The xyz write channel's plan digest is the idempotency and `#stale` contract with xyz, so it is checked across deploys: `node scripts/xyz-digest-check.mjs capture` before the deploy, `compare` after, then `cleanup` (which removes the temporary backend allowlist entry it creates).

`pnpm dev` does not exist at the root; run `npx vite` from `src/frontend/`. `./deploy.sh` starts a local `icp` network, creates both canisters and deploys them. On localhost, `?dev` renders the post-login shell without Internet Identity (queries stay disabled).

---

## The knowledge model

Five node types, each a level of the hierarchy:

```
curation → swarm → location → lawEntity → interpEntity
```

A node `id` is the `@`-joined name path (`Constitutional Law@Article 21@Right to Life`). Paths are convenient, not unique — live data already contains both `SARFAESI ACT, 2002` and `SARFAESI Act, 2002`. Edges carry weighted labels (highest weight wins on display), attributes are weighted values, and interpretation nodes accumulate graffiti with its own weights.

Publishing writes a `published-<nanos>-<creatorHash>` id and maps the curation to it. Published graphs are **live views** of the canonical store, not copies: every publish, extension, or artwork update bumps a `revision`, and caches key on `(id, revision)`, never on `publishedAt`. Saving someone's published graph copies nodes into your own editor tree, charges Buzz, and credits Trust to the contributors whose nodes were saved. Drafts never leave the editor blob; only published graphs have a read path.

## The app

| Tab | Component | What you can do |
| --- | --- | --- |
| **Notes** | `EditorView` | Hierarchical markdown editor: file tree, frontmatter, token annotation (law = crimson, interp = orchid), sources, attributes, ZIP export |
| **Graphs** | `SourcesView` | Manage source graphs as lists or diagrams, import/export ZIP, preview the RDF/Turtle ontology, publish |
| **Public** | `PublicGraphView` | Browse every published graph, force-graph diagrams, node search, save a copy |
| **Forum** | `ForumView` | Posts, replies, votes |
| **Settings** | `SettingsView` | Profile, affiliation and social links, themes and font pairings, Buzz/Trust balances, plugin binding, EVM wallet link, hyvmind.xyz principal link |
| **Terminal** | `TerminalPage` | Admin-only: name resolution, ontology dumps, archive commands, blog password, Telegram config |

The header adds surfaces that live outside the tabs: **Tutorial**, **Whitepaper**, **Videos**, **Code**, and **Blog** — posts are stored on-chain and gated by a password whose digest is checked inside a shared method, so there is no public query to bypass. The Funding view (Juicebox) is implemented but not yet in the sidebar navigation. The wallet redeem flow is reachable at `?settings=wallet&redeem=1`.

## The world

Unauthenticated visitors land in a pixel-art game, not a login form: a 72×272-tile overworld (8px tiles), a branching story, and a menu of puzzles and arcade games — chess (Lichess puzzle database), Wordle, Flipo, Thunder, Box Snake, Charge Beam, Up 1 Way. Finishing it reveals the landing graph and the login button.

Every published graph also becomes a place. The Maps overlay lists published graphs that have terrain artwork, and picking one opens `/assets/voxel/voxel-world.html?seed=<graph name>`: a Minecraft-style Three.js world with the same terrain as the artwork, because artwork and world share one generator (`fnv1a(name)` seed, 3 octaves, exponent 2.2, water at the 20th percentile). The world's sky holds the graph itself — nodes as coloured cubes, parent beams, cross-reference beams, hover details, weight and graffiti actions. Like the landing game, that world is reachable without an identity — which is exactly why it is the discovery surface. Graphs published from xyz have no terrain artwork until a backfill exists, so they appear in Public and the API but not in Maps.

Visually the app is brutalist retro: JetBrains Mono everywhere, dashed 2px borders, square corners, no shadows outside the game; Press Start 2P is reserved for the game and the voxel UI. Details in `DESIGN.md`.

## Public API & MCP

Everything below is served from `http_request`, with `access-control-allow-origin: *`, no key and no auth.

| Endpoint | Returns |
| --- | --- |
| `GET /api/tools` | `{ tools: [...] }` — the JSON-API tool list |
| `GET /api/graphs` | published metadata: `id, name, creator, creatorName, publishedAt, revision, xyzWriteCount, nodeCount, edgeCount, hierarchyEdgeCount, attributeCount, sourcesCount, extensions[], authorDetails[]` |
| `GET /api/graphs/{id}` | `{ curations, swarms, locations, lawTokens, interpretationTokens, edges, revision }` |
| `GET /api/nodes/{id}` | flat array of every node; `type` is one of `curation`, `swarm`, `location`, `lawEntity`, `interpEntity` |
| `GET /api/edges/{id}` | cross-reference edges only: `{ source, target, label, bidirectional }` |
| `GET /api/weights/{id}` | `[{ nodeId, weight, graffiti: [{ id, text, weight }] }]`, resolved through the graph's **name** |
| `POST /mcp` | JSON-RPC 2.0 (`2024-11-05`): `initialize`, `tools/list`, `tools/call` → `get_all_graphs`, `get_graph` |

The shapes are whole-graph: one fetch returns every node, because the payload is assembled from the canonical store rather than an index. That is right for reading a graph and wrong for rendering one node — which is why a citation fetches the graph once and caches it by `(id, revision)`. Per-graph endpoints also set an `x-hyvmind-revision` header; where the gateway does not expose it, read the JSON `revision` field. Writes are Candid-only (`previewXyzWrite`/`commitXyzWrite`, allowlisted xyz backend); nothing in this table grants write access.

## Roadmap: make the knowledge layer citable from xyz

`xyz` cites nodes here; linked xyz users can also publish new interpretation tokens into the graph, and xyz applies its own social rules to who may extend what. Reads stay public, unauthenticated and cacheable; only writes need an identity.

### Goal

A post in xyz attaches to a node here. A linked xyz user can turn a post into an immutable interpretation token on a complete path to a curation, with citations from that token to existing nodes. A node here can show the posts that cite it; writes are attributed to the linked app identity.

### Constraints (verified, not assumed)

1. **The API is whole-graph.** `/api/nodes/{id}` returns every node. There is no per-node endpoint; a citation costs one graph fetch plus a cache entry.

2. **Reads are queries, so they cannot authorize.** Published graphs stay public; gating them would need a different path and would break the voxel world, MCP, and direct browser reads.

3. **Principals do not cross origins.** II principals are derived per origin; the link is an explicit map in this backend.

4. **Node IDs are paths, not identifiers.** Paths collide (`SARFAESI ACT, 2002` and `SARFAESI Act, 2002`); a citation pins the published snapshot and stores the display path.

5. **The allowlisted xyz backend is the entire social fence.** The app enforces structure and charges the writer's own Buzz; it does not and cannot evaluate mutuals, vouching or governance. Anything that must hold here has to be expressible as a structural rule: path completeness, hierarchy, duplicates, citation targets, cost, idempotency. A compromised or buggy xyz backend can therefore insert any structurally valid extension into any graph. That is the same boundary as `confirmLink`, with the graph rather than a link row as the blast radius. Social policy lives in xyz.

6. **The plugin binding is not a link primitive.** `storeNotesData` resolves through `getEffectiveUser`; `getNotesData` reads the raw caller. The Obsidian import works as intended and the link carries no notes or editor data.

7. **There is no working rate limit.** `track_api_request` counters are unread; do not build quotas on them.

8. **Drafts are unreadable by anyone else.** Only published snapshots have a read path.

### Decisions

- **Citations store rendering data, not a lookup key.** `graphId`, `graphName`, `nodeId`, `nodeName`, `nodeType`, `path`, `publishedAt`, `revision`, plus sources/tags/attributes. A citation whose snapshot vanished renders as unresolved rather than lying.

- **`revision` is the cache key.** Published graphs are live views; every publish, extension, and artwork/terrain update bumps `revision`. `publishedAt` is creation time only.

- **The link is code-based and owned by this backend.** `beginLink` → `resolveLinkCode` → `confirmLink` (allowlisted xyz backend) → `revokeLink` / `revokeLinkAsXyz`. `getLinkForXyz` and `getLinkedXyzPrincipal` reconcile both directions; `isAppPrincipalLinked` is the boolean form.

- **Every xyz post is one interpretation token.** `previewXyzWrite` returns cost, path, conflicts and a digest; `commitXyzWrite` is create-only, idempotent by `writeId`, and charges Buzz to the linked app account. The post must sit on a complete path to a curation. Every existing creator on that path is reported in the plan for xyz's benefit, but is never a blocker here.

- **Citations are the post's interpretation → an existing node.** One anchor in v1 (`citations[0] ?? parentLaw`); label `"cites"`; no edges between two pre-existing nodes; cross-graph targets must be published.

- **Writes charge the published cost.** 1.0/2.0/3.0/4.0/5.0 BUZZ for curation/swarm/location/law/interpretation, 0.1 per citation. No weight mirroring in v1.

- **Deep links belong to the app shell.** `?graph=<id>&node=<id>` focuses a node; `?settings=wallet&redeem=1` opens the Buzz redeem flow.

### Phases

| # | Repo | Work |
| --- | --- | --- |
| 1 | app | **Read surface** — `revision` + `xyzWriteCount` in `/api/graphs`, `revision` on `/api/graphs/{id}`, `x-hyvmind-revision` on per-graph endpoints |
| 2 | both | **Principal link** — begin/resolve/confirm/revoke, allowlist, both-direction reconciliation |
| 3 | app | **Write channel** — post-shaped preview/commit, idempotency, structure, citations, Buzz |
| 4 | app | **Deep links** — `?graph=&node=` and the wallet redeem link |

#### Phase 1 — read surface (implemented)

Additive only: no Candid changes to existing types. Published graphs are live views; `revision` is bumped on every publish, extension, and artwork/terrain update.

#### Phase 2 — principal link (implemented)

`beginLink`, `resolveLinkCode`, `confirmLink`, `revokeLink`, `revokeLinkAsXyz`, `getMyLink`, `getLinkForXyz`, `getLinkedXyzPrincipal`, `isAppPrincipalLinked`, `getXyzBackendPrincipals`, `setXyzBackendPrincipal`. The xyz backend is allowlisted; `confirmLink` is the only binding path. `getNotesData`/`storeNotesData` are untouched.

#### Phase 3 — writes from xyz (implemented)

`previewXyzWrite` / `commitXyzWrite` / `getXyzWrite` / `getXyzBuzzBalance`. Post-shaped input: `title`, `content`, `parentLaw`, new `ancestors` (path only), `citations` (this interp → existing node). Create-only; no updates, no merges. A post is at most four ancestors plus one interpretation; citations are capped at 20. `writeId` is retained indefinitely for idempotent retries. `#blocked` carries every existing path creator with a `linked` flag; the app never evaluates follows, and has no opinion on who may extend a path (see constraint 5).

#### Phase 4 — deep links (app)

`?graph=<id>&node=<id>` focuses a node; `?settings=wallet&redeem=1` opens the Buzz redeem flow. No auth, no redirect.

### Not doing (and why)

- **Follower-gating published graphs.** They are public; gating them is a regression and breaks anonymous surfaces.

- **A per-node endpoint.** A whole-graph fetch plus cache is cheaper; revisit only for tamper-evident proofs.

- **Updating existing nodes from xyz.** The channel is create-only; attribute/content edits remain editor-only.

- **A notes bridge.** The link carries no notes or editor data.

- **Mirroring weight in v1.** The voxel weight path is unauthenticated; mirroring needs a dedicated, anti-abuse-designed method.

- **Restoring the old `getNotesData` plan.** The asymmetry is the intended plugin import, not a bug.

### Open items

- Whether xyz discussion appears on the node page here, and in what order relative to sources and attributes.

- Whether agent-written citations ever need a signature — the only case for a per-node proof endpoint.

- When to mirror post weight, and with what anti-abuse model.

### Reference — read shapes

`GET /api/graphs` → array of metadata objects: `id, name, creator, creatorName, publishedAt, revision, xyzWriteCount, nodeCount, edgeCount, hierarchyEdgeCount, attributeCount, sourcesCount, extensions[], authorDetails[]`.

`GET /api/graphs/{id}` → `{ curations, swarms, locations, lawTokens, interpretationTokens, edges, revision }`.

`GET /api/nodes/{id}` → array of `{ id, name, type, parentId?, tags[]?, content?, attributes[], sources[], creator, createdAt }`; `content` exists only on `interpEntity`. Per-graph endpoints set `x-hyvmind-revision`; fall back to the JSON `revision` when the gateway does not expose the header.

`GET /api/edges/{id}` → `[{ source, target, label, bidirectional }]`, cross-reference edges only; hierarchy is expressed by `parentId`.

`GET /api/weights/{id}` → `[{ nodeId, weight, graffiti[{ id, text, weight }] }]`, stored per graph **name** because the voxel world is name-seeded.

## Economy

Two ledgers, both integer with fixed decimals. **Buzz** is the currency: publishing spends it, saving someone's graph spends it, and the game pays it out as one-time secrets (`generateBuzzSecret(score)` → `redeemBuzzSecret`) alongside invite codes. **Trust** is what contributors earn when their nodes survive someone else's save — credited by `sqrt(saveCount)` against the Buzz that was paid for those nodes, and surfaced as `authorDetails[].trustScore` in `/api/graphs`.

xyz writes charge the same per-node costs to the linked app account — 1.0/2.0/3.0/4.0/5.0 BUZZ for curation/swarm/location/law/interpretation and 0.1 per citation. They are create-only; merges and weight updates remain app-side. Post weight is not mirrored into `/api/weights` in v1.

A published graph can also become a fundable project: `linkWallet` binds an EVM address to a principal by verifying an EIP-191 signature on-canister (replay-protected by the last signed message), and `recordJuiceboxProject` pins a Juicebox V6 project on Base to the graph. The Funding view is client-side and not yet in the navigation. The direction of travel is obvious — a graph that earns is a graph worth citing, so the revnet address eventually travels in the same citation payload as the graph id.

## License

GNU General Public License v3.0 — see [LICENSE](./LICENSE). Third-party asset attribution lives in the in-game Credits screen.
