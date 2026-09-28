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

