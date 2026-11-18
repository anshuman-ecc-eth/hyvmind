# hyvmind.app

A shared note-taking space for legal researchers. Notes are organised as a five-level hierarchy and published as immutable legal knowledge graphs; the first thing a new user meets is a game.

Hyvmind is one product split across two origins. **xyz** ([`hyvmind.xyz`](https://www.hyvmind.xyz), [repo](https://github.com/anshuman-ecc-eth/hm-xyz)) is the social layer: posts, replies, citations. **app** is the knowledge layer: the editor, the graphs, the public read API. This README covers the knowledge layer and the seam that lets the social layer cite it. xyz's README covers its side of the same seam.

---

## Stack

- **Backend** — a single Motoko persistent actor (`main.mo`, ~5.7k lines) on `mo:core`, compiled with `mops`. `Migration.mo` carries the migration chain; `EvmRecovery.mo` verifies MetaMask `personal_sign` on-canister over a vendored secp256k1.

- **Frontend** — React 19, TypeScript, Vite 5, Tailwind 3, Radix/shadcn, TanStack Query. Diagrams use force-graph; the world is vanilla Three.js served from `public/assets/voxel/`.

- **Auth** — Internet Identity via `@caffeineai/core-infrastructure`. The blog reader deliberately uses an anonymous agent: the password is the credential.

- **Data surface** — the same canister serves a public JSON API over `http_request` and an MCP JSON-RPC endpoint. No separate gateway, no proxy.

- **Deploy** — Caffeine cloud pipeline (`caffeine.toml`); `icp.yaml` + `deploy.sh` for a local `icp-cli` network.

```
src/backend/     main.mo, Migration.mo, EvmRecovery.mo, vendor/, dist/ (.wasm + .did)
src/frontend/    React app, public/assets/{games,hyvmind,lua,voxel}, env.json, dist/
scripts/         blog-admin.mjs, fetch-juicebox-deployments.mjs
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

`pnpm dev` does not exist at the root; run `npx vite` from `src/frontend/`. `./deploy.sh` starts a local `icp` network, creates both canisters and deploys them. On localhost, `?dev` renders the post-login shell without Internet Identity (queries stay disabled).

---

## The knowledge model

Five node types, each a level of the hierarchy:

```
curation → swarm → location → lawEntity → interpEntity
```

A node `id` is the `@`-joined name path (`Constitutional Law@Article 21@Right to Life`). Paths are convenient, not unique — live data already contains both `SARFAESI ACT, 2002` and `SARFAESI Act, 2002`. Edges carry weighted labels (highest weight wins on display), attributes are weighted values, and interpretation nodes accumulate graffiti with its own weights.

Publishing is a snapshot, not a pointer: `previewPublishSourceGraph` checks the graph, `commitPublishSourceGraph` writes a `published-<nanos>-<creatorHash>` id, and everything readable afterwards is that immutable copy. Saving someone's published graph copies nodes into your own editor tree, charges Buzz, and credits Trust to the contributors whose nodes were saved. Drafts never leave the editor blob; only published graphs have a read path.

## The app

| Tab | Component | What you can do |
| --- | --- | --- |
| **Notes** | `EditorView` | Hierarchical markdown editor: file tree, frontmatter, token annotation (law = crimson, interp = orchid), sources, attributes, ZIP export |
| **Graphs** | `SourcesView` | Manage source graphs as lists or diagrams, import/export ZIP, preview the RDF/Turtle ontology, publish |
| **Public** | `PublicGraphView` | Browse every published graph, force-graph diagrams, node search, save a copy |
| **Forum** | `ForumView` | Posts, replies, votes |
| **Settings** | `SettingsView` | Profile, affiliation and social links, themes and font pairings, Buzz/Trust balances, plugin binding, EVM wallet link |
| **Terminal** | `TerminalPage` | Admin-only: name resolution, ontology dumps, archive commands, blog password, Telegram config |

The header adds surfaces that live outside the tabs: **Tutorial**, **Whitepaper**, **Videos**, **Code**, and **Blog** — posts are stored on-chain and gated by a password whose digest is checked inside a shared method, so there is no public query to bypass. The Funding view (Juicebox) is implemented but not yet in the sidebar navigation.

## The world

Unauthenticated visitors land in a pixel-art game, not a login form: a 72×272-tile overworld (8px tiles), a branching story, and a menu of puzzles and arcade games — chess (Lichess puzzle database), Wordle, Flipo, Thunder, Box Snake, Charge Beam, Up 1 Way. Finishing it reveals the landing graph and the login button.

Every published graph also becomes a place. The Maps overlay lists published graphs that have terrain artwork, and picking one opens `/assets/voxel/voxel-world.html?seed=<graph name>`: a Minecraft-style Three.js world with the same terrain as the artwork, because artwork and world share one generator (`fnv1a(name)` seed, 3 octaves, exponent 2.2, water at the 20th percentile). The world's sky holds the graph itself — nodes as coloured cubes, parent beams, cross-reference beams, hover details, weight and graffiti actions. Like the landing game, that world is reachable without an identity — which is exactly why it is the discovery surface.

Visually the app is brutalist retro: JetBrains Mono everywhere, dashed 2px borders, square corners, no shadows outside the game; Press Start 2P is reserved for the game and the voxel UI. Details in `DESIGN.md`.

## Public API & MCP

Everything below is served from `http_request`, with `access-control-allow-origin: *`, no key and no auth.

| Endpoint | Returns |
| --- | --- |
| `GET /api/tools` | `{ tools: [...] }` — the JSON-API tool list |
| `GET /api/graphs` | published metadata: `id, name, creator, creatorName, publishedAt, nodeCount, edgeCount, hierarchyEdgeCount, attributeCount, sourcesCount, extensions[], authorDetails[]` |
| `GET /api/graphs/{id}` | `{ curations, swarms, locations, lawTokens, interpretationTokens, edges }` |
| `GET /api/nodes/{id}` | flat array of every node; `type` is one of `curation`, `swarm`, `location`, `lawEntity`, `interpEntity` |
| `GET /api/edges/{id}` | cross-reference edges only: `{ source, target, label, bidirectional }` |
| `GET /api/weights/{id}` | `[{ nodeId, weight, graffiti: [{ id, text, weight }] }]`, resolved through the graph's **name** |
| `POST /mcp` | JSON-RPC 2.0 (`2024-11-05`): `initialize`, `tools/list`, `tools/call` → `get_all_graphs`, `get_graph` |

The shapes are whole-graph: one fetch returns every node, because the payload is assembled from a snapshot rather than an index. That is right for reading a graph and wrong for rendering one node — which is why a citation fetches the graph once and caches it by `publishedAt`.

## Roadmap: make the knowledge layer citable from xyz

xyz's README carries the same plan from its side. This one only commits to what the knowledge layer must ship.

### Goal

A post in xyz attaches to a node here. A node here can show the posts that cite it. Later, xyz can create curations and swarms here, attributed to its author. Reads stay public, unauthenticated and cacheable; only writes need an identity.

### Constraints (verified, not assumed)

1. **The API is whole-graph.** `/api/nodes/{id}` returns every node. There is no per-node endpoint, so a citation costs one graph fetch plus a cache entry.

2. **Reads are queries, so they cannot authorize.** Query calls cannot make outbound calls, and `http_request` is a query. Published graphs are public and stay public; any gating would need a different path entirely.

3. **Principals do not cross origins.** II principals are derived per origin, and Caffeine owns `env.json` and `/.well-known/ii-alternative-origins`. xyz cannot sign in here as the same principal, so the link has to be an explicit map in this backend.

4. **Node IDs are paths, not identifiers.** They are `@`-joined and they collide. The citable unit is the published snapshot; a citation stores the display path and pins the snapshot.

5. **The plugin binding is not a link primitive.** `storeNotesData` writes under `getEffectiveUser(caller)` while `getNotesData` reads the raw caller, so a bound principal writes where it cannot read. That asymmetry has to be fixed before anything is built on top of it.

6. **There is no working rate limit.** `track_api_request` increments counters that nothing reads, and only `revokeApiKey` clears them. Do not build quotas on it.

7. **Drafts are unreadable by anyone else.** A draft is only reachable through the owner's own notes blob; every shared read path resolves to a published snapshot. There is no private graph content to expose, which is why the read API needs no identity at all.

### Decisions

- **Citations store the rendering data, not a lookup key.** `graphId`, `graphName`, `nodeId`, `nodeName`, `nodeType`, `path`, `publishedAt`, plus node `sources`, `tags` and `attributes` so a chip renders without a second call. A citation whose snapshot has vanished renders as unresolved rather than quietly lying.

- **Freeze the read shapes.** Field names in `/api/*` are additive only; each payload is immutable and cached keyed by `publishedAt`. Artwork and terrain params already exist in the Candid metadata but are missing from `/api/graphs` — add them rather than inventing a second endpoint.

- **The identity link lives here, not in II.** New methods `requestLink` / `confirmLink` / `revokeLink`, symmetric lookup, revocable from either side, with xyz's backend principal explicitly allowlisted (an inter-canister call does not run `inspect_message`). The resolver replaces the raw caller in `getNotesData` in the same change, or the link is write-only again.

- **Writes from xyz are Candid updates by the linked principal.** Authorship, Buzz and Trust accrue to the linked app identity; the write returns a fresh `published-*` id that xyz stores in its citation.

- **Deep links belong to the app shell.** `?graph=<id>&node=<id>` focuses the node view; no auth, no redirect.

- **Readers fetch the API directly from the browser.** No proxy, no outcalls, no cycles — matching the sibling decision.

### Phases

| # | Repo | Work |
| --- | --- | --- |
| 1 | app | **Citation-ready read surface** — freeze shapes, add artwork/terrain to `/api/graphs`, document cache keys |
| 2 | both | **Principal link** — code-based, owned by this backend |
| 3 | app | **Accept writes** attributed to the linked xyz principal |
| 4 | app | **Deep links** `?graph=&node=` |

#### Phase 1 — read surface (app only, zero risk)

Every field xyz needs already exists except artwork. Add it, document `publishedAt` as the cache key, and publish the node shape as a contract. No Candid change, so no migration.

#### Phase 2 — principal link (both)

Hyvmind issues a short code from settings; xyz's backend calls `confirmLink(code, P_xyz)`; this backend binds `P_hv ↔ P_xyz` symmetrically. Allowlist xyz's backend principal for that one method. Then route `getNotesData` through the resolver, which is also what makes plugin-style attribution stop being write-only.

#### Phase 3 — write from xyz (app)

Expose `createCuration` / `createSwarm` to linked principals, attribute Buzz and Trust to the linked app identity, and return the `published-*` id. Reads stay exactly as they are.

#### Phase 4 — deep links (app)

Accept `?graph=&node=` at load, resolve the node inside the cached snapshot, and focus it. This is what turns an xyz citation chip from a reference into a destination.

### Not doing (and why)

- **Sharing or repointing II origins.** Caffeine owns both files, and repointing orphans every existing principal with no migration path.

- **A per-node endpoint.** A query transform over a whole-graph snapshot is more machinery than a cache entry. Revisit only if citations need tamper-evident proofs.

- **Follower-gating published graphs.** They are already public; gating them is a regression dressed as access control.

- **Reusing `pluginBindings` as the link.** One-way, plugin-shaped, and currently unreadable by its own writer.

- **Server-side outcalls to validate a citation.** No per-node endpoint exists, so validating one node costs a whole-graph fetch plus a transform.

### Open items

- Whether every xyz post must cite a node, or citations stay optional.

- Whether xyz discussion appears on the node page here, and in what order relative to sources and attributes.

- Whether agent-written citations ever need a signature, which is the only case that would justify a per-node proof endpoint.

### Reference — read shapes

`GET /api/graphs` → array of metadata objects (fields listed above). `publishedAt` is nanoseconds.

`GET /api/nodes/{id}` → array of `{ id, name, type, parentId?, tags[]?, content?, attributes[{ key, weightedValues[] }], sources[{ name, url }], creator, createdAt }`. `content` exists only on `interpEntity`.

`GET /api/edges/{id}` → `[{ source, target, label, bidirectional }]`, cross-reference edges only; hierarchy is expressed by `parentId`.

`GET /api/weights/{id}` → `[{ nodeId, weight, graffiti[{ id, text, weight }] }]`, stored per graph **name** because the voxel world is name-seeded.

## Economy

Two ledgers, both integer with fixed decimals. **Buzz** is the currency: publishing spends it, saving someone's graph spends it, and the game pays it out as one-time secrets (`generateBuzzSecret(score)` → `redeemBuzzSecret`) alongside invite codes. **Trust** is what contributors earn when their nodes survive someone else's save — credited by `sqrt(saveCount)` against the Buzz that was paid for those nodes, and surfaced as `authorDetails[].trustScore` in `/api/graphs`.

A published graph can also become a fundable project: `linkWallet` binds an EVM address to a principal by verifying an EIP-191 signature on-canister (replay-protected by the last signed message), and `recordJuiceboxProject` pins a Juicebox V6 project on Base to the graph. The Funding view is client-side and not yet in the navigation. The direction of travel is obvious — a graph that earns is a graph worth citing, so the revnet address eventually travels in the same citation payload as the graph id.

## License

GNU General Public License v3.0 — see [LICENSE](./LICENSE). Third-party asset attribution lives in the in-game Credits screen.
