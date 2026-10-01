# まちイベ Official X Discovery Policy

## Purpose

Official X is an oshi-event discovery, breaking-announcement and change-detection lane.
It is not a license to scrape x.com and it does not automatically make social content Publishable.

## Evidence priority

1. Official event web page
2. Verified official X post
3. X post that still needs account review
4. Non-official social post: discovery candidate only

When an X announcement later gains an official web event page, the web page becomes the primary event evidence.
The X post remains useful as announcement/change provenance.

## Account verification

Strong evidence:
- official website backlinks to the X account
- official operator page explicitly names the X account

Supporting evidence:
- official-domain consistency
- gold checkmark
- grey checkmark
- Verified Organization affiliation badge

Insufficient alone:
- blue checkmark
- display-name similarity
- follower count

A blue checkmark is deliberately not treated as proof of officiality.

## Allowed X-only facts evidence

A post can supply event facts only when:
- the post is public
- the source account is verified_official under this project contract
- event facts are explicit in the post
- the source post URL is retained
- unstated fields are not inferred
- the full post body is not republished
- X-hosted media is not copied/reused

Allowed fact fields are constrained by
`data/machiibe/official_x_source_registry_v1.json`.

## Automation boundary

Allowed now:
- registry design
- manual research
- account cross-checking
- synthetic policy/unit tests
- facts-only contract design

Blocked now:
- x.com web scraping
- DOM/browser scripting against X
- X API recurring fetch
- OAuth
- new paid API usage
- Production ingest
- X media copying

Official API automation may only be enabled after all three are true:
- API access approved
- API cost approved
- current policy/ToS review completed

## User-facing embed

Default surface is link-out ("Xで見る"), not embedded posts.
Embedding stays a separate privacy/UX gate because X for Websites may receive page URL, IP address, browser/OS and cookie information when X widgets are rendered.

## Official policy references

- https://help.x.com/en/rules-and-policies/x-automation
- https://help.x.com/en/rules-and-policies/x-api
- https://help.x.com/en/rules-and-policies/profile-labels
- https://help.x.com/en/x-for-websites-ads-info-and-privacy
- https://help.x.com/en/using-x/how-to-embed-a-post

## Stage C: X API current pricing / quota research (2026-10-01)

Research only. No Developer App creation, credential issuance, OAuth, credit purchase, API request, recurring fetch or Production ingest was performed.

Official docs currently describe X API v2 as pay-per-usage:
- no subscription
- no minimum spend
- credits are purchased upfront
- Post Read: USD 0.005 per returned Post resource
- User Read: USD 0.010 per returned User resource
- pay-per-use Post reads are capped at 2,000,000 per monthly billing cycle
- the same billable resource is normally deduplicated within a 24-hour UTC day
- rates are subject to change; re-check the Developer Console immediately before enabling any paid access
- spending limits are available

Current rate-limit snapshot used for architecture:
- `GET /2/users/:id/tweets`: 10,000 requests / 15 min per app
- `GET /2/tweets/search/recent`: 450 requests / 15 min per app, up to 100 results per request

Recommended first paid pilot, if later approved:
1. Resolve verified registry accounts to X user IDs.
2. Read each verified account timeline with `GET /2/users/{id}/tweets`.
3. Persist only provenance IDs and normalized facts allowed by the facts-only contract.
4. Use `since_id`/equivalent incremental state where supported by the endpoint contract and avoid repeatedly requesting old pages.
5. Keep broad recent search as a secondary gap-discovery lane, not the primary verified-account ingestion route.
6. Set an explicit spending limit before the first paid API call.
7. Keep auto-recharge OFF by project policy unless separately approved.

Why timeline-first:
The billing unit for Post reads is the returned Post resource. Narrow verified-account timelines should reduce irrelevant billable resources compared with broad keyword searches, while current app-level rate limits are ample for a small verified registry.

This is an architecture recommendation, not an approval to purchase credits or connect the API.

Official references:
- https://docs.x.com/x-api/getting-started/about-x-api
- https://docs.x.com/x-api/getting-started/pricing
- https://docs.x.com/x-api/fundamentals/rate-limits


## Stage D preparation: verified registry / cost gate (2026-10-01)

No API connection was made. The verified registry was expanded from 3 to 10 accounts using only explicit official-site backlinks or official operator/store pages.

Current verified handles:
- @SanrioGames_JP
- @SanrioKML_JP
- @jo1xsanrio
- @purolandjp
- @sanrio_ent
- @eddy_sanrio
- @kabukinyantaro
- @namjatown765
- @animatejoji
- @animateSt_grt

Every row keeps:
- user_id=null until an approved API pilot resolves it with provenance
- automated_fetch_allowed=false
- api_fetch_enabled=false
- media_reuse_allowed=false
- full_post_body_reuse_allowed=false

Structured cost scenarios:
`data/machiibe/x_api_cost_scenarios_v1.json`

Scenario assumptions:
- 30-day month
- timeline-first
- max_results=5 for the minimal pilot scenario
- Post Read USD 0.005 per returned Post resource
- no-dedup conservative case: every poll returns five billable Posts
- dedup lower case: the same five Posts repeat within the UTC day and 24-hour dedup works; new unique Posts remain billable
- repeated username -> user-ID lookup is not part of polling design; user_id is resolved once only after approval and then pinned in the verified registry

For the current 10-account registry at 2 polls/day:
- conservative no-dedup Post Read estimate: USD 15/month
- dedup/no-new-Posts lower estimate: USD 7.50/month
- one-time 10-account User Read lookup at the current USD 0.010/resource snapshot: USD 0.10 if one User resource is returned per lookup
- draft spending-limit proposal: USD 20/month
- approval state: NOT APPROVED

The 24-hour billing deduplication is documented by X as a soft guarantee, so it is never used as the budget ceiling. The conservative no-dedup scenario remains the cost gate.

The pilot approval request must not be raised until registry size, cadence, expected returned Post resources, conservative monthly bound, spending limit, auto-recharge OFF verification, token/secret handling, stop procedure, policy re-check, storage/deletion policy and Production connectivity are all documented.
