import { describe, expect, it } from 'vitest';
import { decryptPayload, encryptPayload, protectedMatchToken, sha256 } from './crypto.js';

describe('privacy helpers', () => {
  it('canonicalizes before deterministic protected matching', () => {
    expect(protectedMatchToken(' test-nid-0001 ', 'key', 'epoch')).toBe(protectedMatchToken('TEST-NID-0001', 'key', 'epoch'));
  });
  it('encrypts with fresh GCM nonces and decrypts', () => {
    const a = encryptPayload({caseReference: 'SYNTHETIC-RAB-01'}, 'secret');
    const b = encryptPayload({caseReference: 'SYNTHETIC-RAB-01'}, 'secret');
    expect(a.iv).not.toBe(b.iv);
    expect(decryptPayload(a, 'secret')).toEqual({caseReference: 'SYNTHETIC-RAB-01'});
  });
  it('changes payload hash when content changes', () => expect(sha256('a')).not.toBe(sha256('b')));
});
