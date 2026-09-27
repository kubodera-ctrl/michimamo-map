# Police Scheduled Workflow Stop Audit — 2026-09-27

対象: `.github/workflows/police_cron.yml` / workflow ID 345947781 / `Ultimate Safety Data Scraper`

## Confirmed

- repository default branch = `main`.
- current main HEAD = `7b4b935a5facb0a441445a9e14adce1982c909e1`, created 2026-09-21T02:44:35Z.
- current workflow file exists on main.
- schedule remains `0 0,6,12,18 * * *`.
- `workflow_dispatch` is declared, but manual dispatch is prohibited for this audit because it writes Production `spots`.
- latest scheduled run = #102 / run ID 35425959465 / 2026-09-19T06:11:59Z / success.
- no `schedule` event run exists after #102 in the repository Actions run collection through 2026-09-27.
- run #102 log: 71 RSS lanes success, 1 lane failure (MCAP XML parse), 599 extracted, 23 inserted, 0 DB insert failures.
- comparing last-run HEAD `30cfae46...` to current main found no changes to `police_cron.yml` or `fetch_police_data.py`.
- repository is active and not archived.
- repository-wide GitHub Actions is not globally stopped: other PR workflows continue to run on 2026-09-27.

## Ruled out by current evidence

- cron expression removed/changed: NO
- workflow file missing from default branch: NO
- default branch changed away from main: NO
- old fetch script change after last success causing scheduled jobs to fail: NO (no jobs are being enqueued, and those files are unchanged)
- repo-wide Actions disabled: NO, other workflows are running
- last scraper job failure preventing future schedule: NO, #102 concluded success

## Remaining cause class

1. workflow-specific enabled/disabled state changed outside the file (manual disable is the leading possibility), or
2. GitHub schedule enqueue/service state specific to this workflow.

The available GitHub connector exposes workflow runs/jobs/logs but not the workflow-definition `state` endpoint or repository Actions policy endpoint. Therefore workflow-specific `state=disabled_manually|active` cannot be verified from this environment. Do not convert this limitation into a claimed diagnosis.

Because the legacy workflow writes MCAP + Google News RSS results directly to Production `spots`, no manual dispatch, re-run, enable action, or workflow mutation is performed.

## Formal direction

Do not make legacy cron restoration the completion target. Build the Keishicho Open DATA canonical pipeline in isolated/read-only mode and migrate toward:

primary source → canonical candidate → source/facts/rights/correction gate → Production → MAP/SNS.
