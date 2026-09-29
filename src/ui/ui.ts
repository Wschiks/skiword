import { app } from '../app';
import { BUS, MOOD, OFFLINE, UI } from '../config/balance';
import { AREAS, areaDef, areaIndex } from '../config/areas';
import { BUILDINGS } from '../config/facilities';
import { ZONES } from '../config/zones';
import { LODGE_POS, PARKING_POS, slotBase } from '../config/layout';
import { PRODUCTS } from '../config/shop';
import { QUESTS } from '../config/quests';
import {
  bottleneck, bottleneckHint, buyCashBundle, busStatus, callSkiBus, canNewSeason, claimOffline, claimQuest, computeOffline, isDone,
  listPurchases, maxPop, nextGoal, seasonPreview, startNewSeason, queueCap,
} from '../core/game';
import { clearSave, saveState } from '../core/save';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { ads } from '../ads';
import { purchases } from '../purchases';
import { icons } from './icons';
import { formatMoney, formatNum, formatTime } from './format';
import { sfx, haptic, initAudio, setSoundEnabled, setHapticsEnabled } from './sound';
import { confetti } from './confetti';
import { bar } from './util';
import { morph } from './morph';
import { tutorialStep, ANGRY_TOAST } from './tutorial';
import { renderQuests } from './quests';
import * as lifts from './liftSheet';
import * as people from './peopleSheet';
import * as mountain from './mountainSheet';
import * as buildings from './buildingSheet';
import * as zones from './zoneSheet';
import * as shop from './shopSheet';
import * as menu from './menu';
import type { ActResult, Ctx } from './types';
import type { MapHit, MapScene } from '../scene/MapScene';

type SheetId = 'lifts' | 'people' | 'mountain' | 'buildings' | 'zones' | 'shop' | 'menu';
const TABS: { id: SheetId; label: string; icon: 'lift' | 'people' | 'mountain' | 'building' | 'flag' | 'bag' }[] = [
  { id: 'lifts', label: 'Lifts', icon: 'lift' }, { id: 'people', label: 'People', icon: 'people' }, { id: 'mountain', label: 'Mountain', icon: 'mountain' },
  { id: 'buildings', label: 'Buildings', icon: 'building' }, { id: 'zones', label: 'Zones', icon: 'flag' }, { id: 'shop', label: 'Shop', icon: 'bag' },
];
const TITLES: Record<SheetId, string> = { lifts: 'Lifts', people: 'People', mountain: 'Mountain', buildings: 'Buildings', zones: 'Zones', shop: 'Shop', menu: 'Menu' };
const MODS: Record<string, { render(c: Ctx): string; act?(n: string, a: string, b: string, c: Ctx): ActResult }> = { lifts, people, mountain, buildings, zones, shop, menu: menu as never };
const HINT_SHEETS: SheetId[] = ['lifts', 'people', 'mountain', 'buildings', 'zones'];

let scene: MapScene | null = null;
let open: SheetId | null = null;
const ctx: Ctx = { s: app.state, mult: 1, focus: null, picker: null, tut: null, now: Date.now(), resetArmed: false };
let resetTimer = 0;
let modalOpen: string | null = null;

const $ = (id: string) => document.getElementById(id)!;
const cache = new WeakMap<HTMLElement, string>();
/** in-place update (see morph.ts): keeps element identity, scroll momentum and pressed state across the 4 Hz refreshes */
function setHTML(el: HTMLElement, html: string) { if (cache.get(el) !== html) { morph(el, html); cache.set(el, html); } }

