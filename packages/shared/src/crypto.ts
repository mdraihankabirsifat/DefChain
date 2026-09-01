import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, sign, verify } from 'node:crypto';

export function canonicalizeSyntheticIdentifier(value: string): string {
  const canonical = value.trim().toUpperCase();
  if (!/^TEST-NID-[0-9]{4}$/.test(canonical)) throw new Error('INVALID_SYNTHETIC_IDENTIFIER');
  return canonical;
}

export function protectedMatchToken(identifier: string, key: string, epoch: string): string {
  const canonical = canonicalizeSyntheticIdentifier(identifier);
  return createHmac('sha256', key).update(`defchain:identifier:${epoch}:${canonical}`, 'utf8').digest('hex');
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface EncryptedPayload {ciphertext: string; iv: string; authTag: string; algorithm: 'aes-256-gcm'}

export function encryptPayload(payload: unknown, secret: string): EncryptedPayload {
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), algorithm: 'aes-256-gcm'};
}

export function decryptPayload(bundle: EncryptedPayload, secret: string): unknown {
  const key = createHash('sha256').update(secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(bundle.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(bundle.authTag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(bundle.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}

export function signReceipt(payloadHash: string, privateKeyPem: string): string {
  return sign(null, Buffer.from(payloadHash, 'hex'), privateKeyPem).toString('base64');
}

export function verifyReceipt(payloadHash: string, signature: string, publicKeyPem: string): boolean {
  return verify(null, Buffer.from(payloadHash, 'hex'), publicKeyPem, Buffer.from(signature, 'base64'));
}

export function safeRandomId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}
