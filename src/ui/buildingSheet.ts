import { BUILDINGS, BUILDING_LEVEL_MAX } from '../config/facilities';
import { areaDef } from '../config/areas';
import type { Count } from '../core/unlocks';
import { areaOwned, buildingCost, buildingIncomeRate, buildingUpgradeCost, buyBuilding, incomeMult, maxPop, upgradeBuilding } from '../core/game';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatRate } from './format';
import { btn, bulkInfo, dots } from './util';

export function render(c: Ctx): string {
  const s = c.s;
  const pop = s.rt.guests.length, mp = maxPop(s), mult = incomeMult(s);
  let html = `<div class="mult">${['1', '10', 'max'].map(m => `<button class="chip${String(c.mult) === m ? ' on' : ''}" data-act="mult" data-a="${m}">${m === 'max' ? 'Max' : 'x' + m}</button>`).join('')}</div>
    <div class="note">Restaurants and bars earn on their own. More guests on the mountain means more income.</div>`;
  for (const b of BUILDINGS) {
    const L = s.buildings[b.id] || 0;
    const unlocked = areaOwned(s, b.requiresArea);
    html += `<div class="card${unlocked ? '' : ' locked'}"><div class="row"><div class="ico">${icons.building}</div><div class="grow"><div class="title">${b.name}</div>
      <div class="sub">${L > 0 ? `Level ${L}/${BUILDING_LEVEL_MAX} &middot; <b>${formatRate(buildingIncomeRate(s, b.id, pop, mp) * mult)}</b>` : `Base ${formatRate(b.baseIncome * mult)}${b.lodgeBonus ? ' &middot; boosted by housing' : ''}`}</div></div></div>`;
    if (!unlocked) html += `<div class="lockline">${icons.lock}<span>Needs ${areaDef(b.requiresArea).name}</span></div>`;
    else if (L === 0) html += `<div class="btns">${btn({ act: 'bbuy', a: b.id, label: 'Build', cost: buildingCost(b.id), money: s.money })}</div>`;
    else {
      const bi = bulkInfo(L, BUILDING_LEVEL_MAX, c.mult, s.money, l => buildingUpgradeCost(b.id, l));
      html += dots(L) + `<div class="btns">${L >= BUILDING_LEVEL_MAX ? '<div class="maxed">Max level</div>' : btn({ act: 'bup', a: b.id, label: `Upgrade${bi.n > 1 ? ` +${bi.n}` : ''}`, cost: bi.total, money: s.money })}</div>`;
    }
    html += `</div>`;
  }
  return html;
}

export function act(name: string, a: string, _b: string, c: Ctx) {
  if (name === 'bbuy') return buyBuilding(c.s, a);
  if (name === 'bup') return upgradeBuilding(c.s, a, c.mult as Count);
  return undefined;
}
