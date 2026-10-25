// Compost: one Worker serving the app, a tiny API and a D1 database.
// Static files in ./public are served by Workers Static Assets before this
// code runs, so fetch() only sees requests that didn't match a file.
//
// The rules (slots, lifespan, extension, heap purge) are constants in
// src/rules.js. The routes live in one module per area, listed in ROUTES.
import { migrate, sweep } from './db.js';
import { json, safeEqual } from './http.js';
import { handleImg, withImgCookie } from './img.js';
import { routes as itemRoutes } from './items.js';
import { fetchPageInfo } from './page.js';

// The routing table. A route is [method, path, handler]; `:name` in the path
// becomes params.name. Every route needs the passcode and runs after the
// sweep. To add an area, export a `routes` list from its module and spread it
// here (Phase 4: ...readerRoutes).
const ROUTES = [
  ...itemRoutes,
].map(([method, path, handler]) => ({ method, path, handler, match: compilePath(path) }));

export default {
  fetch(request, env) {
    return handle(request, env);
  },
};

// The whole request pipeline. `now` and `fetchPage` can be injected, which
// is how the tests drive expiry without waiting a week.
export async function handle(request, env, { now = Date.now(), fetchPage = fetchPageInfo, img = {} } = {}) {
  const url = new URL(request.url);
  // The image proxy isn't a file, so it reaches the Worker; it checks its
  // own cookie rather than the header (see src/img.js).
  if (url.pathname === '/img') return handleImg(request, env, img).catch(() => new Response('Not found', { status: 404 }));
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

  try {
    const res = await handleApi(request, env, url, now, fetchPage);
    return res.status < 400 ? await withImgCookie(res, request, env.PASSCODE) : res;
  } catch (err) {
    console.error(err);
    return json({ error: 'server_error' }, 500);
  }
}

async function handleApi(request, env, url, now, fetchPage) {
  if (!env.PASSCODE) return json({ error: 'passcode_not_set' }, 500);
  if (!safeEqual(request.headers.get('X-Passcode') || '', env.PASSCODE)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const matches = ROUTES.filter((r) => r.match(url.pathname));
  if (!matches.length) return json({ error: 'not_found' }, 404);
  const route = matches.find((r) => r.method === request.method);
  if (!route) return json({ error: 'method_not_allowed' }, 405);

  const db = env.DB;
  await migrate(db);
  await sweep(db, now);
  return route.handler({ request, env, url, db, now, fetchPage }, route.match(url.pathname));
}

// '/api/items/:id/done' → a function returning { id } or null. `:id` only
// matches digits and arrives as a number.
function compilePath(path) {
  const names = [];
  const re = new RegExp(
    '^' + path.replace(/\/:(\w+)/g, (_, name) => { names.push(name); return name === 'id' ? '/(\\d+)' : '/([^/]+)'; }) + '$'
  );
  return (pathname) => {
    const m = pathname.match(re);
    if (!m) return null;
    const params = {};
    names.forEach((name, i) => { params[name] = name === 'id' ? Number(m[i + 1]) : decodeURIComponent(m[i + 1]); });
    return params;
  };
}
