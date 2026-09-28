/**
 * Balance bot (spec 17.2). Plays the game with a payback-based policy, either on the
 * analytic estimate ("fast", no guests, event-driven time jumps) or on the real simulation ("full").
 */
import { AREAS, areaIndex } from '../config/areas';
import { BUILDINGS, BUILDING_LEVEL_MAX } from '../config/facilities';
import { HOUSING, PARKING } from '../config/capacity';
import { LEVEL_MAX, MAX_TIER } from '../config/lifts';
import { ZONES, ZONE_LEVEL_MAX } from '../config/zones';
import { ensureState, areaOwned, parkStage } from './state';
import type { GameState } from './state';
import { toSaveData } from './save';
import { areaCost, bottleneck, estimateIncomePerSecond, levelUpgradeCost } from './economy';
import { fastAdvance, simulate } from './game';
import { buyArea, buildLine, listPurchases } from './unlocks';
import type { Purchase } from './unlocks';
import { activeQuests, checkQuests, claimQuest, isDone } from './quests';

export function cloneCore(s: GameState): GameState {
  return ensureState(toSaveData(s));
}

const REBUILD_VALUE_LEVEL = 5;

export interface Milestone { id: string; label: string; target: number; check: (s: GameState) => boolean; tol?: number }
const maxTierOf = (s: GameState) => Math.max(...s.lines.map(l => l.tier));
export const MILESTONES: Milestone[] = [
  { id: 'firstUpgrade', label: 'First lift upgrade', target: 5, tol: 999, check: s => s.lines.some(l => l.level >= 1 || l.tier >= 2) },
  { id: 'tbar', label: 'T-Bar built', target: 4 * 60, check: s => maxTierOf(s) >= 2 },
  { id: 'parking5', label: 'Parking level 5', target: 6 * 60, check: s => s.parkingLevel >= 5 },
  { id: 'lower', label: 'Lower Slopes owned', target: 10 * 60, check: s => areaOwned(s, 'lower') },
  { id: 'chair', label: 'First chair (tier 3)', target: 20 * 60, check: s => maxTierOf(s) >= 3 },
  { id: 'snack', label: 'Snack Hut owned', target: 25 * 60, check: s => (s.buildings.snack || 0) > 0 },
  { id: 'mid', label: 'Mid Mountain owned', target: 55 * 60, check: s => areaOwned(s, 'mid') },
  { id: 'tier5', label: 'Tier 5', target: 1.5 * 3600, check: s => maxTierOf(s) >= 5 },
  { id: 'peaks', label: 'High Peaks owned', target: 4 * 3600, check: s => areaOwned(s, 'peaks') },
  { id: 'gondola', label: 'First gondola (tier 7)', target: 6 * 3600, check: s => maxTierOf(s) >= 7 },
  { id: 'glacier', label: 'Glacier owned', target: 14 * 3600, check: s => areaOwned(s, 'glacier') },
  { id: 'tier10', label: 'First tier 10', target: 30 * 3600, check: s => maxTierOf(s) >= 10 },
  { id: 'max', label: 'Everything maxed', target: 70 * 3600, tol: 0.15, check: s => isMaxed(s) },
];

export function isMaxed(s: GameState): boolean {
  const totalSlots = AREAS.reduce((a, x) => a + x.slots.length, 0);
  if (s.lines.length < totalSlots) return false;
  if (!s.lines.every(l => l.tier === MAX_TIER && l.level === LEVEL_MAX)) return false;
  if (s.parkingLevel < PARKING.levelMax || s.housingLevel < HOUSING.levelMax) return false;
  if (!BUILDINGS.every(b => s.buildings[b.id] >= BUILDING_LEVEL_MAX)) return false;
  if (!ZONES.every(z => s.zones[z.id].owned && s.zones[z.id].level >= ZONE_LEVEL_MAX)) return false;
  return parkStage(s) >= 3;
}

interface Scored { p: Purchase; cost: number; delta: number; payback: number }

function scoreOne(s: GameState, base: number, p: Purchase): Scored {
  const c = cloneCore(s);
  c.money = Number.MAX_SAFE_INTEGER;
  let cost = p.cost;
  p.apply(c);
  let delta = estimateIncomePerSecond(c, true) - base;
  if (p.kind === 'rebuild') {
    // value the rebuild by what the new tier is worth once it has a few levels (a fresh lift starts at level 0)
    const id = p.key.slice(3);
    const line = c.lines.find(l => l.id === id)!;
    const target = Math.min(LEVEL_MAX, REBUILD_VALUE_LEVEL);
    for (let L = 0; L < target; L++) cost += levelUpgradeCost(line.tier, L);
    line.level = target;
    delta = estimateIncomePerSecond(c, true) - base;
  }
  if (p.kind === 'area') {
    // bundle with the cheapest useful follow-up that the new area unlocks (line, building, zone or housing)
    const id = p.key.split(':')[1];
    const before = new Set(listPurchases(s).map(q => q.key));
    const follow = listPurchases(c).filter(q => !before.has(q.key) && (q.kind === 'newline' || q.kind === 'building' || q.kind === 'zone' || q.kind === 'housing'));
    let best: { payback: number; cost: number; delta: number } | null = null;
    for (const f of follow) {
      const cc = cloneCore(c);
      const b0 = estimateIncomePerSecond(cc, true);
      f.apply(cc);
      const d = estimateIncomePerSecond(cc, true) - b0;
      if (d > 0) {
        const pb = (p.cost + f.cost) / d;
        if (!best || pb < best.payback) best = { payback: pb, cost: p.cost + f.cost, delta: d };
      }
    }
    void id;
    if (best) { delta = best.delta; cost = best.cost; } else delta = Math.max(delta, base * 0.02);
    return { p, cost: p.cost, delta, payback: cost / Math.max(delta, 1e-9) };
  }
  return { p, cost, delta, payback: delta > 1e-12 ? cost / delta : Infinity };
}

