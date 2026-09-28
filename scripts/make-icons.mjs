// Generates app icons and splash images from code (SVG rendered with Playwright). Output: assets/*.png and public/icon-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const icon = (size, rounded = false, fgOnly = false, bgOnly = false) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4F8FD0"/><stop offset="1" stop-color="#CFE8F7"/></linearGradient></defs>
  ${fgOnly ? '' : `<rect width="512" height="512" ${rounded ? 'rx="110"' : ''} fill="url(#g)"/>`}
  ${bgOnly ? '' : `<g ${fgOnly ? 'transform="translate(76 76) scale(.7)"' : ''}>
    <path d="M40 420 L200 150 L270 260 L340 190 L472 420 Z" fill="#F4F8FB"/>
    <path d="M200 150 L235 208 L200 230 L170 205 Z" fill="#DCEAF5"/>
    <path d="M40 420 L200 150 L150 420 Z" fill="#C2D3E3"/>
    <circle cx="380" cy="120" r="34" fill="#F2B705"/>
    <path d="M96 440 H416" stroke="#2F6B4F" stroke-width="18" stroke-linecap="round"/>
    <path d="M120 300 L330 232" stroke="#37424f" stroke-width="5"/><rect x="214" y="262" width="26" height="20" rx="4" fill="#C0392B"/>
  </g>`}
</svg>`;
const splash = size => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 2732 2732">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4F8FD0"/><stop offset="1" stop-color="#CFE8F7"/></linearGradient></defs>
  <rect width="2732" height="2732" fill="url(#g)"/>
  <g transform="translate(1000 900) scale(1.4)">
    <path d="M40 420 L200 150 L270 260 L340 190 L472 420 Z" fill="#F4F8FB"/><path d="M40 420 L200 150 L150 420 Z" fill="#C2D3E3"/>
    <circle cx="380" cy="120" r="34" fill="#F2B705"/><path d="M96 440 H416" stroke="#2F6B4F" stroke-width="18" stroke-linecap="round"/>
  </g>
  <text x="1366" y="1900" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="150" fill="#fff" stroke="#2E5F8F" stroke-width="6">Ski Idle Tycoon</text>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync('assets', { recursive: true });
async function render(svg, w, h, path) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', path);
}
await render(icon(1024), 1024, 1024, 'assets/icon-only.png');
await render(icon(1024, false, true), 1024, 1024, 'assets/icon-foreground.png');
await render(icon(1024, false, false, true), 1024, 1024, 'assets/icon-background.png');
await render(splash(2732), 2732, 2732, 'assets/splash.png');
await render(splash(2732), 2732, 2732, 'assets/splash-dark.png');
await render(icon(512, true), 512, 512, 'public/icon-512.png');
await render(icon(192, true), 192, 192, 'public/icon-192.png');
await browser.close();
