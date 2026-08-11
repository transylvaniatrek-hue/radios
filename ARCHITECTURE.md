# Architecture

How the Viper 8000 Radio Trainer is put together, and how to extend it —
particularly for the activities/levels that will build on top of this.

## Running it locally

The app is plain ES modules (`<script type="module">`), which browsers
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

## Two views of one radio

The radio has two SVGs — `#radioMap` (front, `viperFrontMap.svg`) and
`#radioMapTop` (top, `viperTopMap.svg`) — toggled by `ui/viewToggle.js`,
which sets `data-view` on `#radioStage`; CSS in `base.css` shows/hides
whichever view doesn't match. Only one view's hotspots are visible at a
time, but **both are always live in the DOM**, so several physical controls
have two hotspot ids — one per view — for the same real part:

| Control | Front id(s) | Top id |
|---|---|---|
| Volume/power knob | `onOffVolumeClockwise` / `CounterClockwise` | `on_off_volume_clockwise` / `counterclockwise` |
| Channel knob | `sixteenPositionKnobClockwise` / `CounterClockwise` | `_16_position_clockwise` / `counterclockwise` |
| A/B/C switch | `threePositionABCSwitch` | `_3_position_switch` |
| Orange button (scan) | `topOrangeButton` | `orange_top` |
| Lock switch | — (top view only) | `lock_switch` |

Config ties each pair to one shared behavior: `GROUPS` in `config.js` makes
the knob/switch pairs share one highlight state, and every input module
that wires a shared control (`volumeKnobInput.js`, `scanInput.js`) takes an
*array* of elements — one per view — all driving the same controller call.
`main.js` is where each pair gets wired together; that's the one place that
needs to know both ids exist.

Each view's hotspot `<g>` has its own id (`#InteractiveElements` /
`#InteractiveElementsTop`) but shares a `.hotspot-group` class — `main.js`
queries `.hotspot-group > *` once to get every hotspot from both SVGs, and
`hotspots.css` targets `:is(#InteractiveElements, #InteractiveElementsTop)`
so both get the same states with ID-level CSS specificity (safely beating
each SVG's own baked-in `.cls-1`/`.top-cls-1` style block regardless of
source order — see the comment at the top of `hotspots.css`).

## The shape of it: controllers, a bus, and views

```
config/config.js  ────────────────┐
                                   │ (data: labels, timings, constants)
                                   ▼
radio/radioState.js  radio/lockController.js  radio/scanController.js  ptt/pttController.js  ui/hotspotHighlight.js
radio/homeScreenController.js         (state machines, no DOM — read config, emit facts)
       │                    │                  │                   │                  │
       └────────────────────┴──────────────────┴───────────────────┴──────────────────┘
                                   ▼
                        js/core/eventBus.js   (shared pub/sub — see events.js for the full catalog)
                                   │
       ┌───────────────────────────┼──────────────────────┐
       ▼                           ▼                      ▼
radio/screenView.js            ptt/pttView.js        ui/activityLog.js
 (every LCD instance +          (PTT hotspot           (turns every event
  sidebar Radio card)            glow + sidebar          into a log line)
                                  PTT card)
```

**Controllers** own state machines and know nothing about the DOM. They
read tunable numbers from `config/config.js` and emit facts on the event
bus (`radio:volume-changed`, `ptt:released`, `radio:lock-changed`, etc. —
the full list is in `js/core/events.js`).

**Views** subscribe to those events and update the DOM. They never call
into a controller's internals — only its public methods
(`radioState.increaseVolume()`, etc.) or not at all, if they're pure
listeners.

**`js/main.js`** is the only file that wires DOM element lookups to
controllers/views. It should stay thin — if you're adding real logic there,
it probably belongs in a controller instead.

## The lock system

`radio/lockController.js` owns a single `locked` boolean. Every controller
that performs a button-press action checks it before acting:

- `homeScreenController` (keypad, mute), `scanController` (orange button),
  `pttController` (PTT) each call `lockController.isLocked()` and, if
  true, call `lockController.blockedBeep(id)` instead of doing anything —
  that plays the locked-beep tone (`core/beep.js`) and emits
  `radio:locked-input` for the log.
