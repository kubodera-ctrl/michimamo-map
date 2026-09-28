# Fetch Adapter implementation status

PR #24 dry-run parser/normalizer layer.

Implemented pure parsers:
- OPEN_DATA CSV / JSON
- RSS / Atom
- ICS VEVENT
- JSON_API
- JSON_LD schema.org/Event
- HTML_STRUCTURED: application/ld+json Event only
- MANUAL rows

Network behavior:
- parser tests perform no external request.
- buildDryRunFetchPlan may plan a source URL regardless of automation approval.
- buildApprovedFetchPlan returns null unless Source Registry passes:
  active + automated_fetch_allowed + terms reviewed_allowed + robots not disallowed + commercial not disallowed + non-MANUAL.

Normalization:
- exact known keys / schema.org fields only.
- unknown indoor/rain/accessibility/ages/price/image remain null/unknown.
- image URL is deliberately not promoted by generic normalizer; rights review is separate.
- runtime SHA-256 remains ingestion worker responsibility; parser uses dry-run identity only for unit tests.

Source-specific field mapping belongs in source adapter config/normalizer modules, not public.events or UI.
