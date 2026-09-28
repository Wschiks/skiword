import { SAVE_VERSION, ensureState } from './state';
import type { GameState } from './state';
import { maxPop } from './economy';

export const SAVE_KEY = 'skitycoon.save.v1';

interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
const defaultStorage = (): StorageLike | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};

/** Persisted subset only (spec 13.6). Guests and queues are not saved. */
export function toSaveData(s: GameState, nowMs = Date.now()) {
  return {
    version: SAVE_VERSION,
    money: s.money, gems: s.gems,
    lifetimeEarned: s.lifetimeEarned, earnedThisSeason: s.earnedThisSeason,
    season: s.season, seasonPoints: s.seasonPoints,
    parkingLevel: s.parkingLevel, housingLevel: s.housingLevel,
    areasOwned: s.areasOwned,
    lines: s.lines.map(l => ({ id: l.id, areaId: l.areaId, slot: l.slot, tier: l.tier, level: l.level })),
    unlockedTier: s.unlockedTier,
    buildings: s.buildings, zones: s.zones,
    quests: { doneIds: s.quests.doneIds, claimedIds: s.quests.claimedIds, progress: s.quests.progress },
    stats: { ridesTotal: s.stats.ridesTotal, guestsServed: s.stats.guestsServed, angryLeaves: s.stats.angryLeaves, angryRecent: [] },
    ads: s.ads, purchases: s.purchases, settings: s.settings, tutorial: s.tutorial,
    incomeEma: s.incomeEma, lastSeen: nowMs,
    pop: s.rt.guests.length || s.rt.prevPop,
  };
}
export const serialize = (s: GameState, nowMs = Date.now()) => JSON.stringify(toSaveData(s, nowMs));

/** Upgrades old saves. Only v1 exists; this is the hook for later versions. */
export function migrate(data: any, fromVersion: number): any {
  let d = data;
  if (fromVersion < 1) d = { ...d };
  return d;
}

export function deserialize(json: string): GameState | null {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    const s = ensureState(migrate(data, Number(data.version) || 0));
    const n = Math.min(s.rt.prevPop, maxPop(s));
    if (n > 0) s.rt.respawn = { remaining: n, timer: 0, every: 10 / n };
    return s;
  } catch {
    return null;
  }
}

export function saveState(s: GameState, storage: StorageLike | null = defaultStorage(), nowMs = Date.now()): boolean {
  if (!storage) return false;
  try { storage.setItem(SAVE_KEY, serialize(s, nowMs)); return true; } catch { return false; }
}
export function loadState(storage: StorageLike | null = defaultStorage()): GameState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch { return null; }
}
export function clearSave(storage: StorageLike | null = defaultStorage()) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
