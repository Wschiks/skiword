import { AREAS, areaDef } from '../config/areas';
import { LEVEL_MAX, LIFT_TIERS, MAX_TIER, REQ_LEVEL_GATE } from '../config/lifts';
import type { Count } from '../core/unlocks';
import {
  buildLine, buyLiftLevel, rebuildLine, rebuildRequirement, tierDef, tierBuildCost, levelUpgradeCost, newLineCost, lineInterval,
  ticketPrice, lineCapacity, queueCap, areaOwned, canBuildLine,
} from '../core/game';
import { GATE_TIERS } from '../config/lifts';
import { HINT } from '../config/balance';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatMoney, formatRate } from './format';
import { bar, bulkInfo, btn, dots } from './util';

const famIcon = (tier: number) => { const f = tierDef(tier).family; return f === 'gondola' ? icons.cabin : f === 'chair' ? icons.chair : icons.drag; };

export function render(c: Ctx): string {
  const s = c.s;
  let html = `<div class="mult">${['1', '10', 'max'].map(m => `<button class="chip${String(c.mult) === m ? ' on' : ''}" data-act="mult" data-a="${m}">${m === 'max' ? 'Max' : 'x' + m}</button>`).join('')}</div>`;
  for (const a of AREAS) {
    if (!areaOwned(s, a.id)) continue;
    const lines = s.lines.filter(l => l.areaId === a.id).sort((x, y) => x.slot - y.slot);
    html += `<div class="group-h">${a.name}<span class="muted"> ${lines.length}/${a.slots.length} lifts</span></div>`;
    a.slots.forEach((slot, i) => {
      const l = lines.find(x => x.slot === i);
      if (!l) { html += emptySlot(c, a.id, i); return; }
      const tdef = tierDef(l.tier);
      const req = rebuildRequirement(l.tier);
      const gate = GATE_TIERS.includes(l.tier);
      const b = bulkInfo(l.level, LEVEL_MAX, c.mult, s.money, L => levelUpgradeCost(l.tier, L));
      const canReb = l.tier < MAX_TIER && l.level >= req;
      const next = l.tier < MAX_TIER ? tierDef(l.tier + 1) : null;
      html += `<div class="card line" id="line-${l.id}">
        <div class="row"><div class="ico tier-${tdef.family}">${famIcon(l.tier)}</div>
          <div class="grow"><div class="title">${tdef.name} <span class="muted">Tier ${l.tier}</span></div>
          <div class="sub">Level ${l.level}/${LEVEL_MAX} &middot; <b>${formatRate(l.incomeRate)}</b></div></div>
          <div class="qbox ${l.queue.length / queueCap(l) > HINT.queueFill ? 'hot' : ''}">Queue<b>${l.queue.length}/${queueCap(l)}</b></div></div>
        ${dots(l.level)}
        <div class="stats"><div>People / ride<b>${lineCapacity(l)}</b></div><div>Every<b>${lineInterval(l).toFixed(2)}s</b></div><div>Per ride<b>${formatMoney(ticketPrice(l))}</b></div></div>
        <div class="btns">
          ${l.level >= LEVEL_MAX ? `<div class="maxed">Max level</div>` : btn({ act: 'lvl', a: l.id, label: `Upgrade${b.n > 1 ? ` +${b.n}` : ''}`, cost: b.total, money: s.money, pulse: c.tut === 'upgrade' && l === s.lines[0] })}
          ${next ? btn({ act: 'rebuild', a: l.id, label: `Rebuild: ${next.name}`, cost: tierBuildCost(l.tier + 1), money: s.money, kind: 'blue', off: !canReb, pulse: c.tut === 'rebuild' && canReb }) : ''}
        </div>
        ${next && !canReb ? `<div class="lockline">${icons.lock}<span>Needs level ${req}${gate ? ' (gate: bigger jump)' : ''} to rebuild</span></div>${bar(l.level / req)}` : ''}
      </div>`;
    });
  }
  return html;
}

function emptySlot(c: Ctx, areaId: string, slot: number): string {
  const s = c.s;
  const def = areaDef(areaId).slots[slot];
  const key = `${areaId}:${slot}`;
  const open = c.picker === key;
  let html = `<div class="card slot"><div class="row"><div class="ico dim">${icons.lift}</div><div class="grow"><div class="title">Empty slope</div>
    <div class="sub">${def.type === 'gondolaOnly' ? 'Gondolas only' : 'Any lift'} &middot; slot fee ${formatMoney(def.cost * (newLineCost(areaId, slot, 1) - tierBuildCost(1)) / Math.max(1, def.cost))}</div></div>
    <button class="btn blue" data-act="pick" data-a="${key}"><span class="btn-l">${open ? 'Close' : 'Build'}</span></button></div>`;
  if (open) {
    html += `<div class="picker">`;
    let any = false;
    for (const t of LIFT_TIERS) {
      if (t.tier > s.unlockedTier) break;
      if (def.type === 'gondolaOnly' && t.family !== 'gondola') continue;
      any = true;
      const cost = newLineCost(areaId, slot, t.tier);
      html += `<div class="pick-row"><div class="grow"><b>${t.name}</b><span class="muted"> ${t.capacity}/ride &middot; ${formatMoney(t.price)}</span></div>${btn({ act: 'build', a: key, b: String(t.tier), label: 'Build', cost, money: s.money, off: !canBuildLine(s, areaId, slot, t.tier).ok && s.money >= cost })}</div>`;
    }
    if (!any) html += `<div class="muted pad">Unlock gondolas first: rebuild a top chair lift at level ${REQ_LEVEL_GATE}, then rebuild it into a gondola.</div>`;
    html += `</div>`;
  }
  return html + `</div>`;
}

export function act(name: string, a: string, b: string, c: Ctx) {
  const s = c.s;
  switch (name) {
    case 'lvl': return buyLiftLevel(s, a, c.mult as Count);
    case 'rebuild': return rebuildLine(s, a);
    case 'build': { const [area, slot] = a.split(':'); const r = buildLine(s, area, Number(slot), Number(b)); if (r.ok) c.picker = null; return r; }
    case 'pick': c.picker = c.picker === a ? null : a; return { ok: true as const, silent: true };
  }
  return undefined;
}
