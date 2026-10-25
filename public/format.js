// Dates and the expiry fade, shared by the tabs.
import { S } from './strings.js';

const DAY = 24 * 60 * 60 * 1000;

// Full opacity with a full lifespan left, about 40% on the last day.
export function fade(msLeft, lifespan) {
  const t = Math.min(1, Math.max(0, (msLeft - DAY) / (lifespan - DAY)));
  return (0.4 + 0.6 * t).toFixed(2);
}

export function timeLeft(expiresAt, now) {
  const days = Math.round((startOfDay(expiresAt) - startOfDay(now)) / DAY);
  if (days <= 0) return S.expiresToday;
  if (days === 1) return S.expiresTomorrow;
  return S.daysLeft(days);
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
