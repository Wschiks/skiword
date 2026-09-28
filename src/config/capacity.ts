export const PARKING = { levelMax: 30, base: 8, perLevelTotal: 92, costBase: 25, costGrowth: 1.5 };
// capacity(L) = 8 + round(L * 92 / 30);   cost(L -> L+1) = 25 * 1.5^L
export const HOUSING = { levelMax: 20, base: 0, perLevelTotal: 50, costBase: 3000, costGrowth: 1.42, requiresArea: 'lower' };
// capacity(L) = round(L * 50 / 20);        cost(L -> L+1) = 3000 * 1.42^L
export const ARRIVAL_INTERVAL = 2.5;
export const LODGE_INTERVAL = 5;
export const HARD_CAP = 200;
