type ListEnvelope = Record<string, unknown>;

const DEFAULT_KEYS = ['data', 'items'] as const;

export function normalizeApiList<T>(payload: unknown, keys: string[] = [...DEFAULT_KEYS]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ListEnvelope;
  for (const key of keys) {
    const value = envelope[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}
