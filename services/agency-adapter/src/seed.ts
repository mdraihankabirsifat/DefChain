import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { protectedMatchToken, type Organization } from '@defchain/shared';
import { openAgencyDatabase } from './database.js';

interface SeedRecord {syntheticIdentifier: string; eligibilityCode: string; fields: Record<string, string>}

const root = process.cwd();
mkdirSync(path.join(root, 'data', 'runtime'), {recursive: true});
const seeds = JSON.parse(await fs.readFile(path.join(root, 'data', 'seeds', 'agencies.json'), 'utf8')) as Record<Organization, SeedRecord[]>;
const key = process.env.MATCH_HMAC_KEY ?? 'defchain-controlled-demo-match-key-change-me';
const epoch = process.env.TOKEN_EPOCH ?? '2026-Q3';

for (const [org, records] of Object.entries(seeds) as [Organization, SeedRecord[]][]) {
  const db = openAgencyDatabase(org, root);
  db.exec('DELETE FROM query_matches; DELETE FROM protected_records;');
  const insert = db.prepare('INSERT INTO protected_records (protected_token, eligibility_code, fields_json, key_epoch) VALUES (?, ?, ?, ?)');
  for (const record of records) insert.run(protectedMatchToken(record.syntheticIdentifier, key, epoch), record.eligibilityCode, JSON.stringify(record.fields), epoch);
  db.close();
  console.log(`Seeded ${records.length} explicitly synthetic protected record(s) for ${org}`);
}
