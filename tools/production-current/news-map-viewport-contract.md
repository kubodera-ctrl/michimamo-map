# News MAP viewport / region read contract — design only

Status: P4/P5 design contract. No Production migration, RPC or endpoint is created by this document.

## Goal

Separate **DB retention/storage volume** from **the number of news pins rendered in one map view**. Canonical news may grow, but the client must not return to `SELECT all -> create every marker`.

## Request contract

A MAP news request is service-scoped and bounded:

- `service=machimamo`
- `from` / `to` with a maximum 60-day active window
- either viewport `bounds={south,west,north,east}` or an explicit prefecture/region scope
- optional municipality filter
- cursor pagination
- default limit 250, hard contract maximum 500 per page

No unbounded "all Japan / all time" read is admitted.

## Public MAP projection

The MAP response carries only fields needed to draw/select a pin:

- candidateId
- informationKind
- headline
- prefecture
- municipality
- newsDate
- category
- representativeLocation {lat, lon, precision}

Do **not** include sourceHash, full verifiedFacts, rights evidence, audit trail, revision history or publishing state in the public MAP projection. Those belong to the admin/detail API contract.

Representative location precision remains explicit: `prefecture | municipality | exact_public`. For police/safety news, municipality representative coordinates are preferred unless an exact public location is explicitly safe and supported by source policy.

## Future endpoint shape

A future Admin API/BFF / public read API can implement this contract as a region/viewport query returning:

`{items, nextCursor, truncated, queryWindow}`

The database may retain the required canonical/audit metadata beyond the active MAP window while the public MAP excludes inactive/expired records.

## Not implemented here

- no Supabase migration
- no Production RPC
- no new index
- no map data switch
- no mass import

Before Production connection, query-plan/index design and iPhone map performance must be tested against realistic volumes.

## Contract hardening

The executable contract additionally requires:
- prefecture scope to be one of the official 47 prefecture names;
- at most 25 municipality filters per request, deduplicated, and municipality filters require an explicit prefecture scope;
- stable ordering `newsDate desc, candidateId desc` for cursor pagination;
- explicit domain/API decision `mapDisplayEligible=true` before a candidate can enter the public MAP projection;
- MAP eligibility is independent from SNS `publishEligible`;
- `LEGACY_UNVERIFIED` cannot enter the public canonical MAP projection;
- page responses cannot exceed the requested limit and cannot contain duplicate candidateId values.

This remains a contract-only change: no Production RPC, index or migration is added.
