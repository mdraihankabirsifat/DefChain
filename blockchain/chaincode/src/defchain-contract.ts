import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import type {
  AccessRequest,
  AuthorizationDecision,
  DisclosureReceipt,
  LedgerRecord,
  MatchAttestation,
  QueryRequest,
} from "./model";
import {
  accessInputSchema,
  decisionInputSchema,
  matchInputSchema,
  queryInputSchema,
  receiptInputSchema,
} from "./model";

const KEY = {
  query: (id: string) => `QUERY::${id}`,
  match: (queryId: string, provider: string) =>
    `MATCH::${queryId}::${provider}`,
  access: (id: string) => `ACCESS::${id}`,
  decision: (id: string) => `DECISION::${id}`,
  receipt: (id: string) => `RECEIPT::${id}`,
};

type ParsedInput = Record<string, unknown>;

@Info({
  title: "DefChainContract",
  description: "Jointly governed DefChain workflow without private payloads",
})
export class DefChainContract extends Contract {
  private parse(raw: string): ParsedInput {
    try {
      return JSON.parse(raw) as ParsedInput;
    } catch {
      throw new Error("ERR_INVALID_JSON: Input must be valid JSON");
    }
  }

  private timestamp(ctx: Context): string {
    const value = ctx.stub.getTxTimestamp();
    const seconds =
      typeof value.seconds === "object" && "toNumber" in value.seconds
        ? value.seconds.toNumber()
        : Number(value.seconds);
    return new Date(
      seconds * 1000 + Math.floor(value.nanos / 1_000_000),
    ).toISOString();
  }

  private msp(ctx: Context): string {
    return ctx.clientIdentity.getMSPID();
  }
  private requireMsp(ctx: Context, expected: string): void {
    if (this.msp(ctx) !== expected)
      throw new Error(
        `ERR_WRONG_MSP: ${this.msp(ctx)} cannot act for ${expected}`,
      );
  }

  private async get<T>(ctx: Context, key: string): Promise<T> {
    const bytes = await ctx.stub.getState(key);
    if (!bytes?.length) throw new Error(`ERR_NOT_FOUND: ${key}`);
    return JSON.parse(bytes.toString()) as T;
  }

  private async putImmutable(
    ctx: Context,
    key: string,
    record: LedgerRecord,
  ): Promise<void> {
    const existing = await ctx.stub.getState(key);
    if (existing?.length) throw new Error(`ERR_DUPLICATE_ID: ${key}`);
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    ctx.stub.setEvent(
      `defchain.${record.recordType}`,
      Buffer.from(
        JSON.stringify({ recordType: record.recordType, txId: record.txId }),
      ),
    );
  }

  @Transaction()
  @Returns("string")
  public async CreateQueryRequest(ctx: Context, raw: string): Promise<string> {
    const input = queryInputSchema.parse(this.parse(raw));
    this.requireMsp(ctx, input.requesterOrg);
    const record: QueryRequest = {
      ...input,
      schemaVersion: "1.0",
      recordType: "QueryRequest",
      status: "CREATED",
      txId: ctx.stub.getTxID(),
      ledgerTimestamp: this.timestamp(ctx),
    };
    await this.putImmutable(ctx, KEY.query(input.queryId), record);
    return JSON.stringify(record);
  }

  @Transaction()
  @Returns("string")
  public async CreateMatchAttestation(
    ctx: Context,
    raw: string,
  ): Promise<string> {
    const input = matchInputSchema.parse(this.parse(raw));
    this.requireMsp(ctx, input.providerOrg);
    const query = await this.get<QueryRequest>(ctx, KEY.query(input.queryId));
    if (!query.targetOrganizations.includes(input.providerOrg))
      throw new Error("ERR_ILLEGAL_TRANSITION: Provider was not targeted");
    const record: MatchAttestation = {
      ...input,
      schemaVersion: "1.0",
      recordType: "MatchAttestation",
      txId: ctx.stub.getTxID(),
      ledgerTimestamp: this.timestamp(ctx),
    };
    await this.putImmutable(
      ctx,
      KEY.match(input.queryId, input.providerOrg),
      record,
    );
    return JSON.stringify(record);
  }

  @Transaction()
  @Returns("string")
  public async CreateAccessRequest(ctx: Context, raw: string): Promise<string> {
    const input = accessInputSchema.parse(this.parse(raw));
    this.requireMsp(ctx, input.requesterOrg);
    const query = await this.get<QueryRequest>(ctx, KEY.query(input.queryId));
    if (
      query.requesterOrg !== input.requesterOrg ||
      query.purposeCode !== input.purposeCode
    )
      throw new Error(
        "ERR_ILLEGAL_TRANSITION: Query ownership or purpose mismatch",
      );
    const match = await this.get<MatchAttestation>(
      ctx,
      KEY.match(input.queryId, input.providerOrg),
    );
    if (match.result !== "MATCH")
      throw new Error("ERR_ILLEGAL_TRANSITION: Access requires MATCH");
    const record: AccessRequest = {
      ...input,
      schemaVersion: "1.0",
      recordType: "AccessRequest",
      status: "PENDING",
      txId: ctx.stub.getTxID(),
      ledgerTimestamp: this.timestamp(ctx),
    };
    await this.putImmutable(ctx, KEY.access(input.requestId), record);
    return JSON.stringify(record);
  }

