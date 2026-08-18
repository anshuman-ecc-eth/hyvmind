#!/usr/bin/env node
/**
 * Admin helper: register blog posts on-chain.
 *
 * Reads staged posts from `scripts/blogs/staging/<slug>/` (each dir must contain
 * `post.json`, `article.html`, and optionally `banner.png`), then calls
 * `setBlogPost` on the backend with the admin identity.
 *
 * The admin identity is loaded from the ADMIN_SECRET_HEX env var (a 32-byte hex
 * seed for an Ed25519 key) OR ADMIN_KEY_JSON (the JSON form produced by
 * Ed25519KeyIdentity.toJSON()). The principal must be an admin of the canister.
 *
 * Usage:
 *   BACKEND_CANISTER_ID=<id> ADMIN_SECRET_HEX=<64 hex chars> node scripts/blog-admin.mjs
 *   BACKEND_CANISTER_ID=<id> ADMIN_KEY_JSON='["pubhex","sechex"]' node scripts/blog-admin.mjs
 *
 * Optional env:
 *   IC_HOST           agent host (default: localhost for 4943, else icp-api.io)
 *   BLOG_STAGING_DIR  staging dir (default: scripts/blogs/staging)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { idlFactory } from "../src/frontend/src/declarations/backend.did.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAGING = process.env.BLOG_STAGING_DIR || join(__dirname, "blogs", "staging");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

function loadIdentity() {
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

function readPost(slug) {
  const dir = join(STAGING, slug);
  const postJson = JSON.parse(readFileSync(join(dir, "post.json"), "utf8"));
  const html = readFileSync(join(dir, "article.html"));
  const bannerPath = join(dir, "banner.png");
  const banner = existsSync(bannerPath)
    ? [new Uint8Array(readFileSync(bannerPath))]
    : null;
  return { meta: postJson, html: new Uint8Array(html), banner };
}

async function main() {
  const backendCanisterId = requireEnv("BACKEND_CANISTER_ID");
  const isLocal = /localhost|127\.0\.0\.1/.test(backendCanisterId) || !!process.env.IC_HOST?.includes("localhost");
  const identity = loadIdentity();
  const agent = await HttpAgent.create({
    identity,
    host: process.env.IC_HOST || (isLocal ? undefined : "https://icp-api.io"),
    shouldFetchRootKey: isLocal,
  });
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: backendCanisterId,
  });

  const slugs = readdirSync(STAGING).filter((s) =>
    existsSync(join(STAGING, s, "post.json")),
  );
  if (slugs.length === 0) {
    console.error("No staged posts found in", STAGING);
    process.exit(1);
  }

  console.log(`Registering ${slugs.length} post(s) as ${identity.getPrincipal().toString()}`);
  for (const slug of slugs) {
    const { meta, html, banner } = readPost(slug);
    console.log(`  -> ${slug}: "${meta.title}" (${html.length} bytes html, ${banner ? "banner" : "no banner"})`);
    const result = await actor.setBlogPost(meta, html, banner);
    if (result && "ok" in result) {
      console.log(`     ok`);
    } else {
      console.error(`     failed:`, JSON.stringify(result));
    }
  }
  console.log("Done.");
  await agent.destroy?.();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