export function initUI() {
  const root = $('ui');
  root.innerHTML = `
    <div id="topbar" class="pe"></div>
    <div id="quests" class="pe"></div>
    <div id="tut" class="pe hidden"></div>
    <div id="toasts" role="status" aria-live="polite"></div>
    <div id="dock" class="pe"><button id="next" class="nextpill" data-act="next"></button><button id="busfab" class="busfab hidden" data-act="busmodal">${icons.bus}<span>Ski Bus</span></button></div>
    <div id="sheet" class="pe hidden"><div class="grab" id="grab"><i></i></div><div class="sheet-h"><div id="sheet-title" class="sheet-title"></div><button class="icon-btn" data-act="close" aria-label="Close">${icons.close}</button></div>
      <div id="sheet-hint" class="hintline"></div><div id="sheet-body" class="sheet-body"></div></div>
    <div id="tabs" class="pe">${TABS.map(t => `<button class="tab" data-act="tab" data-a="${t.id}" id="tab-${t.id}">${icons[t.icon]}<span>${t.label}</span><i class="dot hidden"></i></button>`).join('')}</div>
    <div id="modal" class="hidden"><div class="modal-card" id="modal-card" role="dialog" aria-modal="true"></div></div>`;

  app.on('sceneReady', (s: MapScene) => { scene = s; });
  app.on('mapTap', (h: MapHit) => onMapTap(h));
  app.on('event', onEvent);
  // browsers only allow audio after a user gesture, and map taps never reach the UI root
  document.addEventListener('pointerdown', () => initAudio(), { passive: true });
  setupPointer(root);
  setupSheetDrag();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onResume(); else saveNow(); });
  window.addEventListener('pagehide', saveNow);
  if (Capacitor.isNativePlatform()) {
    // Android hardware Back: close the top-most dialog or sheet first, only then leave the game
    void NativeApp.addListener('backButton', () => {
      if (modalOpen && modalOpen !== 'offline') closeModal();
      else if (open) closeSheet();
      else void NativeApp.minimizeApp();
    });
    void NativeApp.addListener('pause', () => saveNow());
  }
  setInterval(tick, 100);
  tick(true);
  setTimeout(() => showOfflineOnStart(), 400);
}

// ---------------------------------------------------------------- saving / offline
let resetting = false;
export function saveNow() {
  if (resetting) return;
  app.state.lastSeen = Date.now();
  saveState(app.state);
}
function onResume() {
  const s = app.state;
  computeOffline(s, Date.now(), OFFLINE.awayThreshold);
  if (s.rt.offline >= 1) showOffline();
  else s.lastSeen = Date.now();
}
function showOfflineOnStart() {
  const s = app.state;
  computeOffline(s, Date.now(), OFFLINE.awayThreshold);
  if (s.rt.offline >= 1) showOffline();
}
function showOffline() {
  const s = app.state;
  const away = Math.min(Date.now() - s.lastSeen, OFFLINE.maxHours * 3600_000) / 1000;
  const amt = s.rt.offline;
  openModal(`<div class="modal-title">Welcome back!</div>
    <div class="modal-body">You were away for ${formatTime(away)}. Your resort kept earning.
    <div class="big-num">${icons.coin}${formatMoney(amt)}</div></div>
    <div class="btns col"><button class="btn primary" data-act="offline-collect"><span class="btn-l">Collect</span></button>
    ${OFFLINE.adDouble ? `<button class="btn gold${ads.isReady() ? '' : ' off'}" data-act="offline-double"${ads.isReady() ? '' : ' data-off="1"'}><span class="btn-l">${icons.play} Double it</span><span class="btn-c">${formatMoney(amt * 2)}</span></button>` : ''}</div>`, 'offline');
}

// ---------------------------------------------------------------- modal / toast
function openModal(html: string, id: string) {
  modalOpen = id;
  const m = $('modal');
  cache.delete($('modal-card'));
  $('modal-card').innerHTML = html;
  m.classList.remove('hidden');
}
function closeModal() { modalOpen = null; $('modal').classList.add('hidden'); }
export function toast(msg: string, kind: 'info' | 'good' | 'warn' = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
  while ($('toasts').children.length > 3) $('toasts').firstElementChild!.remove();
}

// ---------------------------------------------------------------- pointer handling (robust against re-render)
function setupPointer(root: HTMLElement) {
  let press: { key: string; x: number; y: number } | null = null;
  const closest = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-act]') as HTMLElement | null) : null);
  const keyOf = (el: HTMLElement) => `${el.dataset.act}|${el.dataset.a ?? ''}|${el.dataset.b ?? ''}`;
  root.addEventListener('pointerdown', e => {
    initAudio();
    const el = closest(e.target);
    press = el ? { key: keyOf(el), x: e.clientX, y: e.clientY } : null;
    if (el) el.classList.add('down');
  });
  const clear = () => { document.querySelectorAll('.down').forEach(x => x.classList.remove('down')); };
  root.addEventListener('pointerup', e => {
    clear();
    if (!press) return;
    const p = press; press = null;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const el = closest(under);
    if (!el || keyOf(el) !== p.key) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) return;
    fire(el, e.clientX, e.clientY);
  });
  root.addEventListener('pointercancel', () => { press = null; clear(); });
  root.addEventListener('click', e => { // keyboard activation
    if ((e as MouseEvent).detail === 0) { const el = closest(e.target); if (el) fire(el, 200, 400); }
  });
  $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && modalOpen !== 'offline') closeModal(); });
}

