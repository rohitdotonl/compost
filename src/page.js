// URLs and page info: normalising a link, fetching a page for its title and
// a reading-time estimate. Phase 1 extends parsePage with image, description,
// favicon and author.
import { FETCH_TIMEOUT, TRACKING_PARAMS, WORDS_PER_MINUTE } from './rules.js';

export function normaliseUrl(input) {
  if (typeof input !== 'string') return null;
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) url.searchParams.delete(key);
  }
  let out = url.toString();
  if (out.endsWith('?')) out = out.slice(0, -1);
  return out;
}

// Fetches the page once for its title and a reading-time estimate.
// Any failure just means no title and no estimate.
export async function fetchPageInfo(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Compost/1.0; personal read-later)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok || !/html/i.test(res.headers.get('content-type') || '')) {
      return { title: null, minutes: null };
    }
    return parsePage(await readCapped(res, 3_000_000));
  } catch {
    return { title: null, minutes: null };
  }
}

async function readCapped(res, maxBytes) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return html;
}

export function parsePage(html) {
  const og =
    html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
  const tag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(decodeEntities((og && og[1]) || (tag && tag[1]) || '')).slice(0, 300) || null;

  const body = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
  const text = decodeEntities(
    body
      .replace(/<(script|style|noscript|svg|template|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const minutes = words >= 150 ? Math.max(1, Math.round(words / WORDS_PER_MINUTE)) : null;
  return { title, minutes };
}

export function decodeEntities(s) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·' };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return named[e.toLowerCase()] ?? m;
  });
}

export function cleanText(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

// Phase 4: the raw HTML for extraction in the browser, fetched the same way
// as fetchPageInfo (same agent, timeout and size cap) but not parsed here.
// Resolves to { ok: true, url, html } with the URL after redirects, or
// { ok: false, reason }.
export async function fetchRawPage(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Compost/1.0; personal read-later)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    if (!/html/i.test(res.headers.get('content-type') || '')) return { ok: false, reason: 'not_html' };
    return { ok: true, url: res.url || url, html: await readCapped(res, 3_000_000) };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
