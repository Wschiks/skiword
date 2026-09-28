import type { Count } from '../core/unlocks';
import { formatMoney } from './format';

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface Bulk { n: number; total: number }
/** How many levels a x1 / x10 / Max purchase buys and what it costs (Max = as many as affordable, at least 1). */
export function bulkInfo(level: number, max: number, mult: Count, money: number, cost: (L: number) => number): Bulk {
  if (level >= max) return { n: 0, total: 0 };
  let n = 0, total = 0;
  const limit = mult === 'max' ? max - level : Math.min(mult, max - level);
  for (let L = level; L < level + limit; L++) {
    const c = cost(L);
    if (mult === 'max' && total + c > money) break;
    total += c; n++;
  }
  if (n === 0) return { n: 1, total: cost(level) };
  return { n, total };
}

export function btn(o: { act: string; a?: string; b?: string; label: string; cost?: number; money: number; kind?: 'primary' | 'blue' | 'gold'; off?: boolean; pulse?: boolean; sub?: string }) {
  const afford = o.cost === undefined || o.money + 1e-9 >= o.cost;
  const off = o.off || !afford;
  const kind = o.kind ?? 'primary';
  return `<button class="btn ${kind}${off ? ' off' : ''}${o.pulse ? ' pulse' : ''}" data-act="${o.act}"${o.a !== undefined ? ` data-a="${esc(o.a)}"` : ''}${o.b !== undefined ? ` data-b="${esc(o.b)}"` : ''}${off ? ' data-off="1"' : ''}>
    <span class="btn-l">${o.label}</span>${o.cost !== undefined ? `<span class="btn-c">${formatMoney(o.cost)}</span>` : ''}${o.sub ? `<span class="btn-s">${o.sub}</span>` : ''}</button>`;
}

export const dots = (level: number, max = 10) =>
  `<div class="dots">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>`;

export const bar = (frac: number, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%"></i></div>`;
