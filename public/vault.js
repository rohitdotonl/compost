// The Vault tab: finished articles with their takeaways, search and export.
import { S } from './strings.js';
import { el } from './api.js';
import * as store from './store.js';
import { shortDate } from './format.js';
import { matches, parseQuery } from './search.js';
import { exportJson, exportMarkdown, exportObsidian } from './export.js';

export function createVaultPanel() {
  let query = '';
  const search = el('input', { type: 'search', placeholder: S.vaultSearch, 'aria-label': S.vaultSearch });
  search.addEventListener('input', () => {
    query = search.value;
    // Keeps the search linkable as #vault?q=…
    history.replaceState(null, '', query.trim() ? `#vault?q=${encodeURIComponent(query.trim())}` : '#vault');
    render(store.getState());
  });
  const exportLink = (label, run) => {
    const a = el('a', { href: '#', className: 'quiet' }, label);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      run(store.getState().data);
    });
    return a;
  };
  const download = el(
    'span',
    { className: 'quiet' },
    `${S.exportLabel} `,
    exportLink(S.exportMarkdown, exportMarkdown), ' · ',
    exportLink(S.exportJson, exportJson), ' · ',
    exportLink(S.exportObsidian, exportObsidian)
  );
  const list = el('ul', { className: 'list' });
  const element = el(
    'section',
    { className: 'panel' },
    el('div', { className: 'row' }, search),
    list,
    el('p', { className: 'footer' }, download)
  );

  function render(state) {
    const vault = state.data.vault;
    if (!vault.length) {
      list.replaceChildren(el('li', { className: 'calm' }, S.vaultEmpty));
      return;
    }
    const parsed = parseQuery(query);
    const items = vault.filter((i) => matches(i, parsed));
    if (!items.length) {
      list.replaceChildren(el('li', { className: 'calm' }, S.vaultNoMatch));
      return;
    }
    list.replaceChildren(...items.map(row));
  }

  function row(item) {
    return el(
      'li',
      { className: 'item', dataset: { id: String(item.id) } },
      el('a', { className: 'title', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      el('p', { className: 'meta' }, `${item.site} · ${S.finishedOn(shortDate(item.ended_at))}`),
      item.takeaway ? el('blockquote', {}, item.takeaway) : null
    );
  }

  function setQuery(q) {
    search.value = query = q;
    if (store.getState().data) render(store.getState());
  }

  return { element, render, focusSearch: () => search.focus(), setQuery };
}
