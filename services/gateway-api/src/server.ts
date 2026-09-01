import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pinoHttp from 'pino-http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FabricClient } from '@defchain/fabric-client';
import { apiAccessSchema, apiDecisionSchema, apiQuerySchema, decryptPayload, DefChainError, loginSchema, protectedMatchToken, safeRandomId, sha256, verifyReceipt, type AccessRequest, type DisclosureReceipt, type LedgerRecord, type Organization, type SecurityEvent } from '@defchain/shared';
import { GatewayDatabase, type AppUser } from './database.js';
import { callAdapter } from './internal-client.js';

interface AuthRequest extends Request {user?: AppUser}
const root = process.cwd();
const database = new GatewayDatabase(root);
const fabric = new FabricClient(root);
const jwtSecret = process.env.JWT_SECRET ?? 'defchain-controlled-demo-jwt-secret-change-me';
const app = express();

function safeUser(user: AppUser) { return {id: user.id, username: user.username, organization: user.organization, role: user.role, active: Boolean(user.active), queryBudget: user.query_budget, queryCount: user.query_count}; }
function event(user: AppUser | undefined, type: SecurityEvent['type'], context: SecurityEvent['safeContext']): void { database.addSecurityEvent({eventId: safeRandomId('security'), actorId: user?.id, actorOrg: user?.organization, type, safeContext: context, createdAt: new Date().toISOString()}); }
function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new DefChainError('UNAUTHENTICATED', 'Authentication required', 401);
    const payload = jwt.verify(token, jwtSecret) as {sub: string};
    const user = database.userById(payload.sub);
    if (!user?.active) { event(user, 'REVOKED_USER', {route: req.path}); throw new DefChainError('USER_REVOKED', 'User disabled or revoked', 403); }
    req.user = user; next();
  } catch (error) { next(error instanceof DefChainError ? error : new DefChainError('INVALID_SESSION', 'Invalid or expired session', 401)); }
}
function role(...roles: AppUser['role'][]) { return (req: AuthRequest, _res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role)) { event(req.user, 'UNAUTHORIZED_ACTION', {route: req.path}); next(new DefChainError('FORBIDDEN', 'Role is not permitted', 403)); return; } next(); }; }

app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors({origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: false}));
app.use(express.json({limit: '32kb'}));
app.use(pinoHttp({redact: ['req.headers.authorization', 'req.body.password', 'req.body.syntheticIdentifier', 'req.body.protectedToken', 'res.headers["set-cookie"]']}));
app.use('/api/v1/auth/login', rateLimit({windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false}));

app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = database.userByUsername(input.username);
    if (!user || !await bcrypt.compare(input.password, user.password_hash)) throw new DefChainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    if (!user.active) { event(user, 'REVOKED_USER', {route: '/auth/login'}); throw new DefChainError('USER_REVOKED', 'User disabled or revoked', 403); }
    res.json({token: jwt.sign({sub: user.id}, jwtSecret, {expiresIn: '2h', issuer: 'defchain-demo'}), user: safeUser(user)});
  } catch (error) { next(error); }
});
app.post('/api/v1/auth/logout', requireAuth, (_req, res) => res.status(204).end());
app.get('/api/v1/auth/me', requireAuth, (req: AuthRequest, res) => res.json({user: safeUser(req.user!)}));

app.get('/api/v1/health', async (_req, res) => {
  const blockchain = await fabric.health();
  res.status(blockchain.available ? 200 : 503).json({service: 'gateway-api', blockchain, mode: process.env.FABRIC_NETWORK_MODE ?? 'lite', syntheticData: true});
});
app.get('/api/v1/cases', requireAuth, (req: AuthRequest, res) => res.json({cases: database.activeCases(req.user!.organization)}));

app.post('/api/v1/queries', requireAuth, role('INVESTIGATOR'), async (req: AuthRequest, res, next) => {
  try {
    const input = apiQuerySchema.parse(req.body);
    const user = database.user!;
    const appUser = req.user!;
    const demoCase = user.caseById(input.caseId);
    if (!demoCase) { event(appUser, 'MISSING_CASE', {caseReferenceHash: sha256(input.caseId)}); throw new DefChainError('CASE_NOT_FOUND', 'Case not found', 404); }
    if (demoCase.status !== 'ACTIVE') { event(appUser, 'INACTIVE_CASE', {caseReferenceHash: sha256(input.caseId), status: demoCase.status}); throw new DefChainError('CASE_INACTIVE', 'Case must be active', 409); }
    if (demoCase.owner_org !== appUser.organization || demoCase.allowed_purpose !== input.purposeCode) throw new DefChainError('PURPOSE_NOT_ALLOWED', 'Purpose is not authorized for this case', 403);
    if (appUser.query_count >= appUser.query_budget) { event(appUser, 'BUDGET_EXCEEDED', {budget: appUser.query_budget}); throw new DefChainError('QUERY_BUDGET_EXCEEDED', 'Query budget exceeded', 429); }
    const queryId = safeRandomId('query');
    const query = await fabric.submit(appUser.organization, 'CreateQueryRequest', JSON.stringify({queryId, requesterOrg: appUser.organization, opaqueCaseRef: demoCase.opaque_ref, purposeCode: input.purposeCode, targetOrganizations: input.targetOrganizations, policyVersion: 'demo-1', createdByRole: 'INVESTIGATOR'}));
    user.incrementQueryCount(appUser.id);
    const token = protectedMatchToken(input.syntheticIdentifier, process.env.MATCH_HMAC_KEY ?? 'defchain-controlled-demo-match-key-change-me', process.env.TOKEN_EPOCH ?? '2026-Q3');
    const attestations = [];
    for (const target of input.targetOrganizations) {
      if (target === appUser.organization) continue;
      const response = await callAdapter<{attestation: LedgerRecord}>(target, '/internal/match', {queryId, protectedToken: token});
      attestations.push(response.attestation);
    }
    res.status(201).json({query, attestations, notice: 'MATCH is a provider attestation, not proof of guilt, source accuracy, or entitlement to a record.'});
  } catch (error) { next(error); }
});

