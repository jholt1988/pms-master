import stringify from "fast-json-stable-stringify";
export function canonicalBytes(obj: unknown): Buffer {
  return Buffer.from(stringify(obj as any), "utf8");
}
