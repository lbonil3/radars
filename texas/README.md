# Texas Opportunity

Tabs: **List** (default), Map, Pursuits, Intel; More: Timeline, Agencies, Sources. The last tab is remembered in localStorage `texas.tab`.

## A/E consultant view

The list opens on Consultant services, and that view opens on **Open**: solicitations that are still accepting submittals. **Forecast** (TxDOT projected contracts, and a CTRMA stage that says forthcoming) and **Past** (awarded, selected, closed, or a due date that has passed) are the chips beside it. Records stay in the snapshot either way. HCFCD RFQ rows with no future due date are Past.

A row is A/E when it is an RFQ, RFP, or on-call / professional-services request and the text is engineering, architecture, surveying, or design work. Bond underwriting, web design, software, janitorial, treatment, legal, insurance, and staffing are left out even when the source called them an RFQ. TxDOT's Projected Contracts List and PEPS rows still count. A TxDOT Bonfire department named Professional Engineering (PEPS) counts; a code such as `PRO_Services` does not.

The Sources view shows how many open A/E items each source contributed today, including a solicitation that was merged from two feeds. A source that answers with HTTP 403 or a human-verification page is marked `blocked by site`. That is not a failure, and the previous records for that source stay. The collector does not try to get around the block.

Paid sources are not used. A free API key or login, when a source needs one, may be stored as a GitHub Actions secret and is not written into the site. SAM.gov was dropped by the owner and is not collected. None of the sources below need a key or a login.

Daily public sources added in wave 1 (no login):

- Texas SmartBuy ESBD, from the public Export to CSV button (posted solicitations; NIGP class 906, 907, and 925, plus A/E wording)
- Bonfire portals: Arlington, Denton County, Williamson County (`wilco`), NTMWD, LCRA, San Antonio River Authority (`sara-tx`), and the University of Texas (`utexas`)
- Texas A&M AggieBid open RFQs and RFPs
- CTRMA engineering and construction procurements, plus awarded engineering rows

Harris County Bonfire rows that name the Toll Road Authority are labeled HCTRA. HCTRA does not publish a capital plan a script can read, so none was added. The same solicitation on two feeds is one record. A failed fetch keeps that source's previous records.

Daily public sources added in wave 2 (no login). Only engineering and A/E consultant rows are kept, under the same rule as wave 1. A pre-qualified list counts as a qualifications request.

- NTTA Marketplace open bids (bid number, description, opening date). Buyer names are not stored.
- City of Houston open solicitations on Beacon Bid, from the JSON the public page loads (title, reference number, due date). Contacts are not stored.
- BidNet Direct public titles for Travis County, Dallas County, and the Texas Purchasing Group open-bids board (title, published date, closing date).

Daily public sources added in wave 3. The same A/E rule applies. A robots.txt file that disallows every crawler, and a human-verification page, are `blocked by site`. The collector does not try to get around either one.

- CivCast public project board (`app.civcast.com`). robots.txt allows the host. The app answered with an AWS WAF human-verification page, so the source is blocked and the API host behind that wall is not called.
- Hidalgo County and H-GAC on OpenGov Procurement, from the JSON the public portal script posts (open, pending, and evaluation). Closed and award-pending lists are not read. Summaries are not stored. The portal HTML shell can answer scripts with a Cloudflare check; that page is not retried.
- City of Plano, Tarrant County, and City of El Paso on IonWave. Each host's robots.txt is `User-agent: *` / `Disallow: /`, so the bid list is not requested.

## Radar 2.0 layout
- One breakpoint at 1024px, shared with National Radar (`shared/shell.js`, `shared/shell.css`). On desktop the List shows the county map beside the list, and the Map tab shows "On the radar now" beside the map. Record details dock in the side column, and Filters is a right-hand drawer. On phones the map is a collapsible strip above the list. Day / Night / Auto is in the header.
- Pursuits: starred records plus any record with a capture file, split into This week and Later, with a badge for overdue and due-soon records. If a capture file has no due date, a solicitation uses the closing date from the source, and the card says so. The weekly list (Print, Share, Copy, Download), CSV and calendar (.ics) export come from `shared/weekly.js`.
- Saved filter sets and removable filter tags (`shared/filters.js`): name and Save in the Filters drawer, apply with one tap, delete with ×. Stored on this device in localStorage `texas.filtersets` and included in the capture backup JSON (`filtersets`), merged by name on restore. Backups stay per app.

## Intel (news and planning signals)

The Intel tab is a feed of public news and planning signals: CIP and budget items, bonds, grants and funding, flood and drainage programs, water and wastewater, roadway work, council and commissioners agenda actions, and new programs. These items are signals. They are not solicitations and they are not verified.

