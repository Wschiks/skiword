# Ski Idle Tycoon (skiworld)

Portrait 2D idle tycoon. Full spec: `docs/concept.md` (single source of truth). Choices where the spec was silent: `docs/decisions.md`. Chronological build log: `docs/journal.md`.

## Rules
1. Do not ask the user questions. Pick the simplest option that fits the pillars and add a line to `docs/decisions.md`.
2. All balance numbers and game data live in `src/config/*`. Never hardcode numbers in logic or UI.
3. `src/core` is pure TypeScript with **no Phaser imports** (may import `src/config`). It must run in Node (tests, balance bot).
4. Work milestone by milestone. After each: `npm run typecheck && npm test`, then `git commit`.
5. No emoji anywhere. No image files (art is drawn in code, icons are inline SVG).

## Commands
- `npm run dev` dev server, `npm run build`, `npm run typecheck`, `npm test`
- `npm run simulate -- --fast` balance bot (`--full` for real sim), `npm run screenshots`, `npm run smoke`, `npm run cap:sync`
