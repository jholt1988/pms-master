export type MigrationCsvFile = 'properties' | 'units' | 'tenants' | 'leases';

export interface MigrationImportDryRunInput {
  organizationId: string;
  propertiesCsv: string;
  unitsCsv: string;
  tenantsCsv: string;
  leasesCsv: string;
}

export interface MigrationImportRowError {
  file?: MigrationCsvFile;
  /** 1-based line where the CSV record starts. Header is line 1. */
  row?: number;
  column?: string;
  code: string;
  message: string;
}

export interface MigrationImportDryRunResult {
  organizationId: string;
  dryRun: true;
  written: false;
  rowCounts: Record<MigrationCsvFile, number>;
  errors: MigrationImportRowError[];
}