- **Collection.** `scripts/build-intel.js` runs in the daily refresh after the opportunity snapshot and writes `texas/data/intel.json`. The browser only reads that file from the same site.
  - The step is `continue-on-error`, and each source runs in its own try/catch. A failed source keeps its previous items, which are marked stale.
  - Requests are polite: one request at a time per host, a 1.5 s gap between them, and backoff on 429/503 with Retry-After. robots.txt is checked before any site feed is fetched.
  - The Intel collector does not use API keys, logins, or paid sources.
- **Stored per item.** Title, source, link, date, an excerpt of at most 280 characters (media feeds: headline only), topic tags, place, county and region, a score, "why this matters" phrases and a positioning hint. Items are kept for 90 days, and `firstSeen` drives the "New" marks.
- **Classification** (`texas/intel.js`, deterministic, with no AI):
  - Topics and places come from regular expressions, and the score comes from keyword weights.
  - Noise such as plats, jobs, newsletters and fun runs is dropped.
  - Near-identical headlines (token Jaccard ≥ 0.8) are merged into one card with "Also reported by".
- **On this device.** Stars (`opportunityRadar.intelWatch.v1`), read marks (`opportunityRadar.intelRead.v1`) and the last-visit time (`opportunityRadar.intelSeen.v1`) are kept here. The tab badge counts items first seen since the last visit.
- **Sources used:**
  - Houston Public Works RSS
  - GLO RSS
  - TML NewsFlash
  - Texas Tribune (headlines only)
  - Dallas City News
  - CivicPlus NewsFlash RSS for 20 cities:
    - Houston region: Sugar Land, League City, Galveston, Baytown, Pasadena, Rosenberg, Bellaire, West University Place, Tomball, Webster, Texas City, Angleton, Deer Park, La Porte, Port Arthur
    - Rest of Texas: Frisco, McKinney, Garland, Mansfield, New Braunfels
  - Legistar public agenda data (keyword-filtered) for Harris County Commissioners Court, Austin, Dallas, Corpus Christi, El Paso and Plano
  - Federal Register API (Texas flood, drainage, wastewater and mitigation notices)
  - Grants.gov search API
  - OpenFEMA disaster declarations for Texas
- **Tested, not used:**
  - No feed (404) or only an HTML page: TxDOT newsroom, TWDB, HCFCD, City of Houston news, Community Impact, Fort Bend County, Conroe, San Antonio and Austin city news.
  - 403: Pearland, FEMA news, H-GAC.
  - robots.txt disallows all: Missouri City.
  - Timed out: Friendswood.
  - Legistar returned 0 matches: San Antonio, Fort Worth. Legistar not configured: Houston, Arlington, Brownsville.
  - Google News RSS: terms of use.
  - Houston Chronicle: paywall.
- **Houston-area HTML pages (intel2).** These sites have no feed, so their list pages are parsed by `parseTxdotList`, `parseDrupalViews` and `parseHoustonCip` in `texas/intel.js`. robots.txt is checked first, and if a page layout changes and no items are found, that source shows as failing.
  - Pages read: TxDOT Houston District newsroom, TxDOT statewide newsroom (only items mentioning drainage, flood, storm, bridge, Houston-area counties, the UTP or funding), Fort Bend County news, and the City of Houston CIP page (newest adopted/proposed plan).
  - Legistar agendas added: Galveston County Commissioners Court, Brazoria County Commissioners Court, City of League City.
  - Tested, not used:
    - Content is built in the browser by scripts, so the server HTML has no list: HCFCD News Room, TWDB press releases, Houston Mayor's press page, METRO news releases.
    - No list on the page: Houston Public Works news, Houston Permitting Center news, Harris County Engineering.
    - Houston City Council agenda (Novus): an ASP.NET postback app, not scraped.
    - City Secretary agenda page: script-only.
    - 403: H-GAC, Brazoria County site, Galveston County site.
    - robots.txt disallows all: Montgomery County.
    - Port Houston: news URLs return 404 or empty pages.
    - Not on Legistar: Fort Bend, Montgomery, Pearland, Sugar Land, Missouri City, Conroe, Friendswood, HCFCD, Port Houston. The `metro` Legistar client is LA Metro, not Houston METRO.
- **Weekly newsletter** (`texas/newsletter.js`, pure and deterministic, with unit tests in `texas/test.js`).
  - The collector writes `texas/data/newsletters/YYYY-Www.json` for the current ISO week and the 11 before it, plus `index.json`. Older issues are deleted.
  - An item belongs to the ISO week of its own date. Items without a date, or with a future date such as a meeting, use the week they were first collected.
  - Each issue puts Houston-region items first (top 15 by score), then the rest of Texas and federal items (top 6 per topic). Both are grouped in this order: Budget/CIP, Bond, Grant/funding, Flood/drainage, Water/wastewater, Roadway/TxDOT, New program/policy, Council action.
  - "Deadlines & dates to watch" lists dates found in item text that fall on or after the week start and follow a cue word (closes, election, hearing, through, end date…).
  - The current week is a draft, rebuilt every run. The first run after a week ends (the Monday run) marks it final, and it is never rewritten. Weeks that were first built after they ended are marked "built from items collected later".
  - The Intel tab has Feed / Weekly newsletter views: a week picker, Copy as text, Copy as email HTML, Print / PDF (prints only the issue), Download .html / .txt, and Share where the browser supports it. Nothing is emailed.
