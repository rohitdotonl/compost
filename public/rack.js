// The Rack tab: the add-link form and one row per article.
import { S } from './strings.js';
import { el } from './api.js';
import * as store from './store.js';
import { decay, fade, proxiedImg, thumbnail, timeLeft, untilDay, urlPath } from './format.js';
import { takeawayChoices } from './highlights.js';

export function createRackPanel() {
  const input = el('input', { type: 'url', placeholder: S.addPlaceholder, 'aria-label': S.addPlaceholder, required: true });
  const button = el('button', { type: 'submit' }, S.addSubmit);
  const form = el('form', { className: 'add row' }, input, button);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addLink(input, button);
  });
  const list = el('ul', { className: 'list rack' });
  const element = el('section', { className: 'panel' }, form, list);

  let takeawayDraft = '';    // survives re-renders while the prompt is open
  let lastPromptId = null;
  let shown = [];            // [id, li] as last rendered, in order
  const leaving = new Map(); // id → { node, beforeId } while a row slides out

  function render(state) {
    const now = Date.now();
    const items = store.rackItems(now);
    const ids = new Set(items.map((i) => i.id));
    noticeLeavers(state, ids);
    shown = items.map((item) => [item.id, row(item, now, state)]);

    const children = [];
    for (const [id, li] of shown) {
      for (const ghost of leaving.values()) if (ghost.beforeId === id) children.push(ghost.node);
      children.push(li);
    }
    for (const ghost of leaving.values()) if (!ids.has(ghost.beforeId)) children.push(ghost.node);
    if (!children.length) children.push(el('li', { className: 'calm' }, S.rackEmpty));
    list.replaceChildren(...children);

    if (state.promptId !== lastPromptId) {
      lastPromptId = state.promptId;
      takeawayDraft = '';
      if (state.promptId) list.querySelector('.takeaway input')?.focus();
    }
  }

  // A row that has just gone to the Vault or the Heap (Done, Toss) slides
  // out, unless reduced motion is asked for. Its old node stays in the list
  // as an inert ghost until the animation ends.
  function noticeLeavers(state, ids) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    shown.forEach(([id, li], index) => {
      if (ids.has(id) || leaving.has(id) || !leftJustNow(state.data, id)) return;
      const height = li.offsetHeight;
      if (!height) return;
      const next = shown.slice(index + 1).find(([other]) => ids.has(other));
      li.classList.add('leaving');
      li.setAttribute('aria-hidden', 'true');
      li.inert = true;
      leaving.set(id, { node: li, beforeId: next ? next[0] : null });
      const anim = li.animate(
        [
          { opacity: getComputedStyle(li).opacity, transform: 'none', height: `${height}px` },
          { opacity: 0, transform: 'translateX(40px)', height: `${height}px`, offset: 0.6 },
          { opacity: 0, transform: 'translateX(40px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' },
        ],
        { duration: 260, easing: 'ease-in', fill: 'forwards' }
      );
      const finish = () => {
        leaving.delete(id);
        render(store.getState());
      };
      anim.finished.then(finish, finish);
    });
  }

  function row(item, now, state) {
    const lifespan = store.rules().lifespan;
    const bare = !item.image_url && !item.description;
    const titleText = item.title === item.url ? urlPath(item.url) : item.title;
    let subtitle = null;
    if (item.description) subtitle = el('p', { className: 'desc' }, item.description);
    else if (item.title !== item.url) subtitle = el('p', { className: 'desc path' }, urlPath(item.url));

    const li = el(
      'li',
      { className: `item${bare ? ' bare' : ''}`, dataset: { id: String(item.id) }, 'aria-selected': String(state.selectedId === item.id) },
      el(
        'div',
        { className: 'body' },
        el('a', { className: 'title', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, titleText),
        metaLine(item, now),
        subtitle,
        item.note ? el('p', { className: 'note' }, item.note) : null
      ),
      thumbnail(item)
    );
    li.style.opacity = fade(item.expires_at - now, lifespan);
    li.style.setProperty('--decay', decay(item.expires_at - now, lifespan).toFixed(2));

    li.append(state.promptId === item.id ? takeawayForm(item) : actions(item, bare));
    return li;
  }

  // favicon site · author · N min · time left
  function metaLine(item, now) {
    const icon = proxiedImg(item.favicon_url, { className: 'favicon', width: 16, height: 16 }, (img) => img.remove());
    const parts = [item.site];
    if (item.author) parts.push(item.author);
    if (item.minutes) parts.push(S.minutes(item.minutes));
    return el('p', { className: 'meta' }, icon, `${parts.join(' · ')} · `, el('span', { className: 'when' }, timeLeft(item.expires_at, now)));
  }

  function actions(item, bare) {
    const button = (label, run) => {
      const b = el('button', { type: 'button', className: 'text' }, label);
      b.addEventListener('click', run);
      return b;
    };
    const bar = el(
      'div',
      { className: 'actions' },
      el('a', { className: 'text open', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, S.open),
      button(S.done, () => store.beginDone(item.id)),
      button(S.toss, () => store.toss(item.id))
    );
    if (!item.extended) bar.append(button(S.extend, () => store.extend(item.id)));
    bar.append(intentPicker(item));
    if (bare) {
      const refresh = button(S.refreshDetails, async () => {
        refresh.disabled = true;
        const updated = await store.refreshDetails(item.id);
        if (updated && !updated.image_url && !updated.description && updated.title === item.title) store.setStatus(S.refreshNothing);
      });
      bar.append(refresh);
    }
    return bar;
  }

  // A plain select that reads as quiet text until an intent is set.
  function intentPicker(item) {
    const select = el('select', { className: `intent${item.intent ? ' set' : ''}`, 'aria-label': S.intentLabel });
    select.append(el('option', { value: '' }, item.intent ? S.intentNone : S.intentLabel));
    for (const [value, label] of Object.entries(S.intents)) {
      select.append(el('option', { value, selected: item.intent === value }, label));
    }
    select.addEventListener('change', () => store.setIntent(item.id, select.value || null));
    return select;
  }

  function takeawayForm(item) {
    const field = el('input', { type: 'text', maxLength: 500, value: takeawayDraft, 'aria-label': S.takeawayPrompt, enterKeyHint: 'done' });
    field.addEventListener('input', () => (takeawayDraft = field.value));
    const keep = el('button', { type: 'submit' }, S.keep);
    const skip = el('button', { type: 'button' }, S.skip);
    const prompt = el(
      'form',
      { className: 'takeaway' },
      el('label', {}, S.takeawayPrompt),
      el('div', { className: 'row' }, field, keep, skip),
      takeawayChoices(item, field) // Phase 5: a highlight as the takeaway
    );
    prompt.addEventListener('submit', (e) => {
      e.preventDefault();
      store.done(item.id, field.value.trim());
    });
    skip.addEventListener('click', () => store.done(item.id, ''));
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') store.cancelDone();
    });
    return prompt;
  }

  async function addLink(field, submit) {
    const url = field.value.trim();
    if (!url) return;
    submit.disabled = true;
    const res = await store.add(url);
    submit.disabled = false;
    if (!res) return;
    if (res.status === 'saved') {
      field.value = '';
      store.setStatus(S.slotReceipt(res.used, res.limit, untilDay(res.item.expires_at)));
    } else if (res.status === 'in_rack') {
      field.value = '';
      store.setStatus(S.alreadyInRack);
    } else if (res.status === 'in_vault') {
      field.value = '';
      store.setStatus(S.alreadyInVault);
    } else if (res.status === 'full') {
      // The Save page owns the drop-one-to-make-room flow.
      location.href = `/save?url=${encodeURIComponent(url)}`;
    } else if (res.status === 'invalid_url') {
      store.setStatus(S.invalidLink);
    }
  }

  // Paste anywhere (keys.js) saves through the same flow and receipt.
  function addUrl(url) {
    input.value = url;
    addLink(input, button);
  }

  return { element, render, focusAdd: () => input.focus(), addUrl };
}

// True when a row left the rack by hand a moment ago: Done or Toss.
function leftJustNow(data, id) {
  const recent = (i) => i.id === id && i.ended_at > Date.now() - 5000;
  return data.vault.some(recent) || data.heap.some((i) => recent(i) && i.outcome === 'tossed');
}
