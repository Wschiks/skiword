export interface ZoneStage { name: string; cost: number; fee: number; capacity: number }
export interface ZoneDef {
  id: string; name: string; requiresArea: string; cost: number; fee: number; capacity: number;
  stay: number; baseP: number; pos: { x: number; y: number }; stages?: ZoneStage[];
}
export const ZONES: ZoneDef[] = [
  { id: 'kids',     name: "Kids' Park",    requiresArea: 'lower', cost: 5000,    fee: 3,  capacity: 8,  stay: 20, baseP: 0.10, pos: { x: 180, y: 2150 } },
  { id: 'park',     name: 'Terrain Park',  requiresArea: 'mid',   cost: 60000,   fee: 6,  capacity: 10, stay: 18, baseP: 0.18, pos: { x: 200, y: 1450 },
    stages: [
      { name: 'Rails and Small Jumps', cost: 60000,   fee: 6,  capacity: 10 },
      { name: 'Big Jumps',             cost: 150000,  fee: 15, capacity: 14 },
      { name: 'Half-Pipe',             cost: 2000000, fee: 40, capacity: 18 },
    ] },
  { id: 'slalom',   name: 'Slalom Course', requiresArea: 'mid',   cost: 90000,   fee: 10, capacity: 12, stay: 18, baseP: 0.15, pos: { x: 850, y: 1250 } },
  { id: 'offpiste', name: 'Off-Piste',     requiresArea: 'peaks', cost: 1200000, fee: 45, capacity: 8,  stay: 30, baseP: 0.08, pos: { x: 200, y: 800 } },
];
export const ZONE_PREFERENCE: Record<string, { board: number; ski: number }> = {
  park:     { board: 1.8, ski: 0.6 },
  slalom:   { board: 0.6, ski: 1.8 },
  kids:     { board: 1, ski: 1 },
  offpiste: { board: 1, ski: 1 },
};
export const ZONE_LEVEL_MAX = 10;
export const zoneFeeMult = (L: number) => 1 + 0.10 * (L - 1);
export const zoneCapBonus = (L: number) => Math.floor((L - 1) / 3);
export const ZONE_UPGRADE = { costFactor: 0.4, growth: 1.5 };
export const PARK_STAGE_REQ_LEVEL = 5;
