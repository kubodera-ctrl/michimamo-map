# Cloudflare Pages beta hosting lane

This directory contains Cloudflare-specific static hosting controls only.

## Safety model

- Source baseline: PR #40 fixed HEAD `08348ce7575ab56057b721c3f2c4fc8c98459967`.
- Vercel production is not modified by this lane.
- Build output is `.cloudflare-pages-dist/`; do **not** upload the repository root.
- The staging script copies only browser runtime files plus `assets/`, then adds Pages `_headers` and `_redirects`.
- Supabase project/database endpoints remain unchanged.
- Production Edge Functions, LINE Developers settings, DNS, billing, and secrets are separate Founder approval gates.

## Build

`node scripts/build_cloudflare_pages.mjs`

Expected marker:

`CLOUDFLARE_PAGES_DIST_READY <path>`

## Intended non-production deploy

After Cloudflare account plan/usage/permissions are independently confirmed as existing, free, and sufficient:

`npx wrangler pages deploy .cloudflare-pages-dist --project-name=<dedicated-project> --branch=hosting-preview --commit-hash=<exact-sha>`

Do not create or deploy a Pages project until the account gate is PASS.

## Auth/CORS gate

The Edge source is prepared to support an exact comma-separated allowlist via `FRONTEND_ORIGINS`.
No wildcard `*.pages.dev` origin is allowed.

For `line-auth`, the callback return origin is bound into the OAuth state and is accepted only when it is in the exact allowlist. Existing 43-character legacy state remains compatible and returns to `FRONTEND_URL`.

Applying the Edge source or setting `FRONTEND_ORIGINS` in Production is **not** authorized by this branch. It requires a separate Founder approval after the exact Cloudflare preview hostname exists.

## Initial production recovery

There is no earlier Cloudflare production deployment to roll back to. The first-release stop procedure is therefore:

1. keep Vercel existing deployment unchanged but do not treat Hobby as the commercial rollback target;
2. validate Cloudflare preview before any production routing;
3. if first Cloudflare production smoke fails, stop traffic cutover / revert DNS or custom-domain attachment if one was separately approved;
4. keep the failed Cloudflare deployment for evidence; do not delete it as an automatic rollback;
5. after one successful Cloudflare production deployment exists, later releases may use Cloudflare Pages rollback to that successful deployment.
