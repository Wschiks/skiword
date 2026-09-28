// Generates public/privacy.html and public/terms.html from src/config/legal.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { APP_NAME, PRIVACY, PUBLISHER, TERMS } from '../src/config/legal';

const page = (title: string, items: string[]) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${APP_NAME} - ${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1E2A38;line-height:1.5}h1{font-size:24px}li{margin-bottom:8px}</style></head>
<body><h1>${APP_NAME}: ${title}</h1><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
<p><b>Publisher</b><br>${PUBLISHER.name}<br>${PUBLISHER.address}, ${PUBLISHER.country}<br>${PUBLISHER.email}<br>${PUBLISHER.website}</p></body></html>
`;
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/privacy.html', import.meta.url), page('Privacy', PRIVACY));
writeFileSync(new URL('../public/terms.html', import.meta.url), page('Terms of Use', TERMS));
console.log('wrote public/privacy.html and public/terms.html');
