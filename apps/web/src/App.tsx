import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Database,
  FileLock2,
  Fingerprint,
  KeyRound,
  LogOut,
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { login, request, type DemoUser } from "./api";

type LedgerRecord = Record<string, unknown> & {
  recordType: string;
  txId: string;
  ledgerTimestamp: string;
  queryId?: string;
  requestId?: string;
  providerOrg?: string;
  result?: string;
  decision?: string;
};
const actors = [
  {
    label: "Police investigator",
    username: "police.investigator",
    password: "PoliceDemo!2026",
    org: "PoliceMSP",
    role: "Requester",
  },
  {
    label: "RAB provider officer",
    username: "rab.officer",
    password: "RabDemo!2026",
    org: "RABMSP",
    role: "Provider",
  },
  {
    label: "BGB provider officer",
    username: "bgb.officer",
    password: "BgbDemo!2026",
    org: "BGBMSP",
    role: "Provider",
  },
  {
    label: "Customs provider officer",
    username: "customs.officer",
    password: "CustomsDemo!2026",
    org: "CustomsMSP",
    role: "Provider",
  },
  {
    label: "Independent auditor",
    username: "auditor",
    password: "AuditDemo!2026",
    org: "Consortium view",
    role: "Read only",
  },
];

function short(value?: string) {
  return value ? `${value.slice(0, 10)}…${value.slice(-8)}` : "—";
}
function CopyButton({ value }: { value?: string }) {
  return (
    <button
      className="copy"
      title="Copy full value"
      onClick={() => value && navigator.clipboard.writeText(value)}
    >
      <Copy size={14} />
      {short(value)}
    </button>
  );
}

