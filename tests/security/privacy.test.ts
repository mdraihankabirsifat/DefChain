import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { protectedMatchToken, sha256, signReceipt, verifyReceipt } from '@defchain/shared';

describe('security acceptance helpers', () => {
  it('never returns the raw identifier as the protected token', () => {
    const token = protectedMatchToken('TEST-NID-0001', 'independent-demo-key', '2026-Q3');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toContain('TEST-NID');
  });
  it('verifies the correct Ed25519 receipt and rejects a modified hash', () => {
    const {privateKey, publicKey} = generateKeyPairSync('ed25519');
    const hash = sha256('approved synthetic payload');
    const signature = signReceipt(hash, privateKey.export({type: 'pkcs8', format: 'pem'}).toString());
    expect(verifyReceipt(hash, signature, publicKey.export({type: 'spki', format: 'pem'}).toString())).toBe(true);
    expect(verifyReceipt(sha256('modified payload'), signature, publicKey.export({type: 'spki', format: 'pem'}).toString())).toBe(false);
  });
});
