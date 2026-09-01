import * as grpc from "@grpc/grpc-js";
import {
  connect,
  hash,
  signers,
  type Contract,
  type Gateway,
  type Identity,
  type Signer,
} from "@hyperledger/fabric-gateway";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Organization } from "@defchain/shared";

const ORG_CONFIG: Record<
  Organization,
  { domain: string; peer: string; port: number }
> = {
  PoliceMSP: {
    domain: "police.defchain.local",
    peer: "peer0.police.defchain.local",
    port: 7051,
  },
  RABMSP: {
    domain: "rab.defchain.local",
    peer: "peer0.rab.defchain.local",
    port: 8051,
  },
  BGBMSP: {
    domain: "bgb.defchain.local",
    peer: "peer0.bgb.defchain.local",
    port: 9051,
  },
  CustomsMSP: {
    domain: "customs.defchain.local",
    peer: "peer0.customs.defchain.local",
    port: 10051,
  },
};

async function firstFile(directory: string): Promise<string> {
  const names = await fs.readdir(directory);
  if (!names[0]) throw new Error(`No identity material in ${directory}`);
  return path.join(directory, names[0]);
}

export class FabricClient {
  constructor(private readonly root = process.cwd()) {}

  private async connection(
    org: Organization,
  ): Promise<{ gateway: Gateway; client: grpc.Client }> {
    const config = ORG_CONFIG[org]!;
    const orgRoot = path.join(
      this.root,
      "blockchain",
      "network",
      "organizations",
      "peerOrganizations",
      config.domain,
    );
    const userRoot = path.join(
      orgRoot,
      "users",
      `User1@${config.domain}`,
      "msp",
    );
    const certPath = await firstFile(path.join(userRoot, "signcerts"));
    const keyPath = await firstFile(path.join(userRoot, "keystore"));
    const tlsRootCert = await fs.readFile(
      path.join(orgRoot, "peers", config.peer, "tls", "ca.crt"),
    );
    const credentials = grpc.credentials.createSsl(tlsRootCert);
    const address =
      process.env[`${org.replace("MSP", "").toUpperCase()}_PEER_ENDPOINT`] ??
      `localhost:${config.port}`;
    const client = new grpc.Client(address, credentials, {
      "grpc.ssl_target_name_override": config.peer,
    });
    const identity: Identity = {
      mspId: org,
      credentials: await fs.readFile(certPath),
    };
    const privateKey = await fs.readFile(keyPath);
    const signer: Signer = signers.newPrivateKeySigner(
      await import("node:crypto").then(({ createPrivateKey }) =>
        createPrivateKey(privateKey),
      ),
    );
    const gateway = connect({
      client,
      identity,
      signer,
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5_000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15_000 }),
      submitOptions: () => ({ deadline: Date.now() + 5_000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
    });
    return { gateway, client };
  }

  private contract(gateway: Gateway): Contract {
    return gateway
      .getNetwork(process.env.FABRIC_CHANNEL ?? "defchain-channel")
      .getContract(process.env.FABRIC_CHAINCODE ?? "defchain");
  }

  async submit<T>(
    org: Organization,
    transactionName: string,
    ...args: string[]
  ): Promise<T> {
    let connection: { gateway: Gateway; client: grpc.Client } | undefined;
    try {
      connection = await this.connection(org);
      const bytes = await this.contract(connection.gateway).submitTransaction(
        transactionName,
        ...args,
      );
      return JSON.parse(Buffer.from(bytes).toString()) as T;
    } catch (error) {
      throw new Error(
        `BLOCKCHAIN_UNAVAILABLE_OR_REJECTED: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      connection?.gateway.close();
      connection?.client.close();
    }
  }

  async evaluate<T>(
    org: Organization,
    transactionName: string,
    ...args: string[]
  ): Promise<T> {
    let connection: { gateway: Gateway; client: grpc.Client } | undefined;
    try {
      connection = await this.connection(org);
      const bytes = await this.contract(connection.gateway).evaluateTransaction(
        transactionName,
        ...args,
      );
      return JSON.parse(Buffer.from(bytes).toString()) as T;
    } finally {
      connection?.gateway.close();
      connection?.client.close();
    }
  }

  async health(
    org: Organization = "PoliceMSP",
  ): Promise<{ available: boolean; message: string }> {
    try {
      await this.evaluate(org, "ListWorkflows");
      return { available: true, message: "Fabric Gateway reachable" };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : "Fabric unavailable",
      };
    }
  }
}
