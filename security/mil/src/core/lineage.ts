import { sha256Hex } from "./hash";
import { canonicalBytes } from "./canonical";
export const CHAIN_ID = "propertyos-lineage-v1";
export function stepHash(p: {tenant_id:string; evaluation_id:string; step_type:string; step_seq:number; prev_step_hash:string; payload_digest:string;}): string {
  return sha256Hex(canonicalBytes({ chain_id: CHAIN_ID, ...p }));
}
export function recordHash(p: {tenant_id:string; sequence_no:number; prev_hash:string; trace_root_hash:string; inputs_digest:string; outputs_digest:string; audit_digest:string;}): string {
  return sha256Hex(canonicalBytes({ chain_id: CHAIN_ID, ...p }));
}