- **Links.** `fixLink()` decodes entities, drops tracking parameters and keeps only http(s) links. Legistar items link to `Gateway.aspx?M=L&ID=<MatterId>`, because `LegislationDetail.aspx?ID=` expects the web page's own id and showed "Invalid parameter". `node scripts/check-intel-links.js [perSource]` GETs a sample of links per source and flags non-2xx or error pages. The daily workflow runs it as a report-only step.
- **Newsletter look (nl-style).** "Texas Intel Weekly" is laid out like a magazine:
  - masthead with the issue number (ISO week) and dates
  - "By the numbers" strip (items, new this week, Houston region, grants, flood/drainage)
  - topic mix bar
  - Top story card with a "Why it matters" pull quote
  - Houston region spotlight
  - Positioning tips callout
  - Statewide sections with topic accent colors
  - Deadlines as calendar tiles
  The markup is tables with inline styles only, so the same HTML is used on the page (dark theme with inline SVG icons), in Copy as email HTML and Download .html (light theme, no SVG or CSS), and in Print (light, cards kept whole across pages). Colors are tested for contrast ≥ 4.5:1.
- **Legistar links (intel2.1).** The collector follows `Gateway.aspx?M=L&ID=<MatterId>` once and checks the target page with an iPhone Safari user agent and no cookies. It stores the site's own `LegislationDetail.aspx?ID=<siteId>&GUID=<siteGuid>`, cached in `texas/data/legistar-links.json`. If no page can be verified, the item links to the client's Legislation search page with a note. Stored newsletter issues are repaired the same way. Run `WITH_NEWSLETTERS=1 node scripts/check-intel-links.js 100000` to check every link.
- Run locally with `node scripts/build-intel.js`. To run some sources only: `INTEL_ONLY=hpw,glo node scripts/build-intel.js`. Tests: `node texas/test.js`.

## Texas Intel Weekly: magazine PDF

In Weekly newsletter mode, **Magazine PDF** prints the selected issue as a trade-magazine style edition, and **Compact print** keeps the earlier single-sheet layout. The last choice is highlighted next time (stored on this device only). Use the browser's Print → Save as PDF, on Letter or A4. Turn on "Background graphics" if your browser asks.

The edition has these parts:

- **Cover:** a full-bleed cover with the masthead, issue and week, the lead headline, up to four cover lines and a Texas map with the Houston region highlighted.
- **In this issue:** contents with section letters, plus By the numbers, From the desk and the topic mix.
- **Cover story:** the feature, with a pull quote and a "What to do next" sidebar.
- **Departments:** Houston Region, then the topic departments.
- **Dates to watch.**
- **Back cover:** the sources, how to use the issue, and a reminder that items are signals, not solicitations.

Section letters stand in for page numbers, because browsers don't fill in page references reliably. Running headers and footers carry the page number.

Download .html saves the same magazine as one self-contained file. Copy as email HTML is unchanged.

### Download PDF

**Download PDF** gets a ready-made PDF of the selected issue. On phones it opens the share sheet (Save to Files, Mail and so on) when the browser supports sharing files. Otherwise it opens the PDF so you can use Share. On desktop it downloads the file. The daily refresh makes these PDFs (Letter size) for all kept issues, and only re-makes an issue when its content or the layout changed. They are kept for 12 weeks with a 12 MB total cap and stored in texas/data/newsletters/pdf/. If a week's PDF isn't made yet, the button says so and points to Magazine PDF.

### Weekly publication (Sunday night)

The PDFs come out once a week. The "Publish Texas Intel Weekly" workflow runs at 02:30 UTC on Monday, which is 9:30 PM Sunday Central in summer (CDT) and 8:30 PM Sunday in winter (CST). GitHub schedules can start late, sometimes by several minutes or more.

A week runs Monday to Sunday and ends at 00:00 UTC Monday. Each run does three things:

- It finalizes the week that just ended, which freezes it, and stamps it "Published <day>". The stamp is set only once.
- It renders the current week as a **Preview edition**.
- It re-renders other issues only if they changed.

The run commits only texas/data/newsletters/ and doesn't depend on the daily refresh's tests. Both workflows share one concurrency group and push with rebase-and-retry. The daily refresh no longer makes PDFs, but it still updates the draft issue text. It can also be started by hand from the Actions tab.