function shake(el: HTMLElement) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

function fire(el: HTMLElement, x: number, y: number) {
  const name = el.dataset.act!, a = el.dataset.a ?? '', b = el.dataset.b ?? '';
  if (el.dataset.off) { sfx.error(); haptic('light'); shake(el); app.emit('event', { k: 'error' }); return; }
  refreshCtx();
  const res = handle(name, a, b, el);
  if (res === undefined) return;
  if (res.ok) {
    if (!res.silent) { sfx.buy(); haptic('medium'); confetti(x, y, 12); if (name === 'area') { sfx.fanfare(); toast(`Unlocked <b>${areaDef(a).name}</b>`, 'good'); } }
    else sfx.tap();
  } else { sfx.error(); haptic('light'); shake(el); }
  if (res.ok && !res.silent) worldFeedback(name, a);
  renderAll(true);
}

/** show a purchase in the world: a burst at the thing, and for big ones a camera glide to it */
function worldFeedback(name: string, a: string) {
  const s = app.state;
  const emit = (x: number, y: number, burst: number) => app.emit('focus', { x, y, burst });
  switch (name) {
    case 'area': { // a new area is the big moment: get the sheet out of the way and glide to the new territory
      const [y0, y1] = areaDef(a).band;
      closeSheet();
      app.emit('focus', { x: 600, y: (y0 + y1) / 2, burst: 340, pan: true, yFrac: 0.5 });
      break;
    }
    case 'bbuy': { const p = BUILDINGS.find(x => x.id === a)!.pos; emit(p.x, p.y - 40, 130); break; }
    case 'bup': { const p = BUILDINGS.find(x => x.id === a)!.pos; emit(p.x, p.y - 40, 100); break; }
    case 'zbuy': { const p = ZONES.find(x => x.id === a)!.pos; emit(p.x + 70, p.y - 30, 150); break; }
    case 'zup': case 'zstage': { const p = ZONES.find(x => x.id === (name === 'zstage' ? 'park' : a))!.pos; emit(p.x + 70, p.y - 30, 110); break; }
    case 'build': { const [area, slot] = a.split(':'); const p = slotBase(areaIndex(area), Number(slot)); emit(p.x, p.y - 60, 150); break; }
    case 'rebuild': case 'lvl': { const l = s.lines.find(x => x.id === a); if (l) { const p = slotBase(areaIndex(l.areaId), l.slot); emit(p.x, p.y - 50, name === 'rebuild' ? 160 : 90); } break; }
    case 'parking': emit(PARKING_POS.x + 20, PARKING_POS.y - 50, 140); break;
    case 'housing': emit(LODGE_POS.x, LODGE_POS.y - 60, 140); break;
  }
}

function handle(name: string, a: string, b: string, el: HTMLElement): ActResult {
  const s = app.state;
  switch (name) {
    case 'tab': toggleSheet(a as SheetId); return { ok: true, silent: true };
    case 'close': closeSheet(); return { ok: true, silent: true };
    case 'mult': ctx.mult = a === 'max' ? 'max' : (Number(a) as 1 | 10); return { ok: true, silent: true };
    case 'next': { const g = nextGoal(s); if (g) openSheet(sheetForKind(g.kind)); return { ok: true, silent: true }; }
    case 'claim': {
      if (!isDone(s, a)) return { ok: true, silent: true };
      const q = QUESTS.find(x => x.id === a)!;
      const r = claimQuest(s, a);
      if (r.ok) { sfx.fanfare(); toast(`Quest done: <b>${q.name}</b>`, 'good'); }
      return r.ok ? { ok: true, silent: true } : r;
    }
    case 'busmodal': showBusModal(); return { ok: true, silent: true };
    case 'busad': case 'busgems': { void callBus(name === 'busad' ? 'ad' : 'gems', el); return { ok: true, silent: true }; }
    case 'cash': { const r = buyCashBundle(s); return r.ok ? { ok: true } : r; }
    case 'product': { void buyProduct(a); return { ok: true, silent: true }; }
    case 'restore': { void restore(); return { ok: true, silent: true }; }
    case 'sound': s.settings.sound = !s.settings.sound; setSoundEnabled(s.settings.sound); return { ok: true, silent: true };
    case 'haptics': s.settings.haptics = !s.settings.haptics; setHapticsEnabled(s.settings.haptics); return { ok: true, silent: true };
    case 'legal': showLegal(a); return { ok: true, silent: true };
    case 'season': showSeasonConfirm(); return { ok: true, silent: true };
    case 'season-yes': {
      const r = startNewSeason(s);
      closeModal();
      if (r.ok) { closeSheet(); sfx.fanfare(); toast('A new season begins! Permanent bonus income unlocked.', 'good'); saveNow(); }
      return { ok: true, silent: true };
    }
    case 'reset':
      if (!ctx.resetArmed) { ctx.resetArmed = true; clearTimeout(resetTimer); resetTimer = window.setTimeout(() => { ctx.resetArmed = false; renderAll(true); }, 4000); return { ok: true, silent: true }; }
      resetting = true; clearSave(); location.reload(); return { ok: true, silent: true };
    case 'dlg-close': closeModal(); return { ok: true, silent: true };
    case 'offline-collect': { claimOffline(s, false); closeModal(); s.lastSeen = Date.now(); sfx.buy(); return { ok: true, silent: true }; }
    case 'offline-double': {
      void ads.showRewarded().then(ok => {
        if (ok) { claimOffline(s, true); closeModal(); s.lastSeen = Date.now(); sfx.buy(); }
        else toast('No ad available right now', 'warn');
      });
      return { ok: true, silent: true };
    }
  }
  const mod = open ? MODS[open] : undefined;
  if (mod?.act) return mod.act(name, a, b, ctx);
  return undefined;
}

