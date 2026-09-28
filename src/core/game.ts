import { BUS, GEMS, MAX_FRAME_DT, MAX_STEPS_PER_FRAME, OFFLINE, SIM_STEP } from '../config/balance';
import { BUILDINGS } from '../config/facilities';
import { HARD_CAP } from '../config/capacity';
import { dayKeyNow } from './state';
import type { GameState } from './state';
import { avgRidesPerGuest, estimate, buildingIncomeRate, credit, incomeMult, maxPop } from './economy';
import { lineTick } from './lifts';
import { guestTick, removeFinished, spawnArrivals } from './guests';
import { checkQuests, tutorialTick } from './quests';
import type { Result } from './unlocks';

export * from './state';
export * from './economy';
export * from './unlocks';
export * from './quests';
export * from './season';
export { rnd } from './guests';

/** One fixed simulation step (spec 13.2). */
export function step(s: GameState, dt: number = SIM_STEP) {
  const rt = s.rt;
  rt.time += dt;
  spawnArrivals(s, dt);
  for (const l of s.lines) lineTick(s, l, dt);
  for (const g of rt.guests) guestTick(s, g, dt);
  // passive income
  const pop = rt.guests.length, mp = maxPop(s), mult = incomeMult(s);
  for (const b of BUILDINGS) {
    if ((s.buildings[b.id] || 0) > 0) credit(s, buildingIncomeRate(s, b.id, pop, mp) * mult * dt, 'buildings');
  }
  s.incomeEma += ((rt.stepIncome / dt) - s.incomeEma) * Math.min(1, dt / OFFLINE.emaTau);
  rt.stepIncome = 0;
  rt.secTimer += dt;
  if (rt.secTimer >= 1) {
    rt.secTimer -= 1;
    checkQuests(s);
    tutorialTick(s);
  }
  removeFinished(s);
  if (rt.events.length > 300) rt.events.splice(0, rt.events.length - 300);
}

/** Real-time advance: accumulates and runs fixed steps. */
export function advance(s: GameState, realDt: number) {
  const rt = s.rt;
  rt.acc += Math.min(MAX_FRAME_DT, Math.max(0, realDt));
  let n = 0;
  while (rt.acc >= SIM_STEP && n < MAX_STEPS_PER_FRAME) {
    step(s, SIM_STEP);
    rt.acc -= SIM_STEP;
    n++;
  }
  if (n >= MAX_STEPS_PER_FRAME) rt.acc = 0;
}

/** Headless: run `seconds` of full simulation. */
export function simulate(s: GameState, seconds: number) {
  const n = Math.round(seconds / SIM_STEP);
  for (let i = 0; i < n; i++) step(s, SIM_STEP);
}

/** Analytic time skip used by the fast balance bot (no guests). */
export function fastAdvance(s: GameState, seconds: number) {
  const e = estimate(s);
  const inc = e.total * seconds;
  s.money += inc; s.lifetimeEarned += inc; s.earnedThisSeason += inc;
  s.stats.ridesTotal += e.rides * seconds;
  s.stats.guestsServed += (e.rides * seconds) / avgRidesPerGuest();
  s.incomeEma = e.total;
  s.rt.time += seconds;
}

// ---------- ski bus ----------
export function busStatus(s: GameState, now = Date.now()) {
  const day = dayKeyNow(now);
  const used = s.ads.dayKey === day ? s.ads.busCount : 0;
  return {
    used, left: Math.max(0, BUS.maxPerDay - used),
    cooldown: Math.max(0, (s.ads.busCooldownUntil - now) / 1000),
    available: used < BUS.maxPerDay && now >= s.ads.busCooldownUntil,
  };
}
export function callSkiBus(s: GameState, payWith: 'ad' | 'gems', now = Date.now()): Result {
  const day = dayKeyNow(now);
  if (s.ads.dayKey !== day) { s.ads.dayKey = day; s.ads.busCount = 0; }
  if (s.ads.busCount >= BUS.maxPerDay) return { ok: false, reason: 'limit' };
  if (now < s.ads.busCooldownUntil) return { ok: false, reason: 'cooldown' };
  const pending = s.rt.busPending?.remaining ?? 0;
  const n = Math.min(BUS.size, HARD_CAP - s.rt.guests.length - pending);
  if (n <= 0) return { ok: false, reason: 'full' };
  if (payWith === 'gems') {
    if (s.gems < BUS.gemCost) return { ok: false, reason: 'gems' };
    s.gems -= BUS.gemCost;
  }
  s.ads.busCount++;
  s.ads.busCooldownUntil = now + BUS.cooldown * 1000;
  s.rt.busPending = { remaining: n + pending, timer: 0 };
  s.rt.busT0 = s.rt.time;
  s.rt.events.push({ k: 'bus' });
  return { ok: true, n };
}

// ---------- gems shop ----------
export function buyCashBundle(s: GameState): Result {
  if (s.gems < GEMS.cashBundleCost) return { ok: false, reason: 'gems' };
  s.gems -= GEMS.cashBundleCost;
  s.money += cashBundleAmount(s);
  return { ok: true };
}
export const cashBundleAmount = (s: GameState) => Math.max(GEMS.cashBundleMin, estimate(s).total * 60 * GEMS.cashBundleMinutes);

// ---------- offline ----------
export function computeOffline(s: GameState, nowMs = Date.now(), minAway = 0): number {
  const away = Math.min((nowMs - s.lastSeen) / 1000, OFFLINE.maxHours * 3600);
  if (!(away > minAway) || away <= 0) { s.rt.offline = 0; return 0; }
  const earned = s.incomeEma * OFFLINE.rate * away;
  s.rt.offline = earned > 0 ? earned : 0;
  return s.rt.offline;
}
export function claimOffline(s: GameState, double: boolean): number {
  const amount = s.rt.offline * (double ? 2 : 1);
  s.rt.offline = 0;
  s.money += amount; s.lifetimeEarned += amount; s.earnedThisSeason += amount;
  return amount;
}