app.get('/api/v1/workflows/:queryId', requireAuth, async (req: AuthRequest, res, next) => { try { res.json({records: await fabric.evaluate<LedgerRecord[]>(req.user!.organization, 'GetWorkflow', req.params.queryId)}); } catch (error) { next(error); } });

app.post('/api/v1/access-requests', requireAuth, role('INVESTIGATOR'), async (req: AuthRequest, res, next) => {
  try {
    const input = apiAccessSchema.parse(req.body);
    const requestId = safeRandomId('request');
    const workflow = await fabric.evaluate<LedgerRecord[]>(req.user!.organization, 'GetWorkflow', input.queryId);
    const query = workflow.find((record) => record.recordType === 'QueryRequest');
    if (!query || query.recordType !== 'QueryRequest') throw new DefChainError('QUERY_NOT_FOUND', 'Query not found', 404);
    const access = await fabric.submit<AccessRequest>(req.user!.organization, 'CreateAccessRequest', JSON.stringify({requestId, queryId: input.queryId, requesterOrg: req.user!.organization, providerOrg: input.providerOrg, requestedScopes: input.requestedScopes, purposeCode: query.purposeCode, justificationHash: sha256(input.justification)}));
    res.status(201).json({access});
  } catch (error) { next(error); }
});

app.get('/api/v1/provider/inbox', requireAuth, role('PROVIDER_OFFICER'), async (req: AuthRequest, res, next) => {
  try {
    const queries = await fabric.evaluate<LedgerRecord[]>(req.user!.organization, 'ListWorkflows');
    const records = (await Promise.all(queries.filter((r) => r.recordType === 'QueryRequest').map((r) => fabric.evaluate<LedgerRecord[]>(req.user!.organization, 'GetWorkflow', (r as {queryId: string}).queryId)))).flat();
    res.json({requests: records.filter((record) => record.recordType === 'AccessRequest' && record.providerOrg === req.user!.organization)});
  } catch (error) { next(error); }
});

app.post('/api/v1/provider/requests/:requestId/decision', requireAuth, role('PROVIDER_OFFICER'), async (req: AuthRequest, res, next) => {
  try {
    const input = apiDecisionSchema.parse(req.body);
    const result = await callAdapter<{decision: LedgerRecord}>(req.user!.organization, '/internal/decisions', {requestId: req.params.requestId, ...input});
    res.status(201).json(result);
  } catch (error) { next(error); }
});

app.post('/api/v1/access-requests/:requestId/disclose', requireAuth, role('INVESTIGATOR'), async (req: AuthRequest, res, next) => {
  try {
    const access = await fabric.evaluate<AccessRequest>(req.user!.organization, 'GetRecord', `ACCESS::${req.params.requestId}`);
    if (access.requesterOrg !== req.user!.organization) throw new DefChainError('FORBIDDEN', 'Requester organization mismatch', 403);
    const result = await callAdapter<{encrypted: Parameters<typeof decryptPayload>[0]; payloadHash: string; signature: string; receipt: DisclosureReceipt}>(access.providerOrg, '/internal/disclosures', {requestId: req.params.requestId});
    const payload = decryptPayload(result.encrypted, process.env.DISCLOSURE_KEY ?? 'defchain-controlled-demo-disclosure-key-change-me');
    if (sha256(JSON.stringify(payload)) !== result.payloadHash) throw new DefChainError('PAYLOAD_HASH_MISMATCH', 'Disclosure integrity check failed', 502);
    const publicKeyPath = path.join(root, 'config', 'runtime', `${access.providerOrg.replace('MSP', '').toLowerCase()}-ed25519-public.pem`);
    const signatureVerified = verifyReceipt(result.payloadHash, result.signature, await fs.readFile(publicKeyPath, 'utf8'));
    if (!signatureVerified) throw new DefChainError('SIGNATURE_INVALID', 'Provider signature check failed', 502);
    res.json({approvedPayload: payload, encryptionVerified: true, signatureVerified, payloadHash: result.payloadHash, receipt: result.receipt});
  } catch (error) { next(error); }
});

app.get('/api/v1/security-events', requireAuth, role('AUDITOR'), (_req, res) => res.json({events: database.securityEvents()}));
app.post('/api/v1/demo/reset', requireAuth, role('AUDITOR'), (_req, res, next) => { if (process.env.DEMO_MODE !== 'true') { next(new DefChainError('DEMO_MODE_DISABLED', 'Reset disabled', 403)); return; } database.resetDemo(); res.json({reset: 'local demo counters and security events', ledgerResetCommand: 'npm run reset'}); });

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = String(req.headers['x-request-id'] ?? safeRandomId('http'));
  if (error instanceof DefChainError) { res.status(error.status).json({error: {code: error.code, message: error.message, requestId}}); return; }
  const message = error instanceof Error ? error.message : 'Unknown error';
  const isFabric = message.includes('BLOCKCHAIN_UNAVAILABLE');
  const isValidation = error && typeof error === 'object' && 'issues' in error;
  res.status(isFabric ? 503 : isValidation ? 400 : 500).json({error: {code: isFabric ? 'BLOCKCHAIN_UNAVAILABLE' : isValidation ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR', message: isFabric ? 'Blockchain unavailable; ledger-changing actions are blocked.' : isValidation ? 'Request validation failed.' : 'Request failed safely.', requestId}});
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, '127.0.0.1', () => console.log(`DefChain gateway API listening on http://localhost:${port}`));
