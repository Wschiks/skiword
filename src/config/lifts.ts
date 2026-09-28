export type LiftFamily = 'drag' | 'chair' | 'gondola';
export interface LiftTier {
  tier: number; id: string; name: string; family: LiftFamily;
  capacity: number; interval: number; rideBase: number; price: number; tierCost: number; levelBase: number;
}

export const LIFT_TIERS: LiftTier[] = [
  { tier: 1,  id: 'button',  name: 'Button Lift',  family: 'drag',    capacity: 1,  interval: 6, rideBase: 12, price: 5,    tierCost: 0,        levelBase: 8 },
  { tier: 2,  id: 'tbar',    name: 'T-Bar',        family: 'drag',    capacity: 2,  interval: 6, rideBase: 12, price: 8,    tierCost: 250,      levelBase: 12 },
  // GATE 1: drag -> chair (T2 must be level >= 8)
  { tier: 3,  id: 'chair2',  name: 'Chair Lift 2', family: 'chair',   capacity: 2,  interval: 5, rideBase: 18, price: 20,   tierCost: 1200,     levelBase: 60 },
  { tier: 4,  id: 'chair4',  name: 'Chair Lift 4', family: 'chair',   capacity: 4,  interval: 5, rideBase: 18, price: 30,   tierCost: 5000,     levelBase: 250 },
  { tier: 5,  id: 'chair6',  name: 'Chair Lift 6', family: 'chair',   capacity: 6,  interval: 5, rideBase: 18, price: 60,   tierCost: 21000,    levelBase: 1050 },
  { tier: 6,  id: 'chair8',  name: 'Chair Lift 8', family: 'chair',   capacity: 8,  interval: 5, rideBase: 18, price: 125,  tierCost: 90000,    levelBase: 4500 },
  // GATE 2: chair -> gondola (T6 must be level >= 8)
  { tier: 7,  id: 'gond12',  name: 'Gondola 12',   family: 'gondola', capacity: 12, interval: 6, rideBase: 26, price: 280,  tierCost: 600000,   levelBase: 30000 },
  { tier: 8,  id: 'gond16',  name: 'Gondola 16',   family: 'gondola', capacity: 16, interval: 6, rideBase: 26, price: 600,  tierCost: 2500000,  levelBase: 125000 },
  { tier: 9,  id: 'gond20',  name: 'Gondola 20',   family: 'gondola', capacity: 20, interval: 6, rideBase: 26, price: 1350, tierCost: 11000000, levelBase: 550000 },
  { tier: 10, id: 'gond24',  name: 'Gondola 24',   family: 'gondola', capacity: 24, interval: 6, rideBase: 26, price: 3200, tierCost: 45000000, levelBase: 2250000 },
];

export const LEVEL_MAX = 10;
export const LEVEL_EFFECT = { pricePerLevel: 0.10, intervalPerLevel: 0.025 };
export const LEVEL_COST_GROWTH = 1.28;
export const GATE_TIERS = [2, 6]; // rebuilding FROM these tiers is a gate
export const REQ_LEVEL_NORMAL = 3;
export const REQ_LEVEL_GATE = 8;
export const MAX_TIER = 10;
export const QUEUE_CAP = (tier: number) => 6 + 6 * tier;
