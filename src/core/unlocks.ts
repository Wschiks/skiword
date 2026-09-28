import { AREAS, areaDef, areaIndex } from '../config/areas';
import { GATE_TIERS, LEVEL_MAX, MAX_TIER, REQ_LEVEL_GATE, REQ_LEVEL_NORMAL } from '../config/lifts';
import { PARKING, HOUSING } from '../config/capacity';
import { BUILDINGS, BUILDING_LEVEL_MAX } from '../config/facilities';
import { ZONES, ZONE_LEVEL_MAX, PARK_STAGE_REQ_LEVEL } from '../config/zones';
import { areaOwned, lineById, makeLine } from './state';
import type { GameState } from './state';
import {
  areaCost, buildingCost, buildingUpgradeCost, housingCost, levelUpgradeCost, newLineCost, parkingCost,
  tierBuildCost, tierDef, zoneBuyCost, zoneDef, zoneUpgradeCost, bottleneck,
} from './economy';

export type Result = { ok: true; n?: number } | { ok: false; reason: string };
const ok = (n?: number): Result => ({ ok: true, n });
const fail = (reason: string): Result => ({ ok: false, reason });
export type Count = number | 'max';

function bulk(s: GameState, n: Count, cost: () => number | null, apply: () => void): Result {
  const limit = n === 'max' ? Infinity : Math.max(1, n);
  let done = 0;
  let lastReason = 'maxed';
  while (done < limit) {
    const c = cost();
    if (c === null) break;
    if (s.money < c) { lastReason = 'money'; break; }
    s.money -= c;
    apply();
    done++;
  }
  return done > 0 ? ok(done) : fail(lastReason);
}

// ---------- lifts ----------
export function buyLiftLevel(s: GameState, lineId: string, n: Count = 1): Result {
  const l = lineById(s, lineId);
  if (!l) return fail('nolift');
  if (l.level >= LEVEL_MAX) return fail('maxed');
  return bulk(s, n, () => (l.level >= LEVEL_MAX ? null : levelUpgradeCost(l.tier, l.level)), () => { l.level++; });
}

export function rebuildRequirement(tier: number) { return GATE_TIERS.includes(tier) ? REQ_LEVEL_GATE : REQ_LEVEL_NORMAL; }

export function canRebuild(s: GameState, lineId: string): Result {
  const l = lineById(s, lineId);
  if (!l) return fail('nolift');
  if (l.tier >= MAX_TIER) return fail('maxed');
  if (l.level < rebuildRequirement(l.tier)) return fail('level');
  if (s.money < tierBuildCost(l.tier + 1)) return fail('money');
  return ok();
}
export function rebuildLine(s: GameState, lineId: string): Result {
  const r = canRebuild(s, lineId);
  if (!r.ok) return r;
  const l = lineById(s, lineId)!;
  s.money -= tierBuildCost(l.tier + 1);
  l.tier++;
  l.level = 0;
  s.unlockedTier = Math.max(s.unlockedTier, l.tier);
  return ok();
}

export function canBuildLine(s: GameState, areaId: string, slot: number, tier: number): Result {
  const a = AREAS.find(x => x.id === areaId);
  if (!a) return fail('noarea');
  if (!areaOwned(s, areaId)) return fail('locked');
  if (slot < 0 || slot >= a.slots.length) return fail('noslot');
  if (s.lines.some(l => l.areaId === areaId && l.slot === slot)) return fail('taken');
  if (tier < 1 || tier > s.unlockedTier) return fail('tier');
  if (a.slots[slot].type === 'gondolaOnly' && tierDef(tier).family !== 'gondola') return fail('gondolaOnly');
  if (s.money < newLineCost(areaId, slot, tier)) return fail('money');
  return ok();
}
export function buildLine(s: GameState, areaId: string, slot: number, tier: number): Result {
  const r = canBuildLine(s, areaId, slot, tier);
  if (!r.ok) return r;
  s.money -= newLineCost(areaId, slot, tier);
  s.lines.push(makeLine(areaId, slot, tier, 0));
  return ok();
}

// ---------- areas ----------
export function nextArea(s: GameState) { return AREAS.find(a => !areaOwned(s, a.id)); }
export function canBuyArea(s: GameState, id: string): Result {
  const a = AREAS.find(x => x.id === id);
  if (!a) return fail('noarea');
  if (areaOwned(s, id)) return fail('owned');
  const idx = areaIndex(id);
  if (idx > 0 && !areaOwned(s, AREAS[idx - 1].id)) return fail('order');
  if (s.money < areaCost(id)) return fail('money');
  return ok();
}
export function buyArea(s: GameState, id: string): Result {
  const r = canBuyArea(s, id);
  if (!r.ok) return r;
  s.money -= areaCost(id);
  s.areasOwned.push(id);
  return ok();
}

