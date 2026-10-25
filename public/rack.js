// The Rack tab: the add-link form and one row per article.
import { S } from './strings.js';
import { el } from './api.js';
import * as store from './store.js';
import { fade, timeLeft, weekday } from './format.js';

export function createRackPanel() {
  const input = el('input', { type: 'url', placeholder: S.addPlaceholder, 'aria-label': S.addPlaceholder, required: true });
  const button = el('button', { type: 'submit' }, S.addSubmit);
  const form = el('form', { className: 'add row' }, input, button);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addLink(input, button);
  });
  const list = el('ul', { className: 'list' });
  const element = el('section', { className: 'panel' }, form, list);

  let takeawayDraft = '';   // survives re-renders while the prompt is open
  let lastPromptId = null;

  function render(state) {
    const now = Date.now();
    const items = store.rackItems(now);
    if (!items.length) {
      list.replaceChildren(el('li', { className: 'calm' }, S.rackEmpty));
    } else {
      list.replaceChildren(...items.map((item) => row(item, now, state)));
    }
    if (state.promptId !== lastPromptId) {
      lastPromptId = state.promptId;
      takeawayDraft = '';
      if (state.promptId) list.querySelector('.takeaway input')?.focus();
    }
  }

  function row(item, now, state) {
    const meta = [item.site];
    if (item.minutes) meta.push(S.minutes(item.minutes));
    meta.push(timeLeft(item.expires_at, now));

    const li = el(
      'li',
      { className: 'item', dataset: { id: String(item.id) }, 'aria-selected': String(state.selectedId === item.id) },
      el('a', { className: 'title', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      el('p', { className: 'meta' }, meta.join(' · '), item.intent ? el('span', { className: 'chip' }, S.intents[item.intent]) : null)
    );
    li.style.opacity = fade(item.expires_at - now, store.rules().lifespan);

    if (state.promptId === item.id) {
      li.append(takeawayForm(item));
      return li;
    }

    const doneBtn = el('button', { type: 'button' }, S.done);
    doneBtn.addEventListener('click', () => store.beginDone(item.id));
    const tossBtn = el('button', { type: 'button' }, S.toss);
    tossBtn.addEventListener('click', () => store.toss(item.id));
    const actions = el(
      'div',
      { className: 'actions' },
      el('a', { className: 'button', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, S.open),
      doneBtn,
      tossBtn
    );
    if (!item.extended) {
      const extendBtn = el('button', { type: 'button' }, S.extend);
      extendBtn.addEventListener('click', () => store.extend(item.id));
      actions.append(extendBtn);
    }
    li.append(actions);
    return li;
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
      el('div', { className: 'row' }, field, keep, skip)
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
      store.setStatus(S.savedReceipt(res.used, res.limit, weekday(res.item.expires_at)));
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
