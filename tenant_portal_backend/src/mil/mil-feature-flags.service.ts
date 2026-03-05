import { Injectable } from '@nestjs/common';

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

@Injectable()
export class MilFeatureFlagsService {
  /**
   * Master switch for MIL wrapper policy + audit hooks.
   * Default false to prevent accidental hard rollout.
   */
  isWrapperEnabled(): boolean {
    return envFlag('MIL_WRAPPER_ENABLED', false);
  }

  /**
   * Switch for at-rest encryption paths.
   * Default false for phased rollout.
   */
  isEncryptAtRestEnabled(): boolean {
    return envFlag('MIL_ENCRYPT_AT_REST_ENABLED', false);
  }

  /**
   * Controls DB-backed security/audit persistence.
   * Default false so wrapper can run without DB schema dependency.
   */
  isAuditPersistEnabled(): boolean {
    return envFlag('MIL_AUDIT_PERSIST_ENABLED', false);
  }
}
