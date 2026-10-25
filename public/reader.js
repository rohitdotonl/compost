// The reader: one article set for reading, at #read/42.
//
// Content comes from GET /api/items/:id/content. The first open of an article
// extracts it in the browser (extract.js) from the raw page the Worker
// fetches, and stores the result for every device. Rack articles are also
// extracted in the background, one at a time while the tab is visible, and
// kept in the Cache API for reading offline.
//
// Hooks for later phases (all on window):
//   'compost:article'        detail { id, item, root }   an article was rendered;
//                            `root` is the element holding the article HTML
//   'compost:progress'       detail { id, progress, activeSeconds }   on scroll
//   'compost:article-closed' detail { id, progress, activeSeconds }
//   currentArticle()         the same fields for the open article, or null
// activeSeconds counts reading time: it pauses while the tab is hidden or
// after 60s without input, and goes to the server with each progress save
// as `seconds` (Phase 8 records it; the Worker ignores it until then).
import { S } from './strings.js';
import { api, el, getPasscode } from './api.js';
import * as store from './store.js';
import { timeLeft } from './format.js';

const ROUTE = /^#read\/(\d+)$/;
const PREFS_KEY = 'compost.reader';
const PROGRESS_KEY = 'compost.progress';
const STATUS_KEY = 'compost.contents';
const CONTENT_CACHE = 'compost-content';
const SAVE_EVERY = 15000;     // progress POSTs at most this often
const CHROME_IDLE = 3000;     // the bar fades after this long without input
const IDLE_LIMIT = 60000;     // reading time stops counting after this long without input
const BACKGROUND_GAP = 1500;  // pause between background extractions
const PREFETCH_IMAGES = 20;   // images per article fetched ahead for offline

const SIZES = [0.85, 0.92, 1, 1.1, 1.2, 1.32];
const WIDTHS = ['56ch', '66ch', '76ch'];
const DEFAULT_PREFS = { size: 2, width: 1, font: 'serif', theme: null };

let view = null;          // the reader's elements, built once
let current = null;       // the open article
let returnScroll = 0;     // rack scroll position to come back to
let fromApp = false;      // entered from the app, so Esc can go back in history
let chromeTimer = null;
let ticker = null;
let saver = null;
let lastInput = Date.now();
let pendingSeconds = 0;   // active seconds not yet sent with a progress save
const contentStatus = new Map(readJSON(STATUS_KEY, []));

export function isReading() {
  return current != null;
}

export function currentArticle() {
  if (!current) return null;
  const { id, item, root, progress, activeSeconds } = current;
  return { id, item, root, progress, activeSeconds };
}

// Built once by app.js. render() runs on every state change and hash change.
export function createReader() {
  view = buildView();
  document.body.append(view.element);
  applyPrefs();
  store.setReader(openFromApp);
  document.addEventListener('click', interceptRackTitle);
  window.addEventListener('keydown', onKey, true);
  for (const type of ['mousemove', 'pointerdown', 'touchstart', 'wheel', 'keydown']) {
    window.addEventListener(type, onInput, { passive: true });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveProgress(true);
    else scheduleBackground();
  });
  window.addEventListener('pagehide', () => saveProgress(true));
  store.subscribe(scheduleBackground);
  return { render };
}

function render(state) {
  const m = location.hash.match(ROUTE);
  const id = m ? Number(m[1]) : null;
  if (current && current.id === id) return;
  if (current) close();
  if (id == null || !state.data) return;
  open(id);
}

// store.open(id): the reader, or the original when extraction already failed.
function openFromApp(id) {
  const item = findItem(id);
  if (!item) return false;
  if (contentStatus.get(id) === 'failed') {
    openOriginal(item);
    return true;
  }
  fromApp = true;
  location.hash = `#read/${id}`;
  return true;
}

