import { HOUSING, PARKING } from '../config/capacity';
import { GUEST } from '../config/balance';
import type { Count } from '../core/unlocks';
import {
  areaOwned, buyHousingLevel, buyParkingLevel, housingCapacity, housingCapacityAt, housingCost, parkingCapacity, parkingCapacityAt, parkingCost,
} from '../core/game';
import { counts } from '../core/guests';
import type { Ctx } from './types';
import { icons } from './icons';
import { bar, btn, bulkInfo } from './util';
import { areaDef } from '../config/areas';

export function render(c: Ctx): string {
  const s = c.s;
  const cnt = counts(s);
  const mult = `<div class="mult">${['1', '10', 'max'].map(m => `<button class="chip${String(c.mult) === m ? ' on' : ''}" data-act="mult" data-a="${m}">${m === 'max' ? 'Max' : 'x' + m}</button>`).join('')}</div>`;
  const pb = bulkInfo(s.parkingLevel, PARKING.levelMax, c.mult, s.money, L => parkingCost(L));
  const pNext = parkingCapacityAt(Math.min(PARKING.levelMax, s.parkingLevel + pb.n));
  let html = mult;
  html += `<div class="card"><div class="row"><div class="ico">${icons.parking}</div><div class="grow"><div class="title">Parking</div>
    <div class="sub">Day visitors. Level ${s.parkingLevel}/${PARKING.levelMax}</div></div><div class="qbox">Cars<b>${cnt.day}/${parkingCapacity(s)}</b></div></div>
    ${bar(cnt.day / Math.max(1, parkingCapacity(s)))}
    <div class="stats"><div>Capacity now<b>${parkingCapacity(s)}</b></div><div>After buying<b>${s.parkingLevel >= PARKING.levelMax ? 'max' : pNext}</b></div></div>
    <div class="btns">${s.parkingLevel >= PARKING.levelMax ? '<div class="maxed">Max parking</div>' : btn({ act: 'parking', label: `More parking${pb.n > 1 ? ` +${pb.n}` : ''}`, cost: pb.total, money: s.money, pulse: c.tut === 'parking' })}</div></div>`;
  const unlocked = areaOwned(s, HOUSING.requiresArea);
  const hb = bulkInfo(s.housingLevel, HOUSING.levelMax, c.mult, s.money, L => housingCost(L));
  const hNext = housingCapacityAt(Math.min(HOUSING.levelMax, s.housingLevel + hb.n));
  html += `<div class="card${unlocked ? '' : ' locked'}"><div class="row"><div class="ico">${icons.bed}</div><div class="grow"><div class="title">Housing</div>
    <div class="sub">Overnight guests stay ${GUEST.lodgeSessions} sessions and pay ${GUEST.lodgeFactor}x. Level ${s.housingLevel}/${HOUSING.levelMax}</div></div><div class="qbox">Beds<b>${cnt.lodge}/${housingCapacity(s)}</b></div></div>
    ${unlocked ? `${bar(cnt.lodge / Math.max(1, housingCapacity(s)))}
    <div class="stats"><div>Beds now<b>${housingCapacity(s)}</b></div><div>After buying<b>${s.housingLevel >= HOUSING.levelMax ? 'max' : hNext}</b></div></div>
    <div class="btns">${s.housingLevel >= HOUSING.levelMax ? '<div class="maxed">Max housing</div>' : btn({ act: 'housing', label: `More beds${hb.n > 1 ? ` +${hb.n}` : ''}`, cost: hb.total, money: s.money })}</div>`
    : `<div class="lockline">${icons.lock}<span>Needs ${areaDef(HOUSING.requiresArea).name}</span></div>`}</div>`;
  html += `<div class="note">Total guests now: <b>${s.rt.guests.length}</b> (limit 200). Buying capacity faster than lifts makes queues grow and guests leave angry.</div>`;
  return html;
}

export function act(name: string, _a: string, _b: string, c: Ctx) {
  if (name === 'parking') return buyParkingLevel(c.s, c.mult as Count);
  if (name === 'housing') return buyHousingLevel(c.s, c.mult as Count);
  return undefined;
}
