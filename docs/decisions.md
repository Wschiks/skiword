# Decisions where the spec was silent

One line each. Newest at the bottom.

- Repo already existed with a remote (`Wschiks/skiword`); kept it and built on top of the existing `first commit`.
- Added guest state `returning` (lodge guest walks back to the lodge between sessions) to the spec's state list; lodge guests are hidden while `resting`.
- Guests carry `x,y,from,to,dur` so the scene only has to interpolate; positions are set at state transitions in the core.
- Guests skip lobby pathing: the `lobby` state keeps the guest at the hub and retries picking a lift once per second.
- Quest "guests served" counts guests that finish a visit without leaving angry (lodge guests count once, at final checkout).
- `TUNE` (src/config/balance.ts) scales costs per group. `tier`, `area` and `liftLevel` are per-tier/per-area arrays so each milestone can be tuned separately (spec only lists groups). Late-tier level costs (tiers 7 to 10) are scaled down by `liftLevel`.
- Balance bot values a rebuild by what the new tier is worth at level 5 (bundle cost), otherwise a fresh level-0 lift always looks like a downgrade. Areas are valued as a bundle with their cheapest useful follow-up purchase.
- Bot decisions use a soft-min of demand vs lift supply (exponent 5) so that parking and lifts both show a gradient. Real income uses the spec's hard `min(D, S)`.
- The analytic estimate uses fill = 0.9 + 0.07 * min(1, capacity/100) and weights the average price by throughput squared; both were fitted against the full simulation so the 25% cross-check holds on all 5 states.
- Balance: Lower Slopes (bot buys it later than target) and Mid Mountain are outside the +/-35% band because the greedy bot flips discontinuously; see docs/balance-report.md.
- Camera zoom is expressed relative to fit-width zoom: min 0.85x, max 3.2x (spec's 0.6 to 1.6 assumed absolute zoom; at 390 px width fit-width is ~0.32).
- Guest sprites are drawn about 28 world units tall (spec says about 22) so they stay visible at fit-width zoom on a phone.
- Season Points bonus shows in the top bar of the menu; New Season keeps `stats` (lifetime counters).
- Zone positions moved (spec coordinates put the Kids' Park, Terrain Park and Off-Piste on top of the lift cables that the spec's slot geometry produces): Kids' Park (44, 2170), Terrain Park (44, 1440), Slalom (960, 1240), Off-Piste (935, 690). Props drawn at 1.05x. Found with a close-up art tour (`screenshots/m7-art-tour`).
- Bug fixed on the way: horizontal panning was impossible when zoomed in (stale clamp line); the touch test now checks it.
