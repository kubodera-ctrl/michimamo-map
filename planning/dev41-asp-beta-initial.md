# DEV41 ASP β Initial — 2026-09-30
Authority: Google Sheets「まちまも・まちイベ ASP案件マスター」。Git is not the business source of truth.

Initial shortlist: ofr_000080 るるぶトラベル, ofr_000083 じゃらんレンタカー, ofr_000085 たびらいレンタカー.
All are ValueCommerce / machimamo site 3779876 / approved Web media with official tracking URL and recorded original text-link tag. Runtime visible cap: 3.

Beta rules: normal ads only; reward_enabled=false; no conversion-to-point; Point Exchange OFF; Web browser only; PWA standalone/app/SNS/LINE fail closed; 0 offers empty state; no legacy hardcoded fallback.

Publication server gate: approval + source/media/production approval + media_conditions_verified + link_verified + approved placement + active/listing_enabled + current validity.

Link verification policy: automated HEAD/GET of ASP tracking URLs remains prohibited by ASP master. CI validates exact source URL/tag correspondence without network. link_verified stays false until a non-synthetic live navigation/redirect check is available.

Migrations are CODE-ONLY and MUST NOT be applied to Production before explicit owner approval.