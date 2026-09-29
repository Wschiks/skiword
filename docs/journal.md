# Build journal

Chronological log of what was built, why, and what was removed (so nothing good is lost).
Screenshots per milestone are in `screenshots/` (see `screenshots/README.md`).

## Session 1 (autonomous overnight build)

### M0 Setup
- Repo already had a remote and a first commit; built on top. Vite + TypeScript + Phaser 4.2.1 + Vitest + Playwright.
- Copied the spec to `docs/concept.md`, wrote `CLAUDE.md`, `docs/decisions.md`.
- All game data in `src/config/*` (lifts, areas, capacity, facilities, zones, quests, balance, shop, ads, legal, layout).

### M1 + M2 Core simulation, economy, bot, tuning
- `src/core` is pure TS: state, economy (formulas + analytic estimate), lifts, guests (state machine), unlocks (all buy rules + purchase catalogue), quests, season (prestige), save, game (step/advance/ski bus/offline), bot.
- 40 unit tests: buy rules, gates, guest state machine, patience, lodge sessions, bus, caps, offline, prestige, save repair, estimate vs sim (5 states within 25%), quests, plus a full headless bot playthrough of Season 1 and a second run with New Season.
- Balance: bot + tuning script (`npm run tune`), results in `docs/balance-report.md`. Everything maxed at about 74 h (target 60 to 80 h).
- Things tried and dropped: plain `payback = cost / delta` made the bot never rebuild lifts (a rebuild resets to level 0, so it looked like a downgrade) and stall on parking vs lifts; fixed with soft-min and rebuild bundling (see decisions.md).

### M3 Map (Phaser scene, all art in code)
- `src/scene/art.ts` bakes every texture at 2x with the 2D canvas API: guests (one 12x2 atlas so 190 guests batch), pines, rocks, lift towers/carriers (dot, T, chair, cabin), stations, cars, lodge, bus, buildings, zone props (kids, park stage 1/2/3, slalom, off-piste), signs.
- `background.ts` bakes the 1200x3200 world (sky, mountain silhouette, snow per area, ridges, glacier cracks, canyon, village, road, parking lot). Pistes are a separate canvas texture redrawn only when lifts change (a Graphics version with hundreds of circles was rejected: Phaser re-tessellates Graphics every frame).
- `MapView.ts`: own DOM pointer camera (drag with inertia, pinch, wheel, tap-to-hit-test). `MapScene.ts` ties core state to views (lifts + carriers with loaded/empty strands, guests interpolated between sim steps, buildings, zones, bus animation, locked-area overlay with FOR SALE sign and price, floating +$ text pooled and throttled to 30/s, snowfall capped at 60 flakes).
- Tooling: `scripts/screenshots.mjs` + `shotlib.mjs`; debug keys with `?debug` (L level, R rebuild, P parking, A area, N new line, M money x10); `?new` starts a fresh save.
- Screenshots: `screenshots/m3-map-v1`.

### M4 UI, M5 Meta, M6 Monetization (mock services)
- HTML/CSS overlay on top of the canvas (`src/ui/*`): top bar (money, income/s, gems, population with mood face, menu), 3 quest chips, tutorial banner + pulsing ring on the map, "Next" goal pill, floating Ski Bus button, 6 tabs with red dots for affordable-and-useful purchases, bottom sheets (x1/x10/Max), dialogs, toasts, DOM confetti.
- Inline SVG icons, synthesized WebAudio sfx (coin throttled to 8/s, chime, buzz, horn, fanfare), haptics via Capacitor if present else `navigator.vibrate`.
- Re-render robustness: sheets re-render from HTML strings only when the string changes; taps are matched by pointerdown/pointerup key + `elementFromPoint`, so a re-render between press and release cannot eat a tap.
- Save/load (10 s autosave, on hide, on pagehide), welcome-back dialog with optional "Double it" rewarded ad, New Season dialog, two-step reset, legal pages (generated from `src/config/legal.ts`, placeholders for the publisher block).
- Ads and purchases go through `src/ads.ts` / `src/purchases.ts`: mock on web (1.5 s fake ad), AdMob / store hooks for device wired in M8.
- New scripts: `npm run smoke` (17 Playwright checks: canvas, first upgrade, six sheets, map tap, drag, autosave, no console errors) and `npm run flows` (18 checks: persistence, offline dialog, quest claim, ski bus with gems and mock ad, cash bundle, mock IAP, prestige, reset).
- Screenshots: `screenshots/m4-ui-v1`.
- A version of the lift row where "Rebuild: Gondola 12" wrapped onto 3 lines was replaced by stacked buttons (label over cost) whenever a row has two buttons.

