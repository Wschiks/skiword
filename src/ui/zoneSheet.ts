import { ZONES, ZONE_LEVEL_MAX, PARK_STAGE_REQ_LEVEL } from '../config/zones';
import { areaDef } from '../config/areas';
import type { Count } from '../core/unlocks';
import {
  areaOwned, buyZone, canNextParkStage, nextParkStage, upgradeZone, zoneBuyCost, zoneCapacity, zoneFee, zoneUpgradeCost,
} from '../core/game';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatMoney } from './format';
import { btn, bulkInfo, dots } from './util';

export function render(c: Ctx): string {
  const s = c.s;
  let html = `<div class="mult">${['1', '10', 'max'].map(m => `<button class="chip${String(c.mult) === m ? ' on' : ''}" data-act="mult" data-a="${m}">${m === 'max' ? 'Max' : 'x' + m}</button>`).join('')}</div>
    <div class="note">Guests pay a fee every time they enter a zone. Snowboarders love the Terrain Park, skiers love the Slalom.</div>`;
  for (const z of ZONES) {
    const zs = s.zones[z.id];
    const unlocked = areaOwned(s, z.requiresArea);
    const name = z.stages && zs.owned ? z.stages[zs.stage].name : z.name;
    html += `<div class="card${unlocked ? '' : ' locked'}"><div class="row"><div class="ico">${icons.flag}</div><div class="grow"><div class="title">${z.name}${z.stages && zs.owned ? `<span class="muted"> ${name}</span>` : ''}</div>
      <div class="sub">${zs.owned ? `Level ${zs.level}/${ZONE_LEVEL_MAX} &middot; fee <b>${formatMoney(zoneFee(s, z.id))}</b> &middot; fits ${zoneCapacity(s, z.id)} &middot; stay ${z.stay}s`
        : `Fee ${formatMoney(z.stages ? z.stages[0].fee : z.fee)} &middot; fits ${z.stages ? z.stages[0].capacity : z.capacity} &middot; stay ${z.stay}s`}</div></div></div>`;
    if (z.stages) {
      html += `<div class="stages">${z.stages.map((st, i) => `<div class="stage${zs.owned && zs.stage === i ? ' on' : zs.owned && zs.stage > i ? ' done' : ''}"><b>${i + 1}</b><span>${st.name}</span><em>${formatMoney(st.fee)}</em></div>`).join('')}</div>`;
    }
    if (!unlocked) html += `<div class="lockline">${icons.lock}<span>Needs ${areaDef(z.requiresArea).name}</span></div>`;
    else if (!zs.owned) html += `<div class="btns">${btn({ act: 'zbuy', a: z.id, label: z.stages ? 'Build stage 1' : 'Open', cost: zoneBuyCost(z.id, 0), money: s.money })}</div>`;
    else {
      const bi = bulkInfo(zs.level, ZONE_LEVEL_MAX, c.mult, s.money, l => zoneUpgradeCost(s, z.id, l));
      html += dots(zs.level) + `<div class="btns">${zs.level >= ZONE_LEVEL_MAX ? '<div class="maxed">Max level</div>' : btn({ act: 'zup', a: z.id, label: `Upgrade${bi.n > 1 ? ` +${bi.n}` : ''}`, cost: bi.total, money: s.money })}`;
      if (z.stages && zs.stage < z.stages.length - 1) {
        const ok = canNextParkStage(s);
        html += btn({ act: 'zstage', label: `Next stage: ${z.stages[zs.stage + 1].name}`, cost: zoneBuyCost(z.id, zs.stage + 1), money: s.money, kind: 'blue', off: !ok.ok && (ok.reason === 'level') });
      }
      html += `</div>`;
      if (z.stages && zs.stage < z.stages.length - 1 && zs.level < PARK_STAGE_REQ_LEVEL) html += `<div class="lockline">${icons.lock}<span>Next stage needs level ${PARK_STAGE_REQ_LEVEL}</span></div>`;
    }
    html += `</div>`;
  }
  return html;
}

export function act(name: string, a: string, _b: string, c: Ctx) {
  if (name === 'zbuy') return buyZone(c.s, a);
  if (name === 'zup') return upgradeZone(c.s, a, c.mult as Count);
  if (name === 'zstage') return nextParkStage(c.s);
  return undefined;
}
