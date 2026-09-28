import { describe, it, expect } from 'vitest';
import { formatNum, formatMoney, formatTime } from '../src/ui/format';
import {
  newGame, estimate, rebuildLine, makeLine, parkingCost, housingCost, levelUpgradeCost, tierBuildCost, areaCost, slotCost, buildingCost,
  buildingUpgradeCost, zoneBuyCost, zoneUpgradeCost, tutorialTick, step, simulate, advance,
} from '../src/core/game';
import { runBot } from '../src/core/bot';
import { makeGuest } from '../src/core/guests';
import { AREAS } from '../src/config/areas';
import { PARKING, HOUSING } from '../src/config/capacity';
import { LIFT_TIERS, GATE_TIERS, REQ_LEVEL_GATE, REQ_LEVEL_NORMAL } from '../src/config/lifts';
import { BUILDINGS } from '../src/config/facilities';
import { ZONES } from '../src/config/zones';
import { ROAD_START } from '../src/config/layout';

describe('number formatting', () => {
  it('uses K M B T Qa Qi then scientific', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(999)).toBe('999');
    expect(formatNum(1234)).toBe('1.23K');
    expect(formatNum(45e5)).toBe('4.50M');
    expect(formatNum(6.7e9)).toBe('6.70B');
    expect(formatNum(8.9e12)).toBe('8.90T');
    expect(formatNum(1.2e15)).toBe('1.20Qa');
    expect(formatNum(3.4e18)).toBe('3.40Qi');
    expect(formatNum(1e22)).toMatch(/e22$/);
    expect(formatMoney(12500)).toBe('$12.5K');
    expect(formatTime(3725)).toBe('1h 2m');
  });
});

describe('economy sanity', () => {
  it('income never drops after a tier rebuild (at the earliest allowed level, any population)', () => {
    for (const parking of [0, 5, 15, 30]) {
      for (let tier = 1; tier < 10; tier++) {
        for (const area of ['bunny', 'lower', 'mid', 'peaks']) {
          const s = newGame(1);
          s.areasOwned = AREAS.map(a => a.id);
          s.parkingLevel = parking; s.housingLevel = parking > 10 ? 10 : 0; s.money = 1e18;
          s.unlockedTier = tier;
          const slot = area === 'bunny' ? 0 : 0;
          s.lines = [makeLine(area, slot, tier, GATE_TIERS.includes(tier) ? REQ_LEVEL_GATE : REQ_LEVEL_NORMAL)];
          const before = estimate(s).total;
          expect(rebuildLine(s, s.lines[0].id).ok).toBe(true);
          expect(estimate(s).total, `tier ${tier} in ${area}, parking ${parking}`).toBeGreaterThanOrEqual(before * 0.999);
        }
      }
    }
  });
  it('all cost sequences are monotonic increasing', () => {
    const inc = (xs: number[], name: string) => { for (let i = 1; i < xs.length; i++) expect(xs[i], `${name}[${i}]`).toBeGreaterThan(xs[i - 1]); };
    inc(Array.from({ length: PARKING.levelMax }, (_, L) => parkingCost(L)), 'parking');
    inc(Array.from({ length: HOUSING.levelMax }, (_, L) => housingCost(L)), 'housing');
    for (const t of LIFT_TIERS) inc(Array.from({ length: 10 }, (_, L) => levelUpgradeCost(t.tier, L)), `levels t${t.tier}`);
    inc(LIFT_TIERS.slice(1).map(t => tierBuildCost(t.tier)), 'tier costs');
    inc(AREAS.slice(1).map(a => areaCost(a.id)), 'area costs');
    for (const a of AREAS) inc(a.slots.slice(1).map((_, i) => slotCost(a.id, i + 1)), `slots ${a.id}`);
    inc(BUILDINGS.map(b => buildingCost(b.id)), 'building costs');
    for (const b of BUILDINGS) inc(Array.from({ length: 9 }, (_, i) => buildingUpgradeCost(b.id, i + 1)), `building ${b.id}`);
    const s = newGame();
    for (const z of ZONES) inc(Array.from({ length: 9 }, (_, i) => zoneUpgradeCost(s, z.id, i + 1)), `zone ${z.id}`);
    expect(zoneBuyCost('park', 2)).toBeGreaterThan(zoneBuyCost('park', 1));
  });
  it('at least 4 purchases are possible in the first 60 seconds', () => {
    const s = newGame(11);
    const r = runBot(s, { mode: 'full', maxSeconds: 60 });
    expect(r.purchases).toBeGreaterThanOrEqual(4);
  });
  it('the first purchase is affordable immediately', () => {
    const s = newGame();
    expect(s.money).toBeGreaterThanOrEqual(levelUpgradeCost(1, 0));
  });
});

describe('tutorial', () => {
  it('advances through the scripted steps', () => {
    const s = newGame();
    expect(s.tutorial.step).toBe(1);
    s.lines[0].level = 1; tutorialTick(s); expect(s.tutorial.step).toBe(2);
    s.lines[0].level = 3; tutorialTick(s); expect(s.tutorial.step).toBe(3);
    s.parkingLevel = 1; tutorialTick(s); expect(s.tutorial.step).toBe(4);
    s.lines[0].tier = 2; tutorialTick(s); expect(s.tutorial.step).toBe(5);
    s.stats.angryLeaves = 1; tutorialTick(s); expect(s.tutorial.step).toBe(6);
    s.areasOwned.push('lower'); tutorialTick(s);
    expect(s.tutorial.done).toBe(true);
  });
});

describe('guest behaviour details', () => {
  it('guests wait in the lobby when every queue is full and retry', () => {
    const s = newGame(2);
    s.rt.arrivalTimer = 1e9;
    const line = s.lines[0];
    const filler = makeGuest(s, 'day', ROAD_START);
    line.queue = Array.from({ length: 12 }, () => filler);
    line.timer = 1e9;
    const g = makeGuest(s, 'day', ROAD_START);
    simulate(s, 15);
    expect(g.state).toBe('lobby');
  });
  it('sim never runs more than 20 steps per frame', () => {
    const s = newGame();
    advance(s, 100);
    expect(s.rt.time).toBeLessThanOrEqual(2.05);
    step(s);
  });
});

import { bulkInfo } from '../src/ui/util';
describe('bulk purchase preview (x1 / x10 / Max)', () => {
  const cost = (L: number) => 10 * Math.pow(2, L);
  it('x1 costs the next level, x10 sums ten, capped by the max level', () => {
    expect(bulkInfo(0, 10, 1, 0, cost)).toEqual({ n: 1, total: 10 });
    expect(bulkInfo(0, 10, 10, 0, cost).n).toBe(10);
    expect(bulkInfo(0, 10, 10, 0, cost).total).toBe(10 * (Math.pow(2, 10) - 1));
    expect(bulkInfo(8, 10, 10, 0, cost).n).toBe(2);
    expect(bulkInfo(10, 10, 1, 1e9, cost)).toEqual({ n: 0, total: 0 });
  });
  it('Max buys as many as are affordable, at least one', () => {
    expect(bulkInfo(0, 10, 'max', 70, cost)).toEqual({ n: 3, total: 70 }); // 10 + 20 + 40
    expect(bulkInfo(0, 10, 'max', 5, cost)).toEqual({ n: 1, total: 10 }); // cannot afford: shows the price of one
    expect(bulkInfo(0, 3, 'max', 1e9, cost).n).toBe(3);
  });
});
