export interface BuildingDef {
  id: string; name: string; requiresArea: string; cost: number; baseIncome: number;
  pos: { x: number; y: number }; lodgeBonus?: number;
}
export const BUILDINGS: BuildingDef[] = [
  { id: 'snack',    name: 'Snack Hut',           requiresArea: 'lower',   cost: 3000,     baseIncome: 0.6, pos: { x: 1000, y: 2250 } },
  { id: 'mountain', name: 'Mountain Restaurant', requiresArea: 'mid',     cost: 40000,    baseIncome: 6,   pos: { x: 1000, y: 1500 } },
  { id: 'apres',    name: 'Apres-Ski Bar',       requiresArea: 'peaks',   cost: 600000,   baseIncome: 60,  pos: { x: 1000, y: 850 }, lodgeBonus: 1.0 },
  { id: 'lodge',    name: 'Lodge Restaurant',    requiresArea: 'glacier', cost: 15000000, baseIncome: 900, pos: { x: 1000, y: 250 }, lodgeBonus: 0.5 },
];
export const BUILDING_LEVEL_MAX = 10;
export const buildingLevelMult = (L: number) => 1 + 0.4 * (L - 1);
export const BUILDING_UPGRADE = { costFactor: 0.5, growth: 1.45 };
