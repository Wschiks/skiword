// screenshots at other viewport sizes: node scripts/viewports.mjs <folder>
import { startServer, openPage, shot, wait } from './shotlib.mjs';
const dir = `screenshots/${process.argv[2] || 'viewports'}`;
const server = await startServer(5195);
for (const [name, w, h, dpr] of [['small-320x568', 320, 568, 2], ['android-360x780', 360, 780, 2.5], ['tablet-820x1180', 820, 1180, 1], ['desktop-1280x800', 1280, 800, 1]]) {
  const { browser, page } = await openPage(server.url + '?new', { w, h, dpr });
  await wait(page, 1200);
  await page.evaluate(() => { const c = window.__core, b = window.__bot; const s = c.newGame(5); window.__app.state = s; s.tutorial.done = true; b.runBot(s, { mode: 'fast', maxSeconds: 3 * 3600 }); c.simulate(s, 300); });
  await wait(page, 800);
  await shot(page, dir, name + '-map');
  await page.click('#tab-lifts'); await wait(page, 500);
  await shot(page, dir, name + '-lifts');
  await browser.close();
}
server.stop();
