# Texas Data Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved public A/E sources to the Texas snapshot and make the Consultant services view mean open engineering RFQs, RFPs, and on-call work, with Forecast and Past one click away.

**Architecture:** Parsers and the A/E rule live in `texas/model.js` so the page and the tests share them. `scripts/build-opportunities.js` only fetches and appends sources, then calls `mergeDuplicates`. Open / Forecast / Past is computed by `aeStatus(record, today)` at filter time and is not a stored field. Failed fetches keep the previous records through the existing per-source try/catch.

**Tech Stack:** Vanilla JavaScript, Node 18+ `fetch`, no new dependencies. Tests: `node test.js` (existing Tests workflow).

## Global Constraints

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Backups stay per app; there is no combined National-and-Texas backup file
- Migration never deletes user data
- When a shipped file changes, bump `RadarCache.VERSION` and include any new shared or app files in `RadarCache.files`
- No paid sources, API keys, or logins
- `scripts/build-intel.js` is not modified
- Bonfire detail pages are not fetched
- Do not merge the pull request

## File structure

| File | Responsibility |
|---|---|
| `texas/model.js` | A/E rule, `aeStatus`, ESBD / AggieBid / CTRMA parsers, Bonfire department and HCTRA label, `mergeDuplicates`, new portal list |
| `texas/test-wave1.js` | Fixture tests for each new parser and the filter examples |
| `texas/test-fixtures/wave1/` | Saved real responses (download tokens removed) |
| `texas/test.js` | Loads `test-wave1.js`; updates the older consultant assertions that the new rule changes |
| `scripts/build-opportunities.js` | ESBD POST, AggieBid, CTRMA, departments passed into `bonfireRecord`, duplicate merge |
| `texas/app.js` | Open / Forecast / Past chips, open-A/E count on Sources, updated source notes |
| `shared/filters.js` | Optional `ae` on Texas saved sets, default `open`, old sets kept |
| `shared/cache.js` | `VERSION` 24 |
| `README.md`, `texas/README.md` | What the new sources are and how the A/E view works |

## Before you start

- [ ] **Branch.** From `main`, `git checkout -b cursor/texas-data-wave1-a7ad`.
- [ ] **Spec.** `docs/superpowers/specs/2026-11-13-texas-data-wave1-design.md` is the behavior this plan implements.
- [ ] **Tests first.** Write the failing assertion, run `node texas/test-wave1.js`, then make it pass. Finish with `node test.js`.

---

### Task 1: A/E rule and status

**Files:**
- Modify: `texas/model.js` (`isConsultant`, `svcRule`, `filterRecords`)
- Modify: `texas/test.js` (assertions the new rule changes)
- Test: `texas/test-wave1.js`

**Interfaces:**
- Produces: `isConsultant(record) -> boolean`, `aeStatus(record, today) -> 'open' | 'forecast' | 'past' | null`, `hasAeWording(text) -> boolean`, `isClearNonEng(text) -> boolean`
- `filterRecords`: when `f.consult` is true and `f.ae` is omitted, keep only `aeStatus(record, f.today) === 'open'`. `f.ae === 'all'` keeps every A/E status. `f.today` is `YYYY-MM-DD`. Missing `f.today` uses the UTC date.

- [ ] **Step 1: Write failing tests** for the real titles in the spec (Arlington tank open, bond underwriting out, web page design out, HCFCD RFQ with no date is Past, PCL is Forecast).
- [ ] **Step 2: Run** `node texas/test-wave1.js` and confirm the failures are missing functions, not typos.
- [ ] **Step 3: Implement** the rule in the spec. Do not trust a stored `svc` flag; compute from the text and the source-category exceptions.
- [ ] **Step 4: Update** the older `texas/test.js` consultant counts so `{ consult: true }` means Open, and `{ consult: true, ae: 'all' }` is the membership test.
- [ ] **Step 5: Run** `node texas/test.js`.

### Task 2: New parsers

**Files:**
- Modify: `texas/model.js`
- Test: `texas/test-wave1.js` against `texas/test-fixtures/wave1/`

