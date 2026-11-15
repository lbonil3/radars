# Texas Opportunity Radar — Data Wave 3

Date: 2026-11-13
Repo: [lbonil3/radars](https://github.com/lbonil3/radars)
Status: Approved by the wave 3 request
Phase: Texas data phase 3, wave 3 of the source capture

## Goal

Add three more public procurement families to the daily Texas snapshot, and count a row only when it is engineering or architecture/engineering (A/E) consultant work under the Wave 1 rule.

The families are CivCast, OpenGov Procurement (Hidalgo County and H-GAC), and IonWave (City of Plano, Tarrant County, and City of El Paso). A failed fetch keeps that source’s previous records. A site that disallows scripts in robots.txt, or that answers with HTTP 401, HTTP 403, or a human-verification page, is reported as `blocked by site`. The adapter does not try to get around the block. Previous records from that source are kept.

## Decisions

These are the choices for this wave. The work does not go beyond them.

- SAM.gov stays dropped. This wave does not add a SAM.gov adapter, does not read `SAM_API_KEY`, and does not add a SAM.gov row.
- Routes stay `/texas/` and `/national/`. `scripts/build-intel.js` and the National Radar collectors stay as they are. `lbonil3/hydraulics-tools` is not touched.
- No new runtime dependencies. Collectors use Node 18+ `fetch`. Paid aggregators are not used. No new secret is added. A free vendor login is not used, because none of these lists require one for the public titles this wave reads.
- Live pages do not link to this repository. Source links point at the public agency pages.
- Stars, notes, and saved filter sets are not deleted. Merging two copies of the same solicitation keeps an id that was already in the previous snapshot when one of the copies had that id.
- Each new source fails on its own. A thrown error keeps that source’s previous records and shows the source as stale or failing, using the same `scripts/source-status.js` rules as the other feeds. “Not configured” stays the existing disabled-source message for a missing API key. This wave does not add a key, so none of these sources are turned off for that reason.
- A block is not a failure. HTTP 401, HTTP 403, or a human-verification page (AWS WAF or a Cloudflare “Just a moment” challenge) is status `blocked by site`. A `User-agent: *` robots group that says `Disallow: /` and does not also say `Allow: /` is the same status. The adapter does not retry that source with a different client, a different user agent, or any other path that avoids the block. It is not counted as stale or failing.
- No layout change. The shared shell and the Open / Forecast / Past control stay as they are. `RadarCache.VERSION` is 25 after wave 2. Shipped files change in this wave (`texas/model.js`), so the version goes from 25 to 26.
- Only engineering and A/E consultant work is kept, using the Wave 1 rule in `isConsultant`. These lists do not get a source-category exception. Construction bids are not A/E consultant work just because the title mentions a road or wastewater.

## Robots.txt on 2026-11-14

Checked with the same user agent as the daily job.

| Source | robots.txt | Result |
|---|---|---|
| CivCast app | `https://app.civcast.com/robots.txt` is `User-agent: *` / `Allow: /`. `https://civcast.com/robots.txt` is the same Allow plus a sitemap. | Allowed. The app itself is blocked (below). |
| OpenGov portal host | `https://procurement.opengov.com/robots.txt` returns the portal HTML, not a robots file. No `Disallow`. | No disallow rule. |
| OpenGov API host | `https://api.procurement.opengov.com/robots.txt` is HTTP 404 `{"message":"Not Found"}`. | No disallow rule. |
| City of Plano IonWave | `https://planotx.ionwave.net/robots.txt` is `User-agent: *` / `Disallow: /`. | Disallow all. |
| Tarrant County IonWave | `https://tarrantcountytx.ionwave.net/robots.txt` is `User-agent: *` / `Disallow: /`. | Disallow all. |
| City of El Paso IonWave | `https://elpasotexas.ionwave.net/robots.txt` is `User-agent: *` / `Disallow: /`. | Disallow all. |

## CivCast

The public project board is [https://app.civcast.com/](https://app.civcast.com/). On 2026-11-14 a normal fetch of that URL returned HTTP 405 and an AWS WAF page titled Human Verification (`awsWafCookieDomainList` includes `civcast.com`). That is a block. The source id is `civcast`. Status is `blocked by site`. The adapter does not call `api-prod-app.civcast.com` or any other host to get past the wall. There are no previous CivCast records to keep.

## OpenGov Procurement

The portal script loads the public list with one POST the page already makes:

`https://api.procurement.opengov.com/api/v1/government/{code}/project/public`

Body: `{ "filters": [{ "type": "status", "value": "<status>" }], "limit": 100, "page": <n> }`. No login. On 2026-11-14 that POST returned HTTP 200 JSON `{ "count", "rows" }` for both governments. The HTML shell at `https://procurement.opengov.com/portal/h-gac` returned HTTP 403 and a Cloudflare “Just a moment” challenge. This wave does not retry that HTML shell. It reads the JSON the portal script posts. The embed pages (`/portal/embed/{code}/project-list`) returned the same rows inside `window.__data` and are not a second feed.

| Source id | Code | Agency label | County | Public page |
|---|---|---|---|---|
| `opengov-hidalgo` | `co-hidalgo-tx` | Hidalgo County | Hidalgo | `https://procurement.opengov.com/portal/co-hidalgo-tx` |
| `opengov-hgac` | `h-gac` | H-GAC | none | `https://procurement.opengov.com/portal/h-gac` |

Statuses read, in this order, each paged until `count` is reached, at most 10 pages of 100:

- `open`
- `pending`
- `evaluation`

`closed` and `awardPending` are not read. Awarded history stays out, the same way wave 2 does not read awarded BidNet tabs.

Fields kept from a row: `id`, `title`, `financialId` (solicitation number), `template.title` (type), `proposalDeadline`, `releaseProjectDate`, `status`, `comingSoon`, `department.name`, and `government.organization.timezone`. `summary` is not stored. A row with `isPrivate: true` is not kept. A due instant is the calendar date in the zone the row names, otherwise `America/Chicago`. Both of these governments name `America/Chicago`. A deadline of `2026-11-19T04:30:00.000Z` is 2026-11-18 in that zone.

Record status follows the row: Open, Pending, or Evaluation. `comingSoon: true` is stage Forthcoming, so `aeStatus` returns Forecast. A due date before today is Past. The project link is `https://procurement.opengov.com/portal/{code}/projects/{id}`.

On 2026-11-14, with the Wave 1 rule:

- H-GAC open `RFQ-TRN26-07`, “Transportation Project Delivery Plan Consultant Services”, due 2026-12-03, is A/E Open. The same number is already on ESBD as `esbd:RFQ-TRN26-07` (ESBD due date 2026-11-19). Dedupe keeps the ESBD id and lists `opengov-hgac` on `also`. The ESBD date stays, because that field is already filled.
- H-GAC open `CT04-27`, “Computer Technology and Related Solutions”, is not A/E.
- Hidalgo County open “Wellness Center, Pct.3” (`26-0632-11-18-12`, competitive sealed proposals) is not A/E.
- Hidalgo County pending “CDBG - Colonia Fund - Construction - 2024, D.T. Villareal Lift Station and Wastewater Infrastructure Improvements” uses the template “Urban County (Hybrid Template)”. It is not an RFQ, RFP, or on-call, so it is not A/E.
- Hidalgo County evaluation `26-0307-06-03-09`, “Expansion of the Professional Engineering Services Pool”, due 2026-06-10, is A/E Past on 2026-11-14.
- Hidalgo County evaluation `26-0569-11-04-03`, “Turnkey Water Extraction and Related Services”, is an RFP whose title says water. The existing wording rule keeps it. It is Past on 2026-11-14. That is the rule, not a new exception.

If a run gets HTTP 401, HTTP 403, or a challenge page from the JSON POST, the adapter stops, reports `blocked by site`, and does not try the HTML shell. Partial pages from that run are not kept. The previous records for that source are kept. If `count` and `rows` are missing, the source fails and the previous records are kept. A list longer than 10 pages fails the same way, so a change in page size cannot silently drop the tail.

## IonWave

Public bid lists for these three portals sit behind robots.txt `Disallow: /`. The collector reads each host’s robots.txt and stops. It does not request `CurrentSourcingEvents.aspx`, `SourcingEvents.aspx`, or `PublicDetail.aspx`.

| Source id | Host | Agency label |
|---|---|---|
| `ionwave-plano` | `https://planotx.ionwave.net` | City of Plano |
| `ionwave-tarrant` | `https://tarrantcountytx.ionwave.net` | Tarrant County |
| `ionwave-elpaso` | `https://elpasotexas.ionwave.net` | City of El Paso |

Status is `blocked by site`. The note says the robots file disallows every crawler and the bid list was not requested. If robots.txt cannot be read, the source fails and the bid list is still not requested. If a later robots file no longer disallows the host, the source fails rather than guessing a page layout. There are no previous IonWave records to keep.

## Duplicates

After every source has run, `mergeDuplicates` runs as it does after Wave 1 and Wave 2.

- Match on a solicitation number when the number, after removing spaces and punctuation, is at least 8 characters. Shorter numbers match only together with the same agency or the same normalized title.
- Otherwise match on normalized title, plus agency, plus due date.
- The kept record uses an id from the previous snapshot when any copy had that id.

## A/E filter

The Wave 1 rule in `isConsultant` is unchanged. Open, Forecast, or Past is still computed by `aeStatus`. An OpenGov or CivCast row is A/E only when `isConsultant` says so.

## Record fields

Existing fields stay. Rows from this wave use `solNum` for the published solicitation number (`financialId` on OpenGov). `ae` is not stored.

## Testing

`node test.js` remains the Tests workflow. New checks live in `texas/test-wave3.js`, which `texas/test.js` loads.

- OpenGov JSON fixture: `RFQ-TRN26-07` is A/E and the Chicago calendar date of `2026-12-03T18:00:00.000Z` is 2026-12-03; `CT04-27` is not kept; the Hidalgo engineering pool is A/E Past on 2026-11-14; the wellness-center CSP is not kept; the wastewater construction row is not kept; a private A/E row is not kept; a deadline of `2026-11-19T04:30:00.000Z` is 2026-11-18; `comingSoon: true` is Forecast; the summary email is not copied.
- `robotsDisallowAll` is true for the IonWave robots file and false for CivCast `Allow: /`.
- A Cloudflare “Just a moment” page is a site challenge. The BidNet and NTTA fixtures are not.
- After a live build, `civcast`, `ionwave-plano`, `ionwave-tarrant`, and `ionwave-elpaso` are `blocked by site`. `opengov-hidalgo` and `opengov-hgac` are on the snapshot. `esbd:RFQ-TRN26-07` is still the kept id and names `opengov-hgac` in `also`. No new source id contains `sam`.

## Out of scope

SAM.gov, Intel, the newsletter, National Radar collectors, paid sources, login automation, CivCast API hosts behind the WAF, IonWave bid pages, OpenGov closed and award-pending lists, and any attempt to get past a WAF, a Cloudflare challenge, or a robots `Disallow: /`.
