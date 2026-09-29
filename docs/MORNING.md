# Good morning: what happened overnight

**Short version:** the whole game in `docs/concept.md` is built (M0 to M8), tested and pushed to `Wschiks/skiword`. It is playable in the browser right now. The native Android/iOS projects exist and sync, but could not be compiled here (no Xcode / Android SDK on this Mac).

## Try it in 30 seconds
```bash
cd ~/skiworld
npm install        # if you have not yet
npm run dev        # open http://localhost:5173 in a phone-sized window (or your phone on the same wifi)
```
`?debug` adds debug keys, `?new` ignores the saved game. Tap the ringed lift, upgrade it, watch guests arrive.

## Want to play on your phone?
- Same wifi: `npm run dev` prints a `Network:` URL, open it on the phone (portrait).
- From anywhere: I did **not** publish the game. `docs/examples/github-pages.yml` is a ready workflow if you want a Pages URL (3 steps inside the file).
- Real app: `docs/native.md` (needs Xcode / Android Studio, which this Mac does not have yet).

## Look at these first (screenshots, no need to run anything)
1. `screenshots/final/` : the final look from the last commit (fresh start, early, mid, late game, HUD and all sheets)
2. `screenshots/m7-art-tour/` : close-ups of every zone and building
3. `screenshots/options/` : the night theme (branch `option/night-theme`)
4. `screenshots/README.md` : index of every step, in order, so you can see what changed and what you might want back

## What is where
| | |
|---|---|
| `README.md` | overview and commands |
| `docs/journal.md` | chronological: what I built, what I tried, what I threw away and why |
| `docs/decisions.md` | every choice I made where the spec was silent (you asked for no questions, these are the answers I picked) |
| `docs/removed-and-alternatives.md` | things I removed or replaced, with the git tag/path to get each one back |
| `docs/roadmap.md` | done, not done, ideas |
| `docs/balance-report.md`, `docs/design-tables.md` | balance numbers |
| `docs/testing.md` | every test/tool and what it checks |
| `docs/native.md` | Android/iOS notes and the checklist before a real release |

## Git
- `main`: the finished build. Milestone tags: `m2-core`, `m3-map`, `m4-m6-ui`, `m7-m8-polish-native`.
- `option/fast-balance`: everything maxed in about 25 h instead of 76 h.
- `option/night-theme`: evening look, dark UI.
Both option branches are up to date with main. Nothing was force-pushed.

## What you should decide / check
1. Feel: does the pace of the first 30 minutes feel right? (balance is tuned with a bot, no human playtest yet)
2. Zone positions moved from the spec (they collided with the lift cables), see `docs/decisions.md`.
3. Publisher/legal placeholders in `src/config/legal.ts`, real AdMob ids and store products (`docs/native.md`).
4. Try it on a real phone (touch is tested with simulated touch only).
5. Pick a branch: main as is, or fast balance, or night theme.

## Numbers
- 50 unit/playthrough tests, 17 smoke checks, 18 flow checks, 9 touch checks, random-monkey test, 3 h soak test: all pass.
- Balance bot: every milestone inside its band, everything maxed in 76 h (target 60 to 80 h).
- Real GPU (Apple M2 Pro, Chromium): 60 fps with 189 guests. JS cost 0.34 ms/frame.
