import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "config", "runtime");
mkdirSync(target, { recursive: true });
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  let env = readFileSync(envPath, "utf8");
  for (const name of [
    "JWT_SECRET",
    "MATCH_HMAC_KEY",
    "INTERNAL_ADAPTER_KEY",
    "DISCLOSURE_KEY",
  ]) {
    env = env.replace(
      new RegExp(`^${name}=replace-with-a-generated-32-byte-secret$`, "m"),
      `${name}=${randomBytes(32).toString("hex")}`,
    );
  }
  writeFileSync(envPath, env);
}
for (const org of ["police", "rab", "bgb", "customs"]) {
  const privatePath = path.join(target, `${org}-ed25519-private.pem`);
  const publicPath = path.join(target, `${org}-ed25519-public.pem`);
  if (existsSync(privatePath)) continue;
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  writeFileSync(
    privatePath,
    privateKey.export({ type: "pkcs8", format: "pem" }),
    { mode: 0o600 },
  );
  writeFileSync(publicPath, publicKey.export({ type: "spki", format: "pem" }));
}
console.log(
  "Generated missing Ed25519 demo signing keys under ignored config/runtime.",
);
