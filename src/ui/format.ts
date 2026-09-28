const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

export function formatNum(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  const neg = n < 0; n = Math.abs(n);
  let out: string;
  if (n < 1000) out = n < 10 && decimals > 0 && n % 1 !== 0 ? n.toFixed(decimals).replace(/\.?0+$/, '') : Math.floor(n).toString();
  else {
    let i = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
    if (i < SUFFIX.length - 1 && n / Math.pow(1000, i) >= 999.5) i++; // 999.9T reads as 1.00Qa, not 1000T
    if (n >= 1e21) {
      const e = Math.floor(Math.log10(n));
      out = `${(n / Math.pow(10, e)).toFixed(2)}e${e}`;
    } else {
      const v = n / Math.pow(1000, i);
      out = `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)}${SUFFIX[i]}`;
    }
  }
  return (neg ? '-' : '') + out;
}
export const formatMoney = (n: number) => '$' + formatNum(n);
export function formatRate(n: number) { return '$' + (n < 10 ? n.toFixed(2) : formatNum(n)) + '/s'; }
export function formatTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
