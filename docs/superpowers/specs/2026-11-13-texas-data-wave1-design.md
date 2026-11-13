# Texas Opportunity Radar — Data Wave 1

Date: 2026-11-13
Repo: [lbonil3/radars](https://github.com/lbonil3/radars)
Status: Approved by Luis, in implementation
Phase: Texas data phase 3, wave 1 of the source capture

## Goal

Capture open engineering and architecture/engineering (A/E) consultant opportunities in Texas — RFQs, RFPs, and on-call work — from public pages that do not need a login, and stop treating unrelated RFQs as A/E.

Success for this wave means the daily snapshot includes the Electronic State Business Daily (ESBD) export, the additional Bonfire portals that answer a public list, Texas A&M AggieBid, and the Central Texas Regional Mobility Authority (CTRMA) procurements page. The Consultant services view counts an item as A/E only under the tighter rule below, and that view opens on items that are still open. Forecast and past A/E items stay in the snapshot and are one click away. A failed fetch keeps the last good records.

## Decisions

These are the approved choices. The work does not go beyond them.

- Routes stay `/texas/` and `/national/`. This wave changes Texas data and the Texas A/E filter only. `scripts/build-intel.js` stays as it is.
- No new runtime dependencies. Collectors use Node 18+ `fetch`. No paid sources, API keys, or logins.
- Live pages do not link to this repository. Source links point at the public agency pages.
- Stars, notes, and saved filter sets are not deleted. A saved set that has no A/E status keeps working and is treated as Open. Merging two copies of the same solicitation keeps an id that was already in the previous snapshot when one of the copies had that id, so an existing star still points at the record.
- Each new source fails on its own. A failure keeps that source’s previous records and shows the source as stale, using the same `scripts/source-status.js` rules as the other feeds.
- Bonfire detail pages return HTTP 403 to scripts. Collectors read only each portal’s public open-opportunities JSON.
- The ESBD collector uses the CSV string from the same request the public “Export to CSV” button makes. It does not treat the line-item JSON as a supported API. See ESBD below for the request and the risk.
- No layout change beyond the Open / Forecast / Past control and an open-A/E count on each source. The shared shell and navigation stay as they are.
- When shipped front-end files change, `RadarCache.VERSION` goes from 23 to 24.

## ESBD

The public page is [https://www.txsmartbuy.gov/esbd](https://www.txsmartbuy.gov/esbd). Sign-in is not required. The page’s “Export to CSV” button (limited to 20,000 rows) does not download a static file. It POSTs JSON `{"isCSV":true,"status":"1"}` to:

`https://www.txsmartbuy.gov/app/extensions/CPA/CPAMain/1.0.0/services/ESBD.Service.ss`

`status` `1` is the form’s “Posted” value. On 2026-11-13 that request returned HTTP 200 with a JSON body whose `csv` field is the file the button saves (header `Name,Solicitation ID,Due Date,Due Time,Agency/Texas SmartBuy Member Number,Status,Posting Date,Created,Last Modified,NIGP Codes`). The same body includes an `agencies` list used only to turn an agency number into a name. A GET to that URL returns HTTP 405. Posted rows on that day included both “Posted” and “Addendum Posted”.

`www.txsmartbuy.gov/robots.txt` is `User-agent: *` / `Disallow: /`. This wave still makes that one POST once a day because it is the export the public button runs and it needs no login. Risk: the Comptroller can change the extension path or the JSON envelope when the site is republished. If the `csv` field is missing or the header is not the one above, the source fails and the previous ESBD records are kept. The collector does not page the `lines` array and does not call any other ESBD service.

Rows kept from ESBD are professional A/E solicitations: NIGP class 906 (architecture), 907 (architecture and engineering), or 925 (engineering), or a title and NIGP text that is an RFQ, RFP, SOQ, or on-call/professional-services request and uses the engineering words in the filter section. Agency name, agency number (the trailing code on the agency list, such as 305, 582, or 710), due date, posting date, status, solicitation id, and `https://www.txsmartbuy.gov/esbd/<solicitation id>` are stored. Staff names are not on this export.

## Bonfire portals

The existing adapter stays. These portals answered `https://<sub>.bonfirehub.com/PublicPortal/getOpenPublicOpportunitiesSectionData` on 2026-11-13 and are added:

| Portal | Subdomain | Agency label |
|---|---|---|
| City of Arlington | `arlingtontx` | City of Arlington |
| Denton County | `dentoncounty` | Denton County |
| Williamson County | `wilco` | Williamson County |
| North Texas Municipal Water District | `ntmwd` | NTMWD |
| Lower Colorado River Authority | `lcra` | LCRA |
| San Antonio River Authority | `sara-tx` | San Antonio River Authority |
| University of Texas | `utexas` | University of Texas |

Checked and not added, because the host did not resolve: `arlington`, `dentoncountytx`, `williamsoncounty`, `williamsoncountytx`, `sara`, `sanantonioriverauthority`, `utaustin`, `universityoftexas`. `utsystem.bonfirehub.com` responded with zero open items and is not a second feed. The University of Texas feed is `utexas`, which had open items.

The list JSON has a `departments` object keyed by `DepartmentID`. The TxDOT portal’s names on that day were internal codes (`PRO_Services`, `PRO_IT`, and so on), not “Professional Engineering (PEPS)”. The adapter still reads the department name and marks a row A/E when that name is `Professional Engineering (PEPS)` or otherwise contains `PEPS`. A code such as `PRO_Services` does not match.

Harris County rows whose department name or title names the Harris County Toll Road Authority or HCTRA are stored with agency `HCTRA`.

## AggieBid

The public open-bids list is [https://bids.sciquest.com/apps/Router/PublicEvent?CustomerOrg=TAMU&tab=PHX_NAV_SourcingOpenForBid](https://bids.sciquest.com/apps/Router/PublicEvent?CustomerOrg=TAMU&tab=PHX_NAV_SourcingOpenForBid). The collector parses the HTML table. It keeps types RFQ and RFP. It stores the title, the subtitle, the type, the event number, the close date, and the event link. It does not store the contact email. On 2026-11-13 the list included “Architect & Engineering Services” / “Architectural and Engineering Services on an As-Needed Basis”, RFQ `04-TARLTON-RFQ-0028`, closing 2026-11-23 2:00 PM CST.

## CTRMA

The page is [https://www.mobilityauthority.com/business/opportunities/procurements/](https://www.mobilityauthority.com/business/opportunities/procurements/). The collector parses the Engineering table and the Construction table. Rows under Contracts Awarded are kept when the type or title is engineering, architecture, surveying, or design work, and those rows are Past. A stage that says forthcoming or projected is Forecast. A due date that has passed is Past even if the stage still says active.

## HCTRA capital plan

Not added. `https://www.hctra.org/` and `https://www.hctra.org/capital-improvement-program` both return the same small script shell (about 5 KB) with no project table, feed, or file link. HCTRA solicitations that are on the Harris County Bonfire list are labeled HCTRA instead.

## Duplicates

After every source has run, records that are the same solicitation become one record.

- Match on a solicitation number when the number, after removing spaces and punctuation, is at least 8 characters. Shorter numbers match only together with the same agency or the same normalized title, so `27-0077` at two different agencies stays two records.
- Otherwise match on normalized title, plus agency, plus due date. All three have to be present.
- The kept record uses an id from the previous snapshot when any copy had that id. Otherwise it uses the copy with the most filled fields.
- Empty fields are filled from the other copies. The other source ids are stored on `also`, and the extra lines note those sources. Nothing is deleted from the user’s watchlist because of a merge.

## A/E filter

An item is A/E only when both of these are true:

1. It is a qualifications or proposal request: RFQ, RFQS, RFSQ, SOQ, RFP, or on-call / as-needed / rotation-list / professional-services language. An ESBD row whose NIGP class is 906, 907, or 925 also passes this half, because that class is the state’s professional A/E code.
2. The title, work type, description, or NIGP text has engineering, architecture, surveying, or design wording: engineer, architect, survey, civil, drainage, hydraulic, hydrology, water, wastewater, stormwater, transportation, roadway, bridge, structural, geotechnical, environmental, schematic, PS&E, or design (including “redesign”). `design-build` alone does not count. `hydraulic cement` does not count.

Clear non-engineering work is not A/E even when the label is RFQ or RFP: bond underwriting, investment banking, financial advisory, web page or graphic design, software, janitorial, substance-abuse or behavioral-health treatment, legal services, insurance brokerage, and staffing.

These source categories are A/E without that text test:

- Every TxDOT Projected Contracts List row.
- Every TxDOT PEPS “consultants selected” row the collector already keeps (PS&E, H&H, bridge design).
- A TxDOT Bonfire row whose department name is Professional Engineering (PEPS).

HCFCD “Request for Qualifications” rows are A/E only when they also have the engineering wording. A row with no due date, or a due date that has passed, is Past.

Untyped titles that merely contain the word engineering, and that are not an RFQ, RFP, on-call, professional-services, or NIGP 906/907/925 item, are not A/E. Austin “Professional Services” agreements are A/E only when the agreement text passes the wording test. They are Past because the source says they are awarded.

Every A/E item has one status:

| Status | When |
|---|---|
| Forecast | TxDOT Projected Contracts List, or a stage that says projected, forthcoming, or forecast |
| Past | Awarded, selected, closed, or cancelled; a due date before today; an HCFCD RFQ row with no future due date |
| Open | Due date today or later, or the source explicitly says open or posted and the due date has not passed |

The Consultant services view defaults to Open. Forecast and Past are chips beside that view. Choosing one replaces the status filter. Records are not removed from the snapshot. With the consultant view off, the status chips do nothing and the rest of the radar behaves as it does today.

The Sources view shows, for each source, how many of its records are open A/E today (including a record that names that source in `also`).

## Record fields

Existing fields stay. New optional fields:

- `solNum` — solicitation number as published
- `dept` — Bonfire department name when the list gives one
- `also` — other source ids merged into this record
- `nigpAe` — true when an ESBD NIGP class is 906, 907, or 925

`ae` is not stored. The page computes Open, Forecast, or Past from the record and today’s date, so a due date that passes moves from Open to Past without a rewrite.

## Testing

`node test.js` remains the Tests workflow. New checks live in `texas/test-wave1.js`, which `texas/test.js` loads, plus the filter and cache assertions those files already have.

Each new parser is tested with a saved response from the live source, with temporary download tokens removed:

- ESBD CSV: the architectural and engineering services row is kept; the pest-control row is not.
- Arlington Bonfire JSON: “Redesign of Grace Howell 2.0 MG Elevated Storage Tank” is A/E and Open on 2026-11-13 (due 2026-12-03).
- TxDOT Bonfire JSON: department `PRO_Services` is not treated as PEPS. The same row with department “Professional Engineering (PEPS)” is A/E.
- Harris Bonfire JSON: a title that names the Toll Road Authority is agency HCTRA.
- AggieBid HTML: the as-needed architectural and engineering RFQ is A/E; an ITB on the same page is not. The contact email is not copied.
- CTRMA HTML: the engineering PS&E pool whose responses were due 2026-08-28 is A/E Past on 2026-11-13. An awarded PS&E row is Past.

Filter examples from real titles already in the radar:

- Arlington tank RFQ → A/E Open
- AggieBid A/E on-call → A/E
- “Municipal Underwriting / Bond & Investment Banking Services” (Austin RFQS) → not A/E
- “Purchase of WEB PAGE DESIGN AND/OR MANAGEMENT SERVICES” and an RFP titled as web page design → not A/E
- An HCFCD RFQ row with no due date → Past

A saved filter set and a watchlist entry are still present after the new status field is applied.

## Out of scope

Intel, the newsletter, National Radar collectors, paid sources, SAM.gov, and any portal that did not answer a public list. Awarded CTRMA construction rows with no engineering wording are not kept. The HCTRA capital plan is not invented from the script shell.
