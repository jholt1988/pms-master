import nacl from "tweetnacl";
import { canonicalBytes } from "./canonical";
function b64ToU8(b64: string): Uint8Array { return new Uint8Array(Buffer.from(b64, "base64")); }
function u8ToB64(u8: Uint8Array): string { return Buffer.from(u8).toString("base64"); }
export function signAttestation(result: unknown): { alg:"Ed25519"; kid:string; sig:string } {
  const kid = process.env.MIL_ATTESTATION_KID || "platform-attest-dev";
  const skB64 = process.env.MIL_ATTESTATION_PRIVATE_KEY_BASE64;
  if (!skB64) throw new Error("Missing MIL_ATTESTATION_PRIVATE_KEY_BASE64");
  const sk = b64ToU8(skB64);
  const msg = canonicalBytes(result);
  const sig = nacl.sign.detached(new Uint8Array(msg), sk);
  return { alg: "Ed25519", kid, sig: u8ToB64(sig) };
}
