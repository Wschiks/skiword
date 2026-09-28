// UI autoplayer: the balance bot decides WHAT to buy, this script buys it through the real UI (tabs, sheets, picker, buttons)
// on a 390x844 screen and checks that the purchase really happened. Proves every purchase type is reachable.
import { startServer, openPage, wait } from './shotlib.mjs';

const MAX_STEPS = Number(process.argv[2] ?? 320);
const server = await startServer(5189);
const { browser, page, errors } = await openPage(server.url + '?new');
await wait(page, 1000);
let failed = 0;
const check = (n, ok, e = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`); if (!ok) failed++; };
const kinds = {};

const step = () => page.evaluate(() => {
  const c = window.__core, b = window.__bot, s = window.__app.state;
  b.claimAllQuests(s);
  const pl = b.plan(s);
  if (!pl) return { done: true };
  return { key: pl.p.key, kind: pl.p.kind, label: pl.p.label, cost: pl.p.cost, wait: pl.wait, money: s.money };
});
const snapshot = () => page.evaluate(() => { const s = window.__app.state; return JSON.stringify([Math.round(s.money * 100), s.lines.map(l => [l.id, l.tier, l.level]), s.parkingLevel, s.housingLevel, s.areasOwned, s.buildings, s.zones]); });

async function openTab(id) {
  const open = await page.evaluate(() => !document.getElementById('sheet').classList.contains('hidden') && document.getElementById('sheet-title').textContent);
  if (open && open.toLowerCase().startsWith(id.slice(0, 4))) return;
  await page.click('#tab-' + id); await wait(page, 120);
}
async function click(sel) {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: 'attached', timeout: 3000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  const vis = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('#sheet, #tabs'); }, [box.x + box.width / 2, box.y + box.height / 2]);
  if (!vis) throw new Error('button not visible/hittable: ' + sel);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await wait(page, 90);
}

async function buyViaUi(key) {
  const [k, ...rest] = key.split(':');
  const id = rest.join(':');
  if (k === 'lv') { await openTab('lifts'); await click(`[data-act="lvl"][data-a="${id}"]`); }
  else if (k === 'rb') { await openTab('lifts'); await click(`[data-act="rebuild"][data-a="${id}"]`); }
  else if (k === 'nl') { const [area, slot, tier] = id.split(':'); await openTab('lifts'); await click(`[data-act="pick"][data-a="${area}:${slot}"]`); await click(`[data-act="build"][data-a="${area}:${slot}"][data-b="${tier}"]`); }
  else if (k === 'area') { await openTab('mountain'); await click(`[data-act="area"][data-a="${id}"]`); }
  else if (k === 'park') { await openTab('people'); await click('[data-act="parking"]'); }
  else if (k === 'house') { await openTab('people'); await click('[data-act="housing"]'); }
  else if (k === 'b') { await openTab('buildings'); await click(`[data-act="bbuy"][data-a="${id}"]`); }
  else if (k === 'bu') { await openTab('buildings'); await click(`[data-act="bup"][data-a="${id}"]`); }
  else if (k === 'z') { await openTab('zones'); await click(`[data-act="zbuy"][data-a="${id}"]`); }
  else if (k === 'zu') { await openTab('zones'); await click(`[data-act="zup"][data-a="${id}"]`); }
  else if (k === 'zs') { await openTab('zones'); await click('[data-act="zstage"]'); }
  else throw new Error('unknown purchase key ' + key);
}

let steps = 0, ok = 0, lastFail = '';
while (steps < MAX_STEPS) {
  const p = await step();
  if (p.done) break;
  if (p.wait > 0) { await page.evaluate(w => window.__core.simulate(window.__app.state, Math.min(w + 1, 900)), p.wait); await wait(page, 120); continue; }
  steps++;
  const before = await snapshot();
  try { await buyViaUi(p.key); } catch (e) { failed++; lastFail = `${p.key}: ${String(e).slice(0, 140)}`; console.log('FAIL  UI purchase', lastFail); await page.evaluate(() => document.querySelector('[data-act="close"]')?.click()); continue; }
  const after = await snapshot();
  if (before === after) { failed++; lastFail = `${p.key}: state unchanged after click (${p.label}, money ${p.money.toFixed(0)}, cost ${p.cost.toFixed(0)})`; console.log('FAIL  no effect', lastFail); await page.evaluate(w => window.__core.simulate(window.__app.state, 5), 0); continue; }
  ok++; kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  if (steps % 40 === 0) { const st = await page.evaluate(() => { const s = window.__app.state; return { t: (s.rt.time / 3600).toFixed(2) + 'h', areas: s.areasOwned.length, lines: s.lines.length, maxTier: Math.max(...s.lines.map(l => l.tier)) }; }); console.log('progress', steps, JSON.stringify(st), JSON.stringify(kinds)); }
}
const end = await page.evaluate(() => { const s = window.__app.state; return { hours: (s.rt.time / 3600).toFixed(1), areas: s.areasOwned.length, lines: s.lines.length, maxTier: Math.max(...s.lines.map(l => l.tier)), buildings: Object.values(s.buildings).filter(x => x > 0).length, zones: Object.values(s.zones).filter(z => z.owned).length, quests: s.quests.claimedIds.length }; });
console.log('end state', JSON.stringify(end), JSON.stringify(kinds));
check(`${ok} purchases made through the real UI, all took effect`, failed === 0, lastFail);
const wanted = ['level', 'rebuild', 'newline', 'parking', 'housing', 'area', 'building', 'zone'];
check('UI covered purchase kinds: ' + Object.keys(kinds).join(', '), wanted.every(k => kinds[k] > 0), 'missing: ' + wanted.filter(k => !kinds[k]).join(','));
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); server.stop();
console.log(failed ? `\n${failed} FAILED` : '\nUI autoplay passed');
process.exit(failed ? 1 : 0);
