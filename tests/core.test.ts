import { describe, it, expect } from 'vitest';
import {
  newGame, step, simulate, advance, estimate, makeLine, buyLiftLevel, rebuildLine, buildLine, buyArea, buyParkingLevel,
  buyHousingLevel, buyBuilding, upgradeBuilding, buyZone, upgradeZone, nextParkStage, callSkiBus, computeOffline, claimOffline,
  busStatus, startNewSeason, canNewSeason, totalSeasonPoints, seasonBonus, ensureState, parkingCapacity, housingCapacity,
  areaCost, tierBuildCost, slotCost, levelUpgradeCost, zoneFee, checkQuests, claimQuest, activeQuests, rebuildRequirement, cashBundleAmount, buyCashBundle,
} from '../src/core/game';
import { serialize, deserialize, saveState, loadState, SAVE_KEY } from '../src/core/save';
import { makeGuest, chooseLine } from '../src/core/guests';
import { AREAS } from '../src/config/areas';
import { BUS, GUEST, OFFLINE } from '../src/config/balance';
import { HARD_CAP } from '../src/config/capacity';
import { QUESTS } from '../src/config/quests';
import { ROAD_START, LODGE_POS } from '../src/config/layout';
import { SPECS, build } from './helpers/states';

const rich = () => { const s = newGame(3); s.money = 1e15; return s; };

describe('buy rules', () => {
  it('success deducts exact cost', () => {
    const s = newGame(); s.money = 100;
    const c = levelUpgradeCost(1, 0);
    expect(buyLiftLevel(s, 'bunny:0').ok).toBe(true);
    expect(s.money).toBeCloseTo(100 - c);
    expect(s.lines[0].level).toBe(1);
  });
  it('x10 and max buy several levels', () => {
    const s = rich();
    const r = buyLiftLevel(s, 'bunny:0', 'max');
    expect(r.ok && r.n).toBe(10);
    expect(buyLiftLevel(s, 'bunny:0', 1)).toEqual({ ok: false, reason: 'maxed' });
    expect(buyParkingLevel(s, 10).ok).toBe(true);
    expect(s.parkingLevel).toBe(10);
  });
  it('rebuild gates: level 3 normal, 8 at gates, unlockedTier rises only by rebuild', () => {
    const s = rich();
    expect(rebuildRequirement(1)).toBe(3);
    expect(rebuildRequirement(2)).toBe(8);
    expect(rebuildRequirement(6)).toBe(8);
    expect(rebuildLine(s, 'bunny:0')).toEqual({ ok: false, reason: 'level' });
    s.lines[0].level = 3;
    expect(s.unlockedTier).toBe(1);
    expect(rebuildLine(s, 'bunny:0').ok).toBe(true);
    expect(s.lines[0].tier).toBe(2);
    expect(s.lines[0].level).toBe(0);
    expect(s.unlockedTier).toBe(2);
    s.lines[0].level = 7;
    expect(rebuildLine(s, 'bunny:0')).toEqual({ ok: false, reason: 'level' });
    s.lines[0].level = 8;
    expect(rebuildLine(s, 'bunny:0').ok).toBe(true);
    expect(s.unlockedTier).toBe(3);
    s.money = 1e7; // small balance: measuring a cost against 1e15 would only test float rounding
    const before = s.money;
    expect(buildLine(s, 'bunny', 1, 3).ok).toBe(true);
    expect(before - s.money).toBeCloseTo(slotCost("bunny", 1) + tierBuildCost(3));
  });
  it('cannot build above unlocked tier; gondola-only slots need tier >= 7', () => {
    const s = rich();
    expect(buildLine(s, 'bunny', 1, 2)).toEqual({ ok: false, reason: 'tier' });
    for (const a of AREAS) { s.areasOwned = AREAS.map(x => x.id); void a; }
    s.unlockedTier = 6;
    expect(buildLine(s, 'glacier', 0, 6).ok).toBe(false);
    s.unlockedTier = 7;
    expect(buildLine(s, 'glacier', 0, 6)).toEqual({ ok: false, reason: 'gondolaOnly' });
    expect(buildLine(s, 'glacier', 0, 7).ok).toBe(true);
    expect(buildLine(s, 'glacier', 0, 7)).toEqual({ ok: false, reason: 'taken' });
  });
  it('areas must be bought in order', () => {
    const s = rich();
    expect(buyArea(s, 'mid')).toEqual({ ok: false, reason: 'order' });
    expect(buyArea(s, 'lower').ok).toBe(true);
    expect(buyArea(s, 'lower')).toEqual({ ok: false, reason: 'owned' });
    const m = s.money;
    expect(buyArea(s, 'mid').ok).toBe(true);
    expect(m - s.money).toBeCloseTo(areaCost('mid'));
  });
  it('housing needs Lower Slopes; buildings and zones need their area', () => {
    const s = rich();
    expect(buyHousingLevel(s)).toEqual({ ok: false, reason: 'locked' });
    expect(buyBuilding(s, 'snack')).toEqual({ ok: false, reason: 'locked' });
    expect(buyZone(s, 'kids')).toEqual({ ok: false, reason: 'locked' });
    buyArea(s, 'lower'); buyArea(s, 'mid');
    expect(buyHousingLevel(s, 3).ok).toBe(true);
    expect(buyBuilding(s, 'snack').ok).toBe(true);
    expect(upgradeBuilding(s, 'snack', 'max').ok).toBe(true);
    expect(s.buildings.snack).toBe(10);
    expect(buyZone(s, 'park').ok).toBe(true);
    expect(nextParkStage(s)).toEqual({ ok: false, reason: 'level' });
    upgradeZone(s, 'park', 4);
    expect(s.zones.park.level).toBe(5);
    expect(nextParkStage(s).ok).toBe(true);
    expect(s.zones.park.stage).toBe(1);
    expect(s.zones.park.level).toBe(1);
    expect(zoneFee(s, 'park')).toBe(15);
  });
  it('capacity formulas', () => {
    const s = newGame();
    expect(parkingCapacity(s)).toBe(8);
    s.parkingLevel = 30; s.housingLevel = 20;
    expect(parkingCapacity(s)).toBe(100);
    expect(housingCapacity(s)).toBe(50);
  });
});

