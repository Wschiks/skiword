// Measures JS time per frame (scene.update + UI tick) with a full 190+ guest late-game mountain.
import { startServer, openPage, wait } from './shotlib.mjs';
const server = await startServer(5196);
const { browser, page, errors } = await openPage(server.url + '?new');
await wait(page, 1200);
const res = await page.evaluate(async () => {
  const c = window.__core, b = window.__bot;
  const s = c.newGame(9); window.__app.state = s; s.tutorial.done = true;
  b.runBot(s, { mode: 'fast', maxSeconds: 60 * 3600 });
  s.parkingLevel = 30; s.housingLevel = 20;
  c.callSkiBus(s, 'gems', Date.now()); s.gems = 100;
  c.simulate(s, 900);
  c.callSkiBus(s, 'ad', Date.now() + 1e6);
  c.simulate(s, 12);
  const scene = window.__game.scene.getScene('map');
  const orig = scene.sys.sceneUpdate;
  let n = 0, total = 0, worst = 0;
  scene.sys.sceneUpdate = (t, d) => { const t0 = performance.now(); orig.call(scene, t, d); const dt = performance.now() - t0; total += dt; n++; worst = Math.max(worst, dt); };
  await new Promise(r => setTimeout(r, 6000));
  scene.sys.sceneUpdate = orig;
  return { guests: s.rt.guests.length, frames: n, avgMs: total / n, worstMs: worst, fps: window.__game.loop.actualFps };
});
console.log(JSON.stringify(res));
console.log('console errors:', errors.length);
await browser.close(); server.stop();
process.exit(res.avgMs < 8 ? 0 : 1);
