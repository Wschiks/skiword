// Monkey test: random taps on UI buttons and the map, drags, pinches, tab switches, across early / mid / late game states.
// Fails on any console error, page error, non-finite state or broken invariant. usage: node scripts/monkey.mjs [actionsPerPhase]
import { startServer, openPage, wait } from './shotlib.mjs';

const N = Number(process.argv[2] ?? 250);
const server = await startServer(5190);
const { browser, page, errors } = await openPage(server.url + '?new&debug');
await wait(page, 1000);
let seed = 987654321;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let failed = 0;
const check = (n, ok, e = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`); if (!ok) failed++; };

const invariants = () => page.evaluate(() => {
  const s = window.__app.state; const bad = [];
  const fin = (k, v) => { if (!Number.isFinite(v)) bad.push(k); };
  fin('money', s.money); fin('gems', s.gems); fin('lifetime', s.lifetimeEarned); fin('ema', s.incomeEma);
  if (s.money < -1e-6) bad.push('negative money ' + s.money);
  if (s.rt.guests.length > 200) bad.push('guests > 200');
  if (s.parkingLevel > 30 || s.housingLevel > 20) bad.push('capacity level over max');
  for (const l of s.lines) { if (l.level > 10 || l.tier > 10 || l.level < 0) bad.push('line ' + l.id); if (l.queue.length > 66) bad.push('queue'); }
  const mv = window.__game.scene.getScene('map').mv;
  for (const k of ['zoom', 'cx', 'cy']) if (!Number.isFinite(mv[k])) bad.push('camera ' + k);
  return bad;
});

async function monkey(label, n) {
  let clicks = 0;
  for (let i = 0; i < n; i++) {
    const r = rnd();
    try {
      if (r < 0.62) {
        // click a random visible [data-act]
        const pos = await page.evaluate(seedR => {
          const els = [...document.querySelectorAll('[data-act]')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight && getComputedStyle(e).display !== 'none'; })
            .filter(e => !['reset'].includes(e.dataset.act));
          if (!els.length) return null;
          const e = els[Math.floor(seedR * els.length)]; const b = e.getBoundingClientRect();
          return { x: b.left + b.width / 2, y: b.top + b.height / 2, act: e.dataset.act };
        }, rnd());
        if (pos) { await page.mouse.click(pos.x, pos.y); clicks++; }
      } else if (r < 0.80) {
        await page.mouse.click(20 + rnd() * 350, 120 + rnd() * 600); // random map/UI tap
      } else if (r < 0.90) {
        const x = 60 + rnd() * 270, y = 200 + rnd() * 400;
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + (rnd() - 0.5) * 200, y + (rnd() - 0.5) * 300, { steps: 4 }); await page.mouse.up();
      } else if (r < 0.95) {
        await page.mouse.wheel(0, (rnd() - 0.5) * 800);
      } else {
        await page.evaluate(() => { const s = window.__app.state; s.gems += 20; s.money += Math.max(50, s.money * 0.5); });
      }
    } catch (e) { check(label + ' action threw', false, String(e).slice(0, 120)); return; }
    if (i % 20 === 0) await wait(page, 150);
    if (i % 50 === 0) { const bad = await invariants(); if (bad.length) { check(label + ' invariants', false, bad.join(', ')); return; } }
  }
  const bad = await invariants();
  check(`${label}: ${n} random actions (${clicks} button clicks), invariants hold`, bad.length === 0, bad.join(', '));
}

await monkey('early game', N);
await page.evaluate(() => { const c = window.__core, b = window.__bot; const s = c.newGame(31); window.__app.state = s; b.runBot(s, { mode: 'fast', maxSeconds: 3 * 3600 }); c.simulate(s, 200); });
await wait(page, 600);
await monkey('mid game', N);
await page.evaluate(() => { const c = window.__core, b = window.__bot; const s = c.newGame(32); window.__app.state = s; b.runBot(s, { mode: 'fast', maxSeconds: 50 * 3600 }); s.parkingLevel = 30; s.housingLevel = 20; c.simulate(s, 200); });
await wait(page, 600);
await monkey('late game', N);
await page.evaluate(() => { const c = window.__core, b = window.__bot; const s = c.newGame(33); window.__app.state = s; b.runBot(s, { mode: 'fast' }); c.simulate(s, 100); });
await wait(page, 600);
await monkey('everything maxed', Math.floor(N / 2));
check('no console errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); server.stop();
console.log(failed ? `\n${failed} FAILED` : '\nmonkey test passed');
process.exit(failed ? 1 : 0);
