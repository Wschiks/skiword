import { newGame, makeLine } from '../../src/core/game';
import type { GameState } from '../../src/core/game';

export interface Spec {
  name: string; parking: number; housing?: number; areas?: string[];
  lines: [string, number, number, number][]; // areaId, slot, tier, level
  buildings?: Record<string, number>; zones?: Record<string, number>;
}

export const SPECS: Spec[] = [
  { name: 'early: 1 button', parking: 3, lines: [['bunny', 0, 1, 2]] },
  { name: 'early: 2 tbars', parking: 12, lines: [['bunny', 0, 2, 4], ['bunny', 1, 2, 2]] },
  { name: 'mid: chairs + snack', parking: 15, housing: 4, areas: ['lower'],
    lines: [['bunny', 0, 3, 3], ['bunny', 1, 2, 5], ['lower', 0, 3, 2], ['lower', 1, 3, 0]], buildings: { snack: 3 }, zones: { kids: 2 } },
  { name: 'mid-late: 4 areas', parking: 25, housing: 12, areas: ['lower', 'mid', 'peaks'],
    lines: [['bunny', 0, 5, 4], ['lower', 0, 5, 3], ['lower', 1, 4, 2], ['mid', 0, 5, 1], ['mid', 1, 4, 0], ['peaks', 0, 4, 3]],
    buildings: { snack: 4, mountain: 3 }, zones: { kids: 3, park: 3, slalom: 2 } },
  { name: 'late: gondolas', parking: 30, housing: 20, areas: ['lower', 'mid', 'peaks', 'glacier'],
    lines: [['bunny', 0, 8, 5], ['lower', 0, 8, 4], ['lower', 1, 7, 6], ['mid', 0, 8, 3], ['mid', 1, 7, 5], ['peaks', 0, 8, 2], ['glacier', 0, 8, 1]],
    buildings: { snack: 8, mountain: 6, apres: 4, lodge: 2 }, zones: { kids: 6, park: 6, slalom: 5, offpiste: 3 } },
];

export function build(spec: Spec, seed = 7): GameState {
  const s = newGame(seed);
  s.parkingLevel = spec.parking;
  s.housingLevel = spec.housing ?? 0;
  s.areasOwned = ['bunny', ...(spec.areas ?? [])];
  s.lines = spec.lines.map(([a, slot, tier, level]) => makeLine(a, slot, tier, level));
  s.unlockedTier = Math.max(...spec.lines.map(l => l[2]));
  for (const [k, v] of Object.entries(spec.buildings ?? {})) s.buildings[k] = v;
  for (const [k, v] of Object.entries(spec.zones ?? {})) s.zones[k] = { owned: true, level: v, stage: 0 };
  s.money = 0;
  return s;
}
