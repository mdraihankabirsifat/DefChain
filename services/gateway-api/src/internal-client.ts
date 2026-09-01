import { createHmac, randomBytes } from 'node:crypto';
import type { Organization } from '@defchain/shared';

const urls: Record<Organization, string> = {
  PoliceMSP: process.env.POLICE_ADAPTER_URL ?? 'http://127.0.0.1:4101',
  RABMSP: process.env.RAB_ADAPTER_URL ?? 'http://127.0.0.1:4102',
  BGBMSP: process.env.BGB_ADAPTER_URL ?? 'http://127.0.0.1:4103',
  CustomsMSP: process.env.CUSTOMS_ADAPTER_URL ?? 'http://127.0.0.1:4104',
};

export async function callAdapter<T>(org: Organization, route: string, value: unknown): Promise<T> {
  const body = JSON.stringify(value);
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const key = process.env.INTERNAL_ADAPTER_KEY ?? 'defchain-controlled-demo-internal-key-change-me';
  const signature = createHmac('sha256', key).update(`${timestamp}.${nonce}.${body}`).digest('hex');
  const response = await fetch(`${urls[org]}${route}`, {method: 'POST', headers: {'content-type': 'application/json', 'x-defchain-timestamp': timestamp, 'x-defchain-nonce': nonce, 'x-defchain-signature': signature}, body, signal: AbortSignal.timeout(20_000)});
  const result = await response.json() as T & {error?: {code: string}};
  if (!response.ok) throw new Error(`ADAPTER_REJECTED: ${result.error?.code ?? response.status}`);
  return result;
}
