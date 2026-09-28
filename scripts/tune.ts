/**
 * Balance tuning (spec 17.3): run the fast bot, scale the responsible cost group by
 * factor = (target / actual)^0.8, repeat. Rewrites the TUNE block in src/config/balance.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { newGame } from '../src/core/game';
import { runBot, MILESTONES } from '../src/core/bot';
import { TUNE } from '../src/config/balance';

const ITER = Number(process.argv[2] ?? 12);
const EXP = 0.8;
const ANCHOR_TIERS: Record<string, number> = { tbar: 2, chair: 3, tier5: 5, gondola: 7, tier10: 10 };
const stepScale: Record<string, number> = {};
const lastDir: Record<string, number> = {};
const ANCHOR_AREAS: Record<string, number> = { lower: 1, mid: 2, peaks: 3, glacier: 4 };

function interpTiers() {
  const anchors = [2, 3, 5, 7, 10];
  for (let t = 1; t <= 10; t++) {
    if (anchors.includes(t)) continue;
    const lo = [...anchors].reverse().find(a => a < t);
    const hi = anchors.find(a => a > t);
    if (lo === undefined) { TUNE.tier[t - 1] = 1; continue; }
    if (hi === undefined) continue;
    const f = (t - lo) / (hi - lo);
    TUNE.tier[t - 1] = Math.exp(Math.log(TUNE.tier[lo - 1]) * (1 - f) + Math.log(TUNE.tier[hi - 1]) * f);
  }
}

function run() {
  const s = newGame(1);
  return runBot(s, { mode: 'fast', maxSeconds: 400 * 3600 });
}

let bestScore = Infinity;
let bestSnap = JSON.stringify(TUNE);
const score = (res: ReturnType<typeof run>) => {
  let w = 0;
  for (const m of MILESTONES) {
    const at = res.timeline[m.id];
    if (m.id === 'firstUpgrade') continue;
    const tol = m.tol ?? 0.35;
    w = Math.max(w, at === undefined ? 99 : Math.abs(at / m.target - 1) / tol);
  }
  return w;
};
for (let it = 0; it < ITER; it++) {
  const res = run();
  const sc = score(res);
  if (sc < bestScore) { bestScore = sc; bestSnap = JSON.stringify(TUNE); }
  let worst = 0;
  const adj: string[] = [];
  for (const m of MILESTONES) {
    const at = res.timeline[m.id];
    if (at === undefined || m.id === 'firstUpgrade') continue;
    const tol = m.tol ?? 0.35;
    const ratio = m.target / at; // >1 means too fast -> raise cost
    if (Math.abs(ratio - 1) > tol * 0.4 || it === ITER - 1) worst = Math.max(worst, Math.abs(at / m.target - 1));
    const f = Math.pow(ratio, EXP);
    if (Math.abs(ratio - 1) < tol * 0.25) continue;
    const dir = Math.sign(Math.log(f));
    if (lastDir[m.id] !== undefined && lastDir[m.id] !== dir) stepScale[m.id] = (stepScale[m.id] ?? 1) * 0.5;
    lastDir[m.id] = dir;
    const ff = Math.pow(f, stepScale[m.id] ?? 1);
    if (m.id in ANCHOR_TIERS) TUNE.tier[ANCHOR_TIERS[m.id] - 1] *= ff;
    else if (m.id in ANCHOR_AREAS) TUNE.area[ANCHOR_AREAS[m.id]] *= ff;
    else if (m.id === 'parking5') TUNE.parking *= ff;
    else if (m.id === 'snack') TUNE.building *= ff;
    else if (m.id === 'max') { for (let i = 6; i < 10; i++) { TUNE.liftLevel[i] *= ff; TUNE.slot *= 1; } }
    adj.push(`${m.id}x${ff.toFixed(2)}`);
  }
  interpTiers();
  console.log(`iter ${it + 1}: maxTime=${((res.timeline.max ?? res.time) / 3600).toFixed(1)}h score=${sc.toFixed(2)}  ${adj.join(' ')}`);
}

Object.assign(TUNE, JSON.parse(bestSnap));
console.log('best normalised deviation (1.0 = at tolerance):', bestScore.toFixed(2));
const r = (n: number) => Number(n.toPrecision(3));
const block = `export const TUNE = {
  parking: ${r(TUNE.parking)}, housing: ${r(TUNE.housing)}, slot: ${r(TUNE.slot)}, building: ${r(TUNE.building)}, zone: ${r(TUNE.zone)},
  liftLevel: [${TUNE.liftLevel.map(r).join(', ')}] as number[],
  tier: [${TUNE.tier.map(r).join(', ')}] as number[],
  area: [${TUNE.area.map(r).join(', ')}] as number[],
};
`;
const path = new URL('../src/config/balance.ts', import.meta.url);
const src = readFileSync(path, 'utf8');
writeFileSync(path, src.replace(/export const TUNE = \{[\s\S]*?\n\};\n/, block));
console.log(block);