### M7 Polish
- Perf: measured 0.34 ms of JS per frame with 190 guests (`npm run perf`). The headless 26 fps is software GL, not the game. To keep phone GPUs happy every sprite now lives in ONE atlas texture (`atlas`), so the depth-sorted scene batches in about one draw call instead of breaking on each texture change. Rejected alternative: baking decor into a huge canvas (needed 35+ MB of texture memory).
- Tests grew to 48: number formatting, income never drops on rebuild (all tiers, 4 areas, 4 population levels), monotonic cost sequences, 4+ purchases in the first minute, tutorial steps, lobby.
- Accessibility: tap targets >= 44 px, text >= 10.5 px, contrast fixes on muted text and disabled buttons, focus-visible ring, aria roles on modal/toasts, `prefers-reduced-motion`.
- Added a decorative gondola bridge (cable, towers, moving cabin) across the canyon once the Glacier is owned.

### M8 Native
- Capacitor 8 projects for Android and iOS (SPM). AdMob (test ids, `LIVE=false`), native purchases, haptics, splash, status bar wired behind the existing services. Icons/splash generated from code (`npm run icons`). `cap sync` works. **Not compiled on this machine** (no Xcode / Android SDK), see `docs/native.md`.

### Real-GPU check and close-up review (after M8)
- Used the built-in browser (Apple M2 Pro GPU, ANGLE Metal): 60 fps with 189 guests. Also found a startup bug there: the pane reported a 0x0 viewport at first, the camera zoom became NaN and the map never rendered. Software-GL headless never hit it. Fixed by ignoring sizes under 50 px and repairing non-finite camera state.
- `scripts/touch.mjs` drives real multi-touch through the DevTools protocol (drag, pinch, tap, scroll-without-buying). It exposed that horizontal panning was impossible when zoomed in (a leftover clamp line). Fixed.
- `scripts/art-tour.mjs` close-ups showed the zone props sitting on the lift cables. Zone coordinates moved (decisions.md). Also: skiers all landed on one spot at each hub (now spread), `formatNum(999.9T)` printed "1000T" (now "1.00Qa").
- Phone-width column on desktop/tablet, rotate hint on landscape phones.

### Balance pass 2 (all milestones in tolerance)
- Two milestones were outside their band (Lower Slopes +147%, Mid Mountain -48%). Cause: the greedy bot never saves for an area while cheap upgrades still pay back, and its one-step estimate cannot see the buildings, zones and housing an area unlocks. Tried: a global unlock bonus (fixes Lower, breaks Peaks), per-area grids (interacting, fiddly), then wrote `scripts/optimize.ts` which found a solution in about 20 s. New numbers in `src/config/balance.ts` and `BOT.areaBonus`; full-simulation cross-check of the first 30 minutes agrees within about 25%.
- Fixed a flaky test that measured a small cost against a 1e15 balance (float rounding).

### Branch option/fast-balance
- Only `src/config/balance.ts` (TUNE), `tests/playthrough.test.ts` bounds and docs differ from main. The profile is main's tuned costs times compression factors: first attempt was a uniform 0.3x, rejected because T-Bar after 34 s and chair after 2.6 min makes the opening a blur. Final: early costs 0.8-1.0x, late costs 0.3x. After main's second balance pass the profile was re-derived from main's new numbers (`MAIN` block in `balance.ts`): T-Bar 3.8 min, first chair 14.5 min, Mid Mountain 57 min, first gondola 2.2 h, Glacier 5.2 h, everything maxed 25 h.

