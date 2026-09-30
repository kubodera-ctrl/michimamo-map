[RUN STATUS]

state:
WAITING_USER

updated_at:
2026-09-30 14:40 JST

current_task:
QA evidence reconciliation completed. Final Candidate Preview adopted by content-equivalent Git comparison; owner physical-device QA remains.

waiting_on:
Owner iPhone Safari normal + Private combined QA and Android Chrome physical-device availability/decision. No other blocker prevents candidate evidence reuse. No additional Preview required.

latest_head:
main c4e16b0dd75f2625ae56087446756db887d6674f
PR #37 HEAD b99ce54dc2ef6cf82420adab1862dbb86ce91186

latest_ci:
PR #37 HEAD CI SUCCESS: Beta Release Gate, Event Site Check, Camera Regression. PR HEAD -> current main: 1 merge commit, changed files 0; content-equivalent evidence only. Current main SHA workflow runs=0; do not say main CI PASS.

next:
Owner's bundled iPhone normal/Private and Android physical QA on https://machimamo-kebomv86m-miti4.vercel.app/ (QA-015/016/017). Android mobile emulation is a separate developer check; do not report it as physical PASS. Then refresh read-only Production security inventory and acquire actual release backup immediately before Production deployment. Lighthouse is post-deploy measurement unless safe local/authenticated runner is available. Production deployment requires explicit owner approval.

Final Candidate Preview:
dpl_6koAu9GSzG7hyHdV6y8nzcxaUwtE READY; URL https://machimamo-kebomv86m-miti4.vercel.app/
source branch fix/beta-map-init-duplicate-now; source SHA b99ce54dc2ef6cf82420adab1862dbb86ce91186
Current main compare: ahead 1 merge commit, changed files 0. Reuse candidate; no extra Preview. Quota remaining not exposed; recovered enough to create candidate.

QA evidence:
QA-011 Preview provenance/content-equivalence PASS.
QA-012 First map PASS: Leaflet initialized, 28 tiles.
QA-013 PC Chrome smoke PASS: map/menu/Terms/Privacy; app-origin console errors/warnings 0. Edge untested separately.
Terms/Privacy runtime PASS. Static accessibility CI PASS; physical keyboard/focus/VoiceOver follow-up separated.
QA-014 Lighthouse moved to POST_DEPLOY_MEASUREMENT; PSI measured Vercel login redirect, score discarded.
QA-015/016 iPhone physical QA pending; QA-017 Android physical QA pending.
QA-018 RUNBOOK_PASS / BACKUP_ARTIFACT_PENDING.
Post-deploy smoke is NOT_APPLICABLE_YET / APPROVAL_GATED.
ASP fail-closed and Point Exchange β OFF remain non-blocking. Cloudflare failure, A8 URL evidence, formal domain, ranking hardening are non-P0.

Production:
known-good dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4 READY, target=production, source=cli.
aliases: machimamo-map.vercel.app; michimamo-map.vercel.app; machimamo-map-miti4.vercel.app
main auto Production deployment OFF. No deploy/promote/alias change/Production write.
