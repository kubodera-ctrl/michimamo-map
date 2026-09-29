# Production Edge Function rollback archive — 2026-09-30

Exact source snapshot captured from Supabase Production project `ckftozjhdszlwqnylmxv` immediately before disabling six beta-unused functions.

- Keep these files outside `supabase/functions/` so they cannot be accidentally redeployed.
- `manifest.json` records the deployed version and `verify_jwt` state.
- Restoring a function requires an explicit reviewed redeploy from this archive.
