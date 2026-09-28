/**
 * Random-restart hill climbing over every cost multiplier (TUNE) and the bot's per-area unlock bonus.
 * Objective: minimise the worst milestone deviation, normalised by its tolerance (< 1 means everything is inside its band).
 * usage: tsx scripts/optimize.ts [seconds] [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { newGame, areaCost, tierBuildCost } from '../src/core/game';
import { runBot, MILESTONES, BOT } from '../src/core/bot';
import { TUNE } from '../src/config/balance';
import { AREAS } from '../src/config/areas';
import { LIFT_TIERS } from '../src/config/lifts';

const budgetSec = Number(process.argv[2] ?? 300);
const write = process.argv.includes('--write');

type P = { tune: typeof TUNE; kappa: number[] };
const snapshot = (): P => ({ tune: JSON.parse(JSON.stringify(TUNE)), kappa: [...BOT.areaBonus] });
const apply = (p: P) => { Object.assign(TUNE, JSON.parse(JSON.stringify(p.tune))); BOT.areaBonus = [...p.kappa]; };

function valid(): boolean {
  for (let t = 3; t <= 10; t++) if (tierBuildCost(t) <= tierBuildCost(t - 1)) return false;
  for (let i = 2; i < AREAS.length; i++) if (areaCost(AREAS[i].id) <= areaCost(AREAS[i - 1].id)) return false;
  return LIFT_TIERS.length === 10;
}
function score(): { w: number; devs: Record<string, number> } {
  const r = runBot(newGame(1), { mode: 'fast', maxSeconds: 300 * 3600 });
  let w = 0; const devs: Record<string, number> = {};
  for (const m of MILESTONES) {
    if (m.id === 'firstUpgrade') continue;
    const at = r.timeline[m.id];
    const d = at === undefined ? 9 : at / m.target - 1;
    devs[m.id] = d;
    w = Math.max(w, Math.abs(d) / (m.tol ?? 0.35));
  }
  return { w, devs };
}

let rng = 12345;
const rnd = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
const jitter = (x: number, s: number) => x * Math.exp((rnd() - 0.5) * 2 * s);

function mutate(p: P, s: number): P {
  const q: P = JSON.parse(JSON.stringify(p));
  const k = 1 + Math.floor(rnd() * 3);
  for (let n = 0; n < k; n++) {
    const pick = Math.floor(rnd() * 8);
    if (pick === 0) q.tune.parking = jitter(q.tune.parking, s);
    else if (pick === 1) q.tune.building = jitter(q.tune.building, s);
    else if (pick === 2) { const i = 1 + Math.floor(rnd() * 9); q.tune.tier[i] = jitter(q.tune.tier[i], s); }
    else if (pick === 3) { const i = 1 + Math.floor(rnd() * 4); q.tune.area[i] = jitter(q.tune.area[i], s); }
    else if (pick === 4) { const i = 6 + Math.floor(rnd() * 4); q.tune.liftLevel[i] = jitter(q.tune.liftLevel[i], s); }
    else if (pick === 5) { const i = 1 + Math.floor(rnd() * 4); q.kappa[i] = jitter(q.kappa[i], s); }
    else if (pick === 6) q.tune.slot = jitter(q.tune.slot, s);
    else q.tune.zone = jitter(q.tune.zone, s);
  }
  return q;
}

const start = Date.now();
let cur = snapshot();
apply(cur);
let curS = score();
let best = { p: cur, s: curS };
let evals = 0, step = 0.25;
console.log('start score', curS.w.toFixed(2));
while ((Date.now() - start) / 1000 < budgetSec) {
  const cand = mutate(cur, step);
  apply(cand);
  if (!valid()) continue;
  const s = score(); evals++;
  if (s.w <= curS.w) { cur = cand; curS = s; if (s.w < best.s.w) { best = { p: cand, s }; console.log(`eval ${evals} score ${s.w.toFixed(3)} ` + Object.entries(s.devs).map(([k, v]) => `${k}:${(v * 100).toFixed(0)}`).join(' ')); } }
  if (evals % 400 === 0) step = Math.max(0.05, step * 0.8);
  if (best.s.w < 0.6) break;
}
apply(best.p);
console.log(`done: ${evals} evals, best ${best.s.w.toFixed(3)}`);
console.log(JSON.stringify(best.p));
if (write) {
  const r = (n: number) => Number(n.toPrecision(3));
  const t = best.p.tune;
  const block = `export const TUNE = {
  parking: ${r(t.parking)}, housing: ${r(t.housing)}, slot: ${r(t.slot)}, building: ${r(t.building)}, zone: ${r(t.zone)},
  liftLevel: [${t.liftLevel.map(r).join(', ')}] as number[],
  tier: [${t.tier.map(r).join(', ')}] as number[],
  area: [${t.area.map(r).join(', ')}] as number[],
};
`;
  const path = new URL('../src/config/balance.ts', import.meta.url);
  writeFileSync(path, readFileSync(path, 'utf8').replace(/export const TUNE = \{[\s\S]*?\n\};\n/, block));
  const bp = new URL('../src/core/bot.ts', import.meta.url);
  writeFileSync(bp, readFileSync(bp, 'utf8').replace(/export const BOT = \{ areaBonus: \[[^\]]*\] as number\[\] \};/, `export const BOT = { areaBonus: [${best.p.kappa.map(r).join(', ')}] as number[] };`));
  console.log('wrote balance.ts and bot.ts');
}
