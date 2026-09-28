import { BUS, GEMS } from '../config/balance';
import { PRODUCTS } from '../config/shop';
import { busStatus, cashBundleAmount } from '../core/game';
import { purchases } from '../purchases';
import { ads } from '../ads';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatMoney, formatTime } from './format';
import { esc } from './util';

const pbtn = (act: string, label: string, sub: string, off: boolean, kind = 'primary', a = '') =>
  `<button class="btn ${kind}${off ? ' off' : ''}" data-act="${act}"${a ? ` data-a="${esc(a)}"` : ''}${off ? ' data-off="1"' : ''}><span class="btn-l">${label}</span><span class="btn-c">${sub}</span></button>`;

export function render(c: Ctx): string {
  const s = c.s;
  const bus = busStatus(s, c.now);
  const cd = bus.cooldown > 0 ? `Ready in ${formatTime(bus.cooldown)}` : bus.left <= 0 ? 'Back tomorrow' : 'Ready';
  let html = `<div class="card"><div class="row"><div class="ico">${icons.bus}</div><div class="grow"><div class="title">Ski Bus</div>
    <div class="sub">+${BUS.size} guests now, they ignore the parking limit and leave after their session</div></div>
    <div class="qbox">Today<b>${bus.used}/${BUS.maxPerDay}</b></div></div>
    <div class="sub pad">${cd}</div>
    <div class="btns">${pbtn('busad', `${icons.play} Watch ad`, ads.isReady() ? 'Free' : 'Loading', !bus.available || !ads.isReady(), 'primary')}
    ${pbtn('busgems', `${icons.gem} Use gems`, `${BUS.gemCost}`, !bus.available || s.gems < BUS.gemCost, 'blue')}</div></div>`;
  html += `<div class="card"><div class="row"><div class="ico">${icons.coin}</div><div class="grow"><div class="title">Cash bundle</div>
    <div class="sub">${GEMS.cashBundleMinutes} minutes of your current income: <b>${formatMoney(cashBundleAmount(s))}</b></div></div></div>
    <div class="btns">${pbtn('cash', `${icons.gem} Buy cash`, `${GEMS.cashBundleCost}`, s.gems < GEMS.cashBundleCost, 'gold')}</div></div>`;
  html += `<div class="group-h">Gems<span class="muted"> you have ${s.gems}</span></div>`;
  for (const p of PRODUCTS.filter(x => x.kind === 'consumable')) {
    html += `<div class="card slim"><div class="row"><div class="ico">${icons.gem}</div><div class="grow"><div class="title">${p.name}</div><div class="sub">${p.desc}</div></div>
      ${pbtn('product', 'Buy', purchases.priceOf(p.id), false, 'blue', p.id)}</div></div>`;
  }
  const dbl = PRODUCTS.find(x => x.id === 'income_x2')!;
  html += `<div class="card slim"><div class="row"><div class="ico">${icons.star}</div><div class="grow"><div class="title">${dbl.name}</div><div class="sub">${dbl.desc}, forever</div></div>
    ${s.purchases.incomeX2 ? '<div class="badge owned">Owned</div>' : pbtn('product', 'Buy', purchases.priceOf(dbl.id), false, 'gold', dbl.id)}</div></div>`;
  html += `<div class="btns pad"><button class="btn ghost" data-act="restore"><span class="btn-l">Restore purchases</span></button></div>`;
  return html;
}
