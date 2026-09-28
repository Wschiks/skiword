import { newGame, simulate, callSkiBus } from '../src/core/game';
import { runBot } from '../src/core/bot';

const s = newGame(21);
runBot(s, { mode: 'fast', maxSeconds: 80 * 3600 });
s.parkingLevel = 30; s.housingLevel = 20; s.gems = 1e6;
const t0 = Date.now();
let maxGuests = 0, maxEvents = 0, maxDep = 0, maxQueue = 0, maxAngry = 0;
for (let hour = 0; hour < 3; hour++) {
  for (let m = 0; m < 60; m++) {
    if (m % 3 === 0) { s.ads.busCooldownUntil = 0; s.ads.busCount = 0; callSkiBus(s, 'gems', Date.now()); }
    simulate(s, 60);
    maxGuests = Math.max(maxGuests, s.rt.guests.length);
    maxEvents = Math.max(maxEvents, s.rt.events.length);
    s.rt.events.length = 0;
    for (const l of s.lines) { maxDep = Math.max(maxDep, l.departures.length); maxQueue = Math.max(maxQueue, l.queue.length); }
    maxAngry = Math.max(maxAngry, s.stats.angryRecent.length);
    if (!Number.isFinite(s.money)) throw new Error('money not finite');
  }
}
const zoneOcc = Object.values(s.rt.zoneOcc);
console.log(JSON.stringify({ wallSec: (Date.now() - t0) / 1000, maxGuests, maxEvents, maxDep, maxQueue, maxAngry, guests: s.rt.guests.length, zoneOcc, money: s.money, rides: s.stats.ridesTotal, angryLeaves: s.stats.angryLeaves, served: s.stats.guestsServed }));
// consistency: queued guests are all in a queue, no guest in two queues, occupancy matches
const inQ = new Set<number>();
for (const l of s.lines) for (const g of l.queue) { if (inQ.has(g.id)) throw new Error('guest in two queues'); inQ.add(g.id); if (g.state !== 'queueing') throw new Error('non-queueing guest in queue ' + g.state); }
const queueing = s.rt.guests.filter(g => g.state === 'queueing').length;
if (queueing !== inQ.size) throw new Error(`queueing ${queueing} != queued ${inQ.size}`);
for (const [id, occ] of Object.entries(s.rt.zoneOcc)) {
  const n = s.rt.guests.filter(g => g.zoneId === id).length;
  if (n !== occ) throw new Error(`zone ${id} occupancy ${occ} != ${n}`);
}
console.log('invariants ok');
