import { AREAS, areaDef, areaIndex } from '../config/areas';
import { LIFT_TIERS, LEVEL_EFFECT, LEVEL_COST_GROWTH, QUEUE_CAP, LEVEL_MAX } from '../config/lifts';
import type { LiftTier } from '../config/lifts';
import { PARKING, HOUSING, HARD_CAP } from '../config/capacity';
import { BUILDINGS, buildingLevelMult, BUILDING_UPGRADE } from '../config/facilities';
import { ZONES, ZONE_PREFERENCE, zoneFeeMult, zoneCapBonus, ZONE_UPGRADE } from '../config/zones';
import type { ZoneDef } from '../config/zones';
import { TUNE, SEASON, INCOME_X2_MULT, GUEST } from '../config/balance';
import type { GameState, Line } from './state';

export const tierDef = (t: number): LiftTier => LIFT_TIERS[Math.min(LIFT_TIERS.length, Math.max(1, t)) - 1];
export const queueCap = (line: Line) => QUEUE_CAP(line.tier);

// ---------- capacity ----------
export const parkingCapacityAt = (L: number) => PARKING.base + Math.round((L * PARKING.perLevelTotal) / PARKING.levelMax);
export const housingCapacityAt = (L: number) => HOUSING.base + Math.round((L * HOUSING.perLevelTotal) / HOUSING.levelMax);
export const parkingCapacity = (s: GameState) => parkingCapacityAt(s.parkingLevel);
export const housingCapacity = (s: GameState) => housingCapacityAt(s.housingLevel);
export const maxPop = (s: GameState) => Math.min(HARD_CAP, parkingCapacity(s) + housingCapacity(s));
export const parkingCost = (L: number) => PARKING.costBase * Math.pow(PARKING.costGrowth, L) * TUNE.parking;
export const housingCost = (L: number) => HOUSING.costBase * Math.pow(HOUSING.costGrowth, L) * TUNE.housing;

// ---------- income multipliers ----------
export const seasonBonusFor = (sp: number) => 1 + SEASON.bonusPerSP * sp;
export const seasonBonus = (s: GameState) => seasonBonusFor(s.seasonPoints);
export const incomeMult = (s: GameState) => seasonBonus(s) * (s.purchases.incomeX2 ? INCOME_X2_MULT : 1);

// ---------- lifts ----------
export const ticketPrice = (line: { tier: number; level: number }) => tierDef(line.tier).price * (1 + LEVEL_EFFECT.pricePerLevel * line.level);
export const lineInterval = (line: { tier: number; level: number }) => tierDef(line.tier).interval * (1 - LEVEL_EFFECT.intervalPerLevel * line.level);
export const lineCapacity = (line: { tier: number }) => tierDef(line.tier).capacity;
export const rideTime = (line: { tier: number; areaId: string }) => tierDef(line.tier).rideBase * areaDef(line.areaId).liftLenMul;
export const throughput = (line: { tier: number; level: number }) => lineCapacity(line) / lineInterval(line);
export const levelUpgradeCost = (tier: number, L: number) => tierDef(tier).levelBase * Math.pow(LEVEL_COST_GROWTH, L) * TUNE.liftLevel[tier - 1];
export const tierBuildCost = (tier: number) => tierDef(tier).tierCost * TUNE.tier[tier - 1];
export const slotCost = (areaId: string, slot: number) => areaDef(areaId).slots[slot].cost * TUNE.slot;
export const newLineCost = (areaId: string, slot: number, tier: number) => slotCost(areaId, slot) + tierBuildCost(tier);
export const areaCost = (areaId: string) => areaDef(areaId).cost * TUNE.area[areaIndex(areaId)];
export const skiTime = (areaIdx: number) => AREAS[areaIdx].skiTime;

// ---------- buildings ----------
export function buildingIncomeRate(s: GameState, id: string, pop: number, maxP: number): number {
  const L = s.buildings[id] || 0;
  if (L <= 0) return 0;
  const b = BUILDINGS.find(x => x.id === id)!;
  const lodgeOcc = s.housingLevel > 0 ? Math.min(1, lodgeCountEstimate(s, pop) / Math.max(1, housingCapacity(s))) : 0;
  return b.baseIncome * buildingLevelMult(L) * (0.5 + 0.5 * (maxP > 0 ? pop / maxP : 0)) * (1 + (b.lodgeBonus || 0) * lodgeOcc);
}
function lodgeCountEstimate(s: GameState, pop: number) {
  const lodge = s.rt.guests.length ? s.rt.guests.filter(g => g.home === 'lodge').length : housingCapacity(s) * (pop / Math.max(1, maxPop(s)));
  return lodge;
}
export const buildingCost = (id: string) => BUILDINGS.find(b => b.id === id)!.cost * TUNE.building;
export const buildingUpgradeCost = (id: string, L: number) =>
  BUILDING_UPGRADE.costFactor * buildingCost(id) * Math.pow(BUILDING_UPGRADE.growth, L - 1);

// ---------- zones ----------
export function zoneDef(id: string): ZoneDef { return ZONES.find(z => z.id === id)!; }
export function zoneBase(s: GameState, id: string): { fee: number; capacity: number; cost: number } {
  const d = zoneDef(id);
  const z = s.zones[id];
  if (d.stages) {
    const st = d.stages[Math.min(d.stages.length - 1, z?.stage || 0)];
    return { fee: st.fee, capacity: st.capacity, cost: st.cost };
  }
  return { fee: d.fee, capacity: d.capacity, cost: d.cost };
}
export function zoneFee(s: GameState, id: string) {
  const z = s.zones[id];
  return zoneBase(s, id).fee * zoneFeeMult(z.level || 1);
}
export function zoneCapacity(s: GameState, id: string) {
  const z = s.zones[id];
  return zoneBase(s, id).capacity + zoneCapBonus(z.level || 1);
}
export const zoneBuyCost = (id: string, stage = 0) => {
  const d = zoneDef(id);
  return (d.stages ? d.stages[stage].cost : d.cost) * TUNE.zone;
};
export const zoneUpgradeCost = (s: GameState, id: string, L: number) =>
  ZONE_UPGRADE.costFactor * zoneBase(s, id).cost * TUNE.zone * Math.pow(ZONE_UPGRADE.growth, L - 1);
