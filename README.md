# Compost

A personal read-later app with a hard limit. The rack holds 10 articles. Each
one expires 7 days after you save it. Only the ones you finish are kept, in the
Vault, with a one-line takeaway.

It is one Cloudflare Worker: it serves the app, answers a tiny API and talks to
one D1 (SQLite) database. No framework, no build step, no dependencies, no
scheduled jobs. It fits comfortably in Cloudflare's free plan.

## The rules

| Rule | Value |
| --- | --- |
| Slots | 10. An 11th save is blocked until you drop one (enforced on the server). |
| Lifespan | 7 days, then the article moves to the Heap. |
| Extension | +48 hours, once per article. |
| Done | Moves it to the Vault with an optional takeaway. Frees the slot. |
| Toss | Moves it to the Heap. Frees the slot. |
| Heap | Everything tossed, dropped or expired. Purged after 30 days. No restore. |
| Vault | Done articles only. Permanent. |

The rules are constants at the top of [`src/worker.js`](src/worker.js). All
the copy lives in [`public/strings.js`](public/strings.js). There is no settings
screen on purpose: change a constant, redeploy.

## Files

| File | Purpose |
| --- | --- |
| `wrangler.toml` | Worker config: static assets folder and the D1 binding |
| `schema.sql` | The one table, `items` |
| `src/worker.js` | API routes, rules, expiry sweep, title fetching |
| `public/index.html`, `app.js`, `style.css` | Main page: Rack, Vault and Heap tabs |
| `public/save.html`, `save.js` | Save page used by the share menu and the bookmarklet |
| `public/api.js` | The passcode and API helper both pages share |
| `public/strings.js` | All user-facing copy |
| `public/manifest.webmanifest`, `sw.js`, `icons/` | PWA install and the Android share target |

## Set it up

You need a Cloudflare account (the free plan is enough) and Node.js 18 or newer
on your computer. Wrangler, Cloudflare's command-line tool, runs through `npx`,
so nothing gets installed into the project.

### 1. Log in

```sh
npx wrangler login
```

### 2. Create the D1 database

```sh
npx wrangler d1 create compost
```

This prints a `database_id`. Paste it into `wrangler.toml` in place of
`REPLACE_WITH_YOUR_DATABASE_ID`.

### 3. Apply the schema

```sh
npx wrangler d1 execute compost --remote --file=schema.sql
```

### 4. Set the passcode

```sh
npx wrangler secret put PASSCODE
```

Type the passcode when asked. It is stored as an encrypted Worker secret, never
in the code. Every API call without it gets a 401.

To change it later, run the same command again. Each device will ask for the new
one on its next open.

### 5. Deploy

```sh
npx wrangler deploy
```

Wrangler prints the app's address, something like
`https://compost.<your-subdomain>.workers.dev`. Open it, enter the passcode once,
and you are in.

To redeploy after changing anything, run `npx wrangler deploy` again.

## Install on Android

1. Open the app's address in Chrome on your phone and enter the passcode.
2. Open Chrome's menu (⋮) and tap **Add to Home screen**, then **Install**.
3. Open Compost once from the home screen.

Compost now appears in the Android share menu. Share a link from Chrome or any
other app, pick Compost, and the Save page opens and saves it. If the share menu
shows the link only as text, Compost still finds the first URL in it.

The installed app and Chrome on Android share storage, so the passcode you
entered in step 1 carries over.

## Add the bookmarklet (desktop)

Create a new bookmark in your browser's bookmarks bar, name it "Compost", and
paste this as its URL, with your own address in place of the placeholder:

```
javascript:(()=>{window.open('https://compost.YOUR-SUBDOMAIN.workers.dev/save?url='+encodeURIComponent(location.href),'compost','width=440,height=620')})()
```

Clicking it on any page opens the Save page in a small popup. The first time,
it asks for your passcode; after that it saves straight away. The popup closes
with **Close**.

Until you set it up, you can paste links into the **Add link** field at the top
of the Rack.

## Run it locally

```sh
echo 'PASSCODE=letmein' > .dev.vars
npx wrangler d1 execute compost --local --file=schema.sql
npx wrangler dev
```

Then open http://localhost:8787. `.dev.vars` is git-ignored.

Some quick API checks with curl:

```sh
P='X-Passcode: letmein'
curl -i localhost:8787/api/items                                   # 401
curl -s -H "$P" localhost:8787/api/items                           # rack, vault, heap
curl -s -H "$P" -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' localhost:8787/api/items      # save
curl -s -H "$P" -X POST localhost:8787/api/items/1/extend          # +48h, once
curl -s -H "$P" -H 'Content-Type: application/json' \
  -d '{"takeaway":"One line"}' localhost:8787/api/items/1/done     # to the Vault
```

## API

Every call needs the `X-Passcode` header and starts with the sweep: rack items
past their expiry move to the Heap, and Heap items older than 30 days are
deleted. That is how expiry works without a scheduled job.

| Method and path | Does |
| --- | --- |
| `GET /api/items` | Returns `rack` (expiring soonest first), `vault` and `heap` |
| `POST /api/items` | Saves `{url, dropId?}`. `409` with the rack list when full and no `dropId` |
| `POST /api/items/:id/intent` | Sets `{intent}`: `tonight`, `commute`, `weekend` or `null` |
| `POST /api/items/:id/done` | Moves to the Vault with `{takeaway?}` |
| `POST /api/items/:id/toss` | Moves to the Heap |
| `POST /api/items/:id/extend` | Adds 48 hours, once |

A save answers with `status`: `saved`, `in_rack`, `in_vault`, `full` or
`invalid_url`. URLs are normalised before comparing (tracking parameters such as
`utm_*` and `fbclid` and the `#fragment` are removed).

## Is it working?

The `items` table records when each article was saved, how it ended and whether
it was extended. For the last 30 days:

```sh
npx wrangler d1 execute compost --remote --command "
  SELECT COUNT(*)                                AS saved,
         SUM(outcome = 'done')                   AS finished,
         SUM(outcome = 'expired')                AS expired,
         SUM(outcome IN ('tossed', 'dropped'))   AS let_go,
         SUM(outcome IS NULL)                    AS still_in_rack,
         SUM(extended)                           AS extended
  FROM items
  WHERE saved_at > (strftime('%s', 'now', '-30 days') * 1000)"
```

Heap rows are deleted after 30 days, so look at a window of 30 days or less
(older Vault rows are all still there, but their tossed and expired
counterparts are not).

## Backups

D1 keeps 7 days of point-in-time recovery on the free plan
(`npx wrangler d1 time-travel --help`). The **Download vault** link in the
Vault tab saves everything worth keeping as a Markdown file.
