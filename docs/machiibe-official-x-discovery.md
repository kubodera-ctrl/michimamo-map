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
