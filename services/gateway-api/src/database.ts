import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Organization, SecurityEvent, UserRole } from "@defchain/shared";

export interface AppUser {
  id: string;
  username: string;
  password_hash: string;
  organization: Organization;
  role: UserRole;
  active: number;
  query_budget: number;
  query_count: number;
}
export interface DemoCase {
  case_id: string;
  owner_org: Organization;
  status: "ACTIVE" | "INACTIVE" | "CLOSED";
  allowed_purpose: string;
  opaque_ref: string;
}

export class GatewayDatabase {
  readonly db: DatabaseSync;
  constructor(root = process.cwd()) {
    mkdirSync(path.join(root, "data", "runtime"), { recursive: true });
    this.db = new DatabaseSync(
      path.join(root, "data", "runtime", "gateway.sqlite"),
    );
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, organization TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL, query_budget INTEGER NOT NULL, query_count INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS cases (case_id TEXT PRIMARY KEY, owner_org TEXT NOT NULL, status TEXT NOT NULL, allowed_purpose TEXT NOT NULL, opaque_ref TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS security_events (event_id TEXT PRIMARY KEY, actor_id TEXT, actor_org TEXT, type TEXT NOT NULL, safe_context_json TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.seed();
  }

  private seed(): void {
    const users: Array<
      [string, string, string, Organization, UserRole, number, number]
    > = [
      [
        "user_police",
        "police.investigator",
        "PoliceDemo!2026",
        "PoliceMSP",
        "INVESTIGATOR",
        1,
        8,
      ],
      [
        "user_rab",
        "rab.officer",
        "RabDemo!2026",
        "RABMSP",
        "PROVIDER_OFFICER",
        1,
        8,
      ],
      [
        "user_bgb",
        "bgb.officer",
        "BgbDemo!2026",
        "BGBMSP",
        "PROVIDER_OFFICER",
        1,
        8,
      ],
      [
        "user_customs",
        "customs.officer",
        "CustomsDemo!2026",
        "CustomsMSP",
        "PROVIDER_OFFICER",
        1,
        8,
      ],
      [
        "user_auditor",
        "auditor",
        "AuditDemo!2026",
        "PoliceMSP",
        "AUDITOR",
        1,
        0,
      ],
      [
        "user_revoked",
        "revoked.user",
        "RevokedDemo!2026",
        "PoliceMSP",
        "INVESTIGATOR",
        0,
        8,
      ],
      [
        "user_budget",
        "budget.exhausted",
        "BudgetDemo!2026",
        "PoliceMSP",
        "INVESTIGATOR",
        1,
        0,
      ],
    ];
    const insertUser = this.db.prepare(
      "INSERT OR IGNORE INTO users (id, username, password_hash, organization, role, active, query_budget, query_count) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    );
    for (const [
      id,
      username,
      password,
      organization,
      role,
      active,
      budget,
    ] of users)
      insertUser.run(
        id,
        username,
        bcrypt.hashSync(password, 12),
        organization,
        role,
        active,
        budget,
      );
    const insertCase = this.db.prepare(
      "INSERT OR IGNORE INTO cases (case_id, owner_org, status, allowed_purpose, opaque_ref) VALUES (?, ?, ?, ?, ?)",
    );
    insertCase.run(
      "P-2026-014",
      "PoliceMSP",
      "ACTIVE",
      "ACTIVE_INVESTIGATION",
      "case_opaque_6a58a441e3c507c8",
    );
    insertCase.run(
      "P-2026-CLOSED",
      "PoliceMSP",
      "CLOSED",
      "ACTIVE_INVESTIGATION",
      "case_opaque_cfe24f0a0b493f70",
    );
    for (const [caseId, ownerOrg, opaqueRef] of [
      ["TEST-CASE-RAB-0001", "RABMSP", "case_opaque_rab_demo_0001"],
      ["TEST-CASE-BGB-0001", "BGBMSP", "case_opaque_bgb_demo_0001"],
      ["TEST-CASE-CUSTOMS-0001", "CustomsMSP", "case_opaque_customs_demo_0001"],
    ] as const)
      insertCase.run(
        caseId,
        ownerOrg,
        "ACTIVE",
        "ACTIVE_INVESTIGATION",
        opaqueRef,
      );
  }

  userByUsername(username: string): AppUser | undefined {
    return this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as unknown as AppUser | undefined;
  }
  userById(id: string): AppUser | undefined {
    return this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as unknown as AppUser | undefined;
  }
  caseById(id: string): DemoCase | undefined {
    return this.db
      .prepare("SELECT * FROM cases WHERE case_id = ?")
      .get(id) as unknown as DemoCase | undefined;
  }
  activeCases(org: Organization): DemoCase[] {
    return this.db
      .prepare("SELECT * FROM cases WHERE owner_org = ? AND status = 'ACTIVE'")
      .all(org) as unknown as DemoCase[];
  }
  incrementQueryCount(userId: string): void {
    this.db
      .prepare("UPDATE users SET query_count = query_count + 1 WHERE id = ?")
      .run(userId);
  }
  resetDemo(): void {
    this.db.exec(
      "UPDATE users SET query_count = 0; DELETE FROM security_events;",
    );
  }
  addSecurityEvent(event: SecurityEvent): void {
    this.db
      .prepare("INSERT INTO security_events VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        event.eventId,
        event.actorId ?? null,
        event.actorOrg ?? null,
        event.type,
        JSON.stringify(event.safeContext),
        event.createdAt,
      );
  }
  securityEvents(): SecurityEvent[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM security_events ORDER BY created_at DESC LIMIT 100",
      )
      .all() as Array<{
      event_id: string;
      actor_id?: string;
      actor_org?: Organization;
      type: SecurityEvent["type"];
      safe_context_json: string;
      created_at: string;
    }>;
    return rows.map((row) => ({
      eventId: row.event_id,
      actorId: row.actor_id,
      actorOrg: row.actor_org,
      type: row.type,
      safeContext: JSON.parse(row.safe_context_json),
      createdAt: row.created_at,
    }));
  }
}
