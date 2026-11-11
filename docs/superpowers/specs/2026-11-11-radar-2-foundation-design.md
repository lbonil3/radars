# Radar 2.0 — Shared Foundation Design

Date: 2026-11-11
Repo: [lbonil3/radars](https://github.com/lbonil3/radars)
Status: Ready for review
Phase: 1 of 3 (shared foundation)

## Goal

Build a shared foundation so National Radar and Texas Opportunity feel like one product, without changing how data is collected or shipping a new desktop layout yet.

Success for this phase means both apps load a shared shell (theme, chrome, filters, backup, capture, and PWA helpers), existing starred items, notes, and saved filters survive, phone-first behavior still works, and the leftover National v2–v6 modules start getting folded into the shell instead of living as a parallel rewrite. The older copies in [hydraulics-tools](https://github.com/lbonil3/hydraulics-tools) stay frozen.

## Later phases (out of scope here)

- Phase 2, visible 2.0: a two-column desktop layout (list beside map or detail), including the useful parts of the desktop map layout from [hydraulics-tools#19](https://github.com/lbonil3/hydraulics-tools/pull/19), and closer visual alignment between the two apps. The shell in this phase must not block that layout.
- Phase 3, data: more sources, fewer misses, and clearer freshness. Collectors, refresh schedules, and source-health behavior stay as they are until then.

## Source of truth and constraints

Radar 2.0 lives only in `lbonil3/radars`. `hydraulics-tools/national-radar` and `hydraulics-tools/opportunity-radar` are frozen snapshots: no sync, no deletions, and no further radar work in that repo during this phase.

Keep the current product constraints:

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- Phone-first remains the default experience
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)

## Architecture

A new `shared/` folder at the repo root is the foundation both apps load. Each app's `index.html` includes the shared CSS and JS first, then its own files. There is no bundler and no framework.

The shell never fetches opportunities. Each app loads its own snapshot from `national/data/` or `texas/data/`, then hands records to the shared list, search, and filters. Texas-only Intel, magazine, and newsletter stay in `texas/`. National-only maps, sources, cost and roadway models, and the weekly list stay in `national/`.

The root landing page uses the shared theme and Home/PWA pieces so the product feels like one site from the first screen.

## Components

### Shared (`shared/`)

- Theme: day, night, or auto, applied before first paint, with `theme-color` following the choice. One preference for the whole product.
- Chrome: top bar, Home button, and bottom tab bar.
- Filters drawer: chips, saved sets, removable active-filter tags, and clear-all.
- Search field pattern.
- Backup and restore, including a version field in the export file.
- Capture and pursuits (today this lives in `national/capture.js` and Texas already uses it; move it to `shared/capture.js` and update both apps).
- PWA helpers: a shared file list and a shared cache-version constant. Each app's service worker includes both, so a shared-file change bumps the cache name in one place.
- Shared CSS for the shell, including layout hooks that can support a two-column desktop view in phase 2 without a rewrite.

Existing root helpers such as `home-btn.css` move into `shared/`. The landing page and both apps load them from there. Apps keep their own icons, manifests, and service worker entry files, and those workers include the shared file list and cache-version constant.

### App-specific

- National: US map and geo, sources, cost, roadway, PS&E, advance notices, weekly list, and National snapshots under `national/data/`.
- Texas: Texas map and geo, Intel, magazine, newsletter, and Texas snapshots under `texas/data/`.
- Each app keeps its own `app.js`, `model.js`, `index.html`, and app-specific CSS.

Leftover National modules (`v2.js`, `v4.js`, `v6.js`, and similar) are not a separate rewrite. As a shared UI piece lands, the behavior that still matters is moved into `shared/` or into the current National app files, and the leftover module is removed only when tests show it is unused.

## Data flow

Data collection and refresh do not change in this phase. Daily workflows (`refresh-national.yml`, `refresh-opportunities.yml`) and the weekly Texas Intel publish workflow stay as they are. Apps still read JSON written by `scripts/build-national.js` and `scripts/build-opportunities.js`.

Device state is namespaced:

- Theme is one shared key for the whole product, so National and Texas match.
- Stars, capture files, saved filters, and last view stay in per-app keys so the two apps cannot overwrite each other.

Backup and restore stay per app. The export file includes a version field and enough namespacing to identify which app it belongs to. Existing National and Texas backups and localStorage keys are read and upgraded once to the new shape, so starred items, notes, and saved filters are not lost. After a successful migration, the app reads the new keys going forward.

Script order on each app page is: shared CSS, shared JS, then the app's own CSS and JS. Each service worker caches the shared files it needs and bumps its cache name when those files change.

## Error handling

- If a shared CSS or JS file fails to load, the page shows a short on-page error instead of a blank screen.
- If a data snapshot is missing or invalid, the shell still draws (theme, tabs, Home) and the app keeps its current empty or error state. Source-health and stale-data handling are unchanged until phase 3.
- Backup restore validates version and shape before writing. A bad, partial, or wrong-app file never overwrites existing device state; the user is told what was wrong. Old backups migrate only after they pass that check.
- If a single stored preference is corrupt, that key is skipped and the rest keep working. The shell does not crash.
- A failed service-worker cache update does not brick the app; it runs from the network until the next successful load.

## Testing

`node test.js` remains the top-level runner for National, Texas, and `scripts/check-paths.js`.

Add focused tests for the shared shell:

- Theme persists and applies before paint; both apps see the same preference.
- Filters drawer: chips, saved sets, clear-all, and per-app isolation.
- Backup: old keys migrate once; a valid backup restores; a bad or wrong-app file does not clobber existing state; a corrupt key is skipped.
- Capture and pursuits still work when loaded from `shared/capture.js` in both apps.
- Path check allows in-repo references such as `../shared/` and still rejects any path that leaves the repo.

All existing National and Texas tests must still pass. A leftover version module is removed only after tests (or an explicit unused-export check) show nothing loads it.

This repo currently has no test workflow, only data-refresh and newsletter workflows. Add a GitHub Actions workflow that runs `node test.js` on pull requests and on pushes to `main`.

## What this phase will not do

- No new sources, collectors, or refresh-schedule changes
- No two-column desktop map/list layout yet (only the CSS/JS hooks the shell needs so phase 2 can add it)
- No framework, bundler, or dependency additions
- No URL changes and no repository links on the live pages
- No updates to the frozen hydraulics-tools radar folders
- No combined National-and-Texas backup file; backups stay per app

## Rollout

Work lands on a branch and a pull request in `lbonil3/radars`, with the new test workflow green before merge. The live GitHub Pages site updates when that PR merges to `main`. If a problem shows up after merge, the PR can be reverted; backup migration is backward-compatible in the sense that a failed restore or a rolled-back app must still leave previously migrated data readable or re-migratable, and must never have deleted the user's starred items or notes to complete a migration.
