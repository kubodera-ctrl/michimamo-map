# Canonical news candidate Admin API/BFF contract

Status: P4 design + validation contract. No Production endpoint or migration is created by this document.

## Purpose

The machimamo admin UI must not depend permanently on legacy `public.spots`. A future Admin API/BFF should return service-scoped, source-verified news candidates that can be consumed by the current machimamo admin UI and the future integrated operations center without changing Production SINGLE/WEEKLY rules.

## Read endpoint

Suggested contract shape:

`GET /admin/v1/news-candidates?service=machimamo&informationKind=&prefecture=&municipality=&from=&to=&status=&week=&limit=&cursor=`

The exact deployment surface is intentionally not fixed yet. It may be a Cloudflare Worker/Admin BFF or another approved server-side route.

Required properties:

- authentication/authorization occurs server-side for Production admin use;
- Preview may expose a separate read-only QA fixture/adapter but cannot inherit write permissions;
- response must be service-scoped;
- pagination must be cursor-based or otherwise bounded;
- no service_role key is exposed to the browser;
- no publication state is inferred from UI state.

## Candidate response

Each canonical candidate uses `machimamo-news-candidate-v1` and includes:

- `service = machimamo`
- `candidateId`
- `sourceEventId` for POLICE_OFFICIAL (stable source identity; required)
- `informationKind = POLICE_OFFICIAL | LOCAL_ANOMALY`
- `headline`
- `prefecture`
- `municipality` when available
- `newsDate`
- `sourceStatus`
- `factsStatus`
- `rightsStatus`
- `correctionStatus`
- `verifiedFacts[]`
- source name / HTTPS URL / publishedAt / checkedAt / SHA-256 `sourceHash`
- rights level / media use mode / commercial-use flag / checkedAt / evidence URL / attribution text
- source-specific `rightsScopeConfirmed` where the upstream license excludes subfields (for example maps, URL descriptions, contact descriptions)

The executable validator is `news-candidate-contract.cjs`.

## Publish eligibility

A candidate is only eligible to advance toward render input when:

- source status is `verified`;
- facts status is `verified`;
- rights status is `cleared`;
- correction status is `current`;
- source URL and rights evidence are HTTPS;
- source hash is present;
- verifiedFacts is non-empty;
- the rights level is one of the CURRENT publishable levels;
- commercial use is explicitly allowed;
- upstream-source scope exclusions have been separated and explicitly confirmed before rightsStatus becomes `cleared`;
- CC BY records contain attribution text.

Passing this candidate gate does not itself publish or render anything. The CURRENT render input validator, renderer QC, admin approval and platform publishing gates still apply.

## Correction handling

Official sources may correct or withdraw previously published content.

- store a stable candidate/source identity and latest source hash;
- if the source hash changes after approval, do not mutate an approved revision silently;
- mark the previous candidate/revision as needing re-verification;
- corrections create a new revision or candidate state transition;
- withdrawn source records cannot remain publish eligible;
- publication correction/removal policy is handled by Publishing/Audit, not by the candidate UI.

## Source-specific rights

A Source Master entry is configuration, not evidence that every record is publishable.

Example currently rechecked: the Tokyo Metropolitan Police Department's "メールけいしちょう OPEN DATA" states that covered data is provided under CC BY 4.0, requests source attribution, asks users not to alter facts into something different, and requires following corrections. It excludes map information, hyperlink descriptions and contact descriptions from the covered information. Rights must therefore be evaluated at the record/media layer, not assumed from the site name alone.

Official source:
- https://mail.keishicho.metro.tokyo.lg.jp/opendata/
- https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy

## Legacy bridge

`LEGACY_UNVERIFIED` is UI/migration-only and is not accepted by the canonical candidate validator.

Legacy rows:
- can be displayed read-only;
- cannot be promoted merely by selecting them;
- need source provenance reconstruction or fresh retrieval from a canonical source;
- remain visibly distinguished until migrated.

## Storage boundary

Do not create a machimamo-only duplicate of shared Publishing state.

Candidate ingestion/provenance storage and Publishing storage have different responsibilities:
- candidate/source layer: raw source identity, facts, rights, correction status, source hash;
- Production/Revision: frozen render input and QC;
- Publishing: platform-specific post state and external IDs;
- Audit: actor/action/reason/history.

The final table names are intentionally not fixed until the machiibe shared schema and management-center data model are reconciled.


## Keishicho direct adapter

`keishicho-open-data-adapter.cjs` is the transport-independent dry-run conversion core for the Tokyo Metropolitan Police Department's "メールけいしちょう OPEN DATA".

It accepts normalized official-source records and produces `machimamo-news-candidate-v1` candidates. It does not write Supabase and does not publish.

Preserved fields include:
- stable `sourceEventId`;
- source publish/occurrence dates;
- SHA-256 `sourceHash` over the frozen source record;
- Tokyo prefecture and municipality;
- source category + canonical category;
- headline and verified facts without invented details;
- CC BY rights metadata, attribution and evidence URL;
- correction status;
- `lastVerifiedAt`;
- structured locality evidence.

The source transport/export parser is intentionally separate from this mapper because the public Open DATA site exposes an interactive export UI and the exact current download payload contract must be captured from the live export before hard-coding an endpoint or column schema. The mapper keeps `rightsStatus=needs_review` unless normalized input explicitly sets `rightsScopeConfirmed=true`, so excluded map/URL/contact material cannot become publishable by default. Until that capture is verified, do not guess the download endpoint.

Dry-run fixtures based on the verified Tokyo rows in Drive (Nerima, Hachioji, Itabashi; published 2026-09-24) are used for the adapter regression test. Production DB writes remain prohibited.

## Read-only admin detail projection

The candidate list and candidate detail are separate UI responsibilities.

A detail response is service-scoped (service=machimamo) and may expose the full admin read model:
- headline / informationKind / prefecture / municipality / newsDate / category;
- sourceEventId / source name / source URL / source date / sourceHash / last verified;
- verifiedFacts;
- sourceStatus / factsStatus / rightsStatus / correctionStatus;
- rights level / commercialUseAllowed / attribution / rights evidence / rightsScopeConfirmed;
- locality evidence;
- retention state;
- classifier topic / priority / include / reason;
- explicit publishEligible and publish blockers.

The UI must not infer that a workflow step completed merely because a detail screen exists.

The future workflow is represented as distinct responsibility boundaries:

Candidate → Production Preview → Render → QC → Approval → Publishing Preview → X/TikTok → final publication confirmation.

Current state:
- Candidate/detail read: implemented for LEGACY_UNVERIFIED; canonical detail view model supported.
- Production Preview: unconnected.
- Render: blocked by exact v7 source.
- QC: unconnected.
- Approval: unconnected.
- Publishing Preview: unconnected.
- X/TikTok: connection required.

LEGACY_UNVERIFIED remains read-only at every downstream boundary. A legacy row may open a detail view but never becomes render/approval/publishing eligible by that action.

The detail UI is intentionally a thin presentation layer. Candidate validation, Production admission, Render, QC, Approval, Publishing and Audit remain separate domain/API responsibilities so a future Admin API/BFF / integrated management OS can replace the frontend without redefining these states.
