import { describe, it, expect } from 'vitest';
import { LIFT_TIERS, LEVEL_MAX } from '../src/config/lifts';
import {
  newGame, simulate, ticketPrice, lineInterval, throughput, levelUpgradeCost, buyLiftLevel, rebuildLine,
  buildLine, buyArea, step,
} from '../src/core/game';

describe('lift formulas', () => {
  it('price / interval / throughput', () => {
    const l = { tier: 1, level: 5 };
    expect(ticketPrice(l)).toBeCloseTo(5 * 1.5);
    expect(lineInterval(l)).toBeCloseTo(6 * (1 - 0.125));
    expect(throughput(l)).toBeCloseTo(1 / lineInterval(l));
  });
  it('design invariant: base of t+1 >= max of t', () => {
    for (let i = 0; i < LIFT_TIERS.length - 1; i++) {
      const a = LIFT_TIERS[i], b = LIFT_TIERS[i + 1];
      const maxA = throughput({ tier: a.tier, level: LEVEL_MAX }) * ticketPrice({ tier: a.tier, level: LEVEL_MAX });
      const baseB = throughput({ tier: b.tier, level: 0 }) * ticketPrice({ tier: b.tier, level: 0 });
      expect(baseB).toBeGreaterThanOrEqual(maxA);
    }
  });
  it('level cost growth', () => {
    expect(levelUpgradeCost(1, 0)).toBeGreaterThan(0);
    expect(levelUpgradeCost(1, 3)).toBeGreaterThan(levelUpgradeCost(1, 2));
  });
});

describe('sim smoke', () => {
  it('money grows in 10 minutes', () => {
    const s = newGame();
    s.parkingLevel = 3;
    const before = s.money;
    simulate(s, 600);
    expect(s.money).toBeGreaterThan(before);
    expect(s.stats.ridesTotal).toBeGreaterThan(10);
  });
  it('buy failure never mutates', () => {
    const s = newGame();
    s.money = 1;
    expect(buyLiftLevel(s, 'bunny:0').ok).toBe(false);
    expect(s.money).toBe(1);
    expect(s.lines[0].level).toBe(0);
    expect(rebuildLine(s, 'bunny:0').ok).toBe(false);
    expect(buildLine(s, 'bunny', 1, 1).ok).toBe(false);
    expect(buyArea(s, 'lower').ok).toBe(false);
    step(s);
  });
});
