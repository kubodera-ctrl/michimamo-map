# Point ledger beta contract — 2026-09-28

## Goal
Keep the existing ledger append-only, fix the dormant exchange-issued mismatch, and define future reversal / ASP integration without enabling those features.

## Reason contract
`tools/points/point-reason-contract.cjs` is the code-level vocabulary. A reason being described there does **not** enable the corresponding feature.

The additive DB migration enables only the currently required `point_exchange` debit reason. Planned reasons remain rejected by the DB until a later explicitly approved migration:
- `point_exchange_reversal`
- `asp_reward`
- `asp_reward_reversal`
- `vehicle_reward`

Existing/legacy-compatible reasons are preserved so historical rows remain valid.

## Balance projection
Formal authenticated projection:
- `gross`: current `profiles.point`
- `reserved`: sum of exchange requests in `requested / points_reserved / approved / issuing`
- `available`: `max(0, gross - reserved)`

ASP pending/verified-but-not-approved value is not part of any of these values. It stays in the future conversion domain until an `asp_reward` ledger credit is approved.

The existing exchange UI currently reads `profiles.point`/displayed point text. Before exchange is enabled, it should be changed to consume the server projection instead.

## Append-only reversal design
Do not update/delete the original ledger transaction.

Future schema proposal:
- `point_transaction_reversals`
  - `original_transaction_id bigint not null unique -> point_transactions(id)`
  - `reversal_transaction_id bigint not null unique -> point_transactions(id)`
  - `source text not null` (`point_exchange`, `asp_conversion`, ...)
  - `reversal_ref_key text not null unique`
  - `created_at timestamptz not null default now()`

A reversal is a new ledger row whose amount is the exact negation of the original:
- ASP reward `+500` -> `asp_reward_reversal -500`
- exchange debit `-30000` -> `point_exchange_reversal +30000`

The reversal RPC must:
1. lock the original/reversal scope;
2. verify the original reason/source is reversible;
3. reject an already-reversed original transaction;
4. call the central ledger append function with a stable reversal ref key;
5. insert the companion link row in the same transaction.

No reversal feature is enabled in beta initial release.

## ASP conversion state
Future conversion records are separate from the point ledger:
`pending -> verified -> approved | rejected -> reversed`

Only `approved` appends `asp_reward`.
`reversed` after a credited approval appends `asp_reward_reversal`.
Provider conversion ID + provider/program identity must form a stable unique/idempotency key.
`pending` and `verified` never increase available points.

## Vehicle reward
`vehicle_reward` is vocabulary only. There is no DB reason, awarding RPC, or beta enablement until the valid-detection definition and abuse controls are approved.

## Exchange beta position
Initial beta keeps:
- `exchange_enabled=false`
- `processing_enabled=false`

The isolated DB test is a readiness test only; it temporarily enables both flags inside a disposable PostgreSQL service and rolls all behavior-test data back.