### Late hardening pass (UI autoplayer, in-place updates, purchase feedback)
- `scripts/monkey.mjs`: 5,250 random taps/drags/wheel actions on buttons and map across early, mid, late and maxed states: no errors, invariants hold.
- `scripts/uiplay.mjs`: the balance bot decides what to buy, a Playwright driver buys it through the real UI (tabs, sheets, build picker, buttons) on a 390x844 screen: 320 purchases over 34 h of game time, every purchase kind (levels, rebuilds, new lines, areas, buildings, zones, park stages, housing, parking) reachable and effective. Its first two runs failed for harness reasons that were still informative: the sheet's DOM was replaced every 250 ms.
- **In-place UI updates** (`src/ui/morph.ts`): sheets, top bar and quest strip are now diffed into the existing DOM instead of replacing `innerHTML`. Element identity, touch scroll momentum and the pressed state survive the 4 Hz refresh. Transient JS classes (`down`, `pop`, `shake`) are preserved.
- Purchase feedback in the world: ring + glow burst at what you bought (`Fx.burst`). Buying an **area** closes the sheet and glides the camera to the new territory (`MapView.panTo`); the camera's bottom padding grows with the open sheet so the map can be scrolled above it.
- Bugs found by looking at the results, not by tests: the dock's `.next` CSS class also styled the Mountain sheet's "Next" card (squeezed to 68% width, renamed `.nextpill`); the burst used an atlas frame (`glow`) that did not exist on main, so Phaser drew frame 0 (a giant ghost skier). New static test `tests/atlas.test.ts` checks every referenced atlas frame is baked.
- Verified: 52 tests, smoke, flows, touch, monkey (5,250 actions), uiplay (320 purchases), 3 h soak.

### Restyle: "chunky cartoon" look (after your reference screenshots)
- Feedback: the first look (dark rock mountain, thin flat sprites, rock walls, sky) was far from the Idle Ski Resort style references. New target: bright near-white snow with soft blue shading, thin curving ski tracks, big colourful cabins and chairs, orange pylons, red net fences, snowy pines, chunky saturated UI, but 2D.
- Art (`src/scene/art.ts`, rewritten): every sprite has a baked ground shadow; pines with snow caps and scalloped edges, bushes, softer rocks; orange pylons with sheave wheels; blue chairs, orange/blue gondola cabins, yellow drum stations with a skier sign; top-down parked cars in 8 colours; chunky houses (`house()` helper: wall, glass windows, snow-topped coloured roof slab, awnings, string lights); lodge, bus, zones recoloured with shadows. Guests: puffy jackets, bigger heads, beanies, shadow.
- World (`src/scene/background.ts`, rewritten): no sky and no rock walls. Snowfield with dune shading, glacier ice cracks, deep-blue crevasse with icy lips, cleared village with road, tiled plaza and an asphalt parking lot. Pistes are now thin blue tracks on a faint packed-snow strip, queue aprons with short wing nets, red net fences along area borders (gaps at the hub walkway and at built lifts), dense forest along both edges. Locked areas are frosted fog with cloud puffs and a green price pill instead of a dark overlay.
- UI (`src/styles.css` v2 block, top bar markup in `ui.ts`): green cash pill with per-minute income, gold gem pill, blue population pill, blue square gear button, floating chunky blue tab buttons (orange when active), green primary buttons with a hard bottom edge, thicker white borders, soft blue sheets. Everything still uses the same state and logic.
- Rejected: keeping the old dark look as a "theme" (the two never shared any art); it is one tag away instead: `git checkout v1-classic-look`.
- Screenshots: `screenshots/restyle-v1` to `restyle-v4` (iterations), `screenshots/restyle-art-tour` (close-ups).
