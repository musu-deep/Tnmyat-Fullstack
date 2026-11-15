import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(filename = process.env.DB_PATH || 'data/tnmyat.sqlite') {
  mkdirSync(dirname(resolve(filename)), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      if (!sqlite.prepare('SELECT name FROM app_migrations WHERE name=?').get(name)) {
        sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
        sqlite.prepare('INSERT INTO app_migrations VALUES (?)').run(name);
      }
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  function prepare(sql, args = []) {
    const statement = sqlite.prepare(sql);
    return {
      bind: (...params) => prepare(sql, params),
      first: (column) => {
        const row = statement.get(...args);
        return (column ? row?.[column] : row) ?? null;
      },
      all: () => ({ success: true, results: statement.all(...args) }),
      run: () => {
        const result = statement.run(...args);
        return { success: true, meta: { changes: result.changes, last_row_id: result.lastInsertRowid } };
      },
      batchResult: () => {
        const results = statement.all(...args);
        const meta = sqlite.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get();
        return { success: true, results, meta };
      }
    };
  }
  return {
    prepare,
    close: () => sqlite.close(),
    batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(s => s.batchResult());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };
}