describe('guests', () => {
  it('arrives, rides, pays per ride, leaves and frees parking', () => {
    const s = newGame(5);
    s.parkingLevel = 0;
    s.lines[0].level = 8;
    simulate(s, 900);
    expect(s.stats.ridesTotal).toBeGreaterThan(20);
    expect(s.stats.guestsServed).toBeGreaterThan(1);
    expect(s.rt.guests.filter(g => g.home === 'day').length).toBeLessThanOrEqual(parkingCapacity(s));
  });
  it('pays every single ride', () => {
    const s = newGame(2);
    const line = s.lines[0];
    const g = makeGuest(s, 'day', ROAD_START);
    g.ridesTarget = 3;
    let payments = 0;
    for (let i = 0; i < 6000 && s.rt.guests.includes(g); i++) {
      const m = s.money;
      step(s);
      if (s.money > m) payments++;
    }
    expect(s.stats.ridesTotal).toBeGreaterThanOrEqual(3);
    expect(payments).toBeGreaterThanOrEqual(3);
    void line;
  });
  it('impatient guest leaves angry and does not pay', () => {
    const s = newGame(2);
    s.rt.arrivalTimer = 1e9; s.rt.lodgeTimer = 1e9;
    s.lines[0].timer = 1e9; // lift never departs
    const g = makeGuest(s, 'day', ROAD_START);
    const m0 = s.money;
    simulate(s, 8 + 4 + 80);
    expect(g.angry).toBe(true);
    expect(s.money).toBe(m0);
    expect(s.stats.angryLeaves).toBe(1);
    simulate(s, 60);
    expect(s.rt.guests.includes(g)).toBe(false);
    expect(s.lines[0].queue.length).toBe(0);
  });
  it('lodge guest does three sessions then checks out', () => {
    const s = newGame(9);
    s.rt.arrivalTimer = 1e9; s.rt.lodgeTimer = 1e9;
    s.lines[0].tier = 2; s.lines[0].level = 10; s.unlockedTier = 2;
    const g = makeGuest(s, 'lodge', LODGE_POS);
    let rests = 0, prev = g.state;
    for (let i = 0; i < 200000 && s.rt.guests.includes(g); i++) {
      step(s);
      if (g.state === 'resting' && prev !== 'resting') rests++;
      prev = g.state;
    }
    expect(rests).toBe(GUEST.lodgeSessions - 1);
    expect(s.rt.guests.includes(g)).toBe(false);
    expect(s.stats.guestsServed).toBe(1);
    expect(s.stats.ridesTotal).toBeGreaterThanOrEqual(GUEST.lodgeSessions * GUEST.lodgeRides[0]);
  });
  it('lodge guests pay 1.25x per ride', () => {
    const pay = (home: 'day' | 'lodge') => {
      const s = newGame(9);
      s.rt.arrivalTimer = 1e9; s.rt.lodgeTimer = 1e9;
      const g = makeGuest(s, home, ROAD_START);
      const m0 = s.money;
      for (let i = 0; i < 1000 && g.state !== 'riding'; i++) step(s);
      return s.money - m0;
    };
    expect(pay('lodge') / pay('day')).toBeCloseTo(GUEST.lodgeFactor);
  });
  it('bus guests leave and never re-arrive', () => {
    const s = newGame(4);
    s.parkingLevel = 0; s.lines[0].tier = 2; s.lines[0].level = 10; s.unlockedTier = 2;
    s.areasOwned = ['bunny'];
    expect(callSkiBus(s, 'ad', 1000).ok).toBe(true);
    simulate(s, 15);
    expect(s.rt.guests.filter(g => g.home === 'bus').length).toBe(BUS.size);
    simulate(s, 2500);
    expect(s.rt.guests.filter(g => g.home === 'bus').length).toBe(0);
    expect(s.stats.guestsServed).toBeGreaterThanOrEqual(BUS.size - 5);
  });
  it('zone capacity and one zone visit per ride', () => {
    const s = rich();
    buyArea(s, 'lower');
    buyZone(s, 'kids');
    s.parkingLevel = 30;
    s.lines[0].tier = 4; s.lines[0].level = 10; s.unlockedTier = 4;
    let maxOcc = 0;
    for (let i = 0; i < 12000; i++) {
      step(s);
      maxOcc = Math.max(maxOcc, s.rt.zoneOcc.kids || 0);
      for (const g of s.rt.guests) if (g.zoneId && g.state !== 'walkingToZone' && g.state !== 'inZone') throw new Error('bad zone state');
    }
    expect(maxOcc).toBeGreaterThan(0);
    expect(maxOcc).toBeLessThanOrEqual(8);
    expect(s.rt.src.zones).toBeGreaterThan(0);
  });
  it('population caps are respected', () => {
    const s = rich();
    s.parkingLevel = 30; s.housingLevel = 20; s.areasOwned = AREAS.map(a => a.id);
    s.lines = [makeLine('bunny', 0, 1, 0)];
    for (let i = 0; i < 6000; i++) {
      step(s);
      expect(s.rt.guests.length).toBeLessThanOrEqual(HARD_CAP);
    }
    expect(s.rt.guests.filter(g => g.home === 'day').length).toBeLessThanOrEqual(100);
    expect(s.rt.guests.filter(g => g.home === 'lodge').length).toBeLessThanOrEqual(50);
  });
  it('chooseLine ignores full queues', () => {
    const s = newGame(1);
    const g = makeGuest(s, 'day', ROAD_START);
    expect(chooseLine(s, g)).toBe(s.lines[0]);
    s.lines[0].queue = Array.from({ length: 12 }, () => g);
    expect(chooseLine(s, g)).toBeNull();
  });
});

