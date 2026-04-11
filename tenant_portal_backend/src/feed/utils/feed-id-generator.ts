// utils/feed-id.generator.ts
export const generateSignalId = (domain: string, type: string, entityId: string): string => {
  return `${domain}_${type}_${entityId}`;
};