# Architecture

How Radio Trainer is put together, and how to extend it — particularly for
the additional radios and activities/levels that will build on top of this.

The app itself is "Radio Trainer"; radios are separate, selectable things
within it. Two are implemented: **Motorola 8000** (it's what used to be the
whole app before the radio/activity selector existed — most of this doc
describes it) and **Rocky Talkie**, added later as the second radio and
the reference example for "Adding a new radio" below. Both have a "Free
Play" activity (no goal, just the simulator) plus one or more guided
scenario activities driven by `js/activities/` — see "Guided activities"
below.

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

## The radio/activity selector

`js/config/radios.js` is the catalog: a `RADIOS` list (id, display name,
`implemented` flag) and an `ACTIVITIES` map keyed by radio id. `Free Play`
is every radio's default activity; any other id in that list is a guided
activity — see "Guided activities" below for where its actual behavior
lives. `ui/radioSelector.js` reads `radios.js` to populate the two
`<select>`s in the header, and does exactly two things on change:

- **Radio changed** → show that radio's panel (`[hidden]` toggled on
  `#motorola8000Panel` / `#rockyTalkiePanel` in `index.html`), repopulate
  the Activity dropdown from `ACTIVITIES[radioId]`, emit `app:radio-changed`.
- **Activity changed** → emit `app:activity-changed`. `activities/activityEngine.js`
  is what actually acts on this (see below); the radio-specific activity
  log also listens, purely to print "Activity: X selected."

Switching radios doesn't tear anything down — Motorola 8000's controllers
are always wired, just hidden when its panel isn't showing, so its state
(power, channel, lock, etc.) is exactly as you left it if you switch back.

### Adding a new radio

Rocky Talkie is the reference example — it was added without touching any
Motorola 8000 code. Follow the same steps:

1. Add `{ id, name, implemented: true }` to `RADIOS` and its activity list
   to `ACTIVITIES` in `radios.js`.
2. Build a new panel in `index.html` (`<div class="radio-panel" id="<id>Panel" hidden>`)
   with that radio's own markup — its own SVG(s)/hotspots/`<template>`
   screen(s), following the Rocky Talkie panel as a reference.
3. Register the panel in `main.js`'s `initRadioSelector({ panels: {...} })`.
4. Give it its own config (`config/<name>Config.js`), controllers, and
   activity log under a same-named folder (`js/rockyTalkie/` is the
   pattern — state machines, inputs, screen view, and its own
   `init<Name>ActivityLog` all live there) and wire them in `main.js`.
   **Use a distinct event namespace** (`rocky:*`, not `radio:*`/`ptt:*`) —
   every radio's controllers are always wired regardless of which panel is
   visible, so reusing Motorola 8000's event names would make its views
   react to the new radio's state changes too. The one exception:
   `APP_RADIO_CHANGED`/`APP_ACTIVITY_CHANGED` (app-level, not radio
   hardware) are deliberately handled by *every* radio's activity log, so
   whichever panel the user just switched to shows the confirmation.