// ---------- parking / housing ----------
export function buyParkingLevel(s: GameState, n: Count = 1): Result {
  return bulk(s, n, () => (s.parkingLevel >= PARKING.levelMax ? null : parkingCost(s.parkingLevel)), () => { s.parkingLevel++; });
}
export function buyHousingLevel(s: GameState, n: Count = 1): Result {
  if (!areaOwned(s, HOUSING.requiresArea)) return fail('locked');
  return bulk(s, n, () => (s.housingLevel >= HOUSING.levelMax ? null : housingCost(s.housingLevel)), () => { s.housingLevel++; });
}

// ---------- buildings ----------
export function buyBuilding(s: GameState, id: string): Result {
  const b = BUILDINGS.find(x => x.id === id);
  if (!b) return fail('nobuilding');
  if (!areaOwned(s, b.requiresArea)) return fail('locked');
  if ((s.buildings[id] || 0) > 0) return fail('owned');
  const c = buildingCost(id);
  if (s.money < c) return fail('money');
  s.money -= c;
  s.buildings[id] = 1;
  return ok();
}
export function upgradeBuilding(s: GameState, id: string, n: Count = 1): Result {
  if (!BUILDINGS.some(x => x.id === id)) return fail('nobuilding');
  if ((s.buildings[id] || 0) <= 0) return fail('notowned');
  return bulk(s, n, () => (s.buildings[id] >= BUILDING_LEVEL_MAX ? null : buildingUpgradeCost(id, s.buildings[id])), () => { s.buildings[id]++; });
}

// ---------- zones ----------
export function buyZone(s: GameState, id: string): Result {
  const d = ZONES.find(z => z.id === id);
  if (!d) return fail('nozone');
  if (!areaOwned(s, d.requiresArea)) return fail('locked');
  if (s.zones[id].owned) return fail('owned');
  const c = zoneBuyCost(id, 0);
  if (s.money < c) return fail('money');
  s.money -= c;
  s.zones[id] = { owned: true, level: 1, stage: 0 };
  return ok();
}
export function upgradeZone(s: GameState, id: string, n: Count = 1): Result {
  const z = s.zones[id];
  if (!z || !z.owned) return fail('notowned');
  return bulk(s, n, () => (z.level >= ZONE_LEVEL_MAX ? null : zoneUpgradeCost(s, id, z.level)), () => { z.level++; });
}
export function canNextParkStage(s: GameState): Result {
  const z = s.zones.park;
  const d = zoneDef('park');
  if (!z.owned) return fail('notowned');
  if (z.stage >= d.stages!.length - 1) return fail('maxed');
  if (z.level < PARK_STAGE_REQ_LEVEL) return fail('level');
  if (s.money < zoneBuyCost('park', z.stage + 1)) return fail('money');
  return ok();
}
export function nextParkStage(s: GameState): Result {
  const r = canNextParkStage(s);
  if (!r.ok) return r;
  const z = s.zones.park;
  s.money -= zoneBuyCost('park', z.stage + 1);
  z.stage++;
  z.level = 1;
  return ok();
}

// ---------- purchase catalogue (bot + next-goal hint) ----------
export type PurchaseKind = 'level' | 'rebuild' | 'newline' | 'parking' | 'housing' | 'area' | 'building' | 'buildingUp' | 'zone' | 'zoneUp' | 'stage';
export interface Purchase { key: string; kind: PurchaseKind; label: string; cost: number; apply: (s: GameState) => Result }