// A plain click on a rack row's title opens the reader; the row's Open
// button and modified clicks still go to the original.
function interceptRackTitle(e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = e.target.closest('li.item[data-id] a.title');
  if (!link) return;
  const id = Number(link.closest('li.item').dataset.id);
  if (!store.rackItem(id)) return;
  e.preventDefault();
  store.open(id);
}

function findItem(id) {
  const data = store.getState().data;
  if (!data) return null;
  return data.rack.find((i) => i.id === id) || data.vault.find((i) => i.id === id) || null;
}

// ---------------------------------------------------------------------------
// Opening and closing
// ---------------------------------------------------------------------------

async function open(id) {
  const item = findItem(id);
  if (!item) {
    store.setStatus(S.readerGone);
    location.replace('#rack');
    return;
  }
  returnScroll = window.scrollY;
  current = { id, item, root: null, progress: 0, activeSeconds: 0, dirty: false, userMoved: false };
  document.body.classList.add('reading');
  document.documentElement.dataset.readerTheme = prefs().theme || '';
  view.element.hidden = false;
  fillHead(item, null);
  view.body.replaceChildren(el('p', { className: 'reader-wait' }, S.readerLoading));
  view.end.replaceChildren();
  window.scrollTo(0, 0);
  wakeChrome();

  let content;
  try {
    content = await loadContent(item);
  } catch {
    content = { offline: true };
  }
  if (!current || current.id !== id) return;
  if (content.failed) {
    leave();
    openOriginal(item);
  } else if (content.offline || content.gone) {
    leave();
    store.setStatus(content.gone ? S.readerGone : S.readerOffline);
  } else {
    await renderArticle(item, content);
  }
}