- `ui/hotspotHighlight.js` (every generic button with no dedicated
  controller — keypad's siblings like nav/home/data/side buttons/etc.)
  does the same check, **except** for ids in `LOCK_EXEMPT_IDS`
  (`config.js`) — the channel knob and A/B/C switch, which keep working.
- `radio/volumeKnobInput.js` never checks lock at all — the volume knob
  always works, per spec ("locking allows the knobs to work").

To add a new lockable button: give it its own controller (or fold it into
the generic system) and add the same `if (lockController.isLocked()) {
lockController.blockedBeep(id); return; }` guard before its real action.

## Two screen "flavors", four live instances

`radio/lcdTemplate.js` clones one of two `<template>`s in `index.html`:

- `"multi"` (`#lcdScreenTemplate`, front view) — three stacked lines, full
  icon row, a clock.
- `"single"` (`#lcdScreenTopTemplate`, top view) — one line that
  **rotates** through the three values (see `screenView.js`'s
  `startRotation`/`renderRotation`), a reduced icon row, no clock. Shows a
  fixed `"CTRL LCK"` instead of rotating while locked.

Four instances exist at once — front on-radio, front large, top on-radio,
top large — all built in `main.js` and passed to `screenView.js` as one
`screens` array. `screenView.js` filters by `.kind` internally
(`multiScreens`/`singleScreens`) so every event handler updates the right
subset; nothing else in the app needs to know how many instances there are
or which kind they are. Adding a fifth screen anywhere on the page is a
`instantiateLcdScreen(host, "multi"|"single")` call in `main.js`, not a new
code path.

There is no on-screen volume indicator on either flavor — the real radio
doesn't show one, so that feedback lives only in the sidebar Radio card.
The mute "Tones Off"/"Tones On" notice only appears on the front
(`"multi"`) flavor's line 3 — the top view has no mute button and its
single line is busy rotating the channel info.

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
| Tune volume steps / boot duration / rotation speed | `js/config/config.js` → `RADIO_CONFIG` |
| Rename/relabel a hotspot | `js/config/config.js` → `BUTTON_LABELS` |
| Add/edit a channel preset | `js/config/config.js` → `CHANNEL_PRESETS` |
| Change what the activity log says for an event | `js/ui/activityLog.js` only |
| Change the front LCD's look/content | `css/screen.css` + `<template id="lcdScreenTemplate">` in `index.html` |
| Change the top LCD's look/content | `css/screen.css` (`.lcd-screen-top` rules) + `<template id="lcdScreenTopTemplate">` in `index.html` |
| Add another copy of a screen elsewhere on the page | Add a host element in `index.html`, then one more `instantiateLcdScreen(host, kind)` call in `main.js`'s `screens` array |
| Add a new physical control with special (non-toggle) behavior | Add its id to `SPECIAL_IDS` in `config.js`, write a controller in a new folder (mirror `ptt/` or `radio/`), emit new events in `events.js`, wire it in `main.js`. If it should be blocked while locked, add the `lockController.isLocked()` guard; if it's a knob/switch, add its id(s) to `LOCK_EXEMPT_IDS` instead |
| Add a brand-new activity/level system | New top-level folder (e.g. `js/activities/`) that only imports `core/eventBus.js` + `core/events.js` — it shouldn't need to import controllers directly |

## File map

```
index.html                 Markup + both SVGs' hotspots + both <template> LCDs
css/
  base.css                 Page chrome: layout, view toggle, large-screen-column,
                             sidebar cards, log, tooltip
  hotspots.css             SVG control states (hover/active/PTT glow/knob flash),
                             targets both views' hotspot groups via :is()
  screen.css                Both LCD flavors (front: boot/home/menu-bar;
                             top: boot/single-line/reduced icons)
js/
  main.js                   Bootstraps everything (DOM refs → controllers/views)
  core/
    eventBus.js              Minimal pub/sub
    events.js                 Catalog of every event name + payload shape
    beep.js                    Shared tone generator (PTT confirm beep, locked-input beep)
  config/
    config.js                 Labels, groups, special-ids, lock-exempt-ids,
                                channel presets, timing constants
  radio/
    radioState.js             Power/volume state machine (no DOM)
    homeScreenController.js    Channel select + mute state machine (no DOM)
    lockController.js           Lock/unlock state + the shared "blocked beep" helper
    scanController.js            Scan on/off state machine (no DOM)
    screenView.js                  Drives every LCD instance + sidebar Radio/Lock card (view)
    lcdTemplate.js                  Clones one of the two <template> LCDs into a host
    volumeKnobInput.js               Knob clicks (front+top) → radioState calls (input)
    homeScreenInput.js                Keypad/mute clicks (front only) → homeScreenController (input)
    scanInput.js                       Orange-button clicks (front+top) → scanController (input)
    lockInput.js                        Lock-switch clicks (top only) → lockController (input)
  ptt/
    pttController.js           Hold-to-transmit state machine (no DOM)
    pttView.js                   PTT hotspot glow + sidebar PTT card (view)
  ui/
    tooltip.js                  Generic hover/focus tooltip (both views)
    activityLog.js               Turns bus events into log lines
    hotspotHighlight.js          Generic click-to-highlight controller+view (lock-aware)
    viewToggle.js                 Front/Top view switch (UI-only, not simulated hardware)
```