async function callBus(payWith: 'ad' | 'gems', el?: HTMLElement) {
  const s = app.state;
  const st = busStatus(s);
  if (!st.available) { sfx.error(); return; }
  if (payWith === 'ad') {
    const ok = await ads.showRewarded();
    if (!ok) { toast('No ad available right now', 'warn'); return; }
  }
  const r = callSkiBus(s, payWith);
  if (r.ok) { sfx.horn(); toast(`Ski bus arriving: <b>${r.n}</b> guests`, 'good'); if (modalOpen === 'bus') closeModal(); }
  else { sfx.error(); if (el) shake(el); toast(r.reason === 'gems' ? 'Not enough gems' : r.reason === 'full' ? 'The mountain is full' : 'Not available yet', 'warn'); }
  renderAll(true);
}

async function buyProduct(id: string) {
  const s = app.state;
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const ok = await purchases.purchase(id);
  if (!ok) { toast('Purchase cancelled', 'warn'); return; }
  if (p.kind === 'consumable') { s.gems += p.gems ?? 0; toast(`+${p.gems} gems`, 'good'); }
  else if (id === 'income_x2') { s.purchases.incomeX2 = true; toast('Double Income unlocked', 'good'); }
  sfx.fanfare(); saveNow(); renderAll(true);
}
async function restore() {
  const ids = await purchases.restore();
  if (ids.includes('income_x2')) { app.state.purchases.incomeX2 = true; toast('Purchases restored', 'good'); }
  else toast('Nothing to restore', 'info');
  renderAll(true);
}

function showBusModal() {
  const s = app.state, st = busStatus(s);
  openModal(`<div class="modal-title">${icons.bus} Ski Bus</div>
    <div class="modal-body">Bring <b>${BUS.size} guests</b> right now. They ignore the parking limit and leave after their session.<div class="sub pad">Used today ${st.used}/${BUS.maxPerDay} &middot; you have ${s.gems} gems</div></div>
    <div class="btns col"><button class="btn primary${st.available && ads.isReady() ? '' : ' off'}" data-act="busad"${st.available && ads.isReady() ? '' : ' data-off="1"'}><span class="btn-l">${icons.play} Watch ad</span><span class="btn-c">Free</span></button>
    <button class="btn blue${st.available && s.gems >= BUS.gemCost ? '' : ' off'}" data-act="busgems"${st.available && s.gems >= BUS.gemCost ? '' : ' data-off="1"'}><span class="btn-l">${icons.gem} Use gems</span><span class="btn-c">${BUS.gemCost}</span></button>
    <button class="btn ghost" data-act="dlg-close"><span class="btn-l">Not now</span></button></div>`, 'bus');
}
function showLegal(kind: string) {
  const p = menu.legalPage(kind);
  openModal(`<div class="modal-title">${p.title}</div><div class="modal-body legal">${p.body}</div><div class="btns col"><button class="btn primary" data-act="dlg-close"><span class="btn-l">Close</span></button></div>`, 'legal');
}
function showSeasonConfirm() {
  const s = app.state;
  if (!canNewSeason(s).ok) return;
  const pv = seasonPreview(s);
  openModal(`<div class="modal-title">${icons.season} New Season?</div>
    <div class="modal-body">Your mountain, lifts, money and buildings reset. You keep gems, quests, settings and purchases.
    <div class="big-num">+${pv.gain} Season Points</div>
    <div class="sub pad">Total ${pv.total} points &middot; permanent income x${pv.bonus.toFixed(2)}</div></div>
    <div class="btns col"><button class="btn gold" data-act="season-yes"><span class="btn-l">Start New Season</span></button><button class="btn ghost" data-act="dlg-close"><span class="btn-l">Cancel</span></button></div>`, 'season');
}

