// The list of migrations, applied in order by src/db.js.
//
// To add one: drop migrations/NNNN_name.sql in the folder and add one line
// here. Numbers must only go up; gaps are fine. Reserved by the V2 plan:
//   0002 rich rows (Phase 1)      0003 capture note (Phase 3)
//   0004 reader (Phase 4)         0005 highlights (Phase 5)
//   0006 reviews (Phase 6)        0008 push and reading days (Phase 8)
//
// wrangler imports .sql files as text (see [[rules]] in wrangler.toml); the
// tests do the same with a small loader hook.
import m0001 from '../migrations/0001_init.sql';

export const MIGRATIONS = [
  [1, m0001],
];
