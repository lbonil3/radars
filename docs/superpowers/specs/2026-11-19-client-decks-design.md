# Client decks

Date: 2026-11-19
Repo: lbonil3/radars
Status: Built

## Goal

Luis can open a client deck inside National Radar and inside Texas Opportunity. The deck is a full-screen slide viewer built from the data already on the page. He picks a state and either one client or all clients. The browser draws the slides. Nothing is downloaded and no server is involved.

A client is the agency name already stored on the record.

## Limits

Past and awarded items stay out. The map stays out. The deck copies stars and notes onto the slides. It does not write browser storage, so saved filters stay put. No PPTX library is added.

## Decisions

Two shapes were considered.

Shape A puts the slide document in one shared module. Each app converts its own records into that document at the edge, then opens the same viewer.

Shape B lets each app build its own slides and share only CSS.

Shape A is the one in the code. The slide order, the date windows, and the row limits then have one owner. Each app still keeps its accent color through the existing `--acc` variable. Texas stays teal and National stays blue. `shared/deck.css` does not set `--acc`.

The deck reads the current in-memory snapshot. It does not fetch a second copy of the opportunities, and it does not change routes. `/national/` and `/texas/` stay as they are. Live pages still do not link to the GitHub repository.

Texas qualification uses `aeStatus` in `texas/model.js`. That function already returns null unless `isConsultant` is true, and it returns `open`, `forecast`, or `past`. The deck keeps `open` and `forecast` only.

National records are a different shape. Calling `aeStatus` on them raw keeps almost none of the engineering rows, and it can keep a vessel IDIQ because the title says indefinite delivery and coastal. The National adapter does four things.

1. It drops a row whose title or description matches vessel, ESPC, or cyber.
2. It drops a row whose combined stage is `awarded` or `closed`.
3. It builds a small record with the notice type in `solType` and calls `aeStatus`.
4. It also keeps a forecast-stage engineering row when `aeStatus` returns null, and an open-stage row when the notice type is a solicitation, synopsis, or sources sought and `hasAeWording` is true.

`awarded` and `closed` are the Past label for National. `open` and `forecast` keep those names.

A row has a solicitation when its status is open and its URL is an `http` or `https` link to a specific notice. A workbook URL (`.xlsx`, `.xls`, `.csv`) is not a solicitation. A forecast row with no solicitation number and no specific notice URL is a watch-list row. Forecast rows still appear on that client's slide.

The due date for an open item is the solicitation due date. Texas uses `date`. National uses `dates.due`. A forecast plan date is not a due date. "Due in the next 14 days" and "due in the next 30 days" include today and the last day. Both windows count only open items that have a due date.

The cover's starred count is the starred open and forecast items in the current selection. The note is the capture-file `notes` string for that starred item. The "Next step / owner" line is always blank. The deck does not copy the capture file's next-action field into it.

The sources slide uses the feed health words fresh, stale, failing, and blocked by site. A snapshot status of `ok` is shown as fresh, and `failed` is shown as failing. Skipped and disabled feeds are left off the slide. The source list is the whole radar, not the one client, because freshness is a property of the feed.

National defaults the state picker to the state with the most open and forecast items. Texas locks the state to Texas. The client picker defaults to all clients.

## Viewer

The header of both radars gets a **Deck** button, placed with the theme controls. The overlay is full screen.

The first screen is the picker. State, client, and **Show deck**. After that, one 16:9 slide is scaled to fit the viewport. Previous and Next sit in a bar with a "1 of N" counter, a Full screen control, and Close. Left and right arrow keys move slides. Esc closes the overlay. A horizontal swipe moves slides. The Full screen control is hidden when the browser has no fullscreen API.

Slides use a light paper background so the type stays readable in a meeting. Titles use Georgia. Tables and labels use the system UI font. Day and night theme do not recolor the slide paper. The accent bar and the kickers use a fixed day accent, Texas `#0f766e` and National `#1d5fbf`, because the night accent is a pastel drawn for a dark page. The Deck button in the header still uses the live `--acc`.

## Slides

The deck is always in this order.

1. Cover. State, long date, client scope, count of open A/E items, count due in the next 14 days, count of starred items.
2. Due soon. One table of open items due in the next 30 days, sorted by due date, then client, then title. Columns are due date, client, number, title, and a star when the item is starred. The table continues on another slide after 6 rows. An empty selection still gets one slide that says none are due.
3. One slide per client that has open or forecast items, clients in alphabetical order. Open items first, then forecast items. Each item shows kind (RFQ, RFP, On-call, Forecast, or Solicitation), number, title, due date or plan date, solicitation link when there is one, a star when starred, the note when there is one, and a blank "Next step / owner" line. Four items per slide. Later slides for the same client say continued.
4. Watch list. Forecast items with no solicitation yet, sorted by client, then plan date, then title. Six rows per slide. Columns are client, title, and plan date.
5. Sources. Counts for fresh, stale, failing, and blocked by site, in that order. The name lists put failing, stale, and blocked by site before fresh, so a long fresh list does not push a problem feed onto the next slide. A parenthetical method note is left off the slide name. Names continue on another slide when they do not fit.

## Data shape

An item is a plain object.

`id`, `client`, `state` (postal code), `status` (`open` or `forecast`), `kind`, `number`, `title`, `due`, `planDate`, `url`, `hasSolicitation`, `starred`, `note`.

`build` trusts that shape. `fromTexas` and `fromNational` are the only places that read app records.

## Files

`shared/deck.js` owns `fromTexas`, `fromNational`, `build`, `render`, and `open`. `shared/deck.css` owns the overlay and the slide paper. Both `index.html` files load those two files and add the button. `texas/app.js` and `national/app.js` pass the current records, marks, and feeds. National also loads `texas/model.js` so the adapter can call `aeStatus` and `hasAeWording` without copying them. `shared/cache.js` bumps `VERSION` from 26 to 27 and precaches the two new files.

## Tests

`node test.js` runs `shared/test-deck.js`. The tests drive `fromTexas`, `fromNational`, `build`, and `render`. They check the windows, the sort, the client filter, continuation, stars, notes, the blank next-step line, the watch list, source labels, and that past items are absent. They also check that both pages have the Deck button and that the cache name is `v27`.
