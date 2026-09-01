import { describe, expect, it } from 'vitest';
import { DefChainContract } from './defchain-contract';

function context(msp = 'PoliceMSP') {
  const state = new Map<string, Buffer>();
  const ctx = {
    clientIdentity: {getMSPID: () => msp},
    stub: {
      getTxID: () => 'a'.repeat(64),
      getTxTimestamp: () => ({seconds: {toNumber: () => 1_700_000_000}, nanos: 0}),
      getState: async (key: string) => state.get(key) ?? Buffer.alloc(0),
      putState: async (key: string, value: Buffer) => { state.set(key, value); },
      setEvent: () => undefined,
    },
  };
  return {ctx: ctx as never, state};
}

describe('DefChainContract', () => {
  it('creates an immutable query with Fabric metadata', async () => {
    const {ctx} = context();
    const contract = new DefChainContract();
    const raw = JSON.stringify({queryId: 'query_12345678', requesterOrg: 'PoliceMSP', opaqueCaseRef: 'opaque_case_reference', purposeCode: 'ACTIVE_INVESTIGATION', targetOrganizations: ['RABMSP'], policyVersion: 'demo-1', createdByRole: 'INVESTIGATOR'});
    const record = JSON.parse(await contract.CreateQueryRequest(ctx, raw));
    expect(record.recordType).toBe('QueryRequest');
    expect(record.txId).toHaveLength(64);
    await expect(contract.CreateQueryRequest(ctx, raw)).rejects.toThrow('ERR_DUPLICATE_ID');
  });

  it('rejects requester impersonation of a provider', async () => {
    const {ctx} = context('PoliceMSP');
    const contract = new DefChainContract();
    await expect(contract.CreateMatchAttestation(ctx, JSON.stringify({attestationId: 'attest_12345678', queryId: 'query_12345678', providerOrg: 'RABMSP', result: 'MATCH', policyVersion: 'demo-1'}))).rejects.toThrow('ERR_WRONG_MSP');
  });
});
