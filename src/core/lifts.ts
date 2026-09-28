import { areaIndex } from '../config/areas';
import { GUEST } from '../config/balance';
import { slotBase, slotTop } from '../config/layout';
import type { GameState, Guest, Line } from './state';
import { credit, incomeMult, lineCapacity, lineInterval, rideTime, ticketPrice } from './economy';

export const lineBase = (l: Line) => slotBase(areaIndex(l.areaId), l.slot);
export const lineTop = (l: Line) => slotTop(areaIndex(l.areaId), l.slot);

export function boardGuest(s: GameState, line: Line, g: Guest) {
  const pay = ticketPrice(line) * (g.home === 'lodge' ? GUEST.lodgeFactor : 1) * incomeMult(s);
  credit(s, pay, 'rides');
  line.earnAcc += pay;
  const b = lineBase(line);
  s.rt.events.push({ k: 'pay', x: b.x, y: b.y, amount: pay, src: 'ride' });
  g.state = 'riding';
  g.lineId = line.id;
  g.dur = g.timer = rideTime(line);
  g.waited = 0;
  g.zoneSinceRide = false;
}

export function lineTick(s: GameState, line: Line, dt: number) {
  const rt = s.rt;
  line.timer -= dt;
  if (line.queue.length > 0 && line.timer <= 0) {
    const n = Math.min(lineCapacity(line), line.queue.length);
    const boarded = line.queue.splice(0, n);
    for (const g of boarded) boardGuest(s, line, g);
    line.timer = lineInterval(line);
    line.departures.push({ t0: rt.time, n, rideTime: rideTime(line) });
    for (let i = 0; i < line.queue.length; i++) line.queue[i].qi = i;
  } else if (line.queue.length === 0) {
    line.timer = Math.max(line.timer, 0);
  }
  while (line.departures.length && rt.time - line.departures[0].t0 > 30) line.departures.shift();
  line.incomeRate += (line.earnAcc / dt - line.incomeRate) * Math.min(1, dt / 10);
  line.earnAcc = 0;
}
