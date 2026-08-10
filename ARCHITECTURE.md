# Architecture

How the Viper 8000 Radio Trainer is put together, and how to extend it —
particularly for the activities/levels that will build on top of this.

## Running it locally

The app is now plain ES modules (`<script type="module">`), which browsers
refuse to load over `file://` (CORS blocks module fetches from disk). You
must serve it over HTTP. From this folder:

```bash
python -m http.server 8743
```

then open `http://localhost:8743`. (Microphone access for PTT already
required `https://` or `localhost` for the same CORS-adjacent reasons, so
this isn't a new constraint — just now it applies to the whole app, not
just PTT.) GitHub Pages serves over HTTPS automatically, so the deployed
site needs no special handling.

## The shape of it: controllers, a bus, and views

```
config/config.js  ──────────┐
                             │ (data: labels, timings, constants)
                             ▼
radio/radioState.js    ptt/pttController.js      ui/hotspotHighlight.js
  (state machine,        (state machine,           (click-to-highlight,
   no DOM)                 mic/recording,            no radio/PTT logic)
       │                    no DOM)                        │
       │                         │                          │
       └─────────────┬───────────┴──────────────────────────┘
                      ▼
              js/core/eventBus.js   (shared pub/sub — see events.js
                      │              for the full catalog)
       ┌──────────────┼──────────────────┐
       ▼              ▼                  ▼
radio/screenView.js  ptt/pttView.js  ui/activityLog.js
 (LCD instances +      (PTT hotspot     (turns every event
  sidebar Radio card)   glow + sidebar   into a log line)
                        PTT card)
```

There are two LCD instances on screen at once — the radio's real screen
(inside an SVG `<foreignObject>`) and a larger auxiliary copy next to it,
for readability. Both are clones of the same `<template id="lcdScreenTemplate">`
in `index.html` (see `radio/lcdTemplate.js`), so screen content is only ever
defined in one place. `screenView.js` takes a `screens: [...]` array and
updates every instance together — adding a third screen anywhere on the
page would be a one-line change in `main.js`, not a new code path.

Note there's no on-screen volume indicator: the real radio doesn't show one
on its display, so that feedback lives only in the sidebar Radio card.

**Controllers** (`radioState.js`, `pttController.js`) own state machines and
know nothing about the DOM. They read tunable numbers from `config/config.js`
and emit facts on the event bus (`radio:volume-changed`, `ptt:released`,
etc. — the full list is in `js/core/events.js`).

**Views** (`screenView.js`, `pttView.js`, `activityLog.js`,
`hotspotHighlight.js`) subscribe to those events and update the DOM. They
never call into a controller's internals — only its public methods
(`radioState.increaseVolume()`, etc.) or not at all, if they're pure
listeners.

**`js/main.js`** is the only file that wires DOM element lookups to
controllers/views. It should stay thin — if you're adding real logic there,
it probably belongs in a controller instead.

## Why an event bus

The whole point: **an activity/level engine can subscribe to the exact same
events without touching any controller code.** For example, a step like
"trainee must power on the radio, then press PTT and hold past the beep"
can be checked by listening for `radio:boot-complete` followed by
`ptt:recording-started`, with no changes to `radioState.js` or
`pttController.js`. See `js/core/events.js` for the full event catalog —
treat it as the contract activities are built against.

## Where to make common changes

| You want to... | Edit... |
|---|---|
| Tune PTT timing (acquire delay, trim length, etc.) | `js/config/config.js` → `PTT_TIMING` |
| Tune volume steps / boot duration | `js/config/config.js` → `RADIO_CONFIG` |
| Rename/relabel a hotspot | `js/config/config.js` → `BUTTON_LABELS` |
| Change what the activity log says for an event | `js/ui/activityLog.js` only |
| Change the LCD's look (colors, layout) | `css/screen.css` + the markup inside `<template id="lcdScreenTemplate">` in `index.html` (cloned into every screen instance, so one edit updates all of them) |
| Add another copy of the screen elsewhere on the page | Add a host element in `index.html`, then one more `instantiateLcdScreen(...)` call in `main.js`'s `screens` array |
| Add a new physical control with special (non-toggle) behavior | Add its id to `SPECIAL_IDS` in `config.js`, write a controller in a new folder (mirror `ptt/` or `radio/`), emit new events in `events.js`, wire it in `main.js` |
| Add a brand-new activity/level system | New top-level folder (e.g. `js/activities/`) that only imports `core/eventBus.js` + `core/events.js` — it shouldn't need to import controllers directly |

## File map

```
index.html                 Markup + inline SVG hotspots + <template id="lcdScreenTemplate">
css/
  base.css                 Page chrome: layout, sidebar cards, log, tooltip,
                             large-screen-panel layout
  hotspots.css             SVG control states (hover/active/PTT glow/knob flash)
  screen.css                The simulated LCD (boot splash + home screen)
js/
  main.js                   Bootstraps everything (DOM refs → controllers/views)
  core/
    eventBus.js              Minimal pub/sub
    events.js                 Catalog of every event name + payload shape
  config/
    config.js                 Labels, groups, special-ids, timing constants
  radio/
    radioState.js             Power/volume state machine (no DOM)
    screenView.js               Drives every LCD instance + sidebar Radio card (view)
    lcdTemplate.js                Clones <template id="lcdScreenTemplate"> into a host
    volumeKnobInput.js           Knob click → radioState calls (input)
  ptt/
    pttController.js           Hold-to-transmit state machine (no DOM)
    pttView.js                   PTT hotspot glow + sidebar PTT card (view)
  ui/
    tooltip.js                  Generic hover/focus tooltip
    activityLog.js               Turns bus events into log lines
    hotspotHighlight.js          Generic click-to-highlight controller+view
```
