// Touch gesture test via CDP: one-finger drag pans, two-finger pinch zooms, a tap opens a sheet.
import { chromium } from 'playwright';
import { startServer } from './shotlib.mjs';

const server = await startServer(5193);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(server.url + '?new');
await page.waitForFunction(() => window.__game?.scene.getScene('map')?.mv, null, { timeout: 30000 });
await page.waitForTimeout(1200);
const cdp = await ctx.newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
const mv = () => page.evaluate(() => { const m = window.__game.scene.getScene('map').mv; return { z: m.zoom, cx: m.cx, cy: m.cy, fit: m.fit }; });
let failed = 0;
const check = (n, ok, e = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`); if (!ok) failed++; };

const a = await mv();
// one finger drag down = map moves down (camera centre goes up)
await touch('touchStart', [[200, 400]]);
for (let i = 1; i <= 8; i++) { await touch('touchMove', [[200, 400 + i * 25]]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(100);
const b = await mv();
check('one-finger drag pans the map', b.cy < a.cy - 100, `cy ${a.cy.toFixed(0)} -> ${b.cy.toFixed(0)}`);

// pinch out = zoom in
await touch('touchStart', [[150, 500], [250, 500]]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [[150 - i * 10, 500], [250 + i * 10, 500]]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(100);
const c = await mv();
check('pinch out zooms in', c.z > b.z * 1.5, `zoom ${b.z.toFixed(3)} -> ${c.z.toFixed(3)}`);
// pinch in = zoom out
await touch('touchStart', [[50, 500], [350, 500]]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [[50 + i * 12, 500], [350 - i * 12, 500]]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(100);
const d = await mv();
check('pinch in zooms out', d.z < c.z * 0.8, `zoom ${c.z.toFixed(3)} -> ${d.z.toFixed(3)}`);
check('zoom stays within limits', d.z >= d.fit * 0.85 - 1e-6 && d.z <= d.fit * 3.2 + 1e-6);

// tap on the lift opens the lifts sheet
await page.evaluate(() => window.__game.scene.getScene('map').mv.focus(600, 2700, 1));
await page.waitForTimeout(300);
const p = await page.evaluate(() => { const m = window.__game.scene.getScene('map').mv; return [(400 - m.cx) * m.zoom + m.w / 2, (2860 - m.cy) * m.zoom + m.h / 2]; });
await touch('touchStart', [[p[0], p[1] - 8]]); await page.waitForTimeout(60); await touch('touchEnd', []);
await page.waitForTimeout(500);
check('touch tap on the lift opens the lifts sheet', await page.isVisible('#sheet'));
// tap the upgrade button with a finger
const before = await page.evaluate(() => window.__app.state.lines[0].level);
const btn = await page.locator('[data-act="lvl"]').boundingBox();
await touch('touchStart', [[btn.x + btn.width / 2, btn.y + btn.height / 2]]); await page.waitForTimeout(50); await touch('touchEnd', []);
await page.waitForTimeout(400);
const after = await page.evaluate(() => window.__app.state.lines[0].level);
check('touch tap on Upgrade buys a level', after === before + 1, `${before} -> ${after}`);
// scrolling the sheet with a finger must not trigger a purchase
const lvl0 = await page.evaluate(() => window.__app.state.lines[0].level);
await touch('touchStart', [[200, 700]]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[200, 700 - i * 30]]); await page.waitForTimeout(16); } await touch('touchEnd', []);
await page.waitForTimeout(300);
check('dragging over buttons does not buy anything', (await page.evaluate(() => window.__app.state.lines[0].level)) === lvl0);
check('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close(); server.stop();
console.log(failed ? `\n${failed} FAILED` : '\nall touch checks passed');
process.exit(failed ? 1 : 0);