**Interfaces:**
- `parseEsbdCsv(csv, agencies) -> records` using the header in the spec. Drop the row when `isConsultant` is false.
- `parseAggieBid(html) -> records`. Keep type RFQ or RFP only. No email in the output.
- `parseCtrma(html) -> records` for Engineering, Construction, and engineering rows under Contracts Awarded.
- `bonfireRecord(project, portal, departments)`. `departments` is the payload object keyed by id `{ DepartmentName }`. Set `dept`. Agency `HCTRA` when the Harris portal’s department or title matches Toll Road Authority or HCTRA. Set `svc` from `isConsultant`.
- `BONFIRE_PORTALS` gains the seven subdomains in the spec.
- `mergeDuplicates(records, preferIds) -> records`. `preferIds` is a `Set` of ids already on disk.

- [ ] **Step 1: Tests** load the fixtures and assert the spec’s examples.
- [ ] **Step 2: Run** and watch them fail.
- [ ] **Step 3: Implement** the parsers and the merge.
- [ ] **Step 4: Run** `node texas/test-wave1.js`.

### Task 3: Daily fetch

**Files:**
- Modify: `scripts/build-opportunities.js`

**Interfaces:**
- Consumes the parsers from Task 2.
- New source ids: `esbd`, `aggiebid`, `ctrma`. New Bonfire ids come from `BONFIRE_PORTALS` (`bonfire-arlingtontx`, `bonfire-dentoncounty`, `bonfire-wilco`, `bonfire-ntmwd`, `bonfire-lcra`, `bonfire-sara-tx`, `bonfire-utexas`).
- ESBD is one POST, `content-type: application/json`, body `{"isCSV":true,"status":"1"}`, URL in the spec. Read `json.csv`. If `csv` is missing or the header does not start with `Name,Solicitation ID`, throw so the previous ESBD rows are kept.
- After the source loop, `ctx.records = M.mergeDuplicates(ctx.records, preferIds)` where `preferIds` is every id in the previous `opportunities.json`.

- [ ] **Step 1: Wire the three sources** with the same try/catch as the others.
- [ ] **Step 2: Pass** `payload.departments` into `bonfireRecord`.
- [ ] **Step 3: Run** `node scripts/build-opportunities.js` once and record the counts for the PR.

### Task 4: Page, saved filters, cache

**Files:**
- Modify: `texas/app.js`, `shared/filters.js`, `shared/test-filters.js`, `shared/cache.js`, `shared/test-cache.js`, `shared/test-capture.js`, `national/test-v6.js`, `README.md`, `texas/README.md`

**Interfaces:**
- `state.f.ae` defaults to `'open'`. Quick chips Open, Forecast, Past show only while Consultant services is on. One is pressed. Choosing one sets `f.ae`.
- `freshFilters()` includes `ae: 'open'`.
- Texas filter snapshots store `ae` as `open`, `forecast`, or `past`. A saved set without `ae` loads as `open`. The set’s name and other fields stay. `texas.watch` is not written by the filter code.
- Sources list adds `open A/E today` using `aeStatus(record, state.today) === 'open'` and `record.src === source.id` or `record.also` contains that id.
- `RadarCache.VERSION` is 24. Cache names are `radars-national-v24`, `radars-texas-v24`, `radars-home-v24`. No new shipped files, so the file lists stay the same.

- [ ] **Step 1: Update** the filter snapshot test so the expected Texas set includes `ae: 'open'`, and an old set without `ae` still loads.
- [ ] **Step 2: Implement** chips, source counts, and the NOT_USED notes (ESBD is used; HCTRA capital plan is not; the skipped Bonfire hosts are named).
- [ ] **Step 3: Bump** the cache version and the three tests that name v23.
- [ ] **Step 4: README** sentences for the new sources and the three A/E statuses.
- [ ] **Step 5: Run** `node test.js`.

### Task 5: Snapshot and pull request

- [ ] **Commit** the rebuilt `texas/data/opportunities.json` and `texas/data/source-status.json` from the Task 3 run.
- [ ] **Assert** in `texas/test.js` that the new source ids are on the snapshot.
- [ ] **Run** `node test.js` again.
- [ ] **Push** `cursor/texas-data-wave1-a7ad` and open one pull request against `main`. Do not merge. Do not force-push.

## Self-review

- Spec coverage: ESBD POST, seven Bonfire portals, skipped hosts, PEPS department, AggieBid, CTRMA, HCTRA label, no HCTRA capital plan, duplicate merge, A/E rule, three statuses, source counts, stale-on-failure, no new dependencies, cache bump. Each has a task above.
- Placeholder scan: no TBD steps. Fixture paths and the ESBD URL are exact.
- Types: `aeStatus` returns the same three strings the chips set on `f.ae`. `mergeDuplicates` takes a `Set`. `bonfireRecord`’s third argument is the departments object.