describe('ski bus', () => {
  it('cooldown, daily limit, gems vs ad', () => {
    const s = newGame(1);
    const now = 1_700_000_000_000;
    expect(callSkiBus(s, 'gems', now)).toEqual({ ok: false, reason: 'gems' });
    s.gems = 24;
    expect(callSkiBus(s, 'gems', now).ok).toBe(true);
    expect(s.gems).toBe(12);
    expect(callSkiBus(s, 'ad', now + 1000)).toEqual({ ok: false, reason: 'cooldown' });
    expect(busStatus(s, now + 1000).cooldown).toBeGreaterThan(80);
    let t = now + BUS.cooldown * 1000 + 1;
    for (let i = 1; i < BUS.maxPerDay; i++) { s.rt.guests = []; s.rt.busPending = null; expect(callSkiBus(s, 'ad', t).ok).toBe(true); t += BUS.cooldown * 1000 + 1; }
    s.rt.guests = []; s.rt.busPending = null;
    expect(callSkiBus(s, 'ad', t)).toEqual({ ok: false, reason: 'limit' });
    expect(busStatus(s, t + 86400_000).left).toBe(BUS.maxPerDay); // next day
    expect(callSkiBus(s, 'ad', t + 86400_000).ok).toBe(true);
  });
  it('spawns fewer near the cap', () => {
    const s = newGame(1);
    for (let i = 0; i < 180; i++) makeGuest(s, 'day', ROAD_START);
    const r = callSkiBus(s, 'ad', 5);
    expect(r.ok && r.n).toBe(20);
    for (let i = 0; i < 20; i++) makeGuest(s, 'day', ROAD_START);
    s.rt.busPending = null; s.ads.busCooldownUntil = 0;
    expect(callSkiBus(s, 'ad', 6)).toEqual({ ok: false, reason: 'full' });
  });
});

