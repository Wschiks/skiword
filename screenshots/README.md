# Screenshot map

One folder per build step, in order. Each is a 390x844 portrait capture at 2x device pixel ratio (JPEG), generated with `npm run screenshots -- <folder> [scenario...]` (Playwright + swiftshader WebGL, so frame rates in these runs mean nothing).
If you spot something in an early folder that was later removed or changed, the folder name maps to a git tag (`git checkout <tag> -- <path>`), see `docs/journal.md`.

| Folder | Tag | What it shows |
|---|---|---|
| `m3-map-v1` | `m3-map` | First playable map: fresh game, 7 min, 3 h mid game (bot-played), 40 h late game (glacier, canyon, village) |
| `m4-ui-v1` | `m4-m6-ui` | HTML overlay: fresh-game tutorial, mid-game HUD, the six sheets (lifts, people, mountain, buildings, zones, shop), menu, welcome-back dialog |
| `m3-map-v2-atlas` | `m7-m8-polish-native` | Map after packing every sprite into one texture atlas (perf change, should look identical) |
| `m7-polish` | `m7-m8-polish-native` | Final polish set: fresh start, early, mid, late (canyon gondola bridge), HUD and all sheets with accessibility tweaks |
| `options/` | (branches) | Preview shots of the alternative branches: `night-theme-v2-*` from `option/night-theme` (full set in that branch under `screenshots/option-night-theme-v2`; the earlier dark-mountain night set is `screenshots/option-night-theme` on that branch) |
| `m7-viewports*` | `m7-m8-polish-native` | Small phone, Android, tablet and desktop widths. `-before` is the stretched desktop layout that was fixed by the phone-width column |
| `m7-art-tour` | `m7-m8-polish-native` | Close-up of every zone, building, the park's 3 stages, lodge, parking and the ski bus with everything unlocked. Found the zone/lift overlap and the horizontal-pan bug |
| `final` | latest `main` | Regenerated full set from the final code: fresh start, early, mid, late, HUD, all sheets, menu with the new Stats card |
| `m7-focus` | `main` | Buying a new area: sheet closes, camera glides to the new territory, ring + glow burst and "Unlocked" toast (`buy-area-before-sheet`, `buy-area-burst`, `buy-area-after-glide`) |
| `restyle-v1` .. `restyle-v4` | `main` | Iterations of the chunky cartoon restyle. v1 = map only, v2 = HUD restyle, v3 = spacing, v4 = continuous border fences. Compare with `final/` (old look, tag `v1-classic-look`) |
| `restyle-art-tour` | `main` | Close-ups of the new art |
