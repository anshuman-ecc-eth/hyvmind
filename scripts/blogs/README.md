# Blog admin

Blog posts are stored **on-chain** in the `backend` canister (HTML body + optional
banner image), served to readers only after they supply the correct blog password.
Content is never committed to this repo (see `.gitignore`).

## Architecture

- **Gate**: the password is checked **on the backend** in the same `shared` call that
  returns content (`getBlogPosts` / `getBlogPostContent`). There is no public query to
  bypass — a request without the correct digest gets `[]`/`null`.
- **Password**: stored as `salt` + `SHA-256(salt ++ password)` (digest computed
  client-side via Web Crypto, sent to the backend for comparison). Plus an
  admin-recovery IBE ciphertext (vetKeys) for future recovery — not part of the gate.
- **Non-authenticated readers** work: the frontend uses an anonymous agent
  (`AnonymousIdentity`) so no login is required — the password is the credential.
- **Non-public**: the old static files in `src/frontend/public/blogs/` were removed.
  A backup lives in `scripts/blogs_backup/` (git-ignored) and in git tag
  `blogs-v1-pre-removal`.

## Setting / rotating the blog password

Use the terminal command in the running app (admin):

```
/setpw <password>
```

This generates a fresh salt, computes the SHA-256 digest, and stores the salt + digest
+ an admin-recovery IBE ciphertext via `setBlogPassword`. Re-running overrides the
previous password.

## Registering a post (admin)

1. Stage the post in `scripts/blogs/staging/<slug>/`:
   - `post.json` — `{ "id", "title", "author", "published", "lastEdited" }`
     (dates as display strings, e.g. `17 Aug, 26`)
   - `article.html` — clean standalone HTML5 (normalize with
     `pandoc input.html -f html -t html5 --standalone -o article.html`)
   - `banner.png` — optional banner image
2. Register it (must be the admin identity of the backend canister):

```bash
BACKEND_CANISTER_ID=<id> ADMIN_SECRET_HEX=<64-hex> node scripts/blog-admin.mjs
# or ADMIN_KEY_JSON='["pubhex","sechex"]'
```

`setBlogPost` upserts by `id`; passing an empty `article.html` deletes that post.

## Password gate backend methods

- `setBlogPassword(salt, hash, ciphertext)` — admin; set/override the password
- `clearBlogPassword()` — admin; remove the gate
- `getBlogPasswordConfig()` — public query; returns salt/hash/ciphertext (no plaintext)
- `getBlogPosts(passwordDigest)` — shared; metadata list, gated on digest
- `getBlogPostContent(postId, passwordDigest)` — shared; HTML + banner, gated
- `setBlogPost(meta, html, banner)` — admin; upsert/delete a post
- `getBlogPasswordPublicKey()` / `deriveBlogPasswordVetKey(tpk)` — vetKD recovery plumbing

## Security notes

- Blob reads are unauthenticated by design (non-logged-in readers), so the password
  digest is the sole capability. A preimage of SHA-256 is infeasible, so exposing the
  salt/hash via `getBlogPasswordConfig` is safe.
- vetKeys is used only for encrypted-at-rest admin recovery, not for the gate.
- This stops automated anonymous scrapers/crawlers; a human with the password can read
  posts (the intended shared-password model).