5. If a hotspot is one of two+ input surfaces for the same physical
   control (Rocky Talkie's PTT/volume exist on both the radio body and the
   accessory hand mic, same as Motorola 8000's front/top views), wire an
   array of elements to one shared controller rather than duplicating
   logic — see `rockyVolumeInput.js`/`rockyPttInput.js`.
6. If one physical button does two different things by press duration
   (Rocky Talkie's Power, and each half of its Channel Flipper), use
   `core/holdOrTap.js` rather than writing bespoke timer logic.
7. `ui/hotspotHighlight.js` is radio-agnostic on purpose — call it once per
   radio with that radio's own `hotspots`/`activeCountEl`/`resetBtn`, and
   (if it needs one) a `guard(id)` function for lock-blocking, rather than
   it hardcoding any one radio's lock system.
8. If a single physical control's behavior depends on *which way* it's
   pushed (not just tap-vs-hold), give it two hotspots in the SVG, one per
   direction — see rocky.svg's `channelFlipperLockForward`/`...Back`. Each
   can independently be a tap-vs-hold control too (forward tap = channel
   up, forward hold = lock; back tap = channel down, back hold = scan).
9. A "press any button to exit" modal state (Rocky Talkie has two: scan
   mode and privacy-code selection) belongs on that radio's state module as
   one method — e.g. `rockyState.consumeModalPress()` — that every other
   input handler calls first and bails out if it returns `true`. Don't
   scatter the "am I in a modal state" check across each input module.

Two rendering pitfalls worth knowing about before you hit them again:

- **An SVG with only `viewBox` (no `width`/`height` attributes) can fail
  to auto-size at all when it's nested inside an extra wrapper `<div>**
  (as opposed to being a direct flex child) — some engines can't resolve
  `width:auto;height:auto` from the intrinsic aspect ratio alone in that
  context. Fix: give the `<svg>` explicit `width`/`height` attributes
  matching its viewBox (see `#rockyMap`) so it has a real intrinsic size
  regardless of nesting.
- **`<foreignObject>` with a `transform` (needed for Rocky Talkie's skewed
  screen) didn't reliably composite** in testing, even though the DOM/CSS
  were verifiably correct (right position, size, color). The fix that
  actually rendered: don't nest the screen inside the SVG at all — make it
  a plain HTML element positioned on top via CSS `transform`, kept in sync
  with the SVG's responsive size by a `ResizeObserver`-driven `--*-scale`
  custom property. See `rockySkewOverlay.js` + `.rocky-onradio-screen` in
  `screen.css` for the working pattern; reuse it rather than foreignObject
  if a future radio's screen also needs a non-rectangular placement.

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

`radio/lockController.js` owns a single `locked` boolean. Locking only
blocks controls that change a *setting* — every controller that performs
that kind of button-press action checks it before acting:

- `homeScreenController` (keypad, mute), `scanController` (orange button)
  each call `lockController.isLocked()` and, if true, call
  `lockController.blockedBeep(id)` instead of doing anything — that plays
  the locked-beep tone (`core/beep.js`) and emits `radio:locked-input` for
  the log.
- `ui/hotspotHighlight.js` (every generic button with no dedicated
  controller — keypad's siblings like nav/home/data buttons/etc.) does the
  same check, **except** for ids in `LOCK_EXEMPT_IDS` (`config.js`) — the
  channel knob and A/B/C switch, which keep working.
- `radio/volumeKnobInput.js` and `ptt/pttController.js` never check lock at
  all — volume and PTT always work regardless of lock state, per spec
  ("locking allows the knobs to work" — PTT and volume aren't "settings").
  Rocky Talkie's volume/PTT input modules follow the same rule (see
  `rockyState.js`'s `increaseVolume`/`decreaseVolume`/PTT — none of them
  check `locked`).

To add a new lockable button: give it its own controller (or fold it into
the generic system) and add the same `if (lockController.isLocked()) {
lockController.blockedBeep(id); return; }` guard before its real action.

Two more of Motorola 8000's side buttons follow this same shape:

- **`sideButton1` → `radio/directModeController.js`.** Held ≥1s
  (`RADIO_CONFIG.directModeHoldMs`) toggles Direct Mode — but only while
  the currently-displayed channel's text contains "Viper" (checked via
  `homeScreenController.getCurrentChannel()`, which always returns a valid
  `{ id, line1, line2 }` — the template's default when nothing's been
  selected yet). Off-channel or locked presses emit a notice/beep instead
  of toggling. Resets to off on power-off.
- **`sideButton2` → `radio/nuisanceDeleteController.js`.** A plain click
  that removes the currently-selected channel from scan until the radio is
  power-cycled. Motorola 8000's scan mode is just an on/off toggle (no real
  channel-cycling simulation), so this tracks *which* channel ids have been
  nuisance-deleted in a `Set` — ready for a future scan-cycling feature to
  consult — and reports the action via the activity log in the meantime.
  Resets (clears the `Set`) on power-off.
- **`topSideSellectButton` does nothing.** It's in `SPECIAL_IDS` (so the
  generic click-to-highlight system skips it) with no controller behind
  it — clicking it is a no-op by design, not a bug.

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
treat it as the contract activities are built against. `js/activities/`
(below) is exactly this — built without touching a single controller.

## Guided activities

`js/activities/activityEngine.js` is a generic, radio-agnostic step-based
engine — it has zero DOM knowledge and zero radio-specific knowledge. It
just:

1. Listens for `app:activity-changed`. If the selected `{ radioId,
   activityId }` matches a registered definition, starts it; otherwise
   (Free Play, or any id with no definition) stops whatever was running.
2. On start, calls the definition's `setup()` (if any) to force a known
   starting state, then announces step 0 (`activity:step-changed`) and
   subscribes to *exactly* the one bus event that step's `isMatch()` cares
   about.
3. When that event fires and `isMatch(payload)` is true, advances to the
   next step (or emits `activity:completed` if that was the last one).
4. If a step goes untouched for `ACTIVITY_CONFIG.struggleTimeoutMs`
   (`config/activityConfig.js`, 15s), emits `activity:struggling` with that
   step's `hintText` and `hintTargetIds`.

**Definitions** (the actual content — steps, setup, hints) live in
`activities/motorolaActivities.js` / `activities/rockyActivities.js`, one
array entry per activity:

