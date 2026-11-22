#!/usr/bin/env node
/**
 * Admin helper: prove the xyz write-channel plan digest is stable across a deploy.
 *
 * `previewXyzWrite` returns a digest; `commitXyzWrite` rejects a write whose digest
 * no longer matches. That makes the digest the idempotency and `#stale` contract
 * between the app and xyz, so a deploy that silently changes it turns every
 * in-flight preview into a `#stale` and forces xyz users to re-preview.
 *
 * Usage, around a deploy:
 *
 *   BACKEND_CANISTER_ID=<id> ADMIN_SECRET_HEX=<64 hex> \
 *     node scripts/xyz-digest-check.mjs capture    # BEFORE the deploy
 *     node scripts/xyz-digest-check.mjs compare    # AFTER the deploy → PASS / FAIL
 *     BACKEND_CANISTER_ID=<id> ADMIN_SECRET_HEX=<64 hex> \
 *     node scripts/xyz-digest-check.mjs cleanup    # AFTER compare, always
 *
 * The admin identity is loaded from ADMIN_SECRET_HEX (32-byte hex seed) or
 * ADMIN_KEY_JSON (Ed25519KeyIdentity.toJSON()). It must be an admin of the
 * canister: capture temporarily allowlists it as an xyz backend so it can call
 * `previewXyzWrite` directly. `cleanup` removes that entry again — see the
 * warning below.
 *
 * Why the fixture cannot drift: the probe is an entirely new curation → swarm →
 * location → law chain with no citations, so the digest depends only on the
 * writer principal and the fixed input below (no revision, no existing node ids,
 * no existing creators). That is why `compare` needs no INCONCLUSIVE state.
 *
 * SAFETY: capture adds the admin principal to the xyz backend allowlist, and
 * canister state survives upgrades — so the entry is still there after the
 * deploy. If cleanup is skipped, the admin key remains a second write channel
 * that bypasses every social rule. Always run cleanup, and confirm with
 * `getXyzBackendPrincipals`, which cleanup prints.
 *
 * Optional env:
 *   IC_HOST              agent host (default: https://icp-api.io)
 *   XYZ_DIGEST_FIXTURE   fixture path (default: scripts/xyz-digest-fixture.json)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { idlFactory } from "../src/frontend/src/declarations/backend.did.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH =
  process.env.XYZ_DIGEST_FIXTURE || join(HERE, "xyz-digest-fixture.json");

// Changing PROBE changes every digest line except cost — bump it only when the
// probe names have been committed into live data (compare will say so).
const PROBE = "digest-probe-8f3c2e91";
const PROBE_WRITE_ID = "digest-probe";

// ---------------------------------------------------------------------------
// SDK resolution
// ---------------------------------------------------------------------------
// scripts/ is not inside a package that depends on the agent; the frontend is.
async function loadSdk() {
  const base = "@icp-sdk/core";
  try {
    return {
      agent: await import(`${base}/agent`),
      identity: await import(`${base}/identity`),
    };
  } catch {
    const rel = "../src/frontend/node_modules/@icp-sdk/core/lib/esm";
    return {
      agent: await import(`${rel}/agent/index.js`),
      identity: await import(`${rel}/identity/index.js`),
    };
  }
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

function loadIdentity(Ed25519KeyIdentity) {
  if (process.env.ADMIN_KEY_JSON) {
    return Ed25519KeyIdentity.fromJSON(process.env.ADMIN_KEY_JSON);
  }
  const seedHex = requireEnv("ADMIN_SECRET_HEX");
  if (!/^[0-9a-f]{64}$/i.test(seedHex)) {
    throw new Error("ADMIN_SECRET_HEX must be 64 hex chars (32-byte seed)");
  }
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = Number.parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return Ed25519KeyIdentity.generate(seed);
}

// A throwaway xyz principal derived from a fixed label, so re-runs reuse the
// same link instead of failing on "already linked".
function probeXyzPrincipal(Ed25519KeyIdentity) {
  const seed = createHash("sha256")
    .update("hyvmind-app/xyz-digest-check/probe-xyz")
    .digest();
  return Ed25519KeyIdentity.generate(new Uint8Array(seed)).getPrincipal();
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
function probeInput() {
  const node = (ref, nodeType, name, parentRef) => ({
    ref,
    nodeType,
    name,
    parentRef: parentRef ? [{ ref: parentRef, nodeType: [] }] : [],
    tags: [],
    attributes: [],
    sources: [],
  });
  return {
    apiVersion: 1,
    title: `${PROBE} interpretation`,
    content:
      "Digest stability probe for the xyz write channel. Preview only; never committed.",
    parentLaw: { ref: "law1", nodeType: [] },
    ancestors: [
      node("c1", "curation", `${PROBE} curation`, null),
      node("s1", "swarm", `${PROBE} swarm`, "c1"),
      node("l1", "location", `${PROBE} location`, "s1"),
      node("law1", "lawEntity", `${PROBE} law`, "l1"),
    ],
    citations: [],
  };
}

// ---------------------------------------------------------------------------
// Canister helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setAllowed(actor, principal, enabled) {
  try {
    await actor.setXyzBackendPrincipal(principal, enabled);
  } catch (err) {
    throw new Error(
      `setXyzBackendPrincipal(${enabled}) failed — is this identity an admin of the canister? (${err?.message ?? err})`,
    );
  }
}

async function ensureProbeLink(actor, xyzPrincipal) {
  const existing = await actor.getMyLink();
  if (existing.length > 0) {
    const linked = existing[0].xyzPrincipal;
    if (linked.toText() === xyzPrincipal.toText()) {
      console.log(`  link: reusing existing probe link`);
      return false;
    }
    throw new Error(
      `This admin principal is already linked to ${linked.toText()}. ` +
        `Refusing to touch a real link — use a dedicated admin key for this check.`,
    );
  }
  const begun = await actor.beginLink();
  if (!("ok" in begun)) throw new Error(`beginLink: ${begun.err}`);
  const confirmed = await actor.confirmLink(begun.ok, xyzPrincipal);
  if (!("ok" in confirmed)) throw new Error(`confirmLink: ${confirmed.err}`);
  console.log(`  link: created probe link ${confirmed.ok.toText()}`);
  return true;
}

async function previewPlan(actor, xyzPrincipal, input) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await actor.previewXyzWrite(
      xyzPrincipal,
      PROBE_WRITE_ID,
      [],
      input,
    );
    if (res.throttled) {
      const wait = Number(res.throttled.retryAfterMs) + 250;
      console.log(`  throttled, retrying in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.err) throw new Error(`previewXyzWrite: ${res.err.message}`);
    if (res.notLinked) throw new Error(`previewXyzWrite: ${res.notLinked.message}`);
    const variant = res.ready
      ? "ready"
      : res.insufficient
        ? "insufficient"
        : res.blocked
          ? "blocked"
          : null;
    if (!variant) throw new Error(`previewXyzWrite: ${JSON.stringify(res)}`);
    return { plan: res[variant].plan, variant };
  }
  throw new Error("preview stayed throttled");
}

function describe(plan) {
  return (
    `digest=${plan.digest}\n` +
    `  revision=${plan.revision} cost=${plan.cost} creates=${plan.creates} ` +
    `publishedGraphId=${plan.publishedGraphId.length > 0 ? plan.publishedGraphId[0] : "(none)"}`
  );
}

async function connect() {
  const backendCanisterId = requireEnv("BACKEND_CANISTER_ID");
  const sdk = await loadSdk();
  const identity = loadIdentity(sdk.identity.Ed25519KeyIdentity);
  const isLocal = !!process.env.IC_HOST?.match(/localhost|127\.0\.0\.1/);
  const agent = await sdk.agent.HttpAgent.create({
    identity,
    host: process.env.IC_HOST || (isLocal ? undefined : "https://icp-api.io"),
    shouldFetchRootKey: isLocal,
  });
  const actor = sdk.agent.Actor.createActor(idlFactory, {
    agent,
    canisterId: backendCanisterId,
  });
  const admin = identity.getPrincipal();
  const xyzPrincipal = probeXyzPrincipal(sdk.identity.Ed25519KeyIdentity);
  return { agent, actor, admin, xyzPrincipal, backendCanisterId };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------
async function capture() {
  const { agent, actor, admin, xyzPrincipal, backendCanisterId } = await connect();
  console.log(`capture against ${backendCanisterId} as ${admin.toText()}`);

  await setAllowed(actor, admin, true);
  console.log("  allowlist: admin added temporarily");
  const createdLink = await ensureProbeLink(actor, xyzPrincipal);

  const input = probeInput();
  const { plan, variant } = await previewPlan(actor, xyzPrincipal, input);
  console.log(`  plan: ${variant}\n  ${describe(plan)}`);

  if (plan.conflicts.length > 0) {
    throw new Error(
      `The probe plan has conflicts (${plan.conflicts.map((c) => c.kind).join(", ")}). ` +
        `Probe names are now present in live data — bump PROBE in this script.`,
    );
  }
  if (plan.publishedGraphId.length > 0) {
    throw new Error("Probe plan attached to an existing graph — the fixture would drift.");
  }

  writeFileSync(
    FIXTURE_PATH,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        backendCanisterId,
        writerApp: admin.toText(),
        writerXyz: xyzPrincipal.toText(),
        createdLink,
        probe: PROBE,
        digest: plan.digest,
        revision: String(plan.revision),
        cost: String(plan.cost),
        input,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`captured -> ${FIXTURE_PATH}`);
  console.log("next: deploy, then run `compare` (do NOT skip `cleanup`).");
  await agent.destroy?.();
}

async function compare() {
  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(`No fixture at ${FIXTURE_PATH} — run \`capture\` before the deploy.`);
  }
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  const { agent, actor, admin, xyzPrincipal, backendCanisterId } = await connect();
  console.log(`compare against ${backendCanisterId} as ${admin.toText()}`);
  console.log(`  fixture: ${fixture.probe} captured ${fixture.capturedAt}`);

  if (fixture.writerApp !== admin.toText()) {
    throw new Error(
      `Fixture was captured as ${fixture.writerApp} but this key is ${admin.toText()}; ` +
        `the digest legitimately differs. Re-capture or use the same admin key.`,
    );
  }
  if (fixture.probe !== PROBE) {
    throw new Error(`PROBE changed since capture (${fixture.probe} -> ${PROBE}). Re-capture.`);
  }

  const { plan, variant } = await previewPlan(actor, xyzPrincipal, fixture.input);
  console.log(`  plan: ${variant}\n  ${describe(plan)}`);

  if (plan.conflicts.length > 0) {
    console.log(
      `INCONCLUSIVE: probe plan now has conflicts (${plan.conflicts
        .map((c) => c.kind)
        .join(", ")}); live data changed under the probe. Bump PROBE and re-run capture -> deploy.`,
    );
    process.exitCode = 2;
    await agent.destroy?.();
    return;
  }

  const same = plan.digest === fixture.digest;
  console.log("");
  console.log(`  before: ${fixture.digest}`);
  console.log(`  after:  ${plan.digest}`);
  console.log(same ? "PASS: digest unchanged across the deploy" : "FAIL: digest changed across the deploy");
  if (!same) {
    console.log(
      "  In-flight previews will be rejected as #stale. Compare the digest-construction\n" +
        "  block in src/backend/main.mo against the previous revision before shipping.",
    );
    process.exitCode = 1;
  }
  console.log("next: run `cleanup` (mandatory — it removes the temporary allowlist entry).");
  await agent.destroy?.();
}

async function cleanup() {
  const { agent, actor, admin } = await connect();
  console.log(`cleanup as ${admin.toText()}`);

  let createdLink = false;
  if (existsSync(FIXTURE_PATH)) {
    createdLink = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")).createdLink === true;
  } else {
    console.log("  no fixture found: leaving the link untouched (pass a fixture to unlink)");
  }

  if (createdLink) {
    const revoked = await actor.revokeLink();
    console.log("  link:", "ok" in revoked ? "probe link revoked" : `skipped (${revoked.err})`);
  }

  await setAllowed(actor, admin, false);
  console.log("  allowlist: admin removed");

  const remaining = await actor.getXyzBackendPrincipals();
  const names = remaining.map((p) => p.toText());
  console.log(`  allowlist now: [${names.join(", ")}]`);
  if (names.includes(admin.toText())) {
    console.error("FAIL: admin principal is still allowlisted");
    process.exitCode = 1;
  }
  await agent.destroy?.();
}

// ---------------------------------------------------------------------------
const MODE = process.argv[2];
const modes = { capture, compare, cleanup };
if (!modes[MODE]) {
  console.error("usage: node scripts/xyz-digest-check.mjs <capture|compare|cleanup>");
  process.exit(1);
}
modes[MODE]().catch((err) => {
  console.error(err?.stack ?? err);
  process.exit(1);
});
