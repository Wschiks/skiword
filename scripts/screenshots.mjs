// usage: node scripts/screenshots.mjs <folder-name> [scenario ...]
import { startServer, openPage, shot, wait } from './shotlib.mjs';

const folder = process.argv[2] || 'latest';
const only = process.argv.slice(3);
const dir = `screenshots/${folder}`;
const want = name => only.length === 0 || only.includes(name);

const server = await startServer();
let exit = 0;
try {
  const { browser, page, errors } = await openPage(server.url + '?new&debug');
  const cam = (x, y, z) => page.evaluate(([x, y, z]) => window.__game.scene.getScene('map').mv.focus(x, y, z), [x, y, z]);
  const setup = fn => page.evaluate(fn);
  await wait(page, 1500);

  if (want('01-start')) {
    await shot(page, dir, '01-start-fresh');
    await cam(600, 2800, 2.2); await wait(page, 700);
    await shot(page, dir, '02-start-zoomed-bunny');
  }
  if (want('early')) {
    await setup(() => { const c = window.__core, b = window.__bot; const s = window.__app.state; b.runBot(s, { mode: 'full', maxSeconds: 420 }); });
    await cam(600, 2300, 1); await wait(page, 1200);
    await shot(page, dir, '03-early-7min');
  }
  if (want('mid')) {
    await setup(() => { const c = window.__core, b = window.__bot; const s = c.newGame(5); window.__app.state = s; b.runBot(s, { mode: 'fast', maxSeconds: 3 * 3600 }); c.simulate(s, 360); });
    await cam(600, 2000, 1); await wait(page, 1200);
    await shot(page, dir, '04-mid-3h-full-view');
    await cam(600, 1500, 1.8); await wait(page, 800);
    await shot(page, dir, '05-mid-zoomed');
  }
  if (want('late')) {
    await setup(() => { const c = window.__core, b = window.__bot; const s = c.newGame(6); window.__app.state = s; b.runBot(s, { mode: 'fast', maxSeconds: 40 * 3600 }); c.simulate(s, 420); });
    await cam(600, 1500, 1); await wait(page, 1200);
    await shot(page, dir, '06-late-40h-view');
    await cam(600, 500, 1.2); await wait(page, 800);
    await shot(page, dir, '07-late-glacier');
    await cam(600, 2900, 1.6); await wait(page, 800);
    await shot(page, dir, '08-late-village');
  }
  const click = async sel => { await page.click(sel); await wait(page, 450); };
  if (want('ui')) {
    await setup(() => { window.__app.state = window.__core.newGame(3); });
    await wait(page, 800);
    await shot(page, dir, 'ui-01-fresh-tutorial');
    await click('#tab-lifts');
    await shot(page, dir, 'ui-02-lifts-sheet-fresh');
    await click('#tab-lifts');
    await setup(() => { const c = window.__core, b = window.__bot; const s = c.newGame(5); window.__app.state = s; s.tutorial.done = true; b.runBot(s, { mode: 'fast', maxSeconds: 3 * 3600 }); c.simulate(s, 300); s.money += 5000; });
    await cam(600, 2000, 1); await wait(page, 800);
    await shot(page, dir, 'ui-03-mid-game-hud');
    for (const [id, name] of [['lifts', '04-lifts'], ['people', '05-people'], ['mountain', '06-mountain'], ['buildings', '07-buildings'], ['zones', '08-zones'], ['shop', '09-shop']]) {
      await click('#tab-' + id);
      await shot(page, dir, 'ui-' + name);
    }
    await click('#tab-shop');
    await page.click('.menu-btn'); await wait(page, 450);
    await shot(page, dir, 'ui-10-menu');
    await page.click('.menu-btn'); await wait(page, 300);
    await page.evaluate(() => document.getElementById('busfab') && document.getElementById('busfab').click());
    await page.evaluate(() => { document.getElementById('busfab')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await setup(() => { const s = window.__app.state; s.lastSeen = Date.now() - 3 * 3600 * 1000; s.incomeEma = 40; window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await wait(page, 500);
    await shot(page, dir, 'ui-11-dialog-state');
  }
  if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); exit = 1; }
  await browser.close();
} catch (e) { console.error(e); exit = 1; }
server.stop();
process.exit(exit);