```js
{
  id: "lockUnlock",            // must match the id in config/radios.js's ACTIVITIES list
  radioId: "motorola8000",
  name: "Lock / Unlock",
  setup() { /* force a known starting state, e.g. powered on + unlocked */ },
  steps: [
    {
      instructions: "...",       // shown immediately on the sidebar Activity card
      hintText: "...",           // shown only after the struggle timeout
      hintTargetIds: ["lock_switch"], // hotspot id(s) to pulse-highlight when struggling
      eventName: EVENTS.RADIO_LOCK_CHANGED,
      isMatch: (payload) => payload.locked === true,
    },
    // ...more steps
  ],
}
```

Registering an activity is two places, kept deliberately separate:
`config/radios.js`'s `ACTIVITIES` map (id + display name — drives the
dropdown) and the matching entry in `activities/<radio>Activities.js`
(the actual behavior). An id in one without the other just means selecting
it behaves like Free Play — config files stay pure data, activity
definitions are allowed to import and call controllers (that's their job).

`activities/activityView.js` is the only piece with DOM knowledge — call it
once per radio (see `main.js`) with that radio's own Activity card
elements and a `findHintEl(id)` lookup. It renders `activity:step-changed`
(progress text + instructions, clears any highlight), `activity:struggling`
(shows the hint paragraph, adds a `.hint-pulse` CSS class — see
`hotspots.css` — to every resolved `hintTargetIds` element), `activity:completed`,
and `activity:ended` (hides the card). Motorola 8000's instance also gets a
`showView(hintTargetIds)` callback that force-switches the Front/Top toggle
when a hinted control (e.g. `lock_switch`) only exists in the other view —
see `config.js`'s `TOP_VIEW_ONLY_IDS`. Rocky Talkie has one view, so it
omits `showView`.

To add a new guided activity: write its definition (setup + steps) in the
right `*Activities.js` file, add `{ id, name }` to `config/radios.js`, and
nothing else — `main.js` already spreads both radios' full activity arrays
into one `initActivityEngine([...])` call.

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
| Add a new physical control with special (non-toggle) behavior | Add its id to that radio's `*_SPECIAL_IDS`, write a controller in its folder, emit new events in `events.js` (own namespace!), wire it in `main.js`. If it should be blocked while locked, guard it (or, for the generic system, pass a `guard` to that radio's `initHotspotHighlight` call); if it's a knob/switch that should keep working, exempt it instead |
| Add a guided activity to a radio | Write its definition in `js/activities/motorolaActivities.js` / `rockyActivities.js` (setup + steps), add `{ id, name }` to `js/config/radios.js`'s `ACTIVITIES` — see "Guided activities" above |
| Tune the struggle-hint delay | `js/config/activityConfig.js` → `ACTIVITY_CONFIG.struggleTimeoutMs` |
| Change the Activity sidebar card's look | `css/base.css` → `.activity-card`/`.activity-progress`/`.activity-instructions`/`.activity-hint`; the highlighted-button pulse is `.hint-pulse` in `hotspots.css` |
| Add a new radio | See "Adding a new radio" above |
| Tune Rocky Talkie's channel range / timing / trim | `js/config/rockyConfig.js` → `ROCKY_CONFIG` |
| Change Rocky Talkie's screen look/content | `css/screen.css` (`.lcd-screen-rocky` rules) + `<template id="lcdScreenRockyTemplate">` in `index.html` |

## File map

