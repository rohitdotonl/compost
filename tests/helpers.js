// Drives the real Worker (src/worker.js) against an in-memory database, with
// the clock and the page fetcher under the test's control.
import { handle } from '../src/worker.js';
import { openDatabase } from './d1.js';

export const PASSCODE = 'test';
export const T0 = Date.parse('2026-10-05T09:00:00Z'); // a Monday

// Pages the fake network knows about. Anything else fails like a timeout.
const PAGES = {
  'https://example.com/a': { title: 'Article A', minutes: 4 },
  'https://example.com/b': { title: 'Article B', minutes: null },
};

export function makeApp({ pages = PAGES } = {}) {
  const db = openDatabase();
  const env = { PASSCODE, DB: db, ASSETS: { fetch: async () => new Response('asset') } };
  const fetchPage = async (url) => pages[url] || { title: null, minutes: null };

  // call('POST', '/api/items', { url }, { now, passcode }) → { status, data }
  async function call(method, path, body, { now = T0, passcode = PASSCODE } = {}) {
    const headers = { 'X-Passcode': passcode };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const request = new Request(`http://compost.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await handle(request, env, { now, fetchPage });
    return { status: res.status, data: await res.json() };
  }

  const save = (url, opts, body = {}) => call('POST', '/api/items', { url, ...body }, opts);
  const list = (opts) => call('GET', '/api/items', undefined, opts).then((r) => r.data);

  return { db, env, call, save, list };
}
