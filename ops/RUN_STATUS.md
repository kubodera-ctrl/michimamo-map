[RUN STATUS]

state:
RUNNING

updated_at:
2026-09-30 12:45 JST

current_task:
β release final QA preparation: update QA evidence, complete backup/rollback runbook, read-only production inventory

waiting_on:
Vercel Preview quota recovery and main exact SHA Preview availability; user device QA after Preview; Cloudflare Dashboard logs are non-critical

latest_head:
main ff8703ecd06f04588ad9c878be40061154114ad6

latest_ci:
PR #36 RC HEAD 111c3d85ba032192351b8fd8021ec8433fbce32c: Camera Regression, Beta Edge Functions Check, Event Site Check, Beta Release Gate PASS. Audit confirms PR HEAD to main has merge commit only / 0 changed files; treat as content-equivalent evidence, not as a workflow run on main. main SHA workflow runs: 0.

next:
Update QA workbook with audited Production aliases and CI equivalence. Prepare read-only backup/rollback runbook. Keep Production unchanged and do not create Preview until quota/readiness is confirmed.

Production:
known-good dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4 READY, target=production, source=cli
aliases: machimamo-map.vercel.app; michimamo-map.vercel.app; machimamo-map-miti4.vercel.app
main auto Production deployment remains disabled.

Vercel Preview budget:
No new Preview created in this run. Generate one Preview only for exact QA baseline main SHA ff8703ecd06f04588ad9c878be40061154114ad6 after quota recovery, reusing it for QA.

Release QA:
Not run. iPhone Safari normal/private, Android Chrome, first map display, mobile Lighthouse, real accessibility remain untested.
