# Texas Opportunity

Tabs: Radar (default), Timeline, Agencies, List, **Intel**, Sources.

## Intel (news and planning signals)

The Intel tab is a feed of public news and planning signals: CIP and budget items, bonds, grants and funding, flood and drainage programs, water and wastewater, roadway work, council and commissioners agenda actions, and new programs. These items are signals. They are not solicitations and they are not verified.

- **Collection.** `scripts/build-intel.js` runs in the daily refresh after the opportunity snapshot and writes `texas/data/intel.json`. The browser only reads that file from the same site.
  - The step is `continue-on-error`, and each source runs in its own try/catch. A failed source keeps its previous items, which are marked stale.
  - Requests are polite: one request at a time per host, a 1.5 s gap between them, and backoff on 429/503 with Retry-After. robots.txt is checked before any site feed is fetched.
  - No API keys, logins or paid sources are used.
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
