# Radars

Two static, phone-first, installable (PWA) pursuit radars built from public procurement feeds, split out of
[hydraulics-tools](https://github.com/lbonil3/hydraulics-tools) (`national-radar/` and `opportunity-radar/`).

Live: https://lbonil3.github.io/radars/

The live pages intentionally carry no links to this repository; data-source citations point only at the public agencies.

| App | Path | What it is |
|---|---|---|
| National Radar | [`national/`](national/) | PS&E / H&H consultant opportunities over $5M, all states; roadway + drainage and water presets. See `national/README.md`. |
| Texas Opportunity | [`texas/`](texas/) | Drainage PS&E opportunities across Texas agencies on a county map (formerly "Opportunity Radar"). |

Vanilla JS, no build step, no dependencies. The landing page is `index.html`; each app's Home button returns to it
(`home-btn.css` at the root). Texas Opportunity shares the capture-file model `national/capture.js`.

## Rebuilding data (Node 18+)

    node scripts/build-national.js        # -> national/data/{national,roadway,pse,cost-prices}.json (reads bid-cost/prices.json)
    node scripts/build-opportunities.js   # -> texas/data/opportunities.json
    node scripts/build-us-geo.js          # one-time: national/us-geo.js state outlines

`bid-cost/prices.json` is a copy of the TxDOT low-bid averages from hydraulics-tools, used for National Radar's roadway cost base.

Daily refresh workflows are installed in `.github/workflows/` (refresh-national.yml, refresh-opportunities.yml; daily + manual). The original templates remain at:
`national/workflow/refresh-national.yml` and `texas/workflow/refresh-opportunities.yml`
(kept for reference). Optional secret `SAM_API_KEY` for the SAM.gov API path.

## Tests

    node test.js    # national + texas tests and scripts/check-paths.js (no relative path may escape the repo)

GitHub Pages serves `main` / root (`.nojekyll` present).
