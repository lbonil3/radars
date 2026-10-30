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
- Run locally with `node scripts/build-intel.js`. To run some sources only: `INTEL_ONLY=hpw,glo node scripts/build-intel.js`. Tests: `node texas/test.js`.
