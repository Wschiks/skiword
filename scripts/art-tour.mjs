// Close-up tour of every zone / building / area with everything unlocked. node scripts/art-tour.mjs <folder>
import { startServer, openPage, shot, wait } from './shotlib.mjs';
const dir = `screenshots/${process.argv[2] || 'art-tour'}`;
const server = await startServer(5192);
const { browser, page } = await openPage(server.url + '?new');
await wait(page, 1000);
await page.evaluate(() => {
  const c = window.__core; const s = c.newGame(3); window.__app.state = s; s.tutorial.done = true;
  s.areasOwned = ['bunny', 'lower', 'mid', 'peaks', 'glacier']; s.parkingLevel = 30; s.housingLevel = 20; s.money = 1e15;
  for (const a of s.areasOwned) for (let i = 0; i < 3; i++) c.buildLine(s, a, i, i === 0 ? 1 : 1);
  s.unlockedTier = 10;
  s.lines = []; for (const [a, n, t] of [['bunny', 2, 3], ['lower', 3, 5], ['mid', 3, 6], ['peaks', 3, 7], ['glacier', 2, 8]]) for (let i = 0; i < n; i++) s.lines.push(c.makeLine(a, i, t, 4));
  for (const b of ['snack', 'mountain', 'apres', 'lodge']) s.buildings[b] = 5;
  for (const z of ['kids', 'park', 'slalom', 'offpiste']) s.zones[z] = { owned: true, level: 3, stage: 0 };
  c.simulate(s, 500);
});
const cam = (x, y, z) => page.evaluate(([x, y, z]) => window.__game.scene.getScene('map').mv.focus(x, y, z), [x, y, z]);
const stops = [
  ['kids-park', 140, 2130, 3.2], ['snack-hut', 1000, 2200, 3], ['terrain-park', 140, 1410, 3.2], ['slalom', 1040, 1210, 3.2], ['mountain-restaurant', 1000, 1450, 3],
  ['off-piste', 1000, 650, 3.2], ['apres-bar', 1000, 800, 3], ['glacier-lodge', 1000, 200, 3], ['village-lodge', 950, 3000, 2.6], ['parking-lot', 220, 3040, 2.6],
];
for (const [name, x, y, z] of stops) { await cam(x, y, z); await wait(page, 500); await shot(page, dir, 'art-' + name); }
await page.evaluate(() => { window.__app.state.zones.park.stage = 1; }); await cam(140, 1410, 3.2); await wait(page, 500); await shot(page, dir, 'art-terrain-park-stage2');
await page.evaluate(() => { window.__app.state.zones.park.stage = 2; }); await wait(page, 500); await shot(page, dir, 'art-terrain-park-stage3');
await page.evaluate(() => { window.__app.state.ads.busCooldownUntil = 0; window.__core.callSkiBus(window.__app.state, 'ad', Date.now()); });
await cam(600, 3050, 2.2); await wait(page, 6500); await shot(page, dir, 'art-ski-bus-arrived');
await browser.close(); server.stop();
