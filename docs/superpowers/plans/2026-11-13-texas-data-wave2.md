# Texas Data Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NTTA Marketplace, City of Houston Beacon Bid, and BidNet Direct public boards to the Texas snapshot, keeping only Wave 1 A/E consultant rows, and report a blocked site as `blocked by site`.

**Architecture:** Parsers live in `texas/model.js` so the page and the tests share them. `scripts/build-opportunities.js` fetches and appends sources, then calls the existing `mergeDuplicates`. A blocked response returns status `blocked by site` instead of throwing. `scripts/source-status.js` stores that health as-is. SAM.gov is not part of this plan.

**Tech Stack:** Vanilla JavaScript, Node 18+ `fetch`, no new dependencies. Tests: `node test.js`.

## Global Constraints

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Backups stay per app; there is no combined National-and-Texas backup file
- Migration never deletes user data
- When a shipped file changes, bump `RadarCache.VERSION` from 24 to 25
- Paid sources are not used. A free API key or login may be a GitHub Actions secret. This wave adds no secret
- SAM.gov was dropped by the owner: no adapter, no `SAM_API_KEY`, no SAM.gov row in source-status or the Sources view
- `scripts/build-intel.js` is not modified
- Do not merge the pull request and do not force-push
- A 403 or an AWS WAF / human-verification page is status `blocked by site`. Do not retry that request with a different user agent or any other way around the block. Keep the previous records for that source

## File structure

| File | Responsibility |
|---|---|
| `texas/model.js` | `parseNtta`, `parseBeaconOpen`, `parseBidNet`, `isSiteChallenge`, pre-qualified phrase in `isAeRequest`, agency colors |
| `texas/test-wave2.js` | Fixture tests and the blocked-status test |
| `texas/test-fixtures/wave2/` | Trimmed NTTA HTML, Beacon JSON, BidNet HTML |
| `texas/test.js` | Loads `test-wave2.js` |
| `scripts/build-opportunities.js` | Fetch the three families; map a block to `blocked by site`; keep previous rows |
| `scripts/source-status.js` | Health `blocked by site` is not stale or failing |
| `texas/app.js` | Sources view shows the status text; SAM.gov and the old “Beacon not used” note come out |
| `texas/style.css` | Color for a blocked source |
| `shared/cache.js` | `VERSION` 25 |
| `README.md`, `texas/README.md` | Policy and the new sources |
| `.github/workflows/refresh-opportunities.yml` | Comment matches the policy. No new secret |

---

### Task 1: Parsers and fixtures

**Files:**
- Create: `texas/test-fixtures/wave2/ntta-sample.html`
- Create: `texas/test-fixtures/wave2/beacon-open.json`
- Create: `texas/test-fixtures/wave2/bidnet-sample.html`
- Create: `texas/test-wave2.js`
- Modify: `texas/model.js`
- Modify: `texas/test.js` (require the new file)

**Interfaces:**
- `isSiteChallenge(text) -> boolean`. True for a short AWS WAF / human-verification page. False for a BidNet or NTTA results page.
- `parseNtta(html) -> records`. Agency `NTTA`. `solNum` is the bid number. `date` is the opening date (`YYYY-MM-DD`). URL is `https://www.nttamarketplace.org` plus the row href. Drop the row when `isConsultant` is false. Do not copy the buyer cell. `records.listed` is the number of data rows.
- `parseBeaconOpen(json) -> records | null`. `null` when the body is not `{ data: { solicitations: { data: [] } } }`. Agency `City of Houston`. `solNum` is `refnum`. Due and issue instants use `specifiedZone` when present. Record status `Open`. Drop non-A/E. `records.listed` is `data.length`.
- `parseBidNet(html, agency, pageUrl) -> records`. One record per `sol-info-container`. `solNum` is the `.sol-num` text. `date` is the closing date. Published date is an extra line. `id` is `bidnet:` plus the long number in the href when present. Drop non-A/E. `records.listed` is the number of cards.
- `isAeRequest` treats `pre-qualified` / `pre-qualification` as a qualifications request. Wording and the clear non-engineering list still apply.

- [ ] **Step 1: Write the failing tests** in `texas/test-wave2.js` for the cases in the spec.
- [ ] **Step 2: Run** `node texas/test-wave2.js` and confirm the failure is the missing parser, not a bad fixture.
- [ ] **Step 3: Implement** the parsers.
- [ ] **Step 4: Run** `node texas/test-wave2.js`.

### Task 2: Fetch, blocked status, page

**Files:**
- Modify: `scripts/build-opportunities.js`
- Modify: `scripts/source-status.js`
- Modify: `texas/app.js`
- Modify: `texas/style.css`
- Modify: `shared/cache.js` and the tests that name v24
- Modify: `national/test-v4.js` allow-list, adding `blocked by site`
- Modify: `.github/workflows/refresh-opportunities.yml` comment only
- Modify: `README.md`, `texas/README.md`

**Interfaces:**
- Source ids: `ntta`, `houston-beacon`, `bidnet-travis`, `bidnet-dallas`, `bidnet-tpg`.
- NTTA URL and Beacon URL are the ones in the spec. Beacon is the GraphQL POST above, page size 100, at most 3 pages. No contact fields in the query.
- BidNet county URLs are the ones in the spec. `bidnet-tpg` reads `/texas/solicitations/open-bids` and then `/page2` … `/pageN` up to 100. `bidnetdirect.com` gets a 1500 ms gap between calls.
- `run()` returns `{ status: 'blocked by site', note }` on HTTP 403 or `isSiteChallenge`. It does not throw for that case, and it does not retry with another user agent.
- The build loop, on that status, keeps `prev.records` for that source id, sets `status` to `blocked by site`, and does not mark the source failed.
- `source-status` `classify` returns `blocked by site` for that status even when `kept` is 0. `error` is the note, not a failing label. `health` is not `stale` or `failing`.
- Sources view prints the status string. A `blocked by site` source is not included in the “stale or failed” count.
- Remove the SAM.gov row and the “Beacon answers scripts with a captcha, not used” row from `NOT_USED`.
- `RadarCache.VERSION` is 25.

- [ ] **Step 1: Write the failing status test** (a `blocked by site` input to `source-status.build` stays `blocked by site`).
- [ ] **Step 2: Implement** the status, the four fetchers, the page copy, and the cache bump.
- [ ] **Step 3: Run** `node texas/test-wave2.js`.

### Task 3: Live snapshot and one pull request

- [ ] **Run** `node scripts/build-opportunities.js` once. Record per-source fetched and kept, and the open A/E total (Wave 1 baseline on 2026-11-13 was 20).
- [ ] **Assert** in `texas/test.js` or `texas/test-wave2.js` that `ntta`, `houston-beacon`, `bidnet-travis`, `bidnet-dallas`, and `bidnet-tpg` are on the snapshot’s source list, and that no source id contains `sam`.
- [ ] **Run** `node test.js`.
- [ ] **Push** `cursor/texas-data-wave2-7ff3` and open one pull request against `main`. Do not merge. Do not force-push.

## Self-review

- Spec coverage: NTTA table, Beacon GraphQL, three BidNet boards, paging cap, block status, previous records kept, Wave 1 A/E rule, pre-qualified phrase, no buyer or contact fields, dedupe, no SAM.gov, no new dependency, cache 25, policy sentence. Each has a task above.
- Placeholder scan: no TBD steps. URLs, field names, and the status string are exact.
- Types: `parseBeaconOpen` returns `null` or an array with `listed`. `parseNtta` and `parseBidNet` return arrays with `listed`. Blocked `run()` results use the status string `blocked by site`.
