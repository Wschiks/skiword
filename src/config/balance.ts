export const SIM_STEP = 0.1;
export const MAX_STEPS_PER_FRAME = 20;
export const MAX_FRAME_DT = 0.5;

export const START = { money: 10, parkingLevel: 0, housingLevel: 0, tier: 1 };

export const GUEST = {
  patience: 50, patienceJitter: 0.2,
  dayRides: [6, 9] as [number, number], busRides: 8, lodgeRides: [7, 10] as [number, number],
  lodgeSessions: 3, lodgeFactor: 1.25, restTime: 30,
  zoneRollWalk: 5, eatChance: 0.25, eatTime: 6,
  skiJitter: [0.85, 1.15] as [number, number], liftScoreJitter: 3,
};

/** Bottleneck hint (spec 14.6) and the population mood face */
export const HINT = { angryWindow: 60, angryCount: 2, queueFill: 0.6, idleUtilisation: 0.5, idleAfter: 20 };
export const MOOD = { angryWindow: 60, angryCount: 2, queueFill: 0.45 };
/** UI visibility thresholds */
export const UI = { busFabMaxGuests: 190, shopDotMaxGuests: 170, maxDpr: 2 };
/** Constants of the analytic income estimate (spec 13.4), fitted against the full simulation */
export const ESTIMATE = { fillBase: 0.9, fillExtra: 0.07, fillExtraCap: 100, walkOverhead: 8, softK: 5, priceWeightExp: 2 };

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
export const TUNE = {
  parking: 1.64, housing: 1, slot: 1.19, building: 0.353, zone: 0.371,
  liftLevel: [1, 1, 1, 1, 1, 1, 0.178, 0.531, 0.183, 0.582] as number[],
  tier: [1, 1.36, 4.86, 7.66, 5.26, 8.42, 5.24, 4.84, 2.96, 3.99] as number[],
  area: [1, 0.402, 1.21, 1.17, 2.49] as number[],
};
