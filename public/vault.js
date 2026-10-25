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
  let editingId = null; // Vault row whose takeaway is being rewritten (Phase 6)
  let draft = '';       // its text, kept across re-renders
  let rendering = false;
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
    rendering = true;
    list.replaceChildren(...items.map(row));
    rendering = false;
    const field = list.querySelector('.takeaway-edit');
    if (field && document.activeElement !== field) {
      field.focus();
      field.setSelectionRange(draft.length, draft.length);
    }
  }

  // The takeaway is what was earned, so it leads; the title follows, small.
  function row(item) {
    return el(
      'li',
      { className: `item vault-item${item.takeaway ? '' : ' no-takeaway'}`, dataset: { id: String(item.id) } },
      editingId === item.id ? takeawayField(item) : item.takeaway ? takeawayQuote(item) : null,
      el('a', { className: 'title', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      el('p', { className: 'meta' }, `${item.site} · ${S.finishedOn(shortDate(item.ended_at))}`)
    );
  }

  // Click the takeaway (or press e on the row) to rewrite it: Enter saves, Esc cancels.
  function takeawayQuote(item) {
    const quote = el('blockquote', { className: 'takeaway-text editable', title: S.takeawayEdit }, item.takeaway);
    quote.addEventListener('click', () => editTakeaway(item.id));
    return quote;
  }

  function takeawayField(item) {
    const field = el('input', { type: 'text', className: 'takeaway-edit', maxLength: 500, value: draft, 'aria-label': S.takeawayEdit, enterKeyHint: 'done' });
    const finish = (save) => {
      if (editingId !== item.id) return;
      editingId = null;
      if (save && draft.trim() !== (item.takeaway || '')) store.editTakeaway(item.id, draft.trim());
      else render(store.getState());
    };
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    field.addEventListener('input', () => (draft = field.value));
    field.addEventListener('blur', () => rendering || finish(false));
    return field;
  }

  function editTakeaway(id) {
    const item = store.getState().data.vault.find((i) => i.id === id);
    if (!item) return;
    editingId = id;
    draft = item.takeaway || '';
    render(store.getState());
    list.querySelector('.takeaway-edit')?.select();
  }

  function setQuery(q) {
    search.value = query = q;
    if (store.getState().data) render(store.getState());
  }

  return { element, render, focusSearch: () => search.focus(), setQuery, editTakeaway };
}
