// The main page's shell: passcode, header, tabs, status line and the router.
// Each tab is its own module; the state and the actions live in store.js.
// keys.js drives store.js from the keyboard and handles #vault?q=… and #item/N.
import { S } from './strings.js';
import { askPasscode, el, getPasscode, Unauthorized } from './api.js';
import * as store from './store.js';
import { createRackPanel } from './rack.js';
import { createVaultPanel } from './vault.js';
import { createHeapPanel } from './heap.js';
import { parseHash, startKeys } from './keys.js';

const TABS = ['rack', 'vault', 'heap'];
const root = document.getElementById('app');
let ui = null; // persistent elements, built once per unlock

async function start() {
  if (!getPasscode()) await askPasscode(root, S);
  buildShell();
  store.setUnauthorizedHandler(relogin);
  store.subscribe(render);
  window.addEventListener('hashchange', () => render(store.getState()));
  startKeys({ panels: () => ui && ui.panels, currentTab, render: () => render(store.getState()) });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ui) refresh();
  });

  // Paint the last known list at once, then refresh behind it.
  const painted = store.paintFromCache();
  await refresh(!painted);
}

// Loads from the server. With nothing on screen yet, a failure shows a retry
// page; otherwise a quiet status line is enough.
async function refresh(firstPaint = false) {
  try {
    await store.load();
  } catch (err) {
    if (err instanceof Unauthorized) return relogin();
    if (!firstPaint) return store.setStatus(S.offline);
    root.replaceChildren(
      el('p', { className: 'calm' }, S.offline),
      el('button', { type: 'button', onclick: () => { buildShell(); refresh(true); } }, S.retry)
    );
  }
}

async function relogin() {
  ui = null;
  store.forgetCache();
  await askPasscode(root, S, true);
  buildShell();
  await refresh(true);
}

// ---------------------------------------------------------------------------
// Shell: header, tabs, status line and one panel per tab
// ---------------------------------------------------------------------------

function buildShell() {
  const nav = el('nav', { className: 'tabs' });
  const links = {};
  for (const tab of TABS) {
    links[tab] = el('a', { href: `#${tab}` }, S[`tab${tab[0].toUpperCase()}${tab.slice(1)}`]);
    nav.append(links[tab]);
  }
  const status = el('p', { className: 'status', role: 'status', 'aria-live': 'polite' });
  const panels = { rack: createRackPanel(), vault: createVaultPanel(), heap: createHeapPanel() };
  const header = el('header', {}, el('h1', {}, S.appName), nav);
  const footer = el('p', { className: 'footer' }, el('a', { href: '/bookmarklet', className: 'quiet' }, S.bookmarkletLink));
  root.replaceChildren(header, status, ...TABS.map((t) => panels[t].element), footer);
  ui = { links, status, panels };
  render(store.getState());
}

export function currentTab() {
  const tab = parseHash(location.hash).tab;
  return TABS.includes(tab) ? tab : 'rack';
}

function render(state) {
  if (!ui) return;
  renderStatus(state.status);
  if (!state.data) return;
  const tab = currentTab();
  for (const t of TABS) {
    ui.panels[t].element.hidden = t !== tab;
    if (t === tab) ui.links[t].setAttribute('aria-current', 'page');
    else ui.links[t].removeAttribute('aria-current');
    ui.panels[t].render(state);
  }
}

let shownStatus = null;
function renderStatus(status) {
  if (status === shownStatus) return;
  shownStatus = status;
  if (!status) return ui.status.replaceChildren();
  const parts = [status.text];
  if (status.action) {
    const button = el('button', { type: 'button', className: 'link' }, status.action.label);
    button.addEventListener('click', () => {
      store.setStatus(null);
      status.action.run();
    });
    parts.push(' ', button);
  }
  ui.status.replaceChildren(...parts);
}

// ---------------------------------------------------------------------------

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
start();