describe('offline', () => {
  it('50% rate, 8h cap, future lastSeen gives 0', () => {
    const s = newGame(); s.incomeEma = 10; s.lastSeen = 0;
    expect(computeOffline(s, 3600_000)).toBeCloseTo(10 * OFFLINE.rate * 3600);
    expect(computeOffline(s, 100 * 3600_000)).toBeCloseTo(10 * OFFLINE.rate * OFFLINE.maxHours * 3600);
    s.lastSeen = 5_000_000;
    expect(computeOffline(s, 1_000_000)).toBe(0);
    s.lastSeen = 0;
    computeOffline(s, 3600_000);
    const m = s.money;
    const amt = claimOffline(s, true);
    expect(amt).toBeCloseTo(10 * 0.5 * 3600 * 2);
    expect(s.money - m).toBeCloseTo(amt);
    expect(s.rt.offline).toBe(0);
  });
});

describe('prestige', () => {
  it('SP formula, bonus, resets and keeps', () => {
    expect(totalSeasonPoints(1e9)).toBe(10);
    expect(totalSeasonPoints(4e9)).toBe(20);
    const s = rich();
    expect(canNewSeason(s)).toEqual({ ok: false, reason: 'areas' });
    s.areasOwned = AREAS.map(a => a.id);
    s.lifetimeEarned = 4e9; s.gems = 33; s.season = 1;
    s.parkingLevel = 12; s.buildings.snack = 3;
    s.quests.claimedIds = ['q1']; s.quests.doneIds = ['q1'];
    expect(startNewSeason(s).ok).toBe(true);
    expect(s.seasonPoints).toBe(20);
    expect(seasonBonus(s)).toBeCloseTo(2);
    expect(s.money).toBe(10);
    expect(s.parkingLevel).toBe(0);
    expect(s.areasOwned).toEqual(['bunny']);
    expect(s.buildings.snack).toBe(0);
    expect(s.lines).toHaveLength(1);
    expect(s.gems).toBe(33);
    expect(s.lifetimeEarned).toBe(4e9);
    expect(s.quests.claimedIds).toEqual(['q1']);
    expect(s.season).toBe(2);
    expect(startNewSeason(s)).toEqual({ ok: false, reason: 'areas' });
  });
  it('bonus multiplies ride income', () => {
    const a = newGame(1), b = newGame(1);
    b.seasonPoints = 20;
    expect(estimate(b).total).toBeCloseTo(estimate(a).total * 2);
  });
});