export function App() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [view, setView] = useState("dashboard");
  const [health, setHealth] = useState<{
    blockchain?: { available: boolean; message: string };
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request<{ user: DemoUser }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => localStorage.removeItem("defchain_token"));
  }, []);
  useEffect(() => {
    if (user)
      request<{ blockchain: { available: boolean; message: string } }>(
        "/health",
      )
        .then(setHealth)
        .catch((e) =>
          setHealth({ blockchain: { available: false, message: e.message } }),
        );
  }, [user]);

  async function signIn(username: string, password: string) {
    setBusy(true);
    setError("");
    try {
      setUser(await login(username, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    localStorage.removeItem("defchain_token");
    setUser(null);
    setView("dashboard");
  }
  if (!user) return <Login onLogin={signIn} busy={busy} error={error} />;

  const nav = [
    { id: "dashboard", label: "Overview", icon: Activity },
    ...(user.role === "INVESTIGATOR"
      ? [
          { id: "discovery", label: "Discovery", icon: Search },
          { id: "disclosure", label: "Disclosure", icon: FileLock2 },
        ]
      : []),
    ...(user.role === "PROVIDER_OFFICER"
      ? [{ id: "inbox", label: "Provider inbox", icon: ClipboardCheck }]
      : []),
    { id: "audit", label: "Audit timeline", icon: BadgeCheck },
    { id: "governance", label: "Security & governance", icon: ShieldCheck },
    { id: "architecture", label: "Architecture", icon: Boxes },
  ];
  return (
    <div className="shell">
      <aside>
        <Brand />
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="actor">
          <span>{user.role.replace("_", " ")}</span>
          <strong>{user.username}</strong>
          <small>{user.organization}</small>
          <button onClick={logout}>
            <LogOut size={16} /> Switch actor
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">
              Synthetic data · Competition prototype
            </span>
            <h1>{nav.find((n) => n.id === view)?.label}</h1>
          </div>
          <HealthBadge available={health?.blockchain?.available} />
        </header>
        {view === "dashboard" && (
          <Dashboard user={user} available={health?.blockchain?.available} />
        )}
        {view === "discovery" && <Discovery />}
        {view === "disclosure" && <Disclosure />}
        {view === "inbox" && <ProviderInbox />}
        {view === "audit" && <Audit />}
        {view === "governance" && <Governance user={user} />}
        {view === "architecture" && <Architecture />}
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="mark">
        <Fingerprint />
      </div>
      <div>
        <strong>DefChain</strong>
        <span>
          Share the match,
          <br />
          not the database.
        </span>
      </div>
    </div>
  );
}
function HealthBadge({ available }: { available?: boolean }) {
  return (
    <div className={`health ${available ? "ok" : "down"}`}>
      {available ? <CheckCircle2 /> : <XCircle />}
      <span>
        <small>Fabric network</small>
        {available ? "Connected" : "Blockchain unavailable"}
      </span>
    </div>
  );
}

function Login({
  onLogin,
  busy,
  error,
}: {
  onLogin: (u: string, p: string) => void;
  busy: boolean;
  error: string;
}) {
  return (
    <div className="login-page">
      <div className="login-glow" />
      <section className="login-intro">
        <Brand />
        <span className="prototype">
          Synthetic Data / Competition Prototype
        </span>
        <h1>
          Sovereign coordination,
          <br />
          <em>without a shared dossier.</em>
        </h1>
        <p>
          Discover a provider-held match, request only necessary fields, and
          leave an organization-backed Fabric audit trail.
        </p>
        <div className="boundary">
          <Database />
          <div>
            <strong>Agency data stays local</strong>
            <span>Only safe workflow facts reach the common ledger.</span>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div>
          <span className="eyebrow">Guided demonstration</span>
          <h2>Choose a simulated actor</h2>
          <p>
            Every card performs a real backend login. Roles remain enforced
            server-side.
          </p>
        </div>
        <div className="actor-grid">
          {actors.map((actor) => (
            <button
              disabled={busy}
              key={actor.username}
              onClick={() => onLogin(actor.username, actor.password)}
            >
              <div className="actor-icon">
                <Building2 />
              </div>
              <span>
                <strong>{actor.label}</strong>
                <small>
                  {actor.org} · {actor.role}
                </small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <small className="fineprint">
          A MATCH does not prove guilt, identity correctness, or entitlement to
          provider data.
        </small>
      </section>
    </div>
  );
}

function Dashboard({
  user,
  available,
}: {
  user: DemoUser;
  available?: boolean;
}) {
  const steps =
    user.role === "INVESTIGATOR"
      ? [
          "Bind query to active case",
          "Receive provider attestations",
          "Request narrow scopes",
          "Receive approved encrypted disclosure",
        ]
      : user.role === "PROVIDER_OFFICER"
        ? [
            "Review scoped request",
            "Approve, partially approve, or deny",
            "Release encrypted fields",
            "Record signed receipt",
          ]
        : [
            "Inspect immutable workflow",
            "Review safe security events",
            "Verify organizational authority",
            "Challenge residual risks",
          ];
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Controlled inter-agency workflow</span>
          <h2>
            The ledger records decisions.
            <br />
            <em>It does not hold the intelligence.</em>
          </h2>
          <p>
            DefChain separates discovery, provider-controlled disclosure, and
            shared accountability across simulated sovereign organizations.
          </p>
        </div>
        <div className="trust-ring">
          <ShieldCheck />
          <strong>{available ? "Gateway verified" : "Fail-closed"}</strong>
          <span>
            {available
              ? "Real ledger writes enabled"
              : "Ledger actions blocked"}
          </span>
        </div>
      </section>
      <div className="metric-grid">
        <Metric
          icon={Network}
          label="Network"
          value={available ? "Fabric online" : "Unavailable"}
          note="defchain-channel · Raft"
        />
        <Metric
          icon={KeyRound}
          label="Identity"
          value={user.organization}
          note="Server-held X.509 identity"
        />
        <Metric
          icon={Search}
          label="Query budget"
          value={`${user.queryCount} / ${user.queryBudget}`}
          note="Per-user abuse control"
        />
      </div>
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Guided demo</span>
            <h3>Your next four steps</h3>
          </div>
          <span className="pill">Role-aware</span>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={s}>
              <span>{i + 1}</span>
              <strong>{s}</strong>
              {i < steps.length - 1 && <ArrowRight />}
            </div>
          ))}
        </div>
      </section>
      <Disclaimer />
    </>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Network;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <Icon />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Discovery() {
  const [cases, setCases] = useState<Array<{ case_id: string }>>([]);
  const [result, setResult] = useState<{
    query: LedgerRecord;
    attestations: LedgerRecord[];
    notice: string;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    request<{ cases: Array<{ case_id: string }> }>("/cases")
      .then((r) => setCases(r.cases))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await request<{
        query: LedgerRecord;
        attestations: LedgerRecord[];
        notice: string;
      }>("/queries", {
        method: "POST",
        body: JSON.stringify({
          caseId: form.get("caseId"),
          purposeCode: "ACTIVE_INVESTIGATION",
          syntheticIdentifier: form.get("identifier"),
          targetOrganizations: ["RABMSP", "BGBMSP", "CustomsMSP"],
        }),
      });
      setResult(response);
      if (response.query.queryId)
        localStorage.setItem("defchain_query_id", response.query.queryId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="two-col">
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">1 · Discovery</span>
            <h3>Case-bound protected search</h3>
          </div>
          <Search />
        </div>
        <form onSubmit={submit}>
          <label>
            Active case
            <select name="caseId" required>
              {cases.map((c) => (
                <option key={c.case_id}>{c.case_id}</option>
              ))}
            </select>
          </label>
          <label>
            Purpose code
            <input value="ACTIVE_INVESTIGATION" readOnly />
          </label>
          <label>
            Synthetic identifier
            <input
              name="identifier"
              defaultValue="TEST-NID-0001"
              pattern="TEST-NID-[0-9]{4}"
              required
            />
            <small>Canonicalized and HMAC-protected before routing.</small>
          </label>
          <fieldset>
            <legend>Target organizations</legend>
            {["RAB", "BGB", "Customs"].map((o) => (
              <label className="check" key={o}>
                <input type="checkbox" checked readOnly />
                {o}
              </label>
            ))}
          </fieldset>
          <button className="primary" disabled={busy}>
            {busy ? "Committing to Fabric…" : "Create protected query"}
            <ArrowRight />
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
      <section className="card results">
        <div className="section-title">
          <div>
            <span className="eyebrow">Provider attestations</span>
            <h3>Discovery results</h3>
          </div>
          <BadgeCheck />
        </div>
        {!result ? (
          <Empty text="Results appear only after a committed QueryRequest." />
        ) : (
          <>
            <div className="proof">
              <span>QueryRequest committed</span>
              <CopyButton value={result.query.txId} />
            </div>
            {result.attestations.map((a) => (
              <div className="attestation" key={a.txId}>
                <div
                  className={`result-dot ${a.result === "MATCH" ? "match" : ""}`}
                />
                <div>
                  <strong>{String(a.providerOrg).replace("MSP", "")}</strong>
                  <span>{a.result}</span>
                </div>
                <CopyButton value={a.txId} />
              </div>
            ))}
            <p className="notice">{result.notice}</p>
          </>
        )}
      </section>
    </div>
  );
}

function Disclosure() {
  const [mode, setMode] = useState<"request" | "receive">("request");
  const [output, setOutput] = useState<Record<string, unknown>>();
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (mode === "request") {
        const r = await request<{ access: LedgerRecord }>("/access-requests", {
          method: "POST",
          body: JSON.stringify({
            queryId: f.get("queryId"),
            providerOrg: "RABMSP",
            requestedScopes: f.getAll("scope"),
            justification: f.get("justification"),
          }),
        });
        localStorage.setItem("defchain_request_id", String(r.access.requestId));
        setOutput(r as unknown as Record<string, unknown>);
      } else {
        setOutput(
          await request(`/access-requests/${f.get("requestId")}/disclose`, {
            method: "POST",
          }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    }
  }
  return (
    <section className="card wide">
      <div className="tabs">
        <button
          className={mode === "request" ? "active" : ""}
          onClick={() => setMode("request")}
        >
          Request scoped access
        </button>
        <button
          className={mode === "receive" ? "active" : ""}
          onClick={() => setMode("receive")}
        >
          Receive approved disclosure
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          {mode === "request" ? "Query ID" : "Request ID"}
          <input
            name={mode === "request" ? "queryId" : "requestId"}
            defaultValue={
              localStorage.getItem(
                mode === "request"
                  ? "defchain_query_id"
                  : "defchain_request_id",
              ) ?? ""
            }
            required
          />
        </label>
        {mode === "request" && (
          <>
            <fieldset>
              <legend>Necessary scopes only</legend>
              {[
                "IDENTITY_CONFIRMATION",
                "CASE_REFERENCE",
                "CONTACT_CHANNEL",
                "ELIGIBILITY_CATEGORY",
              ].map((s, i) => (
                <label className="check" key={s}>
                  <input
                    name="scope"
                    value={s}
                    type="checkbox"
                    defaultChecked={i < 2}
                  />
                  {s.replaceAll("_", " ")}
                </label>
              ))}
            </fieldset>
            <label>
              Purpose-bound justification
              <textarea
                name="justification"
                defaultValue="Verify synthetic cross-agency relevance for active case P-2026-014."
                minLength={12}
              />
            </label>
          </>
        )}
        <button className="primary">
          {mode === "request"
            ? "Commit AccessRequest"
            : "Verify and receive encrypted disclosure"}
          <ArrowRight />
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {output && (
        <pre className="output">{JSON.stringify(output, null, 2)}</pre>
      )}
    </section>
  );
}

function ProviderInbox() {
  const [items, setItems] = useState<LedgerRecord[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    request<{ requests: LedgerRecord[] }>("/provider/inbox")
      .then((r) => setItems(r.requests))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function decide(
    item: LedgerRecord,
    decision: "APPROVE" | "PARTIAL" | "DENY",
  ) {
    try {
      await request(`/provider/requests/${item.requestId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          approvedScopes:
            decision === "DENY"
              ? []
              : decision === "PARTIAL"
                ? ["IDENTITY_CONFIRMATION"]
                : ["IDENTITY_CONFIRMATION", "CASE_REFERENCE"],
          reasonCode:
            decision === "DENY" ? "SCOPE_NOT_JUSTIFIED" : "POLICY_CHECK_PASSED",
        }),
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    }
  }
  return (
    <section className="card wide">
      <div className="section-title">
        <div>
          <span className="eyebrow">Provider authority</span>
          <h3>Scoped request inbox</h3>
        </div>
        <ClipboardCheck />
      </div>
      {error && <p className="error">{error}</p>}
      {!items.length ? (
        <Empty text="No pending access requests for this provider identity." />
      ) : (
        items.map((item) => (
          <article className="request" key={item.requestId}>
            <div>
              <strong>Access request</strong>
              <CopyButton value={item.requestId as string} />
              <p>{(item.requestedScopes as string[]).join(" · ")}</p>
            </div>
            <div className="actions">
              <button onClick={() => decide(item, "DENY")} className="danger">
                Deny
              </button>
              <button onClick={() => decide(item, "PARTIAL")}>Partial</button>
              <button
                onClick={() => decide(item, "APPROVE")}
                className="primary"
              >
                Approve
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function Audit() {
  const [queryId, setQueryId] = useState(
    localStorage.getItem("defchain_query_id") ?? "",
  );
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [error, setError] = useState("");
  async function load() {
    try {
      setRecords(
        (await request<{ records: LedgerRecord[] }>(`/workflows/${queryId}`))
          .records,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit unavailable");
    }
  }
  return (
    <section className="card wide">
      <div className="section-title">
        <div>
          <span className="eyebrow">Five immutable object types</span>
          <h3>Fabric audit timeline</h3>
        </div>
        <BadgeCheck />
      </div>
      <div className="inline">
        <input
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
          placeholder="query_…"
        />
        <button className="primary" onClick={load}>
          Verify workflow
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="timeline">
        {records.map((r, i) => (
          <div key={`${r.recordType}-${r.txId}`}>
            <span className="timeline-index">{i + 1}</span>
            <div>
              <small>{r.ledgerTimestamp}</small>
              <strong>{r.recordType}</strong>
              <span>
                {String(
                  r.providerOrg ??
                    r.status ??
                    r.result ??
                    r.decision ??
                    "Committed",
                )}
              </span>
              <CopyButton value={r.txId} />
            </div>
            <BadgeCheck className="verified" />
          </div>
        ))}
      </div>
      {!records.length && (
        <Empty text="Enter a query ID to query the committed workflow from Fabric." />
      )}
    </section>
  );
}

function Governance({ user }: { user: DemoUser }) {
  const [events, setEvents] = useState<
    Array<{
      eventId: string;
      type: string;
      createdAt: string;
      safeContext: Record<string, unknown>;
    }>
  >([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (user.role === "AUDITOR")
      request<{ events: typeof events }>("/security-events")
        .then((r) => setEvents(r.events))
        .catch((e) => setMessage(e.message));
  }, [user.role]);
  async function reset() {
    try {
      const result = await request<{ reset: string }>("/demo/reset", {
        method: "POST",
      });
      setMessage(result.reset);
      setEvents([]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset failed");
    }
  }
  return (
    <>
      <div className="metric-grid">
        <Metric
          icon={ShieldCheck}
          label="Application role"
          value={user.role.replace("_", " ")}
          note="JWT + active-user check"
        />
        <Metric
          icon={Search}
          label="Query budget"
          value={`${user.queryCount} / ${user.queryBudget}`}
          note="Checked before ledger write"
        />
        <Metric
          icon={Building2}
          label="MSP boundary"
          value={user.organization}
          note="Chaincode checks invoker MSP"
        />
      </div>
      <section className="card wide">
        <div className="section-title">
          <div>
            <span className="eyebrow">Implemented controls</span>
            <h3>Defense in depth</h3>
          </div>
          <UserRoundCheck />
        </div>
        <div className="control-grid">
          {[
            ["Fishing resistance", "Active case, purpose and per-user budget"],
            [
              "Data minimization",
              "HMAC matching; no identifier/token on ledger",
            ],
            [
              "Provider sovereignty",
              "Provider MSP creates attestations and decisions",
            ],
            ["Disclosure integrity", "AES-256-GCM, SHA-256 and Ed25519"],
            ["Safe failure", "No mock ledger fallback when Fabric is down"],
            ["Accountability", "Five typed, immutable workflow records"],
          ].map(([a, b]) => (
            <div key={a}>
              <CheckCircle2 />
              <strong>{a}</strong>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </section>
      {user.role === "AUDITOR" && (
        <section className="card wide">
          <div className="section-title">
            <div>
              <span className="eyebrow">Safe local evidence</span>
              <h3>Rejected security events</h3>
            </div>
            <button className="danger" onClick={reset}>
              <RotateCcw size={14} /> Reset local demo
            </button>
          </div>
          {message && <p className="notice">{message}</p>}
          {events.length ? (
            events.map((item) => (
              <article className="request" key={item.eventId}>
                <div>
                  <strong>{item.type.replaceAll("_", " ")}</strong>
                  <p>
                    {item.createdAt} · {JSON.stringify(item.safeContext)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <Empty text="No rejected events in the current local demo state." />
          )}
        </section>
      )}
      <Disclaimer />
    </>
  );
}
function Architecture() {
  return (
    <section className="card wide">
      <div className="section-title">
        <div>
          <span className="eyebrow">Why blockchain?</span>
          <h3>No single agency should own the shared audit truth.</h3>
        </div>
        <Network />
      </div>
      <p className="lead">
        A central API can route data, but its operator can unilaterally alter
        shared workflow history. Fabric adds organization-backed identity,
        endorsement, transition enforcement and a jointly governed ledger. It
        does not compute the HMAC or make source intelligence true.
      </p>
      <div className="architecture">
        <div>
          <Database />
          <strong>Separate agency databases</strong>
          <span>Raw synthetic records and protected-token indexes</span>
        </div>
        <ArrowRight />
        <div>
          <FileLock2 />
          <strong>Provider adapters</strong>
          <span>Match and encrypted disclosure under local control</span>
        </div>
        <ArrowRight />
        <div>
          <Network />
          <strong>Fabric channel</strong>
          <span>Safe attestations, decisions and receipts only</span>
        </div>
      </div>
      <div className="boundary-table">
        <div>
          <strong>On common ledger</strong>
          <span>
            Opaque case ref · purpose code · organization · scopes · decisions ·
            hashes · tx IDs
          </span>
        </div>
        <div>
          <strong>Always off-chain</strong>
          <span>
            Raw identifier · HMAC token · source record · justification ·
            payload · encryption/private keys
          </span>
        </div>
      </div>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <BookOpen />
      <p>{text}</p>
    </div>
  );
}
function Disclaimer() {
  return (
    <div className="disclaimer">
      <ShieldCheck />
      <p>
        <strong>Interpretation guardrail:</strong> A provider MATCH says only
        that its approved synthetic matching procedure found a corresponding
        identifier. Human verification and separate provider authorization
        remain required.
      </p>
    </div>
  );
}