export function listPurchases(s: GameState): Purchase[] {
  const out: Purchase[] = [];
  for (const l of s.lines) {
    const nm = `${tierDef(l.tier).name} in ${areaDef(l.areaId).name}`;
    if (l.level < LEVEL_MAX) out.push({ key: `lv:${l.id}`, kind: 'level', label: `Upgrade ${nm}`, cost: levelUpgradeCost(l.tier, l.level), apply: t => buyLiftLevel(t, l.id, 1) });
    if (l.tier < MAX_TIER && l.level >= rebuildRequirement(l.tier)) {
      out.push({ key: `rb:${l.id}`, kind: 'rebuild', label: `Rebuild ${nm} as ${tierDef(l.tier + 1).name}`, cost: tierBuildCost(l.tier + 1), apply: t => rebuildLine(t, l.id) });
    }
  }
  for (const a of AREAS) {
    if (!areaOwned(s, a.id)) continue;
    a.slots.forEach((sl, i) => {
      if (s.lines.some(l => l.areaId === a.id && l.slot === i)) return;
      const tiers = new Set<number>([s.unlockedTier, Math.max(1, s.unlockedTier - 2)]);
      for (const t of tiers) {
        if (sl.type === 'gondolaOnly' && tierDef(t).family !== 'gondola') continue;
        out.push({ key: `nl:${a.id}:${i}:${t}`, kind: 'newline', label: `Build ${tierDef(t).name} in ${a.name}`, cost: newLineCost(a.id, i, t), apply: x => buildLine(x, a.id, i, t) });
      }
    });
  }
  const na = nextArea(s);
  if (na && areaOwned(s, AREAS[Math.max(0, areaIndex(na.id) - 1)].id)) {
    out.push({ key: `area:${na.id}`, kind: 'area', label: `Buy ${na.name}`, cost: areaCost(na.id), apply: x => buyArea(x, na.id) });
  }
  if (s.parkingLevel < PARKING.levelMax) out.push({ key: 'park', kind: 'parking', label: 'More parking', cost: parkingCost(s.parkingLevel), apply: x => buyParkingLevel(x, 1) });
  if (areaOwned(s, HOUSING.requiresArea) && s.housingLevel < HOUSING.levelMax) out.push({ key: 'house', kind: 'housing', label: 'More housing', cost: housingCost(s.housingLevel), apply: x => buyHousingLevel(x, 1) });
  for (const b of BUILDINGS) {
    if (!areaOwned(s, b.requiresArea)) continue;
    const L = s.buildings[b.id] || 0;
    if (L === 0) out.push({ key: `b:${b.id}`, kind: 'building', label: `Build ${b.name}`, cost: buildingCost(b.id), apply: x => buyBuilding(x, b.id) });
    else if (L < BUILDING_LEVEL_MAX) out.push({ key: `bu:${b.id}`, kind: 'buildingUp', label: `Upgrade ${b.name}`, cost: buildingUpgradeCost(b.id, L), apply: x => upgradeBuilding(x, b.id, 1) });
  }
  for (const z of ZONES) {
    if (!areaOwned(s, z.requiresArea)) continue;
    const zs = s.zones[z.id];
    if (!zs.owned) out.push({ key: `z:${z.id}`, kind: 'zone', label: `Open ${z.name}`, cost: zoneBuyCost(z.id, 0), apply: x => buyZone(x, z.id) });
    else {
      if (zs.level < ZONE_LEVEL_MAX) out.push({ key: `zu:${z.id}`, kind: 'zoneUp', label: `Upgrade ${z.name}`, cost: zoneUpgradeCost(s, z.id, zs.level), apply: x => upgradeZone(x, z.id, 1) });
      if (z.stages && zs.stage < z.stages.length - 1 && zs.level >= PARK_STAGE_REQ_LEVEL) {
        out.push({ key: `zs:${z.id}`, kind: 'stage', label: `${z.name}: ${z.stages[zs.stage + 1].name}`, cost: zoneBuyCost(z.id, zs.stage + 1), apply: x => nextParkStage(x) });
      }
    }
  }
  return out;
}

/** Cheapest sensible next purchase, for the "Next:" label. */
export function nextGoal(s: GameState): { label: string; cost: number; kind: PurchaseKind } | null {
  const list = listPurchases(s);
  if (!list.length) return null;
  const b = bottleneck(s);
  let cands = list;
  if (b === 'lifts') cands = list.filter(p => p.kind !== 'parking' && p.kind !== 'housing');
  else if (b === 'people') cands = list.filter(p => p.kind === 'parking' || p.kind === 'housing' || p.kind === 'area' || p.kind === 'building' || p.kind === 'zone');
  if (!cands.length) cands = list;
  // prefer the cheapest "big" step: new content over plain level ups when comparably priced
  const rank = (p: Purchase) => p.cost * (p.kind === 'level' ? 1 : p.kind === 'buildingUp' || p.kind === 'zoneUp' ? 1.3 : 0.9);
  cands = cands.slice().sort((a, c) => rank(a) - rank(c));
  const p = cands[0];
  return { label: p.label, cost: p.cost, kind: p.kind };
}
