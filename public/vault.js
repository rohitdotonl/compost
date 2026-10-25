// The Vault tab: finished articles with their takeaways, search and export.
import { S } from './strings.js';
import { el } from './api.js';
import * as store from './store.js';
import { isoDate, shortDate } from './format.js';

export function createVaultPanel() {
  let query = '';
  const search = el('input', { type: 'search', placeholder: S.vaultSearch, 'aria-label': S.vaultSearch });
  search.addEventListener('input', () => {
    query = search.value;
    render(store.getState());
  });
  const download = el('a', { href: '#', className: 'quiet' }, S.vaultDownload);
  download.addEventListener('click', (e) => {
    e.preventDefault();
    downloadVault(store.getState().data.vault);
  });
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
    const q = query.trim().toLowerCase();
    const items = q ? vault.filter((item) => vaultMatches(item, q)) : vault;
    if (!items.length) {
      list.replaceChildren(el('li', { className: 'calm' }, S.vaultNoMatch));
      return;
    }
    list.replaceChildren(...items.map(row));
  }

  // The takeaway is what was earned, so it leads; the title follows, small.
  function row(item) {
    return el(
      'li',
      { className: `item vault-item${item.takeaway ? '' : ' no-takeaway'}` },
      item.takeaway ? el('blockquote', { className: 'takeaway-text' }, item.takeaway) : null,
      el('a', { className: 'title', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      el('p', { className: 'meta' }, `${item.site} · ${S.finishedOn(shortDate(item.ended_at))}`)
    );
  }

  return { element, render, focusSearch: () => search.focus() };
}

// The search filter: one predicate, so a smarter search can replace it.
export function vaultMatches(item, q) {
  return [item.title, item.site, item.url, item.takeaway].some((f) => f && f.toLowerCase().includes(q));
}

function downloadVault(vault) {
  const lines = [`# ${S.vaultFileTitle}`, '', S.vaultFileExported(isoDate(Date.now())), ''];
  for (const item of vault) {
    const title = item.title.replace(/([\\[\]])/g, '\\$1');
    lines.push(`## [${title}](${item.url.replace(/\)/g, '%29')})`, '', `${item.site} · ${S.finishedOn(isoDate(item.ended_at))}`, '');
    if (item.takeaway) lines.push(`> ${item.takeaway}`, '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `compost-vault-${isoDate(Date.now())}.md` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
