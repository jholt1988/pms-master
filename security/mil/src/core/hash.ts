import { createHash } from "crypto";
export function sha256Hex(data: Buffer | string): string {
  const h = createHash("sha256");
  h.update(data);
  return h.digest("hex");
}
