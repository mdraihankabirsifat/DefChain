import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type { Organization } from '@defchain/shared';

export interface ProtectedRecord {protected_token: string; eligibility_code: string; fields_json: string}

export function openAgencyDatabase(org: Organization, root = process.cwd()): DatabaseSync {
  const db = new DatabaseSync(path.join(root, 'data', 'runtime', `${org}.sqlite`));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS protected_records (
      protected_token TEXT PRIMARY KEY,
      eligibility_code TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      key_epoch TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS query_matches (
      query_id TEXT PRIMARY KEY,
      protected_token TEXT NOT NULL,
      matched INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
