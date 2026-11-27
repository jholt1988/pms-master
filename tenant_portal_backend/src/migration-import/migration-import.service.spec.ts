import { readFileSync } from 'fs';
import { join } from 'path';
import { forbiddenColumnKind } from './csv';
import { MigrationImportService } from './migration-import.service';
import { MigrationImportDryRunInput } from './migration-import.types';

const ORG = 'org_dry_run';

const propertiesCsv = [
  'external_id,name,address,city,state,zip',
  'p1,Oak House,"12 Main St, Unit A",Austin,TX,78701',
].join('\n');

const unitsCsv = ['external_id,property_external_id,name,unit_number', 'u1,p1,Oak 1,1'].join('\n');

const tenantsCsv = ['external_id,email,first_name,last_name', 't1,ada@example.com,Ada,Lovelace'].join('\n');

const leasesCsv = [
  'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents',
  'l1,u1,t1,2026-02-01,2027-01-31,150000',
].join('\n');

function input(overrides: Partial<MigrationImportDryRunInput> = {}): MigrationImportDryRunInput {
  return {
    organizationId: ORG,
    propertiesCsv,
    unitsCsv,
    tenantsCsv,
    leasesCsv,
    ...overrides,
  };
}

describe('MigrationImportService dry-run', () => {
  const service = new MigrationImportService();

  it('accepts a valid set and writes nothing', () => {
    const result = service.dryRun(input());

    expect(result.dryRun).toBe(true);
    expect(result.written).toBe(false);
    expect(result.organizationId).toBe(ORG);
    expect(result.rowCounts).toEqual({ properties: 1, units: 1, tenants: 1, leases: 1 });
    expect(result.errors).toEqual([]);
  });

  it('reports a missing unit reference', () => {
    const result = service.dryRun(
      input({
        leasesCsv: [
          'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents',
          'l1,u-missing,t1,2026-02-01,2027-01-31,150000',
        ].join('\n'),
      }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'leases',
          row: 2,
          column: 'unit_external_id',
          code: 'unresolved_reference',
        }),
      ]),
    );
  });

  it('rejects a non-integer rent and a dollar amount', () => {
    const decimal = service.dryRun(
      input({
        leasesCsv: [
          'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents',
          'l1,u1,t1,2026-02-01,2027-01-31,1500.00',
        ].join('\n'),
      }),
    );
    const dollars = service.dryRun(
      input({
        leasesCsv: [
          'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents',
          'l1,u1,t1,2026-02-01,2027-01-31,$150000',
        ].join('\n'),
      }),
    );

    expect(decimal.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'leases',
          column: 'rent_amount_cents',
          code: 'invalid_rent_amount',
        }),
      ]),
    );
    expect(dollars.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'leases',
          column: 'rent_amount_cents',
          code: 'invalid_rent_amount',
        }),
      ]),
    );
    expect(JSON.stringify(decimal.errors)).not.toContain('1500.00 is stored');
    expect(decimal.written).toBe(false);
  });

  it('rejects a bad date', () => {
    const result = service.dryRun(
      input({
        leasesCsv: [
          'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents',
          'l1,u1,t1,2026-02-31,2027-01-31,150000',
        ].join('\n'),
      }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'leases',
          row: 2,
          column: 'start_date',
          code: 'invalid_date',
        }),
      ]),
    );
  });

  it('rejects a forbidden column using the header only', () => {
    const result = service.dryRun(
      input({
        tenantsCsv: 'external_id,email,first_name,last_name,ssn\n',
        leasesCsv: 'external_id,unit_external_id,tenant_external_id,start_date,end_date,rent_amount_cents\n',
      }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'tenants',
          row: 1,
          column: 'ssn',
          code: 'forbidden_column',
        }),
      ]),
    );
    expect(result.rowCounts.tenants).toBe(0);
    for (const error of result.errors) {
      expect(error).not.toHaveProperty('value');
    }
    expect(JSON.stringify(result)).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    expect(JSON.stringify(result)).not.toContain('account_number_value');
  });

  it('does not map vendor headers and does not take organizationId from a CSV', () => {
    const result = service.dryRun(
      input({
        organizationId: 'org_from_caller',
        propertiesCsv: 'PropertyName,Address,organization_id\nOak,1 Main,org_from_csv\n',
      }),
    );

    expect(result.organizationId).toBe('org_from_caller');
    expect(result.organizationId).not.toBe('org_from_csv');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'properties', column: 'PropertyName', code: 'unexpected_column' }),
        expect.objectContaining({ file: 'properties', column: 'external_id', code: 'missing_column' }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('org_from_csv');
  });

  it('rejects sensitive column headers and leaves ordinary headers alone', () => {
    expect(forbiddenColumnKind('ssn')).toBe('ssn');
    expect(forbiddenColumnKind('Social Security Number')).toBe('ssn');
    expect(forbiddenColumnKind("Driver's License")).toBe('driver_license');
    expect(forbiddenColumnKind('password')).toBe('password');
    expect(forbiddenColumnKind('bank_account')).toBe('bank_account');
    expect(forbiddenColumnKind('routing_number')).toBe('bank_account');
    expect(forbiddenColumnKind('name')).toBeNull();
    expect(forbiddenColumnKind('unit_number')).toBeNull();
    expect(forbiddenColumnKind('external_id')).toBeNull();
  });

  it('does not call Prisma write methods', () => {
    const files = [
      'migration-import.service.ts',
      'migration-import.module.ts',
      'migration-import.types.ts',
      'csv.ts',
    ];
    for (const file of files) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect(source.toLowerCase()).not.toContain('prisma');
      expect(source).not.toMatch(/\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/);
      expect(source.toLowerCase()).not.toContain('stripe');
    }
  });
});
