import { AREAS } from '../config/areas';
import { BUILDINGS } from '../config/facilities';
import { ZONES } from '../config/zones';
import { START } from '../config/balance';
import type { Pt } from '../config/layout';

export type GuestKind = 'ski' | 'board';
export type GuestHome = 'day' | 'lodge' | 'bus';
export type GuestState =
  | 'arriving' | 'walkingToLift' | 'lobby' | 'queueing' | 'riding' | 'skiing' | 'choosing'
  | 'walkingToZone' | 'inZone' | 'eating' | 'returning' | 'resting' | 'leaving';

export interface Guest {
  id: number; kind: GuestKind; home: GuestHome; state: GuestState;
  area: number;
  lineId?: string; zoneId?: string;
  timer: number; dur: number;
  waited: number; patience: number;
  ridesDone: number; ridesTarget: number;
  sessionsLeft: number;
  zoneSinceRide: boolean;
  angry: boolean;
  // view helpers (kept in core so the scene only has to interpolate)
  x: number; y: number; from: Pt; to: Pt;
  qi: number; color: number; retry: number; done: boolean;
}

export interface Departure { t0: number; n: number; rideTime: number }

export interface Line {
  id: string; areaId: string; slot: number; tier: number; level: number;
  // runtime only
  queue: Guest[]; timer: number; departures: Departure[]; incomeRate: number; earnAcc: number;
}

export interface ZoneState { owned: boolean; level: number; stage: number }

export type GameEvent =
  | { k: 'pay'; x: number; y: number; amount: number; src: 'ride' | 'zone' }
  | { k: 'angry'; x: number; y: number }
  | { k: 'bus' }
  | { k: 'buy' }
  | { k: 'error' };

export interface Runtime {
  time: number; acc: number; nextId: number; seed: number;
  guests: Guest[];
  arrivalTimer: number; lodgeTimer: number;
  busPending: { remaining: number; timer: number } | null;
  busT0: number;
  respawn: { remaining: number; timer: number; every: number } | null;
  zoneOcc: Record<string, number>;
  stepIncome: number;
  src: { rides: number; zones: number; buildings: number };
  offline: number;
  events: GameEvent[];
  secTimer: number;
  needRemove: boolean;
  prevPop: number;
  firstAngryShown: boolean;
}

export interface GameState {
  version: number;
  money: number; gems: number;
  lifetimeEarned: number; earnedThisSeason: number;
  season: number; seasonPoints: number;
  parkingLevel: number; housingLevel: number;
  areasOwned: string[];
  lines: Line[];
  unlockedTier: number;
  buildings: Record<string, number>;
  zones: Record<string, ZoneState>;
  quests: { doneIds: string[]; claimedIds: string[]; progress: Record<string, number> };
  stats: { ridesTotal: number; guestsServed: number; angryLeaves: number; angryRecent: number[] };
  ads: { busCount: number; dayKey: string; busCooldownUntil: number };
  purchases: { incomeX2: boolean };
  settings: { sound: boolean; haptics: boolean };
  tutorial: { step: number; done: boolean };
  incomeEma: number; lastSeen: number;
  rt: Runtime;
}

export const SAVE_VERSION = 1;

export function makeRuntime(seed = 12345): Runtime {
  return {
    time: 0, acc: 0, nextId: 1, seed,
    guests: [], arrivalTimer: 0, lodgeTimer: 0,
    busPending: null, busT0: -1000, respawn: null, zoneOcc: {},
    stepIncome: 0, src: { rides: 0, zones: 0, buildings: 0 },
    offline: 0, events: [], secTimer: 0, needRemove: false, prevPop: 0, firstAngryShown: false,
  };
}

export function makeLine(areaId: string, slot: number, tier: number, level = 0): Line {
  return { id: `${areaId}:${slot}`, areaId, slot, tier, level, queue: [], timer: 0, departures: [], incomeRate: 0, earnAcc: 0 };
}

export function dayKeyNow(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function newGame(seed = 12345): GameState {
  const buildings: Record<string, number> = {};
  for (const b of BUILDINGS) buildings[b.id] = 0;
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) zones[z.id] = { owned: false, level: 0, stage: 0 };
  return {
    version: SAVE_VERSION,
    money: START.money, gems: 0, lifetimeEarned: 0, earnedThisSeason: 0,
    season: 1, seasonPoints: 0,
    parkingLevel: START.parkingLevel, housingLevel: START.housingLevel,
    areasOwned: ['bunny'],
    lines: [makeLine('bunny', 0, START.tier, 0)],
    unlockedTier: START.tier,
    buildings, zones,
    quests: { doneIds: [], claimedIds: [], progress: {} },
    stats: { ridesTotal: 0, guestsServed: 0, angryLeaves: 0, angryRecent: [] },
    ads: { busCount: 0, dayKey: dayKeyNow(), busCooldownUntil: 0 },
    purchases: { incomeX2: false },
    settings: { sound: true, haptics: true },
    tutorial: { step: 1, done: false },
    incomeEma: 0, lastSeen: Date.now(),
    rt: makeRuntime(seed),
  };
}

