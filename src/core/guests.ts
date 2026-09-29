import { AREAS, areaIndex } from '../config/areas';
import { ARRIVAL_INTERVAL, HARD_CAP, LODGE_INTERVAL } from '../config/capacity';
import { BUILDINGS } from '../config/facilities';
import { ZONES } from '../config/zones';
import { BUS, GUEST, WALK } from '../config/balance';
import { BUS_STOP, LODGE_POS, PARKING_POS, ROAD_START, hub } from '../config/layout';
import type { Pt } from '../config/layout';
import type { GameState, Guest, GuestHome, GuestState, Line } from './state';
import {
  credit, housingCapacity, incomeMult, lineCapacity, lineInterval, parkingCapacity, queueCap,
  rideTime, skiTime, zoneCapacity, zoneFee, zonePref,
} from './economy';
import { lineBase, lineTop } from './lifts';

// ---------- rng ----------
export function rnd(s: GameState): number {
  let t = (s.rt.seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rndInt = (s: GameState, lo: number, hi: number) => lo + Math.floor(rnd(s) * (hi - lo + 1));

// ---------- helpers ----------
const homeWalk = (area: number) => WALK.homeBase + WALK.homePerArea * area;
const hubWalk = (a: number, b: number) => WALK.hubStep * Math.abs(a - b);
/** each guest lands on their own spot around the hub so skiers fan out instead of stacking in one column */
const hubSpot = (g: Guest, area: number): Pt => { const h = hub(area); return { x: h.x + ((g.id * 37) % 200) - 100, y: h.y + ((g.id * 53) % 22) - 4 }; };
const homePos = (g: Guest): Pt => (g.home === 'day' ? PARKING_POS : g.home === 'bus' ? BUS_STOP : LODGE_POS);

function move(g: Guest, to: Pt, dur: number, state: GuestState) {
  g.from = { x: g.x, y: g.y };
  g.to = to;
  g.dur = g.timer = Math.max(0.01, dur);
  g.state = state;
}
function settle(g: Guest) { g.x = g.to.x; g.y = g.to.y; }

export function makeGuest(s: GameState, home: GuestHome, at: Pt, kind?: 'ski' | 'board'): Guest {
  const rt = s.rt;
  const k = kind ?? (rnd(s) < 0.5 ? 'ski' : 'board');
  const rides = home === 'day' ? rndInt(s, GUEST.dayRides[0], GUEST.dayRides[1])
    : home === 'bus' ? GUEST.busRides : rndInt(s, GUEST.lodgeRides[0], GUEST.lodgeRides[1]);
  const g: Guest = {
    id: rt.nextId++, kind: k, home, state: 'arriving', area: 0,
    timer: WALK.arrive, dur: WALK.arrive, waited: 0,
    patience: GUEST.patience * (1 - GUEST.patienceJitter + rnd(s) * 2 * GUEST.patienceJitter),
    ridesDone: 0, ridesTarget: rides, sessionsLeft: home === 'lodge' ? GUEST.lodgeSessions : 0,
    zoneSinceRide: false, angry: false,
    x: at.x, y: at.y, from: { ...at }, to: { x: 0, y: 0 }, qi: 0, color: rndInt(s, 0, 5), retry: 0, done: false,
  };
  g.to = hubSpot(g, 0);
  rt.guests.push(g);
  return g;
}

export function counts(s: GameState) {
  let day = 0, lodge = 0, bus = 0;
  for (const g of s.rt.guests) { if (g.home === 'day') day++; else if (g.home === 'lodge') lodge++; else bus++; }
  return { day, lodge, bus };
}

// ---------- spawning ----------
export function spawnArrivals(s: GameState, dt: number) {
  const rt = s.rt;
  rt.arrivalTimer -= dt;
  if (rt.arrivalTimer <= 0) {
    rt.arrivalTimer = ARRIVAL_INTERVAL;
    const c = counts(s);
    if (c.day < parkingCapacity(s) && rt.guests.length < HARD_CAP) makeGuest(s, 'day', ROAD_START);
  }
  rt.lodgeTimer -= dt;
  if (rt.lodgeTimer <= 0) {
    rt.lodgeTimer = LODGE_INTERVAL;
    const c = counts(s);
    if (c.lodge < housingCapacity(s) && rt.guests.length < HARD_CAP) makeGuest(s, 'lodge', LODGE_POS);
  }
  if (rt.respawn) {
    const r = rt.respawn;
    r.timer -= dt;
    while (r.timer <= 0 && r.remaining > 0) {
      r.timer += r.every; r.remaining--;
      const c = counts(s);
      if (c.day < parkingCapacity(s) && rt.guests.length < HARD_CAP) makeGuest(s, 'day', ROAD_START);
    }
    if (r.remaining <= 0) rt.respawn = null;
  }
  if (rt.busPending) {
    const b = rt.busPending;
    b.timer -= dt;
    const every = BUS.spawnOver / BUS.size;
    while (b.timer <= 0 && b.remaining > 0) {
      b.timer += every; b.remaining--;
      if (rt.guests.length < HARD_CAP) {
        const kind = b.remaining % 2 === 0 ? 'ski' : 'board';
        makeGuest(s, 'bus', BUS_STOP, kind);
      }
    }
    if (b.remaining <= 0) rt.busPending = null;
  }
}

// ---------- lift choice ----------
export function chooseLine(s: GameState, g: Guest): Line | null {
  let best: Line | null = null, bestScore = Infinity;
  for (const l of s.lines) {
    if (l.queue.length >= queueCap(l)) continue;
    const wait = Math.ceil((l.queue.length + 1) / lineCapacity(l)) * lineInterval(l);
    const score = wait + hubWalk(g.area, areaIndex(l.areaId)) + rnd(s) * GUEST.liftScoreJitter;
    if (score < bestScore) { bestScore = score; best = l; }
  }
  return best;
}

function pickLift(s: GameState, g: Guest) {
  const line = chooseLine(s, g);
  if (!line) {
    g.from = { x: g.x, y: g.y };
    g.state = 'lobby';
    g.retry = 1;
    g.to = hub(g.area);
    return;
  }
  g.lineId = line.id;
  move(g, lineBase(line), hubWalk(g.area, areaIndex(line.areaId)) + WALK.toLift, 'walkingToLift');
}

function startLeaving(s: GameState, g: Guest, angry: boolean) {
  g.angry = angry;
  move(g, homePos(g), homeWalk(g.area), 'leaving');
  if (angry) {
    s.stats.angryLeaves++;
    s.stats.angryRecent.push(s.rt.time);
    if (s.stats.angryRecent.length > 30) s.stats.angryRecent.shift();
    s.rt.events.push({ k: 'angry', x: g.x, y: g.y });
  } else {
    s.stats.guestsServed++;
  }
}

function nearestBuilding(s: GameState, g: Guest): Pt | null {
  const h = hub(g.area);
  let best: Pt | null = null, bd = Infinity;
  for (const b of BUILDINGS) {
    if ((s.buildings[b.id] || 0) <= 0) continue;
    const d = Math.abs(b.pos.y - h.y);
    if (d < bd) { bd = d; best = b.pos; }
  }
  return best;
}

function choose(s: GameState, g: Guest) {
  // 1. finished session?
  if (g.ridesDone >= g.ridesTarget) {
    if (g.home === 'lodge') {
      g.sessionsLeft--;
      if (g.sessionsLeft > 0) {
        move(g, LODGE_POS, homeWalk(g.area), 'returning');
      } else startLeaving(s, g, false);
    } else startLeaving(s, g, false);
    return;
  }
  // 2. zone roll
  if (!g.zoneSinceRide) {
    let r = rnd(s);
    for (const z of ZONES) {
      const zs = s.zones[z.id];
      if (!zs?.owned) continue;
      if ((s.rt.zoneOcc[z.id] || 0) >= zoneCapacity(s, z.id)) continue;
      const p = z.baseP * zonePref(z.id, g.kind);
      if (r < p) {
        s.rt.zoneOcc[z.id] = (s.rt.zoneOcc[z.id] || 0) + 1;
        g.zoneId = z.id;
        g.zoneSinceRide = true;
        move(g, z.pos, WALK.toZone, 'walkingToZone');
        return;
      }
      r -= p;
    }
  }
  // 3. cosmetic eating
  if (rnd(s) < GUEST.eatChance) {
    const bp = nearestBuilding(s, g);
    if (bp) {
      g.from = { x: g.x, y: g.y };
      g.to = bp;
      g.dur = g.timer = GUEST.eatTime;
      g.state = 'eating';
      return;
    }
  }
  // 4. next lift
  pickLift(s, g);
}

function leaveQueue(line: Line | undefined, g: Guest) {
  if (!line) return;
  const i = line.queue.indexOf(g);
  if (i >= 0) {
    line.queue.splice(i, 1);
    for (let k = i; k < line.queue.length; k++) line.queue[k].qi = k;
  }
}

export function guestTick(s: GameState, g: Guest, dt: number) {
  const rt = s.rt;
  switch (g.state) {
    case 'arriving':
      g.timer -= dt;
      if (g.timer <= 0) { g.x = g.to.x; g.y = g.to.y; g.area = 0; pickLift(s, g); }
      break;
    case 'walkingToLift': {
      g.timer -= dt;
      if (g.timer <= 0) {
        settle(g);
        const line = s.lines.find(l => l.id === g.lineId);
        if (line && line.queue.length < queueCap(line)) {
          line.queue.push(g);
          g.qi = line.queue.length - 1;
          g.state = 'queueing';
        } else {
          g.area = line ? areaIndex(line.areaId) : g.area;
          pickLift(s, g);
        }
      }
      break;
    }
    case 'lobby':
      g.waited += dt;
      if (g.waited > g.patience) { startLeaving(s, g, true); break; }
      g.retry -= dt;
      if (g.retry <= 0) { g.retry = 1; pickLift(s, g); if (g.state === 'lobby') g.retry = 1; }
      break;
    case 'queueing': {
      g.waited += dt;
      if (g.waited > g.patience) {
        leaveQueue(s.lines.find(l => l.id === g.lineId), g);
        startLeaving(s, g, true);
      }
      break;
    }
    case 'riding': {
      g.timer -= dt;
      if (g.timer <= 0) {
        const line = s.lines.find(l => l.id === g.lineId)!;
        const a = areaIndex(line.areaId);
        g.area = a;
        g.ridesDone++;
        s.stats.ridesTotal++;
        g.x = lineTop(line).x; g.y = lineTop(line).y;
        move(g, hubSpot(g, a), skiTime(a) * (GUEST.skiJitter[0] + rnd(s) * (GUEST.skiJitter[1] - GUEST.skiJitter[0])), 'skiing');
      }
      break;
    }
    case 'skiing':
      g.timer -= dt;
      if (g.timer <= 0) { settle(g); choose(s, g); }
      break;
    case 'walkingToZone':
      g.timer -= dt;
      if (g.timer <= 0) {
        settle(g);
        const zid = g.zoneId!;
        const zdef = ZONES.find(z => z.id === zid)!;
        const fee = zoneFee(s, zid) * incomeMult(s);
        credit(s, fee, 'zones');
        rt.events.push({ k: 'pay', x: g.x, y: g.y, amount: fee, src: 'zone' });
        g.dur = g.timer = zdef.stay;
        g.state = 'inZone';
      }
      break;
    case 'inZone':
      g.timer -= dt;
      if (g.timer <= 0) {
        rt.zoneOcc[g.zoneId!] = Math.max(0, (rt.zoneOcc[g.zoneId!] || 1) - 1);
        g.zoneId = undefined;
        choose(s, g);
      }
      break;
    case 'eating':
      g.timer -= dt;
      if (g.timer <= 0) pickLift(s, g);
      break;
    case 'returning':
      g.timer -= dt;
      if (g.timer <= 0) { settle(g); g.state = 'resting'; g.dur = g.timer = GUEST.restTime; }
      break;
    case 'resting':
      g.timer -= dt;
      if (g.timer <= 0) {
        g.ridesDone = 0;
        g.ridesTarget = rndInt(s, GUEST.lodgeRides[0], GUEST.lodgeRides[1]);
        g.zoneSinceRide = false;
        g.area = 0;
        move(g, hubSpot(g, 0), WALK.arrive, 'arriving');
      }
      break;
    case 'leaving':
      g.timer -= dt;
      if (g.timer <= 0) { g.done = true; rt.needRemove = true; }
      break;
    default:
      break;
  }
}

export function removeFinished(s: GameState) {
  const rt = s.rt;
  if (!rt.needRemove) return;
  rt.guests = rt.guests.filter(g => !g.done);
  rt.needRemove = false;
}

export function areaOfHubY(y: number) { return AREAS.findIndex(a => Math.abs(a.band[1] - 30 - y) < 1); }
export { rideTime };
