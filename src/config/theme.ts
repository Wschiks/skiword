/** Visual theme. `?theme=day` or `?theme=night` overrides the default. */
export type Theme = 'day' | 'night';
export const THEME_DEFAULT: Theme = 'night';
export function currentTheme(): Theme {
  try {
    const q = new URLSearchParams(location.search).get('theme');
    if (q === 'day' || q === 'night') return q;
  } catch { /* ignore */ }
  return THEME_DEFAULT;
}
/** multiply tint applied over the whole world at night (R, G, B 0..255) */
export const NIGHT_TINT = 0x5a70c0;