```
index.html                 Header (radio/activity selectors) + one <div class="radio-panel">
                             per radio: Motorola 8000's has both SVGs' hotspots +
                             both <template> LCDs; Rocky Talkie's has its SVG,
                             its on-radio screen overlay (see below), and its
                             own <template id="lcdScreenRockyTemplate">
css/
  base.css                 Page chrome: layout, header selectors, radio-panel
                             show/hide, view toggle, large-screen-column,
                             .rocky-radio-visual wrapper, sidebar cards (including
                             .activity-card), log, tooltip
  hotspots.css             SVG control states — Motorola 8000's via :is() on two
                             ID selectors (fill/stroke); Rocky Talkie's via
                             `color`/currentColor on its grouped <g> hotspots
                             (see the comment above #InteractiveElementsRocky
                             for why those need a different technique); also the
                             shared .hint-pulse struggle-highlight (both radios)
  screen.css                All three LCD flavors (front: boot/home/menu-bar;
                             top: boot/single-line/reduced icons; rocky: segment-
                             display look) + Rocky's on-radio overlay positioning
js/
  main.js                   Bootstraps everything (DOM refs → controllers/views)
  core/
    eventBus.js              Minimal pub/sub
    events.js                 Catalog of every event name + payload shape (both
                                radios' namespaces)
    beep.js                    Shared tone generator (confirm beeps, locked-input beep)
    holdOrTap.js                Tap-vs-hold gesture helper (Rocky's Power/Channel Flipper)
    lcdTemplate.js                Clones a named <template> LCD into a host — shared,
                                    radio-agnostic (used by both radios)
  config/
    config.js                 Motorola 8000's labels, groups, special-ids,
                                lock-exempt-ids, top-view-only-ids, channel presets,
                                timing constants
    rockyConfig.js              Rocky Talkie's labels, special-ids, channel/power-level
                                  logic, privacy-code range + CT/DCS split, scan timing
    radios.js                  Radio + per-radio activity catalog (the selector's data —
                                 id/name only; behavior lives in js/activities/)
    activityConfig.js            Guided-activity timing (struggle-hint delay)
  activities/                 Guided-activity engine — radio-agnostic, no DOM
    activityEngine.js           Step tracking, completion detection, struggle timeout
    activityView.js               Renders engine events onto one radio's Activity card
                                    + pulse-highlights hinted hotspots (called once per radio)
    motorolaActivities.js         Motorola 8000's activity definitions (Lock/Unlock, Scan)
    rockyActivities.js            Rocky Talkie's activity definitions (Lock/Unlock,
                                    Change Privacy Code)
  radio/                      Motorola 8000's controllers/views
    radioState.js             Power/volume state machine (no DOM)
    homeScreenController.js    Channel select + mute state machine (no DOM) — also
                                 tracks/exposes getCurrentChannel() for directModeController
                                 and nuisanceDeleteController
    lockController.js           Lock/unlock state + the shared "blocked beep" helper
    scanController.js            Scan on/off state machine (no DOM)
    directModeController.js       sideButton1 (hold ≥1s, Viper-channel-gated) state machine
    nuisanceDeleteController.js    sideButton2 (tap) — tracks nuisance-deleted channel ids
    screenView.js                  Drives every LCD instance + sidebar Radio/Lock/Direct-
                                     Mode card (view)
    volumeKnobInput.js               Knob clicks (front+top) → radioState calls (input)
    homeScreenInput.js                Keypad/mute clicks (front only) → homeScreenController (input)
    scanInput.js                       Orange-button clicks (front+top) → scanController (input)
    lockInput.js                        Lock-switch clicks (top only) → lockController (input)
    directModeInput.js                   sideButton1 hold → directModeController (input)
    nuisanceDeleteInput.js                sideButton2 click → nuisanceDeleteController (input)
  rockyTalkie/                 Rocky Talkie's controllers/views (mirrors radio/ + ptt/ above)
    rockyState.js              Power/channel/volume/lock/scan/privacy-code state machine
                                 (no DOM) — owns consumeModalPress(), the "press any
                                 button" handler every other input calls first
    rockyPttController.js       Hold-to-transmit — immediate start, light symmetric
                                  trim, no lock-blocking (see config comments for why
                                  this differs from Motorola 8000's PTT); also defers
                                  to consumeModalPress()
    rockyScreenView.js           Drives both LCD instances + sidebar cards (view)
    rockyActivityLog.js           Rocky's own log — also handles APP_RADIO_CHANGED/
                                    APP_ACTIVITY_CHANGED, same as ui/activityLog.js
    rockySkewOverlay.js           Keeps the skewed on-radio screen's CSS scale in
                                    sync with the responsive SVG (see "rendering
                                    pitfalls" above)
    rockyPowerInput.js             Power button (tap/hold) → rockyState
    rockyChannelInput.js            Channel Flipper Forward/Back, two hotspots, each
                                      tap/hold → rockyState (tap also cycles the privacy
                                      code instead of the channel while selecting one —
                                      the one input consumeModalPress() doesn't gate)
    rockyVolumeInput.js              Volume buttons (radio+handset) → rockyState; Down
                                       is tap/hold (hold enters privacy-code selection)
    rockyPttInput.js                  PTT buttons (radio+handset) → rockyPttController
    rockyPttView.js                    PTT hotspot glow + sidebar PTT card (view)
  ptt/                          Motorola 8000's PTT (separate from rockyTalkie/'s)
    pttController.js           Hold-to-transmit state machine (no DOM)
    pttView.js                   PTT hotspot glow + sidebar PTT card (view)
  ui/
    tooltip.js                  Generic hover/focus tooltip (both radios, all views)
    activityLog.js               Motorola 8000's log — also handles APP_RADIO_CHANGED/
                                   APP_ACTIVITY_CHANGED (see rockyActivityLog.js above)
    hotspotHighlight.js          Generic click-to-highlight controller+view — radio-
                                   agnostic; called once per radio with that radio's own
                                   hotspots/count-el/reset-btn/guard/event-names
    viewToggle.js                 Front/Top view switch (UI-only, not simulated hardware)
    radioSelector.js               Header dropdowns: shows/hides radio panels,
                                     populates the Activity dropdown, emits app:*-changed
```
