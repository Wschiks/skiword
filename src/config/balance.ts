export const SIM_STEP = 0.1;
export const MAX_STEPS_PER_FRAME = 20;
export const MAX_FRAME_DT = 0.5;

export const START = { money: 10, parkingLevel: 0, housingLevel: 0, tier: 1 };

export const GUEST = {
  patience: 50, patienceJitter: 0.2,
  dayRides: [6, 9] as [number, number], busRides: 8, lodgeRides: [7, 10] as [number, number],
  lodgeSessions: 3, lodgeFactor: 1.25, restTime: 30,
  zoneRollWalk: 5, eatChance: 0.25, eatTime: 6,
  skiJitter: [0.85, 1.15] as [number, number],
};

export const WALK = { speed: 70, arrive: 8, hubStep: 10, toLift: 4, homeBase: 6, homePerArea: 6, toZone: 5 };

export const BUS = { size: 40, spawnOver: 10, cooldown: 90, maxPerDay: 12, gemCost: 12 };
export const GEMS = { cashBundleCost: 25, cashBundleMinutes: 30, cashBundleMin: 100 };
export const OFFLINE = { rate: 0.5, maxHours: 8, adDouble: true, emaTau: 120, awayThreshold: 30 };
export const SEASON = { spScale: 10, spDivisor: 1e9, bonusPerSP: 0.05, minGain: 5 };
export const INCOME_X2_MULT = 2;
export const AUTOSAVE_INTERVAL = 10;

/**
 * Cost-group multipliers produced by the balance-tuning procedure (spec section 17.3, `npm run tune`).
 * The base tables in lifts/areas/... stay as the design source; these scale them.
 * `tier` has one entry per lift tier (1..10) and `area` one entry per area (bunny..glacier).
 */
/**
 * FAST variant: the opening keeps close to main's pace (a new player should still feel each early purchase),
 * the mid and late game are compressed harder. Everything maxed in about a day instead of about three.
 */
const mul = (xs: number[], ks: number[]) => xs.map((x, i) => Number((x * ks[i]).toPrecision(3)));
export const TUNE = {
  parking: 1.39 * 0.8, housing: 1 * 0.5, slot: 1 * 0.5, building: 0.226 * 0.5, zone: 1 * 0.4,
  liftLevel: mul([1, 1, 1, 1, 1, 1, 0.35, 0.35, 0.35, 0.35], [0.8, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.3, 0.3]),
  tier: mul([1, 1.18, 3.98, 4.18, 4.4, 4.74, 5.5, 4.4, 4.4, 4.6], [1, 0.9, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.3, 0.3]),
  area: mul([1, 0.33, 0.4, 1.5, 1.4], [1, 0.9, 0.6, 0.4, 0.3]),
};
