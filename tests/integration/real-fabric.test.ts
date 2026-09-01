import { describe, expect, it } from 'vitest';
import { FabricClient } from '@defchain/fabric-client';
import { safeRandomId } from '@defchain/shared';

const enabled = process.env.RUN_REAL_FABRIC_TESTS === 'true';
describe.skipIf(!enabled)('real Fabric integration', () => {
  const fabric = new FabricClient(process.cwd());
  it('commits and queries back a QueryRequest with a real tx ID', async () => {
    const queryId = safeRandomId('query');
    const record = await fabric.submit<{txId: string}>('PoliceMSP', 'CreateQueryRequest', JSON.stringify({queryId, requesterOrg: 'PoliceMSP', opaqueCaseRef: 'integration_opaque_case_ref', purposeCode: 'ACTIVE_INVESTIGATION', targetOrganizations: ['RABMSP'], policyVersion: 'demo-1', createdByRole: 'INVESTIGATOR'}));
    expect(record.txId).toMatch(/^[a-f0-9]{64}$/);
    expect(await fabric.evaluate('PoliceMSP', 'GetRecord', `QUERY::${queryId}`)).toMatchObject({txId: record.txId});
  });
  it('rejects PoliceMSP creating a RAB MatchAttestation', async () => {
    await expect(fabric.submit('PoliceMSP', 'CreateMatchAttestation', JSON.stringify({attestationId: safeRandomId('attest'), queryId: safeRandomId('query'), providerOrg: 'RABMSP', result: 'MATCH', policyVersion: 'demo-1'}))).rejects.toThrow('ERR_WRONG_MSP');
  });
});
