import { AREAS, areaIndex } from '../config/areas';
import { areaCost, areaOwned, buyArea, canBuyArea, nextArea } from '../core/game';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatMoney } from './format';
import { btn } from './util';

export function render(c: Ctx): string {
  const s = c.s;
  const next = nextArea(s);
  let html = '';
  for (const a of AREAS) {
    const owned = areaOwned(s, a.id);
    const isNext = next?.id === a.id;
    const status = owned ? 'Owned' : isNext ? 'Next' : 'Locked';
    const cls = owned ? 'owned' : isNext ? 'next' : 'locked';
    html += `<div class="card area ${cls}"><div class="row"><div class="ico">${owned ? icons.check : isNext ? icons.mountain : icons.lock}</div>
      <div class="grow"><div class="title">${a.name} <span class="badge ${cls}">${status}</span></div>
      <div class="sub">${a.slots.length} lift slots${a.slots[0].type === 'gondolaOnly' ? ' (gondolas only)' : ''} &middot; unlocks ${a.unlocks}</div></div>
      ${owned ? '' : `<div class="price">${formatMoney(areaCost(a.id))}</div>`}</div>
      ${isNext ? `<div class="btns">${btn({ act: 'area', a: a.id, label: `Buy ${a.name}`, cost: areaCost(a.id), money: s.money, pulse: c.tut === 'mountain' })}</div>` : ''}
      ${!owned && !isNext ? `<div class="lockline">${icons.lock}<span>Buy ${AREAS[areaIndex(a.id) - 1].name} first</span></div>` : ''}</div>`;
  }
  return html;
}

export function act(name: string, a: string, _b: string, c: Ctx) {
  if (name === 'area') return canBuyArea(c.s, a).ok ? buyArea(c.s, a) : canBuyArea(c.s, a);
  return undefined;
}
