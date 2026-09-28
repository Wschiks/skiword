import { activeQuests, isDone, questRewardCash } from '../core/game';
import type { GameState } from '../core/game';
import { condProgress } from '../core/quests';
import { icons } from './icons';
import { formatMoney, formatNum } from './format';
import { bar, esc } from './util';

export function renderQuests(s: GameState): string {
  const qs = activeQuests(s);
  if (!qs.length) return '<div class="qchip all-done"><div class="qname">All quests done</div></div>';
  return qs.map(q => {
    const done = isDone(s, q.id);
    const p = condProgress(s, q.cond);
    const rew = q.reward.t === 'gems' ? `${icons.gem}<b>${q.reward.n}</b>` : `${icons.coin}<b>${formatMoney(questRewardCash(s, q))}</b>`;
    return `<button class="qchip${done ? ' done' : ''}" data-act="claim" data-a="${q.id}" aria-label="${esc(q.name)}">
      <div class="qname">${esc(q.name)}</div>
      <div class="qdesc">${done ? 'Tap to collect' : esc(q.desc)}</div>
      ${bar(p.cur / p.target)}
      <div class="qrew">${done ? `${icons.check}<span>Collect</span>` : `<span class="qprog">${formatNum(Math.min(p.cur, p.target))}/${formatNum(p.target)}</span>`}<span class="qr">${rew}</span></div></button>`;
  }).join('');
}
