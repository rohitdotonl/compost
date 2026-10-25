// Vault exports, built in the browser: Markdown, JSON with everything, and an
// Obsidian-friendly zip of one note per Vault item. The builders are pure;
// download() is the only part that touches the page.
import { S } from './strings.js';
import { el } from './api.js';
import { isoDate } from './format.js';
import { makeZip } from './zip.js';

export function vaultMarkdown(vault, now = Date.now()) {
  const lines = [`# ${S.vaultFileTitle}`, '', S.vaultFileExported(isoDate(now)), ''];
  for (const item of vault) {
    const title = item.title.replace(/([\\[\]])/g, '\\$1');
    lines.push(`## [${title}](${item.url.replace(/\)/g, '%29')})`, '', `${item.site} · ${S.finishedOn(isoDate(item.ended_at))}`, '');
    if (item.takeaway) lines.push(`> ${item.takeaway}`, '');
  }
  return lines.join('\n');
}

export function dataJson(data) {
  return JSON.stringify(data, null, 2);
}

// One note per item: YAML frontmatter, then the takeaway.
export function obsidianNote(item) {
  const q = (v) => (v == null ? 'null' : JSON.stringify(String(v))); // JSON strings are valid YAML
  const front = [
    '---',
    `url: ${q(item.url)}`,
    `site: ${q(item.site)}`,
    `saved: ${item.saved_at ? isoDate(item.saved_at) : 'null'}`,
    `finished: ${item.ended_at ? isoDate(item.ended_at) : 'null'}`,
    `intent: ${q(item.intent)}`,
    '---',
    '',
    '',
  ];
  return front.join('\n') + (item.takeaway ? `${item.takeaway}\n` : '');
}

// File names Obsidian and every OS accept, unique within the folder.
export function noteNames(vault) {
  const seen = new Map();
  return vault.map((item) => {
    let base = String(item.title || item.site || 'Untitled')
      .replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
      .replace(/[. ]+$/, '') || 'Untitled';
    const key = base.toLowerCase();
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    if (n > 1) base = `${base} ${n}`;
    return `${base}.md`;
  });
}

export function obsidianZip(vault, date = new Date()) {
  const names = noteNames(vault);
  return makeZip(vault.map((item, i) => ({ name: `${S.exportFolder}/${names[i]}`, data: obsidianNote(item) })), date);
}

// ---------------------------------------------------------------------------

export function exportMarkdown(data) {
  download(vaultMarkdown(data.vault), 'text/markdown', `compost-vault-${isoDate(Date.now())}.md`);
}

export function exportJson(data) {
  download(dataJson(data), 'application/json', `compost-${isoDate(Date.now())}.json`);
}

export function exportObsidian(data) {
  download(obsidianZip(data.vault), 'application/zip', `compost-vault-${isoDate(Date.now())}.zip`);
}

function download(content, type, name) {
  const a = el('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
