// Playwright flow test: save/load, offline dialog, quests, ski bus, shop, prestige.
import { startServer, openPage, wait } from './shotlib.mjs';

const server = await startServer(5197);
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; };
const st = (page, fn) => page.evaluate(fn);
try {
  let { browser, page, errors } = await openPage(server.url + '?new');
  await wait(page, 1200);

  // ---- persistence
  await st(page, () => { const s = window.__app.state; s.money = 500; s.gems = 40; window.__core.buyLiftLevel(s, 'bunny:0', 3); window.__core.buyParkingLevel(s, 2); });
  await st(page, () => window.dispatchEvent(new Event('pagehide')));
  const before = await st(page, () => ({ lvl: window.__app.state.lines[0].level, park: window.__app.state.parkingLevel, gems: window.__app.state.gems }));
  await page.goto(server.url); // no ?new -> loads the save
  await page.waitForFunction(() => window.__game?.scene.getScene('map')?.mv, null, { timeout: 30000 });
  await wait(page, 800);
  const after = await st(page, () => ({ lvl: window.__app.state.lines[0].level, park: window.__app.state.parkingLevel, gems: window.__app.state.gems }));
  check('progress persists across reload', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));

  // ---- offline earnings dialog
  // the old page rewrites the save on pagehide, so edit the save with an init script that runs before the new page's code
  await page.addInitScript(() => {
    if (sessionStorage.getItem('offlineTest')) {
      sessionStorage.removeItem('offlineTest');
      const raw = JSON.parse(localStorage.getItem('skitycoon.save.v1'));
      raw.lastSeen = Date.now() - 2 * 3600 * 1000; raw.incomeEma = 20;
      localStorage.setItem('skitycoon.save.v1', JSON.stringify(raw));
    }
  });
  await st(page, () => sessionStorage.setItem('offlineTest', '1'));
  await page.goto(server.url);
  await page.waitForFunction(() => window.__game?.scene.getScene('map')?.mv, null, { timeout: 30000 });
  await wait(page, 1200);
  const dlg = await page.isVisible('#modal');
  const txt = dlg ? await page.textContent('#modal-card') : '';
  check('welcome back dialog shows offline earnings', dlg && txt.includes('Welcome back') && txt.includes('$72'), txt.replace(/\s+/g, ' ').slice(0, 90));
  const m0 = await st(page, () => window.__app.state.money);
  await page.click('[data-act="offline-collect"]'); await wait(page, 300);
  const m1 = await st(page, () => window.__app.state.money);
  check('collect adds 50% of 2h income (~$72,000)', m1 - m0 > 71000 && m1 - m0 < 73000, `+${(m1 - m0).toFixed(0)}`);
  check('dialog closes', !(await page.isVisible('#modal')));

  // ---- quest claim
  await st(page, () => { const s = window.__app.state; s.lines[0].level = 3; s.tutorial.done = true; });
  await wait(page, 1500);
  const gems0 = await st(page, () => window.__app.state.money);
  await page.click('.qchip.done'); await wait(page, 300);
  const claimed = await st(page, () => window.__app.state.quests.claimedIds.includes('q1'));
  check('completed quest can be collected', claimed);

  // ---- ski bus with gems
  await st(page, () => { const s = window.__app.state; s.gems = 30; s.rt.guests.length = 0; s.ads.busCooldownUntil = 0; s.ads.busCount = 0; });
  await wait(page, 500);
  await page.click('#busfab'); await wait(page, 300);
  check('bus chooser opens', await page.isVisible('#modal'));
  await page.click('[data-act="busgems"]'); await wait(page, 700);
  const busInfo = await st(page, () => ({ gems: window.__app.state.gems, pending: window.__app.state.rt.busPending?.remaining ?? 0, count: window.__app.state.ads.busCount }));
  check('ski bus with gems spends 12 gems and queues 40 guests', busInfo.gems === 18 && busInfo.pending + 0 >= 30 && busInfo.count === 1, JSON.stringify(busInfo));
  await wait(page, 11000);
  const busGuests = await st(page, () => window.__app.state.rt.guests.filter(g => g.home === 'bus').length);
  check('bus guests arrived', busGuests >= 35, `bus guests ${busGuests}`);
  check('bus is on cooldown', await st(page, () => window.__core.busStatus(window.__app.state).cooldown > 60));

  // ---- ski bus with (mock) ad via the shop
  await st(page, () => { window.__app.state.ads.busCooldownUntil = 0; window.__app.state.rt.guests.length = 0; window.__app.state.rt.busPending = null; });
  await page.click('#tab-shop'); await wait(page, 400);
  await page.click('[data-act="busad"]'); await wait(page, 2200);
  check('ski bus with mock ad works', await st(page, () => window.__app.state.ads.busCount === 2));

  // ---- cash bundle, gem pack, income x2 (mock)
  await st(page, () => { window.__app.state.gems = 50; });
  await wait(page, 400);
  const c0 = await st(page, () => window.__app.state.money);
  await page.click('[data-act="cash"]'); await wait(page, 300);
  const c1 = await st(page, () => ({ m: window.__app.state.money, g: window.__app.state.gems }));
  check('cash bundle costs 25 gems and gives cash', c1.g === 25 && c1.m > c0, JSON.stringify(c1));
  await page.click('[data-act="product"][data-a="gems_small"]'); await wait(page, 900);
  check('gem pack (mock purchase) grants gems', (await st(page, () => window.__app.state.gems)) === 125);
  await page.click('[data-act="product"][data-a="income_x2"]'); await wait(page, 900);
  check('Double Income (mock purchase) sets the flag', await st(page, () => window.__app.state.purchases.incomeX2 === true));

  // ---- new season
  await st(page, () => { const s = window.__app.state; s.areasOwned = ['bunny', 'lower', 'mid', 'peaks', 'glacier']; s.lifetimeEarned = 4e9; s.gems = 77; });
  await page.click('.menu-btn'); await wait(page, 500);
  await page.click('[data-act="season"]'); await wait(page, 400);
  check('season dialog previews the reward', (await page.textContent('#modal-card')).includes('Season Points'));
  await page.click('[data-act="season-yes"]'); await wait(page, 600);
  const season = await st(page, () => { const s = window.__app.state; return { season: s.season, sp: s.seasonPoints, areas: s.areasOwned.length, gems: s.gems, money: s.money }; });
  check('new season resets the mountain and keeps gems', season.season === 2 && season.sp === 20 && season.areas === 1 && season.gems === 77, JSON.stringify(season));

  // ---- reset (two-step)
  await page.click('.menu-btn'); await wait(page, 300);
  await page.click('.menu-btn'); await wait(page, 300);
  await page.click('.menu-btn'); await wait(page, 400);
  await page.click('[data-act="reset"]'); await wait(page, 200);
  check('reset needs a second tap', (await page.textContent('[data-act="reset"]')).includes('again'));
  await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('[data-act="reset"]')]);
  await page.waitForFunction(() => window.__game?.scene.getScene('map')?.mv, null, { timeout: 30000 });
  check('reset wipes progress', await st(page, () => window.__app.state.season === 1 && window.__app.state.money === 10));

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
} catch (e) { console.error(e); failed++; }
server.stop();
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall flow checks passed');
process.exit(failed ? 1 : 0);
