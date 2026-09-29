import { AREAS } from './areas';

export const WORLD = { w: 1200, h: 3200 };
/** Zoom is expressed relative to the "fit width" zoom. */
/** the camera starts this much closer than fit-width so the first screen shows big, readable lifts and guests */
export const START_ZOOM = 1.5;
export const ZOOM = { minFactor: 0.85, maxFactor: 3.2 };
export const PARKING_POS = { x: 180, y: 3070 };
export const LODGE_POS = { x: 1020, y: 3070 };
export const BUS_STOP = { x: 600, y: 3150 };
export const ROAD_START = { x: -40, y: 3150 };
export const ROAD_Y = 3150;

export interface Pt { x: number; y: number }

export function hub(areaIdx: number): Pt {
  return { x: 600, y: AREAS[areaIdx].band[1] - 30 };
}
export function slotBase(areaIdx: number, slot: number): Pt {
  const a = AREAS[areaIdx];
  const n = a.slots.length;
  return { x: (WORLD.w * (slot + 1)) / (n + 1), y: a.band[1] - 40 };
}
export function slotTop(areaIdx: number, slot: number): Pt {
  const a = AREAS[areaIdx];
  const b = slotBase(areaIdx, slot);
  return { x: b.x + (slot % 2 === 0 ? -60 : 60), y: a.band[0] + 40 };
}
