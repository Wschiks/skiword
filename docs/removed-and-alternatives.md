# Removed, replaced and alternative things (and how to get them back)

Everything below was tried and then dropped or replaced. Tags mark the commits that still contain the old version: `git show <tag>:<path>` prints a file, `git checkout <tag> -- <path>` restores it.

| What | Why it went | Where it is now / how to get it |
|---|---|---|
| One separate texture per sprite (`bake()` per key) | Every texture change breaks a WebGL batch and the scene is depth-sorted, so pines, rocks, lifts, guests interleave constantly | Replaced by one atlas in `src/scene/art.ts`. Old version: `git show m3-map:src/scene/art.ts` |
| Pistes drawn with Phaser `Graphics` (round dots per sample) | Graphics re-tessellates every frame; hundreds of circles per redraw | Canvas texture `PisteLayer` in `src/scene/background.ts`. The Graphics version was never committed, see docs/journal.md M3 |
| Skiers converging on a single hub point | All skiers stacked in one column at the hub | Each guest now has its own landing spot (`hubSpot` in `src/core/guests.ts`). Old behaviour: `git show m4-m6-ui:src/core/guests.ts` |
| Spec zone coordinates (Kids' Park 180,2150; Terrain Park 200,1450; Slalom 850,1250; Off-Piste 200,800) | Props sat on top of the lift cables | New coordinates in `src/config/zones.ts`. Original numbers stay in `docs/concept.md` section 10; to restore: `git show m7-m8-polish-native:src/config/zones.ts` |
| Full-width layout on desktop/tablet | Stretched the phone UI across a 1280 px window | Phone-width column (max 500 px). Before: `screenshots/m7-viewports-before` |
| Balance pass 1 (about 74 h, two milestones out of band) | Lower Slopes +147% and Mid Mountain -48% | Pass 2 numbers in `src/config/balance.ts` + `BOT.areaBonus`. Pass 1: `git show m7-m8-polish-native:src/config/balance.ts` (parking 1.39, building 0.226, area [1, 0.33, 0.4, 1.5, 1.4], tier [1, 1.18, 3.98, 4.18, 4.4, 4.74, 5.5, 4.4, 4.4, 4.6], liftLevel 7 to 10 at 0.35) |
| Plain `payback = cost / delta` balance bot | Never rebuilt lifts (a level-0 rebuild looks like a downgrade), stalled between parking and lifts | Rebuild bundles + soft-min in `src/core/bot.ts`. Never committed in its first form, see journal |
| Uniform 0.3x "fast" balance | T-Bar after 34 s, chair after 2.6 min: the opening became a blur | Shaped profile on branch `option/fast-balance` |
| Debug keys (L, R, P, A, N, M) as the only way to play in M3 | Replaced by the real UI in M4 | Still available with `?debug` in `src/main.ts` |
| Dynamic `import()` of the AdMob / purchases plugins | Only needed before the plugins were installed | Static imports in `src/ads.ts`, `src/purchases.ts` (M8). Mock services are unchanged |
| The `resolution` idea for high-DPI | Phaser 4 has no such option | Canvas is sized `css * min(2, dpr)` with `scale.setZoom(1 / dpr)` in `src/scene/MapScene.ts` |

## Alternative branches (not merged on purpose)
- `option/fast-balance`: everything maxed in about 25 h instead of 76 h.
- `option/night-theme`: evening look and dark UI; `?theme=day` switches back.
Both are kept up to date by merging `main` into them.
