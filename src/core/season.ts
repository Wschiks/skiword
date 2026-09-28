import { AREAS } from '../config/areas';
import { SEASON } from '../config/balance';
import { areaOwned, makeRuntime, newGame } from './state';
import type { GameState } from './state';
import { seasonBonusFor } from './economy';
import type { Result } from './unlocks';

export const totalSeasonPoints = (lifetime: number) => Math.floor(SEASON.spScale * Math.sqrt(lifetime / SEASON.spDivisor));
export const seasonGain = (s: GameState) => Math.max(0, totalSeasonPoints(s.lifetimeEarned) - s.seasonPoints);
export function canNewSeason(s: GameState): Result {
  if (!AREAS.every(a => areaOwned(s, a.id))) return { ok: false, reason: 'areas' };
  if (seasonGain(s) < SEASON.minGain) return { ok: false, reason: 'points' };
  return { ok: true };
}
export const seasonPreview = (s: GameState) => {
  const total = totalSeasonPoints(s.lifetimeEarned);
  return { gain: seasonGain(s), total, bonus: seasonBonusFor(total) };
};

export function startNewSeason(s: GameState): Result {
  const r = canNewSeason(s);
  if (!r.ok) return r;
  const fresh = newGame();
  s.seasonPoints = totalSeasonPoints(s.lifetimeEarned);
  s.season++;
  s.money = fresh.money;
  s.earnedThisSeason = 0;
  s.parkingLevel = fresh.parkingLevel;
  s.housingLevel = fresh.housingLevel;
  s.areasOwned = fresh.areasOwned;
  s.lines = fresh.lines;
  s.unlockedTier = fresh.unlockedTier;
  s.buildings = fresh.buildings;
  s.zones = fresh.zones;
  s.incomeEma = 0;
  const events = s.rt.events;
  s.rt = makeRuntime(s.rt.seed);
  s.rt.events = events;
  return { ok: true };
}
