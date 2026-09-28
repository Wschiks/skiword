/**
 * Minimal in-place DOM diff. The sheets are re-rendered from HTML strings several times a second; replacing innerHTML
 * every time swaps every element (cancels touch scrolling momentum, loses :active / focus, detaches automation handles).
 * `morph` updates the existing nodes instead: text and attributes change in place, nodes are only replaced when the tag differs.
 */
/** classes toggled by JS (pressed state, coin pop, shake) that the HTML templates do not know about */
const TRANSIENT = ['down', 'pop', 'shake'];

function syncAttrs(a: Element, b: Element) {
  for (const attr of Array.from(a.attributes)) {
    if (!b.hasAttribute(attr.name)) a.removeAttribute(attr.name);
  }
  for (const attr of Array.from(b.attributes)) {
    let v = attr.value;
    if (attr.name === 'class') for (const k of TRANSIENT) if (a.classList.contains(k) && !v.split(' ').includes(k)) v += ' ' + k; // keep JS-driven states
    if (a.getAttribute(attr.name) !== v) a.setAttribute(attr.name, v);
  }
}

function sameKind(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  return a.nodeType !== Node.ELEMENT_NODE || (a as Element).tagName === (b as Element).tagName;
}

function syncChildren(a: Node, b: Node) {
  const from = Array.from(a.childNodes), to = Array.from(b.childNodes);
  const n = Math.max(from.length, to.length);
  for (let i = 0; i < n; i++) {
    const x = from[i], y = to[i];
    if (!y) { a.removeChild(x); continue; }
    if (!x) { a.appendChild(y.cloneNode(true)); continue; }
    if (!sameKind(x, y)) { a.replaceChild(y.cloneNode(true), x); continue; }
    if (x.nodeType === Node.TEXT_NODE) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    syncAttrs(x as Element, y as Element);
    syncChildren(x, y);
  }
}

const tpl = typeof document !== 'undefined' ? document.createElement('template') : null;

export function morph(target: Element, html: string) {
  if (!tpl) return;
  tpl.innerHTML = html;
  syncChildren(target, tpl.content);
}