describe('save', () => {
  it('round trips', () => {
    const s = rich();
    buyArea(s, 'lower'); buyBuilding(s, 'snack'); buyZone(s, 'kids'); buyParkingLevel(s, 5); s.gems = 7;
    s.settings.sound = false;
    simulate(s, 60);
    const t = deserialize(serialize(s))!;
    expect(t.money).toBeCloseTo(s.money);
    expect(t.areasOwned).toEqual(s.areasOwned);
    expect(t.buildings.snack).toBe(1);
    expect(t.zones.kids.owned).toBe(true);
    expect(t.parkingLevel).toBe(5);
    expect(t.settings.sound).toBe(false);
    expect(t.lines.map(l => [l.id, l.tier, l.level])).toEqual(s.lines.map(l => [l.id, l.tier, l.level]));
    expect(t.rt.guests.length).toBe(0);
    expect(t.rt.respawn).not.toBeNull();
  });
  it('repairs corrupt saves and drops unknown ids', () => {
    expect(deserialize('not json')).toBeNull();
    const s = ensureState({
      money: 'lots', gems: -5, parkingLevel: 999, areasOwned: ['lower', 'narnia'],
      lines: [{ areaId: 'lower', slot: 0, tier: 99, level: -3 }, { areaId: 'nope', slot: 0 }, { areaId: 'bunny', slot: 77 }],
      buildings: { snack: 4, ghost: 9 }, zones: { kids: { owned: true, level: 99 }, ghost: { owned: true } },
    });
    expect(s.money).toBe(10);
    expect(s.gems).toBe(0);
    expect(s.parkingLevel).toBe(30);
    expect(s.areasOwned).toEqual(['bunny', 'lower']);
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].tier).toBe(10);
    expect(s.lines[0].level).toBe(0);
    expect(s.buildings.snack).toBe(4);
    expect((s.buildings as any).ghost).toBeUndefined();
    expect(s.zones.kids.level).toBe(10);
    expect((s.zones as any).ghost).toBeUndefined();
    const empty = ensureState(null);
    expect(empty.money).toBe(10);
    expect(empty.lines).toHaveLength(1);
  });
  it('storage wrapper', () => {
    const mem: Record<string, string> = {};
    const st = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
    const s = newGame(); s.gems = 42;
    expect(saveState(s, st)).toBe(true);
    expect(mem[SAVE_KEY]).toBeTruthy();
    expect(loadState(st)!.gems).toBe(42);
    mem[SAVE_KEY] = '{bad';
    expect(loadState(st)).toBeNull();
  });
});

describe('estimate vs full simulation', () => {
  for (const sp of SPECS) {
    it(`within 25%: ${sp.name}`, () => {
      const s = build(sp);
      const e = estimate(s).total;
      simulate(s, 360);
      const m0 = s.money;
      simulate(s, 240);
      const measured = (s.money - m0) / 240;
      expect(Math.abs(measured / e - 1)).toBeLessThan(0.25);
    });
  }
});

describe('quests', () => {
  it('conditions and rewards', () => {
    const s = newGame(); s.money = 1e6;
    checkQuests(s);
    expect(activeQuests(s).map(q => q.id)).toEqual(['q1', 'q2', 'q3']);
    expect(claimQuest(s, 'q1')).toEqual({ ok: false, reason: 'notdone' });
    s.lines[0].level = 3; s.parkingLevel = 2;
    checkQuests(s);
    const m = s.money;
    expect(claimQuest(s, 'q1').ok).toBe(true);
    expect(s.money - m).toBeGreaterThanOrEqual(20);
    expect(claimQuest(s, 'q1')).toEqual({ ok: false, reason: 'claimed' });
    expect(activeQuests(s).map(q => q.id)).toEqual(['q2', 'q3', 'q4']);
    s.lines[0].tier = 2; checkQuests(s);
    claimQuest(s, 'q2');
    const g = s.gems; claimQuest(s, 'q3');
    expect(s.gems - g).toBe(3);
    expect(QUESTS).toHaveLength(26);
  });
  it('gem cash bundle', () => {
    const s = newGame(); s.gems = 30;
    expect(buyCashBundle(s).ok).toBe(true);
    expect(s.gems).toBe(5);
    expect(cashBundleAmount(s)).toBeGreaterThanOrEqual(100);
    expect(buyCashBundle(s)).toEqual({ ok: false, reason: 'gems' });
  });
});

describe('time', () => {
  it('advance clamps frame time', () => {
    const s = newGame();
    advance(s, 10);
    expect(s.rt.time).toBeLessThanOrEqual(2.1);
    advance(s, 0.25);
  });
});