export interface Plan { p: Purchase; wait: number }

/** Chooses the next purchase and how long to wait for it (0 = buy now). */
export function plan(s: GameState): Plan | null {
  const list = listPurchases(s);
  if (!list.length) return null;
  const base = estimateIncomePerSecond(s, true);
  const bn = bottleneck(s);
  let scored = list.map(p => scoreOne(s, base, p));
  const others = scored.filter(x => x.p.kind !== 'parking' && x.p.kind !== 'housing' && Number.isFinite(x.payback));
  if (bn === 'lifts' && others.length) scored = scored.filter(x => x.p.kind !== 'parking' && x.p.kind !== 'housing');
  scored.sort((a, b) => (a.payback === b.payback ? a.cost - b.cost : a.payback - b.payback));
  const target = scored[0];
  const inc = Math.max(estimateIncomePerSecond(s), 1e-9);
  const wait = Math.max(0, (target.p.cost - s.money) / inc);
  if (wait <= 0) return { p: target.p, wait: 0 };
  // affordable alternatives that do not delay the target too much
  for (const a of scored.slice(1)) {
    if (a.p.cost > s.money || !Number.isFinite(a.payback)) continue;
    const delay = a.p.cost / inc;
    if (wait > 60 ? a.payback < wait || delay <= 0.2 * wait : delay <= 0.2 * wait) return { p: a.p, wait: 0 };
  }
  return { p: target.p, wait };
}

export function claimAllQuests(s: GameState): number {
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    checkQuests(s);
    const q = activeQuests(s).find(x => isDone(s, x.id));
    if (!q) break;
    if (claimQuest(s, q.id).ok) n++;
  }
  return n;
}

export interface BotOptions {
  mode: 'fast' | 'full';
  maxSeconds?: number;
  until?: (s: GameState) => boolean;
  onPurchase?: (s: GameState, p: Purchase) => void;
}
export interface BotResult {
  timeline: Record<string, number>;
  time: number;
  finished: boolean;
  purchases: number;
  checkpoints: { t: number; income: number; money: number }[];
  angryLeaves: number;
}

export function runBot(s: GameState, opts: BotOptions): BotResult {
  const maxSec = opts.maxSeconds ?? 600 * 3600;
  const timeline: Record<string, number> = {};
  const checkpoints: BotResult['checkpoints'] = [];
  let purchases = 0;
  let nextCp = 0;
  let t = s.rt.time;
  const t0 = t;
  const mark = () => {
    for (const m of MILESTONES) if (timeline[m.id] === undefined && m.check(s)) timeline[m.id] = s.rt.time - t0;
    while (s.rt.time - t0 >= nextCp) {
      checkpoints.push({ t: nextCp, income: estimateIncomePerSecond(s), money: s.money });
      nextCp = nextCp < 3600 ? nextCp + 600 : nextCp + 3600;
    }
  };
  const doBuy = (p: Purchase) => {
    const r = p.apply(s);
    if (r.ok) { purchases++; opts.onPurchase?.(s, p); }
    return r.ok;
  };
  mark();
  let guard = 0;
  while (s.rt.time - t0 < maxSec && guard++ < 2_000_000) {
    if (opts.until?.(s) || (!opts.until && isMaxed(s))) break;
    claimAllQuests(s);
    const pl = plan(s);
    if (opts.mode === 'fast') {
      if (!pl) break;
      if (pl.wait > 0) {
        fastAdvance(s, pl.wait + 1e-6);
        claimAllQuests(s);
        mark();
      }
      if (!doBuy(pl.p)) { fastAdvance(s, 1); }
      checkQuests(s);
      mark();
    } else {
      // full simulation: decide once per simulated second
      let bought = 0;
      let cur = pl;
      while (cur && cur.wait === 0 && bought < 6) {
        if (!doBuy(cur.p)) break;
        bought++;
        claimAllQuests(s);
        cur = plan(s);
      }
      simulate(s, 1);
      mark();
    }
    t = s.rt.time;
  }
  mark();
  return {
    timeline, time: s.rt.time - t0, finished: isMaxed(s), purchases, checkpoints, angryLeaves: s.stats.angryLeaves,
  };
}

export { areaIndex, areaCost, buyArea, buildLine };
