# Radar 2.0 — Visible Design

Date: 2026-11-11
Repo: [lbonil3/radars](https://github.com/lbonil3/radars)
Status: Ready for review
Phase: 2 of 3 (visible 2.0)
Prior phase: Phase 1, [Shared Foundation Design](https://github.com/lbonil3/radars/blob/cursor/radar-2-foundation-design-spec-779b/docs/superpowers/specs/2026-11-11-radar-2-foundation-design.md) (`docs/superpowers/specs/2026-11-11-radar-2-foundation-design.md`), dated 2026-11-11

## Goal

Build the visible 2.0 so National Radar and Texas Opportunity share one desktop-leading shell — the same layout and navigation, each keeping its own accent color — without changing how data is collected.

Success for this phase means both apps, at 1024px and wider, open on a list with a smaller map beside it, and a record’s details open in a right-hand panel that leaves the list in place. Below 1024px they still work as they do on a phone today: list and map stacked, details as a bottom sheet, tab bar at the bottom. Texas gains a Pursuits tab and weekly list built from its existing watchlist, plus saved filter sets. National’s Map tab gains the zoom, pan, state selection, Northeast labels, shading, and table view from [hydraulics-tools#19](https://github.com/lbonil3/hydraulics-tools/pull/19), adapted to this repo. The older copies in [hydraulics-tools](https://github.com/lbonil3/hydraulics-tools) stay frozen.

Luis uses the radars mostly on desktop, so desktop leads this phase. Phone must keep working.

## Later phases (out of scope here)

- Phase 3, data: more sources, fewer misses, and clearer freshness. Collectors, refresh schedules, and source-health behavior stay as they are until then.

Phase 1 is the shared foundation already designed and implemented on open [PR #1](https://github.com/lbonil3/radars/pull/1). This phase starts after that PR is merged, or stacked on it; see Open questions.

## Decisions

These are the approved choices for this phase. The work does not go beyond them.

- Desktop leads; phone must keep working as it does today.
- Approach: a shared desktop shell first in `shared/`, then move National into it, then Texas, then port the PR #19 map tools to National. Each step is reviewable on its own.
- Same layout and navigation for both apps; National keeps its blue accent, Texas its teal.
- Desktop (1024px and wider): a slim header (Home, app name, freshness, Day/Night/Auto); a row with search, Filters (a drawer from the right), and quick chips; two columns — list about 60% on the left, a small map about 40% on the right, sticky as the list scrolls. Clicking a record swaps the map column for a details panel; closing the panel brings the map back. The list never moves. The tab bar is List, Map, Pursuits, and More; Texas adds an Intel tab. The Map tab is a full-size map with its records beside it.
- Phone (under 1024px): as today — stacked list and map, details as a bottom sheet, tab bar at the bottom.
- Shared in `shared/`: the header, tab bar and More menu, filter drawer, two-column list/map/detail layout, and the detail panel or sheet. Each app provides its records, cards, map, and accent color. Both apps open on List and remember the last tab.
- This layout replaces National’s current 1200px desktop rules and fixes the overridden, unused 900px `.lgrid` / `.shell-lgrid` hook from the foundation.
- National moves into the shell and keeps scopes, digest, saved filter sets, Pursuits, weekly list, and Data & sources under More. Dormant leftovers (`renderMapV5`, unused lane scope arrays, the always-hidden `#pseCtl`) come out only once tests show nothing uses them. The list count that CSS hides today is shown again.
- Texas moves into the shell and opens on List, not the map. Timeline, Agencies, and Sources move under More. Intel stays its own tab. The newsletter and magazine are unchanged. Texas gains a Pursuits tab and weekly list built from its existing watchlist, plus saved filter sets and filter tags via `shared/filters.js`. Its canvas map stays as it is (pan, zoom, pins) and fills the map column on desktop; clicking a record still highlights its pin.
- National map tools are the last step, and they are not applied to Texas: click and multi-select states to filter, zoom and pan, Northeast callout labels, state shading, and a map-as-table view. They are adapted from PR #19’s `mapview.js`. The 975×610 viewBox in this repo versus the PR’s 1040×610 is handled in this repo. Colors follow Day and Night; no hard-coded night colors. Today’s count markers stay; lane-based value bubbles and hydraulics-tools lane modes are not ported.
- Snapshots, refresh jobs, and collectors do not change. Stars, notes, filters, and backups keep the Phase 1 keys. Texas Pursuits reads the stars and capture data already on the device, so nothing is lost. The only new saved settings are `texas.tab` and `texas.filtersets`, written through `RadarStorage`.
- If a shared shell file fails to load, the page uses the existing on-page `RadarLoadError`. If the map fails, the list and details still work and the map column shows a short note. A record with no location still appears in the list, with a “no location” chip on the map side.
- Work is test-first at each step and is run by `node test.js` in the existing CI. Before each review, desktop and phone screenshots of both apps.

## Source of truth and constraints

Radar 2.0 lives only in `lbonil3/radars`. `hydraulics-tools/national-radar` and `hydraulics-tools/opportunity-radar` stay frozen snapshots: no sync, no deletions, and no radar work in that repo during this phase. Map helpers are copied and adapted into this repo; the PR #19 files are not edited in place.

Keep the product constraints from Phase 1:

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Backups stay per app; there is no combined National-and-Texas backup file
- Migration never deletes user data
- When a shipped file changes, bump `RadarCache.VERSION` and include any new shared or app files in `RadarCache.files`

## Architecture

A shared shell in `shared/` is the layout both apps load. Each app’s `index.html` includes the shared CSS and JS first (as in Phase 1), now including `shared/shell.js`, then its own files. There is no bundler and no framework.

The breakpoint is 1024px, and CSS and JS use the same value. At that width and above, the shell is the two-column desktop layout described below. Below it, the shell is the current phone layout. This replaces National’s 1200px docked-sheet and list-grid rules. It also replaces the foundation’s unused 900px `.lgrid` / `.shell-lgrid` hook, which National’s stylesheet currently overrides, and Texas’s 900px rule that centers an 1100px-wide phone layout.

The shell never fetches opportunities and never renders an app’s cards or map. Each app still loads its own snapshot from `national/data/` or `texas/data/`, renders its own list cards and map, and paints its own accent (National blue, Texas teal). Texas-only Intel, magazine, and newsletter stay in `texas/`. National-only maps, sources, cost and roadway models, and related modules stay in `national/`.

On the List tab at 1024px and wider, the main area is two columns: the list on the left at about 60%, and a small map on the right at about 40% that stays in view as the list scrolls. Opening a record swaps that right column for the details panel; closing the panel restores the map. The list column does not move, and details do not add a third column. On the Map tab at that width, the same two-column shell is reused with the same about 60/40 split flipped: a full-size map in the wider column, and the records for that view in the narrower column beside it. Opening a record swaps the records column for the details panel, with a close control that brings the records back; the map stays put.

Below 1024px, list and map stack, details open as the existing modal bottom sheet (body scroll locked), and the tab bar stays at the bottom. Both widths use the same slim header and the same Filters drawer from the right.

Both apps open on List on a first visit. After that they restore the last view, including Map, Pursuits, Texas Intel, and the views reached from More (for example Timeline or Data & sources). More itself is a menu, not a saved view. This is a small change from National today, which already remembers the last tab but refuses to restore Map. Texas gains tab memory for the first time (`texas.tab`).

The root landing page is unchanged in this phase, aside from any cache-list update it already receives when shared files change.

## Components

### Shared (`shared/`)

- **`shared/shell.js` (`RadarShell`)**: the shared chrome and layout controller. `RadarShell.bind(opts)` takes the app id (`national` or `texas`), the primary tabs (List, Map, Pursuits, and on Texas Intel), the More-menu items, and the DOM slots for header, freshness, theme, search and chips, filter drawer, list column, map column, detail panel or sheet, and tab bar. It does not fetch records or draw cards or maps.

  It exposes: `showTab(id)` (writes `${app}.tab` through `RadarStorage`; National already has `national.tab`; on bind, the last view is restored, or List if none is stored); `openDetail()` / `closeDetail()` (desktop: swap the right column for the details panel; phone: open or close the bottom sheet); `openFilters()` / `closeFilters()` (the right-side drawer, including Close and Escape); and `isDesktop()`, which matches the 1024px CSS breakpoint. These methods are callable from tests with a provided document root.

- **`shared/shell.css`**: styles for the slim header, tab bar, More menu, right-side filter drawer, two-column 60/40 list and map layout, sticky map column, docked details panel, and the phone stacked layout and bottom sheet. The unused 900px `.lgrid` / `.shell-lgrid` rule is replaced by this 1024px layout, using `.shell-*` layout classes so app styles do not silently override the hook again. This file does not set either app’s accent color.

- **Theme, filters, storage, capture, cache**: `RadarTheme`, `RadarFilters`, `RadarStorage`, `RadarCapture`, and `RadarCache` stay as designed in Phase 1. The shell mounts the Day/Night/Auto control in the header for both apps, so theme leaves National’s More menu. Texas starts calling `RadarFilters` for saved sets and active-filter tags, writing `texas.filtersets` (the key Phase 1 already reserved). New or moved shipped files are added to `RadarCache.files`, and `RadarCache.VERSION` is bumped.

- **`shared/weekly.js` (`RadarWeekly`)**: the weekly-list builders that already live in `national/weekly.js` (Print, Share, Copy, Download), moved here so both apps’ Pursuits tabs use the same actions. No new weekly features. If a builder needs a value only National has, the app passes it in; Texas simply omits that value rather than gaining a new field.

Existing shared files keep their current public names and load order. Script order on each app page remains: shared CSS, shared JS (now including `shell.js` and, once moved, `weekly.js`), then the app’s own CSS and JS. Each service worker caches the new shared files.

### National map helpers (`national/`)

- **`national/mapview.js` (`NationalMapView`)**: a port of PR #19’s pure, DOM-free helpers into this repo, used only by National. It covers aggregation, count-marker sizing, Northeast callout layout, state shading, and legend or tooltip copy. Hydraulics-tools lane modes (`pse` / `road` / `water`) and value-bubble encoding are not ported; sizing follows today’s count markers.

  Callouts need a wider view than the current map land. Keep `US_GEO` and the existing 975×610 land as they are, and when callouts are on, widen the SVG `viewBox` to `0 0 1040 610` so the Atlantic column (MA, RI, CT, NJ, DE, MD, DC, and VT/NH when they collide) sits in the extra space to the right. Callouts turn off past 1.8× zoom, as in the PR. Shading and other map chrome use Day and Night theme tokens, not hard-coded night colors such as `#0c1428` or `#16233f`.

  Map interactions stay in National’s `app.js`, adapted from the PR to the current markup: hover and keyboard-focus tooltip; click to select a state; Control/Shift-click or a Multi-select control to add states; unselected states stay visible but dimmed; a selection bar with Clear and a “Nationwide / no state” chip; wheel and +/− zoom, drag pan when zoomed, and Reset; a Map as table toggle; a toggle for state shading by count. These tools land on the Map tab. The small List-tab map stays a compact overview in the right column and does not need zoom, table view, or callouts.

- **`national/test-mapview.js`**: ports the PR’s pure helper tests and covers sizing, callout layout against the 975×610 land in a 1040×610 view, and theme-agnostic shading values.

### App-specific

- National still owns the US map and geo, sources, cost, roadway, PS&E, advance notices, and National snapshots under `national/data/`. Live modules (`v2.js`, `v4.js`, `v6.js`, `combined.js`, `weekly.js` until it moves) stay until a later change actually replaces them. Each app keeps its own `app.js`, `model.js`, `index.html`, and app-specific CSS, including its accent: National blue (`#7cb7ff` night, `#1d5fbf` day) and Texas teal (`#5eead4` night, `#0f766e` day).
- Texas still owns the canvas map and geo, Intel, magazine, newsletter, and Texas snapshots under `texas/data/`. Intel keeps its own search and filter stack; those filters do not move into the shared Filters drawer.

## Per-app changes

### National

National moves into the shared shell: slim header with Home, title, freshness, and theme; shared search, Filters drawer, and chips row; List / Map / Pursuits / More; Data & sources, Timeline, Breakdown, and What counts stay under More. Scopes, digest, “Since you last visited,” the slim banner, saved filter sets, Pursuits, and the weekly list stay. The list count next to the quick filters is shown again by removing the CSS that hides `#listCount`.

The 1200px list-plus-mini-map and 480px third-column docked sheet go away in favor of the shared 1024px two-column layout, where details use the right column. After National is in the shell and tests show they are unused, remove `renderMapV5`, the unused lane scope arrays (such as `SCOPES_P`), and the always-hidden `#pseCtl` markup and the code that only exists to hide or render it. Do not bring those fee, design-build, pipeline, or advance controls back.

The Map-tab tools described above are a later step, after Texas is in the shell.

### Texas

Texas moves into the same shell and opens on List instead of the map. The six always-visible tabs become List, Map, Pursuits, Intel, and More. Timeline, Agencies, and Sources move under More. Intel stays its own tab. The newsletter and magazine are unchanged. The previous default view name “Radar” is the Map tab.

Texas gains a Pursuits tab and weekly list built from the stars and capture files already on the device, in the same pattern as National (starred records plus capture files, sorted by the user’s due date when one exists). Nothing is migrated off of those existing keys. It also gains saved filter sets and removable active-filter tags by calling `RadarFilters` with `app: 'texas'`. Drainage relevance and the other Texas filter controls move into the shared right-side drawer; they do not change meaning. Texas’s KPI boxes stay, as app-owned content under the header. The List capture and backup bar stays where it is today. Pursuits includes the weekly list and the same Export CSV and calendar actions National’s Pursuits already has.

The canvas map (`texas/map.js`) stays a self-contained canvas map with pan, zoom, and pins. On desktop it fills the shell’s map column (the List-tab overview and the Map-tab full-size pane). Clicking a record still highlights its pin when the map is visible and the record has coordinates. Records with no location stay in the list; the map side shows a “no location” chip (this is also the note already implied by today’s unmapped count). Texas does not receive National’s SVG state tools.

Texas’s 900px “center a 1100px phone layout” rule is removed. Below 1024px Texas uses the shared stacked phone layout at full width.

## Data flow

Data collection and refresh do not change in this phase. Daily workflows (`refresh-national.yml`, `refresh-opportunities.yml`) and the weekly Texas Intel publish workflow stay as they are. Apps still read JSON written by `scripts/build-national.js` and `scripts/build-opportunities.js`.

Device state keeps the Phase 1 keys: one shared theme (`radars.theme`); per-app stars, capture files, notes, saved filters, and National’s last view (`national.tab`). The only new keys are `texas.tab` (last view) and `texas.filtersets` (saved sets), both read and written through `RadarStorage`. Texas Pursuits and the weekly list read the existing Texas watch and capture data; they do not introduce a second watchlist.

Backup and restore stay per app, with the Phase 1 versioned format. No new backup shape is required for this phase.

## Error handling

- If a shared shell CSS or JS file (including `shared/shell.js` and `shared/shell.css`) fails to load, the page shows the existing on-page `RadarLoadError` instead of a blank screen. New shared `<script>` and `<link>` tags get the same `onerror` hook as in Phase 1.
- If the map fails to load or throw at render time, the list and details still work, and the map column (or the stacked map area on a phone) shows a short note in place of the map.
- A record with no location still appears in the list and in details. The map side shows a “no location” chip and does not pretend to place it.
- The Phase 1 rules still hold: a missing or invalid snapshot leaves the shell drawn and the app in its current empty or error state; a bad backup never overwrites device state; a single corrupt preference is skipped; a failed service-worker cache update does not brick the app.

## Testing

`node test.js` remains the top-level runner, including the Phase 1 shared tests and `scripts/check-paths.js`, and is what the existing Tests workflow runs on pull requests and on pushes to `main`. Every step in this phase is test-first. No new test framework or dependency is added.

Add focused tests for:

- Shell layout: at 1024px and wider, two columns at about 60/40, sticky map column, details swapping that right column and restoring the map (or, on the Map tab, the records list) on close, list column unmoved; under 1024px, stacked list and map, details as a bottom sheet, tab bar at the bottom.
- Tab memory: first visit opens List; a later visit restores the last view, including Map; Texas writes `texas.tab` through `RadarStorage` and does not overwrite National’s key.
- Texas Pursuits and weekly list: starred plus capture rows, existing watch data is still read, weekly Print / Share / Copy / Download builders run for Texas records.
- Ported map helpers: count-marker sizing, callout layout in the widened viewBox, and shading in a theme-agnostic 0..1 range.
- Phone layout still works, and the existing National and Texas tests still pass. Path checks still allow `../shared/` and still reject any path that leaves the repo.

A leftover National function or control is removed only after tests (or an explicit unused-export check) show nothing loads it.

Before each review, take desktop and phone screenshots of both apps (desktop at 1280px wide is enough; phone at 390px wide is enough) so the change is visible, not only described. Screenshots are for review, not for CI.

## What this phase will not do

- No new sources, collectors, or refresh-schedule changes, and no source-health work (that is Phase 3)
- No framework, bundler, or dependency additions
- No URL changes and no repository links on the live pages
- No updates to the frozen hydraulics-tools radar folders
- No combined National-and-Texas backup file
- No landing-page redesign
- No National map tools on Texas, and no change to Texas’s canvas map behavior other than filling the shell’s map column
- No return of National’s dormant dollar-bubble map, lane modes, or hidden fee / design-build / pipeline / advance controls
- No new saved-setting keys other than `texas.tab` and `texas.filtersets`
- No change to list page sizes (National still adds 50 rows, Texas 100)

## Delivery

Work lands on a new branch and a pull request in `lbonil3/radars`, built task by task with review between tasks, the same way as the foundation. The live GitHub Pages site updates when that PR merges to `main`. If a problem shows up after merge, the PR can be reverted. This phase does not migrate away any existing device data; a revert must leave stars, notes, capture files, and saved filters as they were.

Delivery order, each step reviewable on its own:

1. **Shared shell.** Add `shared/shell.js` and the `shared/shell.css` layout, with tests for layout, panel open/close, the filter drawer, and tab memory against a document root. Do not switch the live apps over in this step. Bump `RadarCache.VERSION` and add the new files to the cache lists. Screenshots of both apps confirm there is no visual change yet.
2. **National moves into the shell.** Wire National to `RadarShell`, drop the 1200px-only layout, show the list count, and put theme in the header. After tests show they are unused, remove `renderMapV5`, the unused lane scope arrays, and `#pseCtl`. Existing National behavior listed above stays. Screenshots of National (and Texas, to show it is unchanged).
3. **Texas moves into the shell.** Wire Texas to the same shell, open on List, add `texas.tab`, move Timeline / Agencies / Sources under More, keep Intel as a tab, add Pursuits and the weekly list, and call `RadarFilters` for `texas.filtersets`. Move the weekly-list builders from `national/weekly.js` to `shared/weekly.js` and point both apps at that file. The canvas map fills the map column; newsletter and magazine stay as they are. Screenshots of both apps.
4. **National map tools.** Add `national/mapview.js` and its tests, widen the viewBox only for callouts, follow Day and Night, keep count markers, and wire the Map-tab interactions. Texas is untouched. Screenshots of both apps.

## Open questions

- Should this phase’s branch stack on [PR #1](https://github.com/lbonil3/radars/pull/1) (`cursor/radar-2-foundation-design-spec-779b`), or wait until that PR is merged to `main`? The foundation work is a prerequisite either way; only the starting point changes.
