# Texas Opportunity Radar — Data Wave 2

Date: 2026-11-13
Repo: [lbonil3/radars](https://github.com/lbonil3/radars)
Status: Approved by Luis, with SAM.gov dropped by the owner
Phase: Texas data phase 3, wave 2 of the source capture

## Goal

Add three more public Texas procurement lists to the daily snapshot, and count a row only when it is engineering or architecture/engineering (A/E) consultant work under the Wave 1 rule.

Success means the snapshot can include the North Texas Tollway Authority (NTTA) Marketplace open bids, the City of Houston open list on Beacon Bid, and the public BidNet Direct titles for Travis County, Dallas County, and the Texas Purchasing Group board. A failed fetch keeps that source’s previous records. A site that answers with a block is reported as `blocked by site`, not as a failure, and the adapter does not try to get around the block.

## Decisions

These are the approved choices. The work does not go beyond them.

- SAM.gov was dropped by the owner. This wave does not add a SAM.gov adapter, does not read or pass `SAM_API_KEY`, and does not add a SAM.gov row to `source-status` or the Sources view.
- Routes stay `/texas/` and `/national/`. `scripts/build-intel.js` and the National Radar collectors stay as they are.
- No new runtime dependencies. Collectors use Node 18+ `fetch`. Paid sources are not used. A free API key or login, if a later source needs one, may be stored as a GitHub Actions secret and must not be written into the site or the logs. None of the sources in this wave need a key or a login.
- Live pages do not link to this repository. Source links point at the public agency pages.
- Stars, notes, and saved filter sets are not deleted. Merging two copies of the same solicitation keeps an id that was already in the previous snapshot when one of the copies had that id.
- Each new source fails on its own. A thrown error keeps that source’s previous records and shows the source as stale, using the same `scripts/source-status.js` rules as the other feeds.
- A source that is blocked (HTTP 403, or an AWS WAF / human-verification page) is not retried with a different client, a different user agent, or any other way around the block. Its status is `blocked by site` in `texas/data/source-status.json` and on the Sources view. Previous records from that source are kept. It is not counted as stale or failing.
- No layout change beyond the source notes. The shared shell and the Open / Forecast / Past control stay as they are.
- When shipped front-end files change, `RadarCache.VERSION` goes from 24 to 25.
- Only engineering and A/E consultant work is kept from these lists, using the Wave 1 rule in `isConsultant`. A pre-qualified list is a qualifications request for that rule. Construction bids (ITB, IFB, RFB) are not A/E consultant work just because the title mentions drainage or a roadway.

## NTTA Marketplace

The public open-bids page is [https://www.nttamarketplace.org/bso/view/search/external/advancedSearchBid.xhtml?openBids=true](https://www.nttamarketplace.org/bso/view/search/external/advancedSearchBid.xhtml?openBids=true). No login. On 2026-11-13 a normal fetch returned HTTP 200 and an HTML table, `1-7 of 7`, with bid number, description, and opening date. The agency on every row is `NTTA`. Buyer names are not stored.

The collector reads that table. It keeps a row only when `isConsultant` is true. On that day the open rows were internal-audit RFQs, an RFI, a software quote, and construction RFBs (including a drainage improvement). None of those are A/E consultant work, so a live run may keep zero rows and still be fresh. If the results table is missing, the source fails and the previous NTTA records are kept.

## City of Houston Beacon Bid

The public page is [https://www.beaconbid.com/solicitations/city-of-houston/open](https://www.beaconbid.com/solicitations/city-of-houston/open). The HTML is a script shell. The list the page loads is one GraphQL POST the page’s own script already makes:

`https://www.beaconbid.com/api/gql?operation=ListSolicitations`

Variables: `agencyTag` `city-of-houston`, `status` `open`, `pageSize` 100, and `start` when the first page is not the whole list. At most three requests. The fields read are id, title, reference number, type, due date, and issue date. Contacts are not requested and are not stored.

On 2026-11-13 that POST returned HTTP 200 JSON, 29 open rows, not a captcha. Two of them are A/E:

- `RFQ-2026-0010`, type Professional Engineering - RFQ, “Pre-Qualification Pool for Professional Engineering Services”, due 2026-11-19 (America/Chicago).
- `PES-2026-0012`, type Professional Engineering - RFQ, “OST/Griggs Area Drainage and Paving Improvements”, due 2026-12-03 (America/Chicago).

The agency is `City of Houston`. A due instant is stored as the calendar date in the zone the payload names (`specifiedZone`), otherwise UTC. Item status `approved` on this open query means the solicitation is on the open list, so the record status is Open.

If a run gets HTTP 403 or an AWS WAF / human-verification page, the adapter stops, reports `blocked by site`, and does not try another client. The previous Houston Beacon records are kept.

## BidNet Direct

Public titles, published dates, and closing dates, no login. On 2026-11-13 a normal fetch with the same user agent as the daily job returned HTTP 200 and the open-solicitation cards. An earlier bare curl had seen HTTP 403. This wave uses that one normal fetch. It does not switch clients if a later run is refused.

| Board | Page | Agency label |
|---|---|---|
| Travis County | `https://www.bidnetdirect.com/texas/traviscounty` | Travis County |
| Dallas County | `https://www.bidnetdirect.com/texas/dallas-county` | Dallas County |
| Texas Purchasing Group | `https://www.bidnetdirect.com/texas/solicitations/open-bids` and the `pageN` links that page lists, at most 100 pages | Texas Purchasing Group |

The purchasing-group board is included because that fetch was not blocked. On 2026-11-13 it listed about 2,133 open solicitations across 86 pages. Pages are read one at a time with a gap on `bidnetdirect.com`. The first 403 or challenge page stops that board. Partial pages from the blocked run are not kept. The previous records for that board are kept, and the status is `blocked by site`.

The same BidNet document id (the long number in the public href, including `/statewide/<id>/abstract` on the purchasing-group board) is one record. County boards are read before the purchasing-group board, so the county agency wins when both list it. A card with no printed solicitation number does not get a placeholder number, so those rows are not treated as the same solicitation.

On 2026-11-13 the Travis County card “Travis County Pre-Qualified List for Architects and Engineers” (`223-TL`, published 2026-10-30, closing 2026-11-19) is A/E. “CDL Training Services” on the same page is not. Dallas County’s “Real Estate Appraisal and Related Professional Services” and the tax-statement IFB are not.

## Duplicates

After every source has run, `mergeDuplicates` runs as it does after Wave 1.

- Match on a solicitation number when the number, after removing spaces and punctuation, is at least 8 characters. Shorter numbers match only together with the same agency or the same normalized title.
- Otherwise match on normalized title, plus agency, plus due date.
- The kept record uses an id from the previous snapshot when any copy had that id.

## A/E filter

The Wave 1 rule in `isConsultant` is unchanged, plus one qualifications phrase: a title or type that says pre-qualified (pre-qualification list, pre-qualified list) passes the “qualifications or proposal request” half. It still has to pass the engineering, architecture, surveying, or design wording half, and clear non-engineering work still loses.

These lists do not get a source-category exception. An NTTA, Houston, or BidNet row is A/E only when `isConsultant` says so.

## Record fields

Existing fields stay. Rows from this wave use `solNum` for the published solicitation number. `ae` is not stored. Open, Forecast, or Past is still computed by `aeStatus`.

## Testing

`node test.js` remains the Tests workflow. New checks live in `texas/test-wave2.js`, which `texas/test.js` loads.

- NTTA HTML fixture: the internal-audit RFQ is not kept; the drainage RFB is not kept; an engineering on-call RFQ in the same table shape is kept; the buyer cell is not copied.
- Beacon JSON fixture: `RFQ-2026-0010` is A/E Open on 2026-11-13 with due date 2026-11-19; the dental RFP is not kept.
- BidNet HTML fixture: the Travis architects and engineers pre-qualified list is A/E Open on 2026-11-13; CDL training is not kept; the Dallas appraisal and the tax-statement IFB are not kept.
- A short challenge page is `blocked by site` in `source-status`, and that health is not `failing`.
- The Texas page and the opportunity workflow do not mention SAM.gov or `SAM_API_KEY`.

## Out of scope

SAM.gov, Intel, the newsletter, National Radar collectors, paid sources, login automation, and any attempt to get past a WAF or a 403. Awarded BidNet tabs are not read. Houston contacts and NTTA buyer names are not stored.
