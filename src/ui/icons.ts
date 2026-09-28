/** Inline SVG icons (24x24, stroke = currentColor). No emoji, no image files. */
const svg = (body: string, extra = '') =>
  `<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
  coin: svg('<circle cx="12" cy="12" r="9" fill="#F2B705" stroke="#B98300"/><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.8-2.5 2-2.5.8-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2" stroke="#7A5500" stroke-width="1.6"/>'),
  gem: svg('<path d="M6 4h12l4 6-10 11L2 10z" fill="#3ABEFF" stroke="#1B7FB8"/><path d="M2 10h20M9 4l-2 6 5 11 5-11-2-6" stroke="#1B7FB8" stroke-width="1.4"/>'),
  people: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.2c2.4.3 4.2 2.2 4.2 4.8"/>'),
  lift: svg('<path d="M3 5l18 5"/><path d="M9 7.5V11m0 0h-3v3h6v-3z"/><path d="M17 9.5V13m0 0h-3v3h6v-3z"/><path d="M4 21V9M20 21V11" opacity=".5"/>'),
  mountain: svg('<path d="M2 20L9 7l4 7 3-4 6 10z"/><path d="M9 7l1.8 3.2L9 11.5 7.2 10z" fill="currentColor"/>'),
  building: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  flag: svg('<path d="M5 21V3"/><path d="M5 4h12l-2.5 4L17 12H5"/>'),
  bag: svg('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  parking: svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9.5 17V7H13a3 3 0 010 6H9.5"/>'),
  bed: svg('<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 00-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>'),
  bus: svg('<rect x="3" y="4" width="18" height="13" rx="3"/><path d="M3 11h18M7 17v2M17 17v2"/><circle cx="7.5" cy="14" r=".8" fill="currentColor"/><circle cx="16.5" cy="14" r=".8" fill="currentColor"/>'),
  ski: svg('<path d="M3 20L21 14"/><path d="M5 17l14-4.6"/><circle cx="14" cy="6" r="2"/><path d="M14 8l-2 5-3 2M14 8l3 3"/>'),
  check: svg('<path d="M4 12.5l5 5L20 6.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  up: svg('<path d="M12 19V6M6 11l6-6 6 6"/>'),
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>'),
  book: svg('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/>'),
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>'),
  soundOff: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  vibrate: svg('<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8"/>'),
  reset: svg('<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3"/><path d="M3 4v4h4"/>'),
  season: svg('<path d="M12 2v20M4 6l16 12M20 6L4 18"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>'),
  face: (mood: 'good' | 'ok' | 'bad') => svg(
    `<circle cx="12" cy="12" r="9.5" fill="${mood === 'good' ? '#4CC38A' : mood === 'ok' ? '#F2B705' : '#E25555'}" stroke="none"/>` +
    `<circle cx="8.6" cy="10" r="1.2" fill="#1E2A38" stroke="none"/><circle cx="15.4" cy="10" r="1.2" fill="#1E2A38" stroke="none"/>` +
    (mood === 'good' ? '<path d="M7.5 14c1.2 2.2 7.8 2.2 9 0" stroke="#1E2A38"/>' : mood === 'ok' ? '<path d="M8 15h8" stroke="#1E2A38"/>' : '<path d="M7.5 16.5c1.2-2.2 7.8-2.2 9 0" stroke="#1E2A38"/>')),
  chair: svg('<path d="M12 2v6"/><path d="M5 12h14M5 8v10M19 12v6"/><path d="M5 18h14"/>'),
  cabin: svg('<path d="M12 2v5"/><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M4 14h16"/>'),
  drag: svg('<path d="M12 2v10"/><path d="M6 12h12"/><circle cx="12" cy="17" r="2"/>'),
};
export type IconName = keyof typeof icons;
export const icon = (n: Exclude<IconName, 'face'>) => icons[n];