const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

/** Repairs a partial/untrusted object into a full valid GameState (unknown ids dropped, numbers clamped). */
export function ensureState(input: any): GameState {
  const base = newGame();
  if (!input || typeof input !== 'object') return base;
  const s = base;
  s.money = num(input.money, s.money, 0);
  s.gems = Math.floor(num(input.gems, 0, 0));
  s.lifetimeEarned = num(input.lifetimeEarned, 0, 0);
  s.earnedThisSeason = num(input.earnedThisSeason, 0, 0);
  s.season = Math.floor(num(input.season, 1, 1));
  s.seasonPoints = Math.floor(num(input.seasonPoints, 0, 0));
  s.parkingLevel = Math.floor(num(input.parkingLevel, 0, 0, 30));
  s.housingLevel = Math.floor(num(input.housingLevel, 0, 0, 20));
  const owned = Array.isArray(input.areasOwned) ? input.areasOwned.filter((id: any) => AREAS.some(a => a.id === id)) : [];
  s.areasOwned = AREAS.map(a => a.id).filter(id => id === 'bunny' || owned.includes(id));
  if (Array.isArray(input.lines)) {
    const lines: Line[] = [];
    for (const l of input.lines) {
      const area = AREAS.find(a => a.id === l?.areaId);
      if (!area || !s.areasOwned.includes(area.id)) continue;
      const slot = Math.floor(num(l.slot, -1));
      if (slot < 0 || slot >= area.slots.length) continue;
      if (lines.some(x => x.areaId === area.id && x.slot === slot)) continue;
      lines.push(makeLine(area.id, slot, Math.floor(num(l.tier, 1, 1, 10)), Math.floor(num(l.level, 0, 0, 10))));
    }
    if (lines.length) s.lines = lines;
  }
  s.unlockedTier = Math.floor(num(input.unlockedTier, 1, 1, 10));
  s.unlockedTier = Math.max(s.unlockedTier, ...s.lines.map(l => l.tier));
  for (const b of BUILDINGS) s.buildings[b.id] = Math.floor(num(input.buildings?.[b.id], 0, 0, 10));
  for (const z of ZONES) {
    const zi = input.zones?.[z.id];
    if (zi && zi.owned) {
      s.zones[z.id] = {
        owned: true, level: Math.floor(num(zi.level, 1, 1, 10)),
        stage: z.stages ? Math.floor(num(zi.stage, 0, 0, z.stages.length - 1)) : 0,
      };
    }
  }
  if (input.quests) {
    const known = (ids: any) => (Array.isArray(ids) ? ids.filter((x: any) => typeof x === 'string') : []);
    s.quests.doneIds = known(input.quests.doneIds);
    s.quests.claimedIds = known(input.quests.claimedIds);
    for (const id of s.quests.claimedIds) if (!s.quests.doneIds.includes(id)) s.quests.doneIds.push(id);
  }
  if (input.stats) {
    s.stats.ridesTotal = num(input.stats.ridesTotal, 0, 0);
    s.stats.guestsServed = num(input.stats.guestsServed, 0, 0);
    s.stats.angryLeaves = num(input.stats.angryLeaves, 0, 0);
  }
  if (input.ads) {
    s.ads.busCount = Math.floor(num(input.ads.busCount, 0, 0));
    s.ads.dayKey = typeof input.ads.dayKey === 'string' ? input.ads.dayKey : dayKeyNow();
    s.ads.busCooldownUntil = num(input.ads.busCooldownUntil, 0, 0);
  }
  s.purchases.incomeX2 = !!input.purchases?.incomeX2;
  if (input.settings) {
    s.settings.sound = input.settings.sound !== false;
    s.settings.haptics = input.settings.haptics !== false;
  }
  if (input.tutorial) {
    s.tutorial.step = Math.floor(num(input.tutorial.step, 1, 1, 7));
    s.tutorial.done = !!input.tutorial.done;
  }
  s.incomeEma = num(input.incomeEma, 0, 0);
  s.lastSeen = num(input.lastSeen, Date.now(), 0);
  s.rt.prevPop = Math.floor(num(input.pop, 0, 0, 200));
  return s;
}

export function areaOwned(s: GameState, id: string) { return s.areasOwned.includes(id); }
export function lineById(s: GameState, id: string) { return s.lines.find(l => l.id === id); }
export function parkStage(s: GameState): number { return s.zones.park?.owned ? s.zones.park.stage + 1 : 0; }
