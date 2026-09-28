export type SlotType = 'any' | 'gondolaOnly';
export interface AreaDef {
  id: string; name: string; cost: number; band: [number, number]; skiTime: number; liftLenMul: number;
  slots: { cost: number; type: SlotType }[];
  unlocks: string;
}

export const AREAS: AreaDef[] = [
  { id: 'bunny',   name: 'Bunny Hill',   cost: 0,        band: [2500, 2900], skiTime: 20, liftLenMul: 1.0,  unlocks: 'Starter slopes',
    slots: [ { cost: 0, type: 'any' }, { cost: 120, type: 'any' } ] },
  { id: 'lower',   name: 'Lower Slopes', cost: 1500,     band: [1800, 2500], skiTime: 26, liftLenMul: 1.1,  unlocks: 'Housing, Snack Hut, Kids\' Park',
    slots: [ { cost: 0, type: 'any' }, { cost: 4000, type: 'any' }, { cost: 12000, type: 'any' } ] },
  { id: 'mid',     name: 'Mid Mountain', cost: 20000,    band: [1100, 1800], skiTime: 32, liftLenMul: 1.25, unlocks: 'Mountain Restaurant, Terrain Park, Slalom',
    slots: [ { cost: 0, type: 'any' }, { cost: 60000, type: 'any' }, { cost: 180000, type: 'any' } ] },
  { id: 'peaks',   name: 'High Peaks',   cost: 400000,   band: [560, 1100],  skiTime: 40, liftLenMul: 1.4,  unlocks: 'Apres-Ski Bar, Off-Piste',
    slots: [ { cost: 0, type: 'any' }, { cost: 1500000, type: 'any' }, { cost: 4000000, type: 'any' } ] },
  { id: 'glacier', name: 'Glacier',      cost: 20000000, band: [0, 500],     skiTime: 50, liftLenMul: 1.7,  unlocks: 'Lodge Restaurant, gondola-only slopes',
    slots: [ { cost: 0, type: 'gondolaOnly' }, { cost: 60000000, type: 'gondolaOnly' } ] },
];

export const areaIndex = (id: string) => AREAS.findIndex(a => a.id === id);
export const areaDef = (id: string) => AREAS[areaIndex(id)];
export const CANYON_BAND: [number, number] = [500, 560];
