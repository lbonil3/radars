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

## Day theme (default) with Night as a preference

Baseline tag `national-pre-theme`; finished tag `national-v-theme`. Day is the default for everyone; Night (the original dark look, unchanged) or Auto (follows the device) is picked in the bottom **More** menu → Theme, saved as `nr.theme`. Service worker cache bumped to `radars-national-v13`. Landing page and Texas Opportunity not changed.

| Change | Commit | Rollback |
|---|---|---|
| Day theme + Night/Auto preference, pre-paint script, theme-color, tests | adcb42c | `git revert adcb42c` |

Whole theme change: `git revert --no-edit national-pre-theme..national-v-theme` (data-bot commits in the range only touch data and are re-applied by the next daily run). Reverting leaves a harmless unused `nr.theme` key in browsers.

## v4.1 to v4.5 (sources, change tracking, since-last-visit, polish, no lane grouping)

Baseline tag `national-pre-v4`; finished tag `national-v4-final`. Newest first when undoing.

| Step | Commit / tag | Rollback |
|---|---|---|
| v4.5 one combined ungrouped set (no lane picker, no fee gating, optional minimum amount), cache v18 | 484a80c, `national-v4.5` (baseline `national-pre-nogroup`) | `git revert --no-edit national-pre-nogroup..national-v4.5` |
| v4.4 collapsible Top of this view, empty states, two-column desktop, cache v17 | 4a97bad, `national-v4.4` | `git revert 4a97bad` |
| v4.3 since-last-visit summary + on-device .ics export, cache v16 | 45ba30c, `national-v4.3` | `git revert 45ba30c` |
| v4.2 change tracking (due date, addendum, status, value, title), cache v15 | 63e233a, `national-v4.2` | `git revert 63e233a` |
| v4.1 Source health, polite Bonfire throttling, Houston SWMB public layer, cache v14 | f3c725c, `national-v4.1` | `git revert f3c725c` (also undoes the feed fixes) |

Whole batch: `git revert --no-edit national-pre-v4..national-v4-final`. Daily data commits in that range are re-applied by the next daily refresh.

## v5 (water / wastewater, no value floor, future-first) — Oct 29, 2026
- Before v5: tag `national-pre-water` (18a0ff2). v5 code: a522203 (no floor + EPA SRF source), 8b305b9 (Upcoming scope, upcoming-first sort, Positionable). Tags `national-v5` (8b305b9), `national-v5-final` (c8886d9), `national-v5.3` (Data-tab notes, latest).
- Roll back without force: `git revert --no-edit 8b305b9 a522203 && git push` (keeps history), then run the National refresh so the data files match the code.
- Or restore files only: `git checkout national-pre-water -- national scripts/build-national.js && git commit -m "Restore National pre-v5" && git push`.

## v5.4 (weekly list fix for phones) — Oct 29, 2026
- Before: tag `national-pre-printfix` (32a746f). Fix: 0e58057, 1cf4714. Tags `national-v5.4` (1cf4714), `national-v5.4-final` (this ROLLBACK commit).
- Roll back without force: `git revert --no-edit national-pre-printfix..national-v5.4 && git push`.

## v6 (list-first interface) — Oct 30, 2026
- Before: tag `national-pre-v6` (59d9bf7 = `national-v5.4-final`). Groups: `national-v6.1` (list first + small map + count markers), `national-v6.2` (slim header, one control row, switch CSS fix, Texas prompt in drawer, no headline sum, phone tidy), `national-v6.3` (card order), `national-v6.4` (quick filters, tags, saved sets, sw v21). `national-v6` = v6.4 code; `national-v6-final` = docs commit.
- Roll back without force: `git revert --no-edit national-pre-v6..national-v6-final && git push`.
- Saved filter sets stay in localStorage `nr.filtersets`; older versions ignore that key.
