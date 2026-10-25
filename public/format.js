// Dates, time left in words, the expiry fade, image addresses and the row
// thumbnail, shared by the tabs and the Save page.
import { S } from './strings.js';
import { el } from './api.js';

const DAY = 24 * 60 * 60 * 1000;

// How far an article has aged: 0 with a full lifespan left, 1 on its last day.
export function decay(msLeft, lifespan) {
  return 1 - Math.min(1, Math.max(0, (msLeft - DAY) / (lifespan - DAY)));
}

// Full opacity when fresh, about 40% on the last day.
export function fade(msLeft, lifespan) {
  return (1 - 0.6 * decay(msLeft, lifespan)).toFixed(2);
}

// "expires tonight", "until tomorrow morning", "until Friday evening".
export function timeLeft(expiresAt, now = Date.now()) {
  const days = Math.round((startOfDay(expiresAt) - startOfDay(now)) / DAY);
  const part = dayPart(new Date(expiresAt).getHours());
  if (days <= 0) return S.expiresToday[part];
  if (days === 1) return S.untilTomorrow(S.dayParts[part]);
  if (days < 7) return S.untilDay(weekday(expiresAt), S.dayParts[part]);
  return S.untilNext(weekday(expiresAt));
}

// "until Saturday", for receipts.
export function untilDay(expiresAt, now = Date.now()) {
  const days = Math.round((startOfDay(expiresAt) - startOfDay(now)) / DAY);
  if (days <= 0) return S.expiresToday.evening;
  if (days === 1) return S.untilTomorrow('');
  return days < 7 ? S.untilDay(weekday(expiresAt), '') : S.untilNext(weekday(expiresAt));
}

function dayPart(hour) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function startOfDay(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function weekday(ms) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'long' });
}

export function shortDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Stored image and favicon addresses go through the Worker's proxy.
export function imgSrc(url) {
  return url ? `/img?u=${encodeURIComponent(url)}` : null;
}

// Rows re-render often; an image that failed once isn't asked for again
// until the page reloads.
const broken = new Set();

// An <img> through the proxy, or null if it failed before. `onFail` runs
// with the element when it fails to load.
export function proxiedImg(url, props, onFail) {
  if (!url || broken.has(url)) return null;
  const img = el('img', { src: imgSrc(url), alt: '', ...props });
  img.addEventListener('error', () => {
    broken.add(url);
    onFail(img);
  });
  return img;
}

// The preview image, or the site's initial on a tinted tile when there is
// none or it fails to load. Decorative: the title next to it is the link.
export function thumbnail(item) {
  const tile = el('span', { className: 'tile' }, (item.site || '?')[0].toUpperCase());
  tile.style.setProperty('--hue', siteHue(item.site));
  const img = proxiedImg(item.image_url, {}, () => img.replaceWith(tile));
  return el('span', { className: 'thumb', 'aria-hidden': 'true' }, img || tile);
}

// A muted hue per site, for the initial tile of a row without an image.
export function siteHue(site) {
  let h = 0;
  for (const ch of site || '') h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// "/2026/10/some-post" from a URL, or the host for a bare domain.
export function urlPath(url) {
  try {
    const u = new URL(url);
    const path = decodeURI(u.pathname + u.search).replace(/\/$/, '');
    return path || u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
