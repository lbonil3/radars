# National Radar v2: rollback notes

Baseline before v2: tag `national-pre-v2`. Each item is one commit with its own tag; undo one item with
`git revert <commit> && git push origin main` (never force-push). Data-refresh commits by github-actions[bot] are
independent and can stay.

| Item | Tag | What it changed | Rollback |
|---|---|---|---|
| 1 Daily data refresh | `national-v2.1` | `.github/workflows/refresh-national.yml` + `refresh-opportunities.yml` installed (daily + manual), workflow also refreshes `bid-cost/prices.json` from hydraulics-tools if reachable; "Data updated" label; sw cache v8 | `git revert <item-1 commit>`; or just disable: `gh workflow disable refresh-national.yml -R lbonil3/radars` (and `refresh-opportunities.yml`) |
| 2 New since last visit + Closing soon | `national-v2.2` | `national/v2.js`, digest chips in app, `firstSeen` in data + build carry-forward | `git revert <item-2 commit>` (the data files keep a harmless `firstSeen` field until the next refresh after the revert) |
