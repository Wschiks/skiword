// Time from navigation to "scene ready" with the CPU throttled (rough stand-in for a mid-range phone). node scripts/startup.mjs [rate]
import { chromium } from 'playwright';
import { startServer } from './shotlib.mjs';
const rate = Number(process.argv[2] ?? 6);
process.env.SERVE = 'preview'; // production bundle
const { execSync } = await import('node:child_process');
execSync('npm run -s build', { stdio: 'ignore' });
const server = await startServer(5187);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
for (const r of [1, rate]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
  const t0 = Date.now();
  await page.goto(server.url + '?new');
  await page.waitForFunction(() => window.__game?.scene.getScene('map')?.mv && !document.getElementById('splash')?.isConnected || document.getElementById('splash')?.classList.contains('hide'), null, { timeout: 60000 });
  const ms = Date.now() - t0;
  const bake = await page.evaluate(() => performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd | 0);
  console.log(`cpu x${r}: ready after ${ms} ms (DCL ${bake} ms)`);
}
await browser.close(); server.stop();
