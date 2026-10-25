import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, splitStatements } from '../src/db.js';
import { MIGRATIONS } from '../src/migrations.js';
import { openDatabase } from './d1.js';
import { makeApp } from './helpers.js';

const lastNumber = MIGRATIONS[MIGRATIONS.length - 1][0];

async function version(db) {
  const row = await db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).first();
  return row ? Number(row.value) : null;
}

test('migrations run on an empty database and record the last number', async () => {
  const db = openDatabase();
  await migrate(db);
  assert.equal(await version(db), lastNumber);
  const tables = (await db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all()).results.map((r) => r.name);
  assert.ok(tables.includes('items'));
  assert.ok(tables.includes('meta'));
});

test('migrations are safe on a database that V1 created, and keep its rows', async () => {
  const db = openDatabase();
  // What V1's ensureSchema left behind: the items table, no meta table.
  db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY, url TEXT NOT NULL, title TEXT NOT NULL, site TEXT NOT NULL,
      minutes INTEGER, intent TEXT, saved_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
      extended INTEGER NOT NULL DEFAULT 0, outcome TEXT, ended_at INTEGER, takeaway TEXT
    );
    CREATE UNIQUE INDEX items_rack_url ON items (url) WHERE outcome IS NULL;
    CREATE INDEX items_outcome ON items (outcome, ended_at);
    INSERT INTO items (url, title, site, saved_at, expires_at) VALUES ('https://old.test/', 'Old', 'old.test', 1, 2);
  `);
  await migrate(db);
  assert.equal(await version(db), lastNumber);
  assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM items`).first()).n, 1);
});

test('migrations run once per database and skip ones already applied', async () => {
  const db = openDatabase();
  db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT); INSERT INTO meta VALUES ('schema_version', '9999')`);
  await migrate(db);
  await migrate(db);
  // Nothing above 9999 exists, so the items table was never created.
  const row = await db.prepare(`SELECT name FROM sqlite_master WHERE name = 'items'`).first();
  assert.equal(row, null);
  assert.equal(await version(db), 9999);
});

test('every API call works on a fresh database (migrations happen on first use)', async () => {
  const app = makeApp();
  const { status } = await app.call('GET', '/api/items');
  assert.equal(status, 200);
  assert.equal(await version(app.db), lastNumber);
});

test('splitStatements keeps a trigger body together and drops comments', () => {
  const sql = `
    -- a comment; with a semicolon
    CREATE TABLE a (x);
    CREATE TRIGGER t AFTER INSERT ON a BEGIN
      INSERT INTO a VALUES (1);
      DELETE FROM a WHERE x = 2;
    END;
    CREATE INDEX i ON a (x);
  `;
  const parts = splitStatements(sql);
  assert.equal(parts.length, 3);
  assert.match(parts[1], /^CREATE TRIGGER[\s\S]*END$/);
});
