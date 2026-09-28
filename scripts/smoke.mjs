// Playwright smoke test: page loads, canvas renders, first lift upgrade works, six sheets open, no console errors.
import { startServer, openPage, wait } from './shotlib.mjs';

const server = await startServer(5198);
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; };
try {
  const { browser, page, errors } = await openPage(server.url + '?new', { w: 390, h: 844, dpr: 2 });
  await wait(page, 1500);

  const canvas = await page.evaluate(() => { const c = document.querySelector('#game canvas'); return c ? { w: c.width, h: c.height } : null; });
  check('canvas renders', !!canvas && canvas.w >= 700 && canvas.h >= 1600, JSON.stringify(canvas));
  // a WebGL canvas cannot be read back without preserveDrawingBuffer, so judge the composited screenshot instead:
  // a blank canvas compresses to a few KB, the rendered mountain is far larger
  const shotBytes = (await page.screenshot({ type: 'jpeg', quality: 70, clip: { x: 0, y: 300, width: 390, height: 300 } })).length;
  check('canvas has content', shotBytes > 20000, `map region jpeg ${shotBytes} bytes`);

  const money0 = await page.evaluate(() => window.__app.state.money);
  check('start money is $10', money0 === 10);
  await page.click('#tab-lifts'); await wait(page, 400);
  check('lifts sheet opens', await page.isVisible('#sheet'));
  await page.click('[data-act="lvl"]'); await wait(page, 300);
  const after = await page.evaluate(() => ({ m: window.__app.state.money, l: window.__app.state.lines[0].level }));
  check('first lift upgrade works', after.l === 1 && after.m < 10, JSON.stringify(after));

  for (const id of ['people', 'mountain', 'buildings', 'zones', 'shop', 'lifts']) {
    await page.click('#tab-' + id); await wait(page, 300);
    const title = await page.textContent('#sheet-title');
    const bodyLen = await page.evaluate(() => document.getElementById('sheet-body').innerText.length);
    check(`${id} sheet opens`, (await page.isVisible('#sheet')) && title.toLowerCase().includes(id.slice(0, 4)) && bodyLen > 20, `title=${title}`);
  }
  await page.click('.menu-btn'); await wait(page, 300);
  check('menu opens', (await page.textContent('#sheet-title')) === 'Menu');
  await page.click('.menu-btn'); await wait(page, 200);
  check('sheet closes', !(await page.isVisible('#sheet')));

  // the live sheet is updated in place: elements must survive the 4 Hz refresh (keeps touch scroll momentum and pressed state)
  await page.click('#tab-lifts'); await wait(page, 300);
  await page.evaluate(() => { window.__probe = document.querySelector('#sheet-body [data-act="lvl"]'); });
  await wait(page, 900);
  check('sheet buttons stay attached across refreshes (in-place update)', await page.evaluate(() => !!window.__probe && window.__probe.isConnected));
  await page.click('.menu-btn'); await wait(page, 200); await page.click('.menu-btn'); await wait(page, 200);

  // map tap on the lift opens the lifts sheet
  const pos = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('map'); const mv = sc.mv; const b = { x: 400, y: 2860 };
    return { x: (b.x - mv.cx) * mv.zoom + mv.w / 2, y: (b.y - mv.cy) * mv.zoom + mv.h / 2 };
  });
  await page.mouse.click(pos.x, pos.y - 10); await wait(page, 400);
  check('tapping the lift on the map opens the lifts sheet', (await page.isVisible('#sheet')) && (await page.textContent('#sheet-title')) === 'Lifts');

  // drag pans the camera
  await page.click('[data-act="close"]'); await wait(page, 200);
  const cy0 = await page.evaluate(() => window.__game.scene.getScene('map').mv.cy);
  await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.move(200, 700, { steps: 6 }); await page.mouse.up(); await wait(page, 200);
  const cy1 = await page.evaluate(() => window.__game.scene.getScene('map').mv.cy);
  check('dragging pans the map', Math.abs(cy1 - cy0) > 50, `${cy0.toFixed(0)} -> ${cy1.toFixed(0)}`);

  // 10 s of game time passes without errors and guests appear
  await wait(page, 6000);
  const guests = await page.evaluate(() => window.__app.state.rt.guests.length);
  check('guests spawn and simulation runs', guests > 0, `guests=${guests}`);

  // save/load round trip
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await page.evaluate(() => !!localStorage.getItem('skitycoon.save.v1'));
  check('autosave wrote a save', saved);

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
} catch (e) { console.error(e); failed++; }
server.stop();
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall smoke checks passed');
process.exit(failed ? 1 : 0);
