# Testing and tooling guide

Everything runs with npm scripts. Playwright tests start their own Vite server (`SERVE=preview` runs them against the production build instead).

| Command | What it checks |
|---|---|
| `npm run typecheck` | `tsc --noEmit` with `strict` and `noUnusedLocals` |
| `npm test` | Vitest, 50 tests in `tests/`: lift formulas and the tier design invariant, buy rules (failures never mutate, exact costs, gates at level 3/8, gondola-only slots, areas in order), guest state machine (patience, per-ride pay, lodge sessions, bus guests, zones, caps), ski bus, offline, prestige, save round trip and repair, estimate vs full simulation on 5 hand-built states (within 25%), quests, number formatting, bulk preview, cost monotonicity, tutorial, and two full bot playthroughs (Season 1 and New Season) |
| `npm run smoke` | 17 checks in a real browser: canvas renders, first upgrade, six sheets, menu, map tap, drag, sim runs, autosave, no console errors |
| `npm run flows` | 18 checks: persistence across reload, offline dialog and collect, quest claim, ski bus with gems and with the mock ad, cash bundle, mock IAP, New Season, two-step reset |
| `npm run touch` | multi-touch through the DevTools protocol: one-finger pan (both axes), pinch in/out, zoom limits, tap on map and on a button, scrolling a sheet does not buy anything |
| `node scripts/monkey.mjs [n]` | random taps/drags/wheel on buttons and map in early, mid, late and maxed states; checks invariants (finite money, guest cap, level caps, camera) and console errors |
| `npm run perf` | JS time per frame with 190 guests (about 0.34 ms). FPS in headless is software GL and meaningless |
| `npm run soak` | 3 simulated hours at max population with a bus every 3 minutes, checks bounded arrays and queue/zone bookkeeping |
| `npm run simulate -- --fast [--report]` | balance bot on the analytic estimate, prints the milestone table (`--report` writes `docs/balance-report.md`); `--full --minutes=30` runs the real simulation |
| `npx tsx scripts/optimize.ts 150 --write` | re-tunes all cost multipliers and the bot's per-area unlock bonus against the milestone targets |
| `npm run screenshots -- <folder> [01-start early mid late ui]` | fills `screenshots/<folder>` with 390x844 captures (env `THEME=night` on the night branch) |
| `node scripts/art-tour.mjs <folder>` / `node scripts/viewports.mjs <folder>` | close-ups of every zone/building; small phone, Android, tablet and desktop widths |

## Notes
- Headless Chromium uses SwiftShader (software WebGL). The built-in browser pane in the Claude app uses the real GPU and is the place to look at frame rate (60 fps with 189 guests on an Apple M2 Pro).
- After changing anything in `src/config/*` or the economy, run `npm test` and `npm run simulate -- --fast`; after UI work run `smoke`, `flows` and `touch`.
- Not covered: real devices, real ad/purchase plugins (mock on web), native builds.
