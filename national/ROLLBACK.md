# National Radar v2: rollback notes

Baseline before v2: tag `national-pre-v2`. Each item is one commit with its own tag; undo one item with
`git revert <commit> && git push origin main` (never force-push). Data-refresh commits by github-actions[bot] are
independent and can stay.

| Item | Tag | What it changed | Rollback |
|---|---|---|---|
| 1 Daily data refresh | `national-v2.1` | `.github/workflows/refresh-national.yml` + `refresh-opportunities.yml` installed (daily + manual), workflow also refreshes `bid-cost/prices.json` from hydraulics-tools if reachable; "Data updated" label; sw cache v8 | `git revert c727019`; or just disable: `gh workflow disable refresh-national.yml -R lbonil3/radars` (and `refresh-opportunities.yml`) |
| 2 New since last visit + Closing soon | `national-v2.2` | `national/v2.js`, digest chips in app, `firstSeen` in data + build carry-forward | `git revert 48edfc6` (the data files keep a harmless `firstSeen` field until the next refresh after the revert) |
| 3 Region focus | `national-v2.3` | region selector + hint + Texas Opportunity link (`v2.js`, `app.js`, `index.html`, `style.css`) | `git revert 1c0fbec`; users' saved `nr.region` is then ignored |
| 4 My pursuits tab | `national-v2.4` | Pursuits tab, weekly print, CSV (`v2.js` pursuitRows, `app.js`, `index.html`, `style.css`) | `git revert 8a7a454 04dbd9e e0e8899`; capture data in localStorage is untouched |
| 5 Confirmed only + duplicate cards | `national-v2.5` / `national-v2-final` | saved Confirmed-only switch, on-screen cross-source grouping with Also listed in (`v2.js` groupDupes, fixtures) | `git revert 2e092c1`; whole v2: `git revert --no-edit national-pre-v2..national-v2-final` (skip data commits by bot if you want to keep fresh data) |

Note: commit 04dbd9e briefly broke the page (JS syntax error, about 3 minutes live); 8a7a454 fixed it and test.js now syntax-checks every script.

## v3 interface simplification

Baseline tag `national-pre-ui`; finished state tag `national-v3-ui`. Data files, build scripts and refresh workflows were not touched. Saved settings (`nr.region`, `nr.confirmedOnly`, `nr.watch`, `nr.capture`, `nr.seenThrough`) keep working; `nr.tab` (last view) is new.

| Change | Commit | Rollback |
|---|---|---|
| P1a one-line explainer + lane dropdown + 4 scopes / More | 534cd29 | `git revert 534cd29` |
| P1b single Filters drawer + badge + Reset; Confirmed only visible; Hide unconfirmed removed | cfde5e1 | `git revert cfde5e1` |
| P1c max 2 badges per card | ebd40c9 | `git revert ebd40c9` |
| P2a 4 bottom tabs + More, header New/Closing pill, one-line summary | 5868dd6 | `git revert 5868dd6` |
| P2b sheet order (rules last), Data health summary | 282f4d7 | `git revert 282f4d7` |
| P3 remember last view, closed menu fix | 2648c88 | `git revert 2648c88` |
| docs + search placeholder | f0dc693 | `git revert f0dc693` |

Whole UI change at once: `git revert --no-edit national-pre-ui..national-v3-ui` (skips nothing; github-actions data commits in that range are only data and can be re-applied by the next daily run).
