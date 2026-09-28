# Roadmap: what is done, what is not, what could come next

## Done (all milestones of `docs/concept.md`)
- **M0** setup, config-driven data (`src/config/*`), CLAUDE.md, decisions log
- **M1/M2** pure-TS core: guests state machine, per-ride pay, patience, lifts (10 tiers, gates, levels), parking, housing, areas, buildings, zones, ski bus, quests (26), prestige, offline, save; analytic estimate; balance bot; tuning; 48 tests
- **M3** map: procedural art, camera, all guest states, carriers, locked areas, buildings/zones, bus, fx, snowfall
- **M4** UI: HUD, quests, tutorial, six sheets with x1/x10/Max, next-goal pill, dialogs, sound, haptics, confetti
- **M5/M6** save/autosave, offline dialog with rewarded double, New Season, legal pages, menu; ski bus, gems, cash bundle, gem packs, Double Income (mock services)
- **M7** perf (single sprite atlas, 0.34 ms JS/frame at 190 guests, 60 fps on Apple M2 Pro in Chromium), accessibility, more tests, desktop column layout
- **M8** Capacitor Android + iOS projects, AdMob (test ids), native purchases, haptics, icons, splash

## Not done / known gaps
- Native apps were **not compiled or run on a device** (no Xcode / Android SDK on the build machine). `cap sync` works. See `docs/native.md`.
- Balance: all milestones are inside their bands for the balance bot (worst -21%, total to max 76 h vs a 60 to 80 h target, `docs/balance-report.md`). The bot is a payback optimiser, real players will differ: tuning with real play data is the next step. Optimiser: `npx tsx scripts/optimize.ts 150 --write`.
- Audio is synthesized beeps (no music).
- No real store products, no live ad units, publisher block in `src/config/legal.ts` still has placeholders.
- Only one language (English), no localization layer.
- No analytics / crash reporting.
- Never verified on a real phone; touch handling is tested with mouse events in Playwright only.

## Ideas (out of scope for v1 per the spec)
Skill trees, resort reputation, weather, extra sports, cloud saves, leaderboards, day/night cycle, events/seasons, more zone types, guest personalities, music.

## Alternative branches
| Branch | What it changes |
|---|---|
| `option/fast-balance` | roughly 3x faster progression (about 25 h to everything maxed) for a more casual pace |
| `option/night-theme` | evening / night look for the map and a dark UI theme |
