import { APP_NAME, APP_VERSION, CREDITS, PRIVACY, PUBLISHER, TERMS } from '../config/legal';
import { canNewSeason, seasonPreview, seasonBonus } from '../core/game';
import type { Ctx } from './types';
import { icons } from './icons';
import { formatNum } from './format';

export const HELP = [
  ['Guests pay per ride', 'Every guest pays each time they board a lift, not once per visit. Upgrade lifts to earn more per ride and carry more people.'],
  ['Queues and patience', 'Guests wait about 50 seconds. Then they walk to their car angry and you lose those rides. Long queues mean your lifts are the bottleneck.'],
  ['People, lifts, terrain', 'Income is limited by how many guests you have (parking, housing, ski bus), how fast your lifts move them, and how much mountain you own.'],
  ['Rebuild lifts', 'A lift can be rebuilt into the next tier once it reaches level 3. The jumps from T-Bar to chairs and from chairs to gondolas need level 8.'],
  ['Passive income', 'Restaurants and bars earn on their own. Zones charge guests a fee each time they enter. Both grow with more guests.'],
  ['New Season', 'Own the whole mountain and start over for permanent bonus income (Season Points). Gems, quests and settings stay.'],
];

export function render(c: Ctx): string {
  const s = c.s;
  const can = canNewSeason(s);
  const pv = seasonPreview(s);
  let html = `<div class="card"><div class="title">Settings</div>
    <div class="toggle-row"><div>${s.settings.sound ? icons.sound : icons.soundOff}<span>Sound</span></div><button class="switch${s.settings.sound ? ' on' : ''}" data-act="sound" aria-label="Toggle sound"><i></i></button></div>
    <div class="toggle-row"><div>${icons.vibrate}<span>Haptics</span></div><button class="switch${s.settings.haptics ? ' on' : ''}" data-act="haptics" aria-label="Toggle haptics"><i></i></button></div></div>`;
  html += `<div class="card season"><div class="row"><div class="ico">${icons.season}</div><div class="grow"><div class="title">New Season</div>
    <div class="sub">Season ${s.season} &middot; ${s.seasonPoints} Season Points &middot; income x${seasonBonus(s).toFixed(2)}</div></div></div>`;
  if (can.ok) html += `<div class="sub pad">Start over now for <b>+${pv.gain}</b> Season Points (total ${pv.total}, income x${pv.bonus.toFixed(2)}).</div>
    <div class="btns"><button class="btn gold" data-act="season"><span class="btn-l">Start New Season</span></button></div>`;
  else html += `<div class="sub pad">${can.reason === 'areas' ? 'Own all 5 mountain areas to unlock.' : `Earn more: you would gain ${pv.gain} Season Points and need 5.`}</div>`;
  html += `</div>`;
  html += `<div class="group-h">Help</div>` + HELP.map(([t, b]) => `<div class="card slim help"><div class="title">${t}</div><div class="sub">${b}</div></div>`).join('');
  html += `<div class="group-h">About</div><div class="card"><div class="btns wrap">
    <button class="btn ghost" data-act="legal" data-a="terms"><span class="btn-l">Terms</span></button>
    <button class="btn ghost" data-act="legal" data-a="privacy"><span class="btn-l">Privacy</span></button>
    <button class="btn ghost" data-act="legal" data-a="credits"><span class="btn-l">Credits</span></button>
    <button class="btn ghost" data-act="restore"><span class="btn-l">Restore purchases</span></button></div></div>`;
  html += `<div class="card danger"><div class="row"><div class="ico">${icons.reset}</div><div class="grow"><div class="title">Reset save</div><div class="sub">Deletes all progress, gems and purchases record on this device.</div></div></div>
    <div class="btns"><button class="btn ${c.resetArmed ? 'danger-btn' : 'ghost'}" data-act="reset"><span class="btn-l">${c.resetArmed ? 'Tap again to erase everything' : 'Reset save'}</span></button></div></div>`;
  html += `<div class="foot">${APP_NAME} v${APP_VERSION} &middot; income ${formatNum(s.incomeEma)}/s</div>`;
  return html;
}

export function legalPage(kind: string): { title: string; body: string } {
  const pub = `<p><b>Publisher</b><br>${PUBLISHER.name}<br>${PUBLISHER.address}, ${PUBLISHER.country}<br>${PUBLISHER.email}<br>${PUBLISHER.website}</p>`;
  if (kind === 'terms') return { title: 'Terms of Use', body: `<ul>${TERMS.map(t => `<li>${t}</li>`).join('')}</ul>${pub}` };
  if (kind === 'privacy') return { title: 'Privacy', body: `<ul>${PRIVACY.map(t => `<li>${t}</li>`).join('')}</ul>${pub}` };
  return { title: 'Credits', body: `<ul>${CREDITS.map(t => `<li>${t}</li>`).join('')}</ul>` };
}