// ---------------------------------------------------------------- sheets
function sheetForKind(kind: string): SheetId {
  if (kind === 'parking' || kind === 'housing') return 'people';
  if (kind === 'area') return 'mountain';
  if (kind === 'building' || kind === 'buildingUp') return 'buildings';
  if (kind === 'zone' || kind === 'zoneUp' || kind === 'stage') return 'zones';
  return 'lifts';
}
function openSheet(id: SheetId, focus: string | null = null) {
  open = id; ctx.focus = focus; if (id !== 'lifts') ctx.picker = null;
  $('sheet').classList.remove('hidden');
  $('ui').classList.add('sheet-open');
  renderAll(true);
}
function closeSheet() { open = null; $('sheet').classList.add('hidden'); $('ui').classList.remove('sheet-open'); ctx.picker = null; }
function toggleSheet(id: SheetId) { if (open === id) closeSheet(); else openSheet(id); }

function setupSheetDrag() {
  const grab = $('grab');
  let y0 = 0, dragging = false;
  const head = $('sheet').querySelector('.sheet-h') as HTMLElement;
  for (const el of [grab, head]) {
    el.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('[data-act]')) return; y0 = e.clientY; dragging = true; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!dragging) return; const dy = Math.max(0, e.clientY - y0); $('sheet').style.transform = `translateY(${dy}px)`; });
    const end = (e: PointerEvent) => { if (!dragging) return; dragging = false; const dy = e.clientY - y0; $('sheet').style.transform = ''; if (dy > 70) closeSheet(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
}

function onMapTap(h: MapHit) {
  refreshCtx();
  sfx.tap();
  const s = app.state;
  switch (h.type) {
    case 'line': {
      openSheet('lifts', h.id);
      const l = s.lines.find(x => x.id === h.id);
      if (l && scene) { const ai = AREAS.findIndex(a => a.id === l.areaId); const y = AREAS[ai].band[1] - 200; scene.mv.focus(app.view.cx, y + 260 / scene.mv.zoom * 0.5); }
      break;
    }
    case 'slot': ctx.picker = `${h.areaId}:${h.slot}`; openSheet('lifts', `line-slot`); break;
    case 'area': openSheet('mountain'); break;
    case 'building': openSheet('buildings'); break;
    case 'zone': openSheet('zones'); break;
    case 'parking': case 'lodge': openSheet('people'); break;
  }
}

function onEvent(e: any) {
  if (e.k === 'pay') { if (e.src === 'ride') sfx.coin(); popMoney(); }
  else if (e.k === 'bus') { /* horn played by caller */ }
  else if (e.k === 'angry') {
    const s = app.state;
    if (s.stats.angryLeaves === 1 && !s.rt.firstAngryShown) { s.rt.firstAngryShown = true; toast(ANGRY_TOAST, 'warn'); }
  }
}
let lastPop = 0;
function popMoney() {
  const now = performance.now();
  if (now - lastPop < 160) return;
  lastPop = now;
  const el = document.getElementById('money');
  if (!el) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

// ---------------------------------------------------------------- rendering
function refreshCtx() {
  ctx.s = app.state;
  ctx.now = Date.now();
  ctx.tut = tutorialStep(app.state)?.target ?? null;
}

function mood(): 'good' | 'ok' | 'bad' {
  const s = app.state;
  const recent = s.stats.angryRecent.filter(t => s.rt.time - t <= MOOD.angryWindow).length;
  if (recent >= MOOD.angryCount) return 'bad';
  let fill = 0, n = 0;
  for (const l of s.lines) { fill += l.queue.length / queueCap(l); n++; }
  return n && fill / n > MOOD.queueFill ? 'ok' : 'good';
}

function tabDots(): Record<string, boolean> {
  const s = app.state;
  const list = listPurchases(s);
  const b = bottleneck(s);
  const aff = (kinds: string[]) => list.some(p => kinds.includes(p.kind) && p.cost <= s.money);
  return {
    lifts: aff(['level', 'rebuild', 'newline']),
    people: aff(['parking', 'housing']) && b !== 'lifts',
    mountain: aff(['area']),
    buildings: aff(['building', 'buildingUp']),
    zones: aff(['zone', 'zoneUp', 'stage']),
    shop: busStatus(s).available && s.rt.guests.length < UI.shopDotMaxGuests,
  };
}

let last250 = 0;
function tick(force = false) {
  refreshCtx();
  const s = app.state;
  // top bar every tick
  setHTML($('topbar'), `<div class="tb-left"><div class="tb-rate">${formatMoney(s.incomeEma * 60)}/min</div>
      <div class="cash-pill tb-money" id="money"><i class="coin-badge">${icons.coin}</i><b class="tb-amt">${formatMoney(s.money)}</b></div></div>
    <div class="tb-right"><div class="gem-pill">${icons.gem}<b>${formatNum(s.gems)}</b></div>
      <div class="pop-pill">${icons.people}<b>${s.rt.guests.length}<span>/${maxPop(s)}</span></b>${icons.face(mood())}</div></div>
    <button class="sq-btn menu-btn" data-act="tab" data-a="menu" aria-label="Menu">${icons.gear}</button>`);
  const now = performance.now();
  if (force || now - last250 > 250) { last250 = now; renderAll(false); }
  // map ring for tutorial
  if (scene) {
    const t = tutorialStep(s);
    if (t && (t.target === 'upgrade' || t.target === 'rebuild') && s.lines[0]) {
      const ai = AREAS.findIndex(a => a.id === s.lines[0].areaId);
      const b = AREAS[ai];
      scene.ring((1200 * (s.lines[0].slot + 1)) / (b.slots.length + 1), b.band[1] - 40, 80);
    } else scene.ring(null);
  }
}

function renderAll(immediate: boolean) {
  const s = app.state;
  // quests strip
  setHTML($('quests'), renderQuests(s));
  // tutorial banner
  const t = tutorialStep(s);
  const tut = $('tut');
  if (t) { setHTML(tut, `<div class="tut-in">${icons.info}<span>${t.text}</span></div>`); tut.classList.remove('hidden'); } else tut.classList.add('hidden');
  // dock
  const g = nextGoal(s);
  setHTML($('next'), g ? `<div class="next-t"><span class="next-l">Next</span><span class="next-n">${g.label}</span></div><div class="next-c">${formatMoney(g.cost)}</div>${bar(s.money / Math.max(1, g.cost), s.money >= g.cost ? 'ready' : '')}` : '<div class="next-t"><span class="next-n">Everything built</span></div>');
  $('next').classList.toggle('hidden', !g);
  const bus = busStatus(s);
  $('busfab').classList.toggle('hidden', !(bus.available && (s.tutorial.done || s.tutorial.step >= 5) && s.rt.guests.length < UI.busFabMaxGuests));
  // tabs
  const dots = tabDots();
  for (const tb of TABS) {
    const el = $(`tab-${tb.id}`);
    el.classList.toggle('on', open === tb.id);
    el.querySelector('.dot')!.classList.toggle('hidden', !dots[tb.id]);
    const tpulse = (t?.target === 'upgrade' || t?.target === 'rebuild') ? 'lifts' : t?.target === 'parking' ? 'people' : t?.target === 'mountain' ? 'mountain' : '';
    el.classList.toggle('pulse', tpulse === tb.id && open !== tb.id);
  }
  // let the camera scroll the map above an open sheet (and make room for purchase glides)
  if (scene) scene.mv.padBottom = open ? $('sheet').offsetHeight + 86 : 110;
  // sheet
  if (open) {
    $('sheet-title').textContent = TITLES[open];
    const hint = $('sheet-hint');
    if (HINT_SHEETS.includes(open)) { setHTML(hint, `${icons.info}<span>${bottleneckHint(s)}</span>`); hint.classList.remove('hidden'); } else hint.classList.add('hidden');
    const body = $('sheet-body');
    const mod = MODS[open];
    const html = mod.render(ctx);
    setHTML(body, html);
    if (ctx.focus) {
      const el = ctx.focus === 'line-slot' ? body.querySelector('.picker')?.parentElement : document.getElementById(`line-${ctx.focus}`);
      if (el) { (el as HTMLElement).scrollIntoView({ block: 'nearest' }); ctx.focus = null; }
    }
  }
}
