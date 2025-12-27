import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dir = join(homedir(), '.quick-td');
mkdirSync(dir, { recursive: true });
const dbName = process.env.DB_NAME ?? 'todos.db';
const dbPath = join(dir, dbName);

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT NULL
  )
`);
