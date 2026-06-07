import { SetMetadata } from '@nestjs/common';

export const MIGRATED_ENVELOPE_KEY = 'propertyos:migrated-envelope';

export function UseApiEnvelope() {
  return SetMetadata(MIGRATED_ENVELOPE_KEY, true);
}
