// Database upkeep: migrations on first use and the expiry sweep on every call.
import { MIGRATIONS } from './migrations.js';
import { HEAP_KEEP } from './rules.js';

const META_TABLE = `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`;
const VERSION_KEY = 'schema_version';

// Applies every migration above the recorded version, each as one batch
// (D1 runs a batch as a transaction, so a failure leaves nothing half done).
// Runs once per Worker instance; a failure clears the memo so the next
// request tries again.
const ready = new WeakMap();
export function migrate(db) {
  if (!ready.has(db)) {
    ready.set(
      db,
      runMigrations(db).catch((err) => {
        ready.delete(db);
        throw err;
      })
    );
  }
  return ready.get(db);
}

async function runMigrations(db) {
  await db.prepare(META_TABLE).run();
  const row = await db.prepare(`SELECT value FROM meta WHERE key = ?`).bind(VERSION_KEY).first();
  const applied = Number((row && row.value) || 0);
  for (const [number, sql] of MIGRATIONS) {
    if (number <= applied) continue;
    await db.batch([
      ...splitStatements(sql).map((s) => db.prepare(s)),
      db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`).bind(VERSION_KEY, String(number)),
    ]);
  }
}

// One statement per `;`. A CREATE TRIGGER body (BEGIN … END;) stays whole.
export function splitStatements(sql) {
  const out = [];
  let buffer = '';
  for (const part of sql.replace(/--.*$/gm, '').split(';')) {
    buffer += (buffer ? ';' : '') + part;
    const text = buffer.trim();
    if (!text) { buffer = ''; continue; }
    if (/\bCREATE\s+(TEMP(ORARY)?\s+)?TRIGGER\b/i.test(text) && !/\bEND\s*$/i.test(text)) continue;
    out.push(text);
    buffer = '';
  }
  return out;
}

// Expiry without a scheduled job: runs at the start of every API call.
// Each step returns one prepared statement; the steps run as one batch, in
// this order. Later phases add steps here (Phase 5: expired items that have a
// highlight become 'kept' instead, so its step goes before expireRack).
export const SWEEP_STEPS = [expireRack, purgeHeap];

function expireRack(db, now) {
  return db
    .prepare(`UPDATE items SET outcome = 'expired', ended_at = expires_at WHERE outcome IS NULL AND expires_at <= ?`)
    .bind(now);
}

function purgeHeap(db, now) {
  return db
    .prepare(`DELETE FROM items WHERE outcome IN ('tossed', 'dropped', 'expired') AND ended_at < ?`)
    .bind(now - HEAP_KEEP);
}

export function sweep(db, now) {
  return db.batch(SWEEP_STEPS.map((step) => step(db, now)));
}
