# Screenshot map

One folder per build step, in order. Each is a 390x844 portrait capture at 2x device pixel ratio (JPEG), generated with `npm run screenshots -- <folder> [scenario...]` (Playwright + swiftshader WebGL, so frame rates in these runs mean nothing).
If you spot something in an early folder that was later removed or changed, the folder name maps to a git tag (`git checkout <tag> -- <path>`), see `docs/journal.md`.

| Folder | Tag | What it shows |
|---|---|---|
| `m3-map-v1` | `m3-map` | First playable map: fresh game, 7 min, 3 h mid game (bot-played), 40 h late game (glacier, canyon, village) |
| `m4-ui-v1` | `m4-m6-ui` | HTML overlay: fresh-game tutorial, mid-game HUD, the six sheets (lifts, people, mountain, buildings, zones, shop), menu, welcome-back dialog |