function close() {
  const { id } = current;
  saveProgress(true);
  window.dispatchEvent(new CustomEvent('compost:article-closed', { detail: articleDetail() }));
  clearInterval(ticker);
  clearInterval(saver);
  current = null;
  fromApp = false;
  view.element.hidden = true;
  view.controls.hidden = true;
  view.body.replaceChildren();
  document.body.classList.remove('reading');
  delete document.documentElement.dataset.readerTheme;
  window.scrollTo(0, returnScroll);
  if (store.rackItem(id)) {
    store.select(id);
    requestAnimationFrame(() => document.querySelector(`li.item[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }));
  }
}

// Back to the rack: one step back in history when we came from it.
function leave() {
  if (fromApp && history.length > 1) history.back();
  else location.replace('#rack');
}

function openOriginal(item) {
  const win = window.open(item.url, '_blank');
  if (win) {
    try { win.opener = null; } catch {}
    store.setStatus(S.readerFailed);
  } else {
    store.setStatus(S.readerFailedBlocked, { label: S.readerOriginal, run: () => window.open(item.url, '_blank', 'noopener') });
  }
}

// ---------------------------------------------------------------------------
// Content: the server, the browser's extraction, the offline cache
// ---------------------------------------------------------------------------

// → content { html, byline, minutes, progress, last_read_at }, or
//   { failed } / { offline } / { gone }.
async function loadContent(item) {
  let res;
  try {
    res = await api(`/api/items/${item.id}/content`);
  } catch {
    return (await cacheGet(item.id)) || { offline: true };
  }
  const { status, data } = res;
  if (status === 200 && data.status === 'ok') {
    setStatus(item.id, 'ok');
    if (isRack(item.id)) cachePut(item.id, data);
    return data;
  }
  if (status === 200 && data.status === 'failed') {
    setStatus(item.id, 'failed');
    return { failed: true };
  }
  if (status === 404 && data.error === 'no_content') {
    const extracted = await extractAndStore(item);
    return extracted ? { ...extracted, progress: data.progress, last_read_at: data.last_read_at } : { failed: true };
  }
  return { gone: true };
}

// Fetches the raw page through the Worker, extracts it here and stores the
// result. Resolves to the content, or null when extraction failed (which is
// recorded, so no device tries again). Network errors throw.
async function extractAndStore(item) {
  const raw = await api(`/api/items/${item.id}/raw`);
  let result = null;
  if (raw.status === 200 && raw.data.html) {
    try {
      const { extract } = await import('./extract.js');
      result = await extract(raw.data.html, raw.data.url || item.url);
    } catch (err) {
      console.warn('extract failed', err);
    }
  }
  if (!result) {
    if (raw.status !== 404) await api(`/api/items/${item.id}/content`, { status: 'failed' });
    setStatus(item.id, 'failed');
    return null;
  }
  const { html, text, words, excerpt, byline } = result;
  const saved = await api(`/api/items/${item.id}/content`, { html, text, words, excerpt, byline });
  const minutes = (saved.data && saved.data.minutes) || result.minutes;
  if (minutes && minutes !== item.minutes) store.patchItem(item.id, { minutes });
  const content = { status: 'ok', html, words, excerpt, byline, minutes };
  if (saved.status === 200 && saved.data.status === 'ok') {
    setStatus(item.id, 'ok');
    if (isRack(item.id)) cachePut(item.id, content);
  }
  return content;
}

function setStatus(id, status) {
  if (contentStatus.get(id) === status) return;
  contentStatus.set(id, status);
  writeJSON(STATUS_KEY, [...contentStatus]);
}

function isRack(id) {
  return !!store.rackItem(id);
}

const cacheKey = (id) => `/__compost/content/${id}`;
const hasCaches = () => typeof caches !== 'undefined';

async function cachePut(id, content) {
  if (!hasCaches()) return;
  try {
    const cache = await caches.open(CONTENT_CACHE);
    await cache.put(cacheKey(id), new Response(JSON.stringify(content), { headers: { 'Content-Type': 'application/json' } }));
  } catch {}
}

async function cacheGet(id) {
  if (!hasCaches()) return null;
  try {
    const hit = await (await caches.open(CONTENT_CACHE)).match(cacheKey(id));
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

async function cacheHas(id) {
  if (!hasCaches()) return false;
  try { return !!(await (await caches.open(CONTENT_CACHE)).match(cacheKey(id))); } catch { return false; }
}

// Keeps only the rack's articles. Images are capped by the service worker.
async function cacheEvict(keepIds) {
  if (!hasCaches()) return;
  try {
    const cache = await caches.open(CONTENT_CACHE);
    for (const request of await cache.keys()) {
      const id = Number(new URL(request.url).pathname.split('/').pop());
      if (!keepIds.has(id)) await cache.delete(request);
    }
  } catch {}
}

// Asks for each article image once, so the service worker keeps it.
async function prefetchImages(html) {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sources = [...doc.querySelectorAll('img[src^="/img?"]')].slice(0, PREFETCH_IMAGES).map((img) => img.getAttribute('src'));
  for (const src of sources) {
    try { await fetch(src); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Background: extract and cache the rack, one article at a time
// ---------------------------------------------------------------------------

let backgroundTimer = null;
let backgroundRunning = false;
let statusesLoadedAt = 0;
const attempted = new Set();

function scheduleBackground() {
  clearTimeout(backgroundTimer);
  backgroundTimer = setTimeout(runBackground, 2000);
}

async function runBackground() {
  if (backgroundRunning || document.visibilityState !== 'visible' || !navigator.onLine) return;
  if (!store.getState().data || !getPasscode()) return;
  backgroundRunning = true;
  try {
    const rack = store.rackItems();
    await cacheEvict(new Set(rack.map((i) => i.id)));
    if (Date.now() - statusesLoadedAt > 60000) {
      const { status, data } = await api('/api/contents');
      if (status === 200) {
        statusesLoadedAt = Date.now();
        for (const row of data.contents) setStatus(row.id, row.status);
      }
    }
    for (const item of rack) {
      if (document.visibilityState !== 'visible') break;
      if (attempted.has(item.id) || (current && current.id === item.id)) continue;
      const known = contentStatus.get(item.id);
      if (known === 'failed') continue;
      if (known === 'ok' && (await cacheHas(item.id))) continue;
      attempted.add(item.id);
      const content = known === 'ok' ? await fetchToCache(item) : await extractAndStore(item);
      if (content && content.html) await prefetchImages(content.html);
      await new Promise((r) => setTimeout(r, BACKGROUND_GAP));
    }
  } catch {
    // Offline or signed out: try again on the next change.
  } finally {
    backgroundRunning = false;
  }
}

async function fetchToCache(item) {
  const { status, data } = await api(`/api/items/${item.id}/content`);
  if (status !== 200 || data.status !== 'ok') return null;
  await cachePut(item.id, data);
  return data;
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

function buildView() {
  const back = el('a', { href: '#rack', className: 'reader-back', 'aria-label': S.readerBackLabel }, '← ', S.readerBack);
  back.addEventListener('click', (e) => { e.preventDefault(); leave(); });
  const aa = el('button', { type: 'button', className: 'reader-aa', 'aria-label': S.readerSettingsLabel, 'aria-expanded': 'false' }, S.readerSettings);
  const original = el('a', { className: 'reader-original', target: '_blank', rel: 'noopener noreferrer' }, S.readerOriginal);
  const bar = el('nav', { className: 'reader-bar' }, back, el('span', { className: 'reader-spacer' }), aa, original);
  const controls = buildControls();
  controls.hidden = true;
  aa.addEventListener('click', () => {
    controls.hidden = !controls.hidden;
    aa.setAttribute('aria-expanded', String(!controls.hidden));
    wakeChrome();
  });

  const favicon = el('img', { className: 'reader-favicon', alt: '', width: 16, height: 16 });
  favicon.addEventListener('error', () => (favicon.hidden = true));
  const site = el('span', {});
  const title = el('h1', { className: 'reader-title' });
  const meta = el('p', { className: 'reader-meta' });
  const head = el('header', { className: 'reader-head' }, el('p', { className: 'reader-site' }, favicon, site), title, meta);
  const body = el('div', { className: 'reader-body' });
  const end = el('footer', { className: 'reader-end' });
  const page = el('article', { className: 'reader-page' }, head, body, end);
  const element = el('div', { className: 'reader', hidden: true }, bar, controls, page);
  return { element, bar, aa, controls, original, favicon, site, title, meta, body, end };
}

function fillHead(item, content) {
  view.original.href = item.url;
  const favicon = item.favicon_url ? proxied(item.favicon_url) : null;
  view.favicon.hidden = !favicon;
  if (favicon) view.favicon.src = favicon;
  else view.favicon.removeAttribute('src');
  view.site.textContent = item.site;
  view.title.textContent = item.title;
  const parts = [];
  const byline = content && content.byline;
  if (byline) parts.push(byline);
  const minutes = (content && content.minutes) || item.minutes;
  if (minutes) parts.push(S.minutes(minutes));
  if (item.outcome == null) parts.push(timeLeft(item.expires_at, Date.now()));
  view.meta.textContent = parts.join(' · ');
}

function proxied(url) {
  return url.startsWith('/') ? url : `/img?u=${encodeURIComponent(url)}`;
}

async function renderArticle(item, content) {
  const { sanitize } = await import('./extract.js');
  if (!current || current.id !== item.id) return;
  fillHead(item, content);
  view.body.replaceChildren(sanitize(content.html));
  current.root = view.body;
  for (const img of view.body.querySelectorAll('img')) {
    img.addEventListener('load', restoreScroll);
    img.addEventListener('error', () => {
      (img.closest('figure') || img).hidden = true;
      restoreScroll();
    });
  }
  renderEnd(item);

  current.progress = resumePoint(item, content);
  current.restoreTo = current.progress;
  restoreScroll();
  ticker = setInterval(tick, 1000);
  saver = setInterval(() => saveProgress(false), SAVE_EVERY);
  window.dispatchEvent(new CustomEvent('compost:article', { detail: { id: item.id, item, root: view.body } }));
}

// Done and Toss for rack articles. Done asks for the takeaway in place.
function renderEnd(item) {
  if (item.outcome != null) return view.end.replaceChildren();
  const doneBtn = el('button', { type: 'button' }, S.done);
  const tossBtn = el('button', { type: 'button' }, S.toss);
  doneBtn.addEventListener('click', () => askTakeaway(item));
  tossBtn.addEventListener('click', () => {
    saveProgress(true);
    store.toss(item.id);
    leave();
  });
  view.end.replaceChildren(el('div', { className: 'actions' }, doneBtn, tossBtn));
}

function askTakeaway(item) {
  const field = el('input', { type: 'text', maxLength: 500, 'aria-label': S.takeawayPrompt, enterKeyHint: 'done' });
  const keep = el('button', { type: 'submit' }, S.keep);
  const skip = el('button', { type: 'button' }, S.skip);
  const form = el('form', { className: 'takeaway' }, el('label', {}, S.takeawayPrompt), el('div', { className: 'row' }, field, keep, skip));
  const finish = (takeaway) => {
    saveProgress(true);
    store.done(item.id, takeaway);
    leave();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); finish(field.value.trim()); });
  skip.addEventListener('click', () => finish(''));
  view.end.replaceChildren(form);
  field.focus();
}

// ---------------------------------------------------------------------------
// Progress, reading time and the fading bar
// ---------------------------------------------------------------------------

// The most recent of the server's position and this device's own copy
// (which also covers saves made while offline).
function resumePoint(item, content) {
  const local = readJSON(PROGRESS_KEY, {})[item.id];
  const serverAt = content.last_read_at || item.last_read_at || 0;
  const server = Number(content.progress ?? item.progress) || 0;
  if (local && local.t > serverAt) return local.p;
  return server;
}

function scrollFraction() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
}

// Images arriving change the height, so the restore is applied again on each
// until the reader moves.
function restoreScroll() {
  if (!current || current.userMoved || !current.restoreTo || current.restoreTo < 0.01) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.round(current.restoreTo * max));
}

let scrollQueued = false;
function onScroll() {
  if (!current || !current.root || scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    if (!current || !current.root) return;
    const progress = scrollFraction();
    if (Math.abs(progress - current.progress) < 0.0005) return;
    current.progress = progress;
    current.dirty = true;
    window.dispatchEvent(new CustomEvent('compost:progress', { detail: articleDetail() }));
  });
}

function onInput(e) {
  lastInput = Date.now();
  if (!current) return;
  if (e.type !== 'wheel') wakeChrome();
  if (e.type === 'wheel'|| e.type === 'touchstart' || e.type === 'keydown' || e.type === 'pointerdown') current.userMoved = true;
}

// One second of reading, if the tab is visible and someone is there.
function tick() {
  if (!current || document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_LIMIT) return;
  current.activeSeconds++;
  pendingSeconds++;
}

// Sends the position (and the reading seconds since the last save). With
// keepalive it survives the tab closing.
function saveProgress(keepalive) {
  if (!current || !current.root) return;
  if (!current.dirty && !pendingSeconds) return;
  const { id, item } = current;
  const progress = Math.round(current.progress * 10000) / 10000;
  const seconds = pendingSeconds;
  pendingSeconds = 0;
  current.dirty = false;
  const at = Date.now();
  item.progress = progress;
  item.last_read_at = at;
  const local = readJSON(PROGRESS_KEY, {});
  local[id] = { p: progress, t: at };
  writeJSON(PROGRESS_KEY, local);
  fetch(`/api/items/${id}/progress`, {
    method: 'POST',
    keepalive,
    headers: { 'Content-Type': 'application/json', 'X-Passcode': getPasscode() },
    body: JSON.stringify({ progress, seconds }),
  })
    .then((res) => { if (!res.ok && res.status !== 404) pendingSeconds += seconds; })
    .catch(() => { pendingSeconds += seconds; });
}

function articleDetail() {
  const { id, progress, activeSeconds } = current;
  return { id, progress, activeSeconds };
}

function wakeChrome() {
  if (!view) return;
  view.bar.classList.remove('faded');
  clearTimeout(chromeTimer);
  chromeTimer = setTimeout(() => {
    if (!current || !view.controls.hidden || view.bar.contains(document.activeElement)) return;
    view.bar.classList.add('faded');
  }, CHROME_IDLE);
}

// Esc goes back one level; Shift+O opens the original. Runs before other
// key handlers while reading, and stops them for the keys it takes.
function onKey(e) {
  if (!current) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.key === 'Escape') {
    e.stopImmediatePropagation();
    e.preventDefault();
    if (!view.controls.hidden) {
      view.controls.hidden = true;
      view.aa.setAttribute('aria-expanded', 'false');
    } else if (view.end.querySelector('form')) {
      renderEnd(current.item);
    } else {
      leave();
    }
  } else if (!typing && e.key === 'O' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.stopImmediatePropagation();
    e.preventDefault();
    window.open(current.item.url, '_blank', 'noopener');
  }
}

// ---------------------------------------------------------------------------
// Reading settings (this device only)
// ---------------------------------------------------------------------------

function prefs() {
  return { ...DEFAULT_PREFS, ...readJSON(PREFS_KEY, {}) };
}

function setPref(key, value) {
  writeJSON(PREFS_KEY, { ...prefs(), [key]: value });
  applyPrefs();
}

function applyPrefs() {
  const p = prefs();
  const r = view.element;
  r.style.setProperty('--r-scale', SIZES[p.size] ?? 1);
  r.style.setProperty('--r-measure', WIDTHS[p.width] ?? WIDTHS[1]);
  r.dataset.font = p.font;
  if (current) document.documentElement.dataset.readerTheme = p.theme || '';
  for (const button of view.controls.querySelectorAll('[aria-pressed]')) {
    button.setAttribute('aria-pressed', String(p[button.dataset.pref] === button.dataset.value));
  }
  view.controls.querySelector('[data-step="size-"]').disabled = p.size <= 0;
  view.controls.querySelector('[data-step="size+"]').disabled = p.size >= SIZES.length - 1;
  view.controls.querySelector('[data-step="width-"]').disabled = p.width <= 0;
  view.controls.querySelector('[data-step="width+"]').disabled = p.width >= WIDTHS.length - 1;
}

function buildControls() {
  const step = (key, delta, text, label) => {
    const button = el('button', { type: 'button', dataset: { step: `${key}${delta > 0 ? '+' : '-'}` }, 'aria-label': label || text }, text);
    button.addEventListener('click', () => {
      const max = (key === 'size' ? SIZES : WIDTHS).length - 1;
      setPref(key, Math.min(max, Math.max(0, prefs()[key] + delta)));
    });
    return button;
  };
  const choice = (key, value, text) => {
    const button = el('button', { type: 'button', dataset: { pref: key, value }, 'aria-pressed': 'false' }, text);
    // Pressing the chosen page colour again goes back to following the system.
    button.addEventListener('click', () => setPref(key, key === 'theme' && prefs().theme === value ? null : value));
    return button;
  };
  const row = (label, ...buttons) => el('div', { className: 'reader-control' }, el('span', {}, label), el('div', {}, ...buttons));
  return el(
    'div',
    { className: 'reader-controls', role: 'group', 'aria-label': S.readerSettingsLabel },
    row(S.readerSize, step('size', -1, S.readerSmaller, S.readerSmallerLabel), step('size', 1, S.readerLarger, S.readerLargerLabel)),
    row(S.readerWidth, step('width', -1, S.readerNarrower), step('width', 1, S.readerWider)),
    row(S.readerFont, choice('font', 'serif', S.readerFonts.serif), choice('font', 'sans', S.readerFonts.sans)),
    row(S.readerTheme, ...['light', 'sepia', 'dark'].map((t) => choice('theme', t, S.readerThemes[t])))
  );
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
