import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export async function startServer(port = 5199) {
  const proc = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('vite start timeout')), 30000);
    proc.stdout.on('data', d => { if (String(d).includes('Local')) { clearTimeout(t); resolve(); } });
    proc.on('exit', c => reject(new Error('vite exited ' + c)));
  });
  return { url: `http://127.0.0.1:${port}/`, stop: () => proc.kill('SIGTERM') };
}

export async function openPage(url, { w = 390, h = 844, dpr = 2 } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.scene.getScene('map') && window.__game.scene.getScene('map').mv, null, { timeout: 30000 });
  return { browser, page, errors };
}

export async function shot(page, dir, name) {
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.jpg`, type: 'jpeg', quality: 84 });
  console.log('saved', `${dir}/${name}.jpg`);
}

export const wait = (page, ms) => page.waitForTimeout(ms);
