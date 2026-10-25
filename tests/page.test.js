import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliseUrl, parsePage } from '../src/page.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('normaliseUrl strips tracking params and the fragment', () => {
  assert.equal(
    normaliseUrl('https://Example.com/post?utm_source=x&id=7&fbclid=abc#section'),
    'https://example.com/post?id=7'
  );
  assert.equal(normaliseUrl('  https://example.com/post?utm_medium=mail '), 'https://example.com/post');
});

test('normaliseUrl rejects anything that is not http(s)', () => {
  assert.equal(normaliseUrl('ftp://example.com/x'), null);
  assert.equal(normaliseUrl('javascript:alert(1)'), null);
  assert.equal(normaliseUrl('not a url'), null);
  assert.equal(normaliseUrl(42), null);
  assert.equal(normaliseUrl(null), null);
});

test('normaliseUrl keeps meaningful query parameters and order', () => {
  assert.equal(normaliseUrl('https://example.com/?b=2&a=1'), 'https://example.com/?b=2&a=1');
});

test('parsePage prefers og:title, decodes entities, estimates minutes', () => {
  const { title, minutes } = parsePage(fixture('article.html'));
  assert.equal(title, 'Why Slow Reading Wins & What It Costs');
  assert.equal(minutes, 1);
});

test('parsePage falls back to <title> and gives no estimate for short pages', () => {
  const { title, minutes } = parsePage(fixture('bare.html'));
  assert.equal(title, 'Short & sweet');
  assert.equal(minutes, null);
});

test('parsePage copes with pages that have neither', () => {
  assert.deepEqual(parsePage('<p>hi</p>'), { title: null, minutes: null });
});