  @Transaction()
  @Returns("string")
  public async RecordAuthorizationDecision(
    ctx: Context,
    raw: string,
  ): Promise<string> {
    const input = decisionInputSchema.parse(this.parse(raw));
    this.requireMsp(ctx, input.providerOrg);
    const request = await this.get<AccessRequest>(
      ctx,
      KEY.access(input.requestId),
    );
    if (request.providerOrg !== input.providerOrg)
      throw new Error("ERR_ILLEGAL_TRANSITION: Provider mismatch");
    if (
      input.approvedScopes.some(
        (scope) => !request.requestedScopes.includes(scope),
      )
    )
      throw new Error("ERR_SCOPE_ESCALATION: Approved scope was not requested");
    if (
      input.decision === "APPROVE" &&
      input.approvedScopes.length !== request.requestedScopes.length
    )
      throw new Error(
        "ERR_ILLEGAL_TRANSITION: APPROVE must grant all scopes; use PARTIAL",
      );
    if (
      input.decision !== "DENY" &&
      new Date(input.expiresAt).getTime() <=
        new Date(this.timestamp(ctx)).getTime()
    )
      throw new Error(
        "ERR_INVALID_EXPIRY: Approval must expire after the transaction timestamp",
      );
    const record: AuthorizationDecision = {
      ...input,
      schemaVersion: "1.0",
      recordType: "AuthorizationDecision",
      txId: ctx.stub.getTxID(),
      ledgerTimestamp: this.timestamp(ctx),
    };
    await this.putImmutable(ctx, KEY.decision(input.requestId), record);
    return JSON.stringify(record);
  }

  @Transaction()
  @Returns("string")
  public async RecordDisclosureReceipt(
    ctx: Context,
    raw: string,
  ): Promise<string> {
    const input = receiptInputSchema.parse(this.parse(raw));
    this.requireMsp(ctx, input.providerOrg);
    const request = await this.get<AccessRequest>(
      ctx,
      KEY.access(input.requestId),
    );
    const decision = await this.get<AuthorizationDecision>(
      ctx,
      KEY.decision(input.requestId),
    );
    if (
      request.providerOrg !== input.providerOrg ||
      request.requesterOrg !== input.requesterOrg
    )
      throw new Error("ERR_ILLEGAL_TRANSITION: Receipt parties mismatch");
    if (
      decision.decision === "DENY" ||
      new Date(decision.expiresAt).getTime() <=
        new Date(this.timestamp(ctx)).getTime()
    )
      throw new Error("ERR_NO_VALID_APPROVAL: Decision denied or expired");
    const record: DisclosureReceipt = {
      ...input,
      schemaVersion: "1.0",
      recordType: "DisclosureReceipt",
      txId: ctx.stub.getTxID(),
      ledgerTimestamp: this.timestamp(ctx),
    };
    await this.putImmutable(ctx, KEY.receipt(input.requestId), record);
    return JSON.stringify(record);
  }

  @Transaction(false)
  @Returns("string")
  public async GetRecord(ctx: Context, key: string): Promise<string> {
    return JSON.stringify(await this.get<LedgerRecord>(ctx, key));
  }

  @Transaction(false)
  @Returns("string")
  public async GetWorkflow(ctx: Context, queryId: string): Promise<string> {
    const records: LedgerRecord[] = [
      await this.get<QueryRequest>(ctx, KEY.query(queryId)),
    ];
    const iterator = await ctx.stub.getStateByRange("", "");
    for (
      let item = await iterator.next();
      !item.done;
      item = await iterator.next()
    ) {
      if (!item.value?.value) continue;
      const record = JSON.parse(item.value.value.toString()) as LedgerRecord & {
        queryId?: string;
        requestId?: string;
      };
      if (
        record.recordType !== "QueryRequest" &&
        "queryId" in record &&
        record.queryId === queryId
      )
        records.push(record);
      else if ("requestId" in record && record.requestId) {
        const accessBytes = await ctx.stub.getState(
          KEY.access(record.requestId),
        );
        if (
          accessBytes?.length &&
          (JSON.parse(accessBytes.toString()) as AccessRequest).queryId ===
            queryId
        )
          records.push(record);
      }
    }
    return JSON.stringify(
      records.sort((a, b) =>
        a.ledgerTimestamp.localeCompare(b.ledgerTimestamp),
      ),
    );
  }

  @Transaction(false)
  @Returns("string")
  public async ListWorkflows(ctx: Context): Promise<string> {
    const results: QueryRequest[] = [];
    const iterator = await ctx.stub.getStateByRange("QUERY::", "QUERY::~");
    for (
      let item = await iterator.next();
      !item.done;
      item = await iterator.next()
    ) {
      if (item.value?.value)
        results.push(JSON.parse(item.value.value.toString()) as QueryRequest);
    }
    return JSON.stringify(results);
  }

  @Transaction(false)
  @Returns("string")
  public async GetHistoryForKey(ctx: Context, key: string): Promise<string> {
    const history: unknown[] = [];
    const iterator = await ctx.stub.getHistoryForKey(key);
    for (
      let item = await iterator.next();
      !item.done;
      item = await iterator.next()
    ) {
      if (item.value)
        history.push({
          txId: item.value.txId,
          isDelete: item.value.isDelete,
          value: item.value.value?.length
            ? JSON.parse(item.value.value.toString())
            : null,
        });
    }
    return JSON.stringify(history);
  }
}
