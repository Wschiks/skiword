import { QUESTS, ACTIVE_QUESTS } from '../config/quests';
import type { QuestCond, QuestDef } from '../config/quests';
import { areaOwned, parkStage } from './state';
import type { GameState } from './state';
import { areaCost, estimateIncomePerSecond, housingCapacity, parkingCapacity } from './economy';
import { GEMS } from '../config/balance';
import type { Result } from './unlocks';

export function condProgress(s: GameState, c: QuestCond): { cur: number; target: number } {
  switch (c.t) {
    case 'liftLevel': return { cur: Math.max(0, ...s.lines.map(l => l.level)), target: c.n };
    case 'liftTier': return { cur: Math.max(0, ...s.lines.map(l => l.tier)), target: c.n };
    case 'parkingLevel': return { cur: s.parkingLevel, target: c.n };
    case 'parkingCap': return { cur: parkingCapacity(s), target: c.n };
    case 'peopleCap': return { cur: parkingCapacity(s) + housingCapacity(s), target: c.n };
    case 'guestsServed': return { cur: Math.floor(s.stats.guestsServed), target: c.n };
    case 'area': return { cur: areaOwned(s, c.id) ? 1 : 0, target: 1 };
    case 'linesInArea': return { cur: s.lines.filter(l => l.areaId === c.id).length, target: c.n };
    case 'housingLevel': return { cur: s.housingLevel, target: c.n };
    case 'building': return { cur: (s.buildings[c.id] || 0) > 0 ? 1 : 0, target: 1 };
    case 'zone': return { cur: s.zones[c.id]?.owned ? 1 : 0, target: 1 };
    case 'parkStage': return { cur: parkStage(s), target: c.n };
    case 'lifetime': return { cur: s.lifetimeEarned, target: c.n };
    case 'season': return { cur: s.season, target: c.n };
  }
}

export function checkQuests(s: GameState) {
  for (const q of QUESTS) {
    const p = condProgress(s, q.cond);
    s.quests.progress[q.id] = Math.min(1, p.cur / p.target);
    if (!s.quests.doneIds.includes(q.id) && p.cur >= p.target) s.quests.doneIds.push(q.id);
  }
}

export const isDone = (s: GameState, id: string) => s.quests.doneIds.includes(id);
export const isClaimed = (s: GameState, id: string) => s.quests.claimedIds.includes(id);

/** The first ACTIVE_QUESTS unclaimed quests of the chain. */
export function activeQuests(s: GameState): QuestDef[] {
  return QUESTS.filter(q => !isClaimed(s, q.id)).slice(0, ACTIVE_QUESTS);
}

export function questRewardCash(s: GameState, q: QuestDef): number {
  if (q.reward.t !== 'cash') return 0;
  return Math.max(q.reward.floor, q.reward.minutes * 60 * estimateIncomePerSecond(s));
}

export function claimQuest(s: GameState, id: string): Result {
  const q = QUESTS.find(x => x.id === id);
  if (!q) return { ok: false, reason: 'noquest' };
  if (!isDone(s, id)) return { ok: false, reason: 'notdone' };
  if (isClaimed(s, id)) return { ok: false, reason: 'claimed' };
  if (q.reward.t === 'gems') s.gems += q.reward.n;
  else s.money += questRewardCash(s, q);
  s.quests.claimedIds.push(id);
  return { ok: true };
}

/** Advances the scripted tutorial (spec 12.4). Step 7+ is done. */
export function tutorialTick(s: GameState) {
  const t = s.tutorial;
  if (t.done) return;
  const maxLevel = Math.max(0, ...s.lines.map(l => l.level));
  const maxTier = Math.max(0, ...s.lines.map(l => l.tier));
  if (t.step === 1 && maxLevel >= 1) t.step = 2;
  if (t.step === 2 && maxLevel >= 3) t.step = 3;
  if (t.step === 3 && s.parkingLevel >= 1) t.step = 4;
  if (t.step === 4 && maxTier >= 2) t.step = 5;
  if (t.step === 5 && (s.stats.angryLeaves >= 1 || s.money >= areaCost('lower'))) t.step = 6;
  if (t.step === 6 && areaOwned(s, 'lower')) { t.step = 7; t.done = true; }
  void GEMS;
}
