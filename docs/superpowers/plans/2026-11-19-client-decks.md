# Client decks implementation plan

Date: 2026-11-19
Spec: `docs/superpowers/specs/2026-11-19-client-decks-design.md`

The deck is an in-app viewer. Do not add a PPTX library.

## Constraints

- Vanilla JS. No build step and no new dependency.
- Routes `/national/` and `/texas/` stay as they are.
- Live pages do not link to this repository.
- Do not write or delete `localStorage` keys. Stars, notes, and saved filters stay put.
- Do not edit `lbonil3/hydraulics-tools`.
- Do not force-push. Do not merge the pull request.
- Bump `RadarCache.VERSION` from 26 to 27 when the new files ship.
- `node test.js` is the check.

## File map

| File | Role |
|---|---|
| `shared/deck.js` | Adapters, `build`, `render`, `open` |
| `shared/deck.css` | Overlay, picker, 16:9 slides |
| `shared/test-deck.js` | Behavior tests |
| `shared/cache.js` | Version 27 and the new files |
| `shared/test-cache.js`, `shared/test-capture.js`, `national/test-v6.js` | Expect v27 |
| `texas/index.html`, `national/index.html` | Deck button, CSS, scripts |
| `texas/app.js`, `national/app.js` | Pass live records into `RadarDeck.open` |

## Task 1: Failing tests

Create `shared/test-deck.js` before `shared/deck.js` exists.

Cover these cases with plain records.

- `fromTexas` keeps `aeStatus` open and forecast, and drops past and non-consultant rows.
- `fromNational` drops awarded, closed, and a vessel IDIQ. It keeps a forecast row that has no RFQ word, and an open solicitation whose title has engineering wording.
- Cover counts use a fixed `today`. Due in 14 days and due in 30 days are inclusive. An open item with no due date is not in those counts.
- Due-soon rows sort by due date.
- `client` limits every slide except sources.
- A seventh due-soon row starts a second due slide. A fifth client item starts a continued client slide.
- A starred item shows the note and a star. The rendered client slide contains the text `Next step / owner` and does not fill that line with the note.
- Watch list rows are forecast items with `hasSolicitation` false. A workbook URL is not a solicitation.
- Source status `ok` renders as fresh, and `failed` renders as failing. `skipped` is absent.
- Rendered HTML contains no `github.com`.
- Both index pages contain `id="btnDeck"` and load `shared/deck.js` and `shared/deck.css`.

Run `node shared/test-deck.js` and confirm it fails because the module is missing.

## Task 2: Shared deck module

Add `shared/deck.js` and `shared/deck.css` until `node shared/test-deck.js` passes.

`build` returns `{ kicker, slides }`. Slide kinds are `cover`, `due`, `client`, `watch`, and `sources`. Due and watch use 6 rows. Client slides use 4 items. `render` returns HTML for every slide. `open` builds the overlay, the picker, the keyboard handler, the swipe handler, and the fullscreen control.

The slide paper is light. Accent color comes from `var(--acc)`.

## Task 3: Wire both apps and the cache

Add the **Deck** button to both headers. Texas calls `fromTexas` with `RadarModel` and the watchlist marks. National loads `../texas/model.js`, calls `fromNational` with `NRC.stageOf`, and passes `STATE_NAMES`. Prefer `data/source-status.json` on National when it loaded. Texas passes the snapshot source list.

Set `VERSION` to 27. Add `deck.js` and `deck.css` to `SHARED` in `shared/cache.js`. Update the three tests that name v26.

Run `node test.js`.

## Task 4: Look at the slides

Open a Texas all-clients deck from the current snapshot in a headless browser. Save three PNGs under `docs/`: the cover, the due-soon table, and one client slide. Read the images. Adjust spacing, type size, and row count until the type is readable and the slides are not crowded. Replace the PNGs with the clean versions.

## Task 5: Pull request

One pull request against `main`. Do not merge it.
