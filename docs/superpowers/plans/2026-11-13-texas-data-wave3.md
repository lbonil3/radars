# Texas Data Wave 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CivCast, OpenGov Procurement (Hidalgo County and H-GAC), and IonWave (Plano, Tarrant County, El Paso) to the Texas snapshot, keeping only Wave 1 A/E consultant rows, and report a robots disallow or a challenge page as `blocked by site`.

**Architecture:** Parsers and the robots check live in `texas/model.js` so the page and the tests share them. `scripts/build-opportunities.js` fetches OpenGov’s public JSON, reads IonWave robots.txt and stops, and treats the CivCast WAF page as `blocked by site`. A blocked response keeps previous rows. `mergeDuplicates` is unchanged. SAM.gov is not part of this plan.

**Tech Stack:** Vanilla JavaScript, Node 18+ `fetch`, no new dependencies. Tests: `node test.js`.

## Global Constraints

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Backups stay per app; there is no combined National-and-Texas backup file
- Migration never deletes user data
- When a shipped file changes, bump `RadarCache.VERSION` from 25 to 26
- Paid sources are not used. This wave adds no secret and no login
- SAM.gov stays dropped: no adapter, no `SAM_API_KEY`, no SAM.gov row
- `scripts/build-intel.js` is not modified. `lbonil3/hydraulics-tools` is not touched
- Do not merge the pull request and do not force-push
- HTTP 401, HTTP 403, an AWS WAF / human-verification page, or a Cloudflare “Just a moment” challenge is status `blocked by site`
- A `User-agent: *` robots group with `Disallow: /` and without `Allow: /` is status `blocked by site`
- Do not retry a block with another user agent, another host, or another path. Keep the previous records for that source

## File structure

| File | Responsibility |
|---|---|
| `texas/model.js` | `robotsDisallowAll`, Cloudflare case in `isSiteChallenge`, `parseOpenGovPublic`, agency colors |
| `texas/test-wave3.js` | Fixture tests, robots tests, snapshot health |
| `texas/test-fixtures/wave3/opengov-sample.json` | Trimmed OpenGov rows, including one private row and one zone-edge row |
| `texas/test-fixtures/wave3/ionwave-robots.txt` | The IonWave `Disallow: /` file |
| `texas/test.js` | Loads `test-wave3.js` |
| `scripts/build-opportunities.js` | CivCast, two OpenGov boards, three IonWave robots checks |
| `shared/cache.js` | `VERSION` 26 |
| `shared/test-cache.js`, `shared/test-capture.js`, `national/test-v6.js` | Expect v26 |
| `README.md`, `texas/README.md` | The new sources and the block rule |
| `.github/workflows/refresh-opportunities.yml` | Comment matches the policy. No new secret |

---

### Task 1: Parsers and fixtures

**Files:**
- Create: `texas/test-fixtures/wave3/opengov-sample.json`
- Create: `texas/test-fixtures/wave3/ionwave-robots.txt`
- Create: `texas/test-wave3.js`
- Modify: `texas/model.js`
- Modify: `texas/test.js` (require the new file)

**Interfaces:**
- `robotsDisallowAll(text) -> boolean`. True only when a `User-agent: *` group contains `Disallow: /` and does not contain `Allow: /`.
- `isSiteChallenge(text)` is also true when the first 5000 characters contain both `just a moment` and `challenges.cloudflare.com`. Existing BidNet and NTTA pages stay false.
- `parseOpenGovPublic(body, agency, code, src, county) -> records | null`. `null` when the body is not `{ count, rows: [] }`. `records.listed` is `rows.length`. `records.total` is `count`. Agency, src, and county are the arguments. `solNum` is `financialId` or null. `id` is `opengov:` + code + `:` + row id. URL is `https://procurement.opengov.com/portal/` + code + `/projects/` + row id. Due and posted dates use `government.organization.timezone`, otherwise `America/Chicago`. Drop `isPrivate` rows. Drop rows `isConsultant` rejects. Do not copy `summary`. `comingSoon: true` sets stage and status to Forthcoming.

- [ ] **Step 1: Write the failing tests** in `texas/test-wave3.js` for the cases in the spec.
- [ ] **Step 2: Run** `node texas/test-wave3.js` and confirm the failure is the missing parser, not a bad fixture.
- [ ] **Step 3: Implement** the parsers.
- [ ] **Step 4: Run** `node texas/test-wave3.js`.

### Task 2: Fetch, cache, page copy

**Files:**
- Modify: `scripts/build-opportunities.js`
- Modify: `shared/cache.js` and the tests that name v25
- Modify: `.github/workflows/refresh-opportunities.yml` comment only
- Modify: `README.md`, `texas/README.md`

**Interfaces:**
- Source ids: `civcast`, `opengov-hidalgo`, `opengov-hgac`, `ionwave-plano`, `ionwave-tarrant`, `ionwave-elpaso`.
- CivCast fetches `https://app.civcast.com/` once. HTTP 405 with a human-verification page, HTTP 401, HTTP 403, or `isSiteChallenge` returns `{ status: 'blocked by site', note }`. It does not call `api-prod-app.civcast.com`.
- OpenGov POSTs the public URL in the spec for statuses `open`, `pending`, and `evaluation`, limit 100, at most 10 pages each. A block returns `blocked by site` and no new rows. A short page or a bad JSON body throws.
- IonWave fetches only `{origin}/robots.txt`. `robotsDisallowAll` returns `blocked by site` and does not request a bid page. A robots failure throws and still does not request a bid page.
- The existing build loop keeps `prev.records` on `blocked by site`.
- `RadarCache.VERSION` is 26.

- [ ] **Step 1: Write the failing cache assertion** (`VERSION === 26`) and confirm it fails on 25.
- [ ] **Step 2: Implement** the fetchers, the docs, and the cache bump.
- [ ] **Step 3: Run** `node texas/test-wave3.js` and `node shared/test-cache.js`.

### Task 3: Live snapshot and one pull request

- [ ] **Run** `node scripts/build-opportunities.js` once. Record per-source fetched and kept, and the open A/E total (the snapshot on 2026-11-14 has 38 open A/E items).
- [ ] **Assert** in `texas/test-wave3.js` that the six new source ids are on the snapshot, that the four blocked ids have health `blocked by site`, that `esbd:RFQ-TRN26-07` names `opengov-hgac` in `also`, and that no source id contains `sam`.
- [ ] **Run** `node test.js`.
- [ ] **Push** `cursor/texas-data-wave3-9b3a` and open one pull request against `main`. Do not merge. Do not force-push.

## Self-review

- Spec coverage: CivCast WAF block, OpenGov JSON for two governments and three statuses, page cap, timezone, private rows, summary omitted, IonWave robots stop, previous records kept, Wave 1 A/E rule, dedupe with the ESBD copy, no SAM.gov, no new dependency, cache 26, no repo link. Each has a task above.
- Placeholder scan: no TBD steps. URLs, source ids, status strings, and the solicitation numbers are exact.
- Types: `parseOpenGovPublic` returns `null` or an array with `listed` and `total`. `robotsDisallowAll` returns a boolean. Blocked `run()` results use the status string `blocked by site`.