export const zonePref = (id: string, kind: 'ski' | 'board') => ZONE_PREFERENCE[id]?.[kind] ?? 1;

// ---------- credit ----------
export function credit(s: GameState, amount: number, src: 'rides' | 'zones' | 'buildings') {
  s.money += amount;
  s.lifetimeEarned += amount;
  s.earnedThisSeason += amount;
  s.rt.src[src] += amount;
  s.rt.stepIncome += amount;
}

// ---------- analytic estimate (spec 13.4) ----------
export interface Estimate {
  N: number; S: number; D: number; rides: number; cycle: number; pAvg: number;
  rideIncome: number; zoneIncome: number; buildingIncome: number; total: number;
}
export const SOFT_K = 5;
/** Lines with more throughput attract proportionally more guests than S_i alone (measured against the full sim). */
export const TUNE_EST = { priceWeightExp: 2.0 };
export function estimate(s: GameState, soft = false): Estimate {
  const capTotal = Math.min(parkingCapacity(s) + housingCapacity(s), HARD_CAP);
  const N = capTotal * (0.9 + 0.07 * Math.min(1, capTotal / 100)); // typical fill grows with capacity (measured)
  let S = 0, wSum = 0, sPrice = 0, sRide = 0, sSki = 0;
  for (const l of s.lines) {
    const si = throughput(l);
    const w = Math.pow(si, TUNE_EST.priceWeightExp);
    S += si; wSum += w; sPrice += w * ticketPrice(l);
    sRide += w * rideTime(l); sSki += w * skiTime(areaIndex(l.areaId));
  }
  const mult = incomeMult(s);
  const zero = { N, S, D: 0, rides: 0, cycle: 0, pAvg: 0, rideIncome: 0, zoneIncome: 0, buildingIncome: 0, total: 0 };
  if (S <= 0) return zero;
  const avgRide = sRide / wSum, avgSki = sSki / wSum;
  const cycle = 8 + avgRide + avgSki;
  const D = N / cycle;
  const rides = soft ? Math.pow(Math.pow(D, -SOFT_K) + Math.pow(S, -SOFT_K), -1 / SOFT_K) : Math.min(D, S);
  const pAvg = sPrice / wSum;
  const housing = housingCapacity(s), total = parkingCapacity(s) + housing;
  const lodgeF = 1 + 0.25 * housing / Math.max(1, total);
  const rideIncome = rides * pAvg * lodgeF;
  let zoneIncome = 0;
  for (const z of ZONES) {
    if (!s.zones[z.id]?.owned) continue;
    const pref = (zonePref(z.id, 'ski') + zonePref(z.id, 'board')) / 2;
    const pv = Math.min(1, z.baseP * pref);
    const fee = zoneFee(s, z.id);
    zoneIncome += Math.min(rides * pv * fee, (zoneCapacity(s, z.id) / z.stay) * fee);
  }
  let bIncome = 0;
  const lodgeOccEst = housing > 0 ? 0.9 : 0;
  for (const b of BUILDINGS) {
    const L = s.buildings[b.id] || 0;
    if (L <= 0) continue;
    bIncome += b.baseIncome * buildingLevelMult(L) * (0.5 + 0.5 * (N / Math.max(1, total))) * (1 + (b.lodgeBonus || 0) * lodgeOccEst);
  }
  return { N, S, D, rides, cycle, pAvg, rideIncome, zoneIncome, buildingIncome: bIncome, total: (rideIncome + zoneIncome + bIncome) * mult };
}
export const estimateIncomePerSecond = (s: GameState, soft = false) => estimate(s, soft).total;

/** Analytic bottleneck: demand (people) vs supply (lift throughput). */
export function bottleneck(s: GameState): 'lifts' | 'people' | 'balanced' {
  const e = estimate(s);
  if (e.S <= 0) return 'lifts';
  const r = e.D / e.S;
  if (r > 1.15) return 'lifts';
  if (r < 0.85) return 'people';
  return 'balanced';
}

/** Runtime bottleneck hint (spec 14.6). */
export function bottleneckHint(s: GameState): string {
  const rt = s.rt;
  const recentAngry = s.stats.angryRecent.filter(t => rt.time - t <= 60).length;
  let fill = 0, cnt = 0, sTot = 0;
  for (const l of s.lines) {
    fill += l.queue.length / queueCap(l); cnt++;
    sTot += throughput(l);
  }
  const avgFill = cnt ? fill / cnt : 0;
  if (recentAngry >= 2 || avgFill > 0.6) return 'Queues are long. Upgrade your lifts.';
  const boardedPerSec = s.lines.reduce((a, l) => a + l.departures.filter(d => rt.time - d.t0 <= 10).reduce((x, d) => x + d.n, 0), 0) / 10;
  const utilisation = sTot > 0 ? boardedPerSec / sTot : 0;
  if (rt.time > 20 && utilisation < 0.5) {
    return rt.guests.length < maxPop(s) ? 'Lifts are idle. Wait for guests or add parking.' : 'Lifts are idle. Add parking or housing.';
  }
  return 'Looking good.';
}

export function maxLevel() { return LEVEL_MAX; }
export const avgRidesPerGuest = () => (GUEST.dayRides[0] + GUEST.dayRides[1]) / 2;
