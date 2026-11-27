import { Injectable } from '@nestjs/common';
import { forbiddenColumnKind, isBlankRecord, parseCsv } from './csv';
import {
  MigrationCsvFile,
  MigrationImportDryRunInput,
  MigrationImportDryRunResult,
  MigrationImportRowError,
} from './migration-import.types';

const FILES: MigrationCsvFile[] = ['properties', 'units', 'tenants', 'leases'];

const COLUMNS: Record<MigrationCsvFile, readonly string[]> = {
  properties: ['external_id', 'name', 'address', 'city', 'state', 'zip'],
  units: ['external_id', 'property_external_id', 'name', 'unit_number'],
  tenants: ['external_id', 'email', 'first_name', 'last_name'],
  leases: [
    'external_id',
    'unit_external_id',
    'tenant_external_id',
    'start_date',
    'end_date',
    'rent_amount_cents',
  ],
};

const REFERENCE_COLUMNS: Record<MigrationCsvFile, ReadonlyArray<{ column: string; target: MigrationCsvFile }>> = {
  properties: [],
  units: [{ column: 'property_external_id', target: 'properties' }],
  tenants: [],
  leases: [
    { column: 'unit_external_id', target: 'units' },
    { column: 'tenant_external_id', target: 'tenants' },
  ],
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AcceptedRow {
  line: number;
  values: Record<string, string>;
}

/**
 * Dry-run only. Parses four caller-supplied CSV strings and returns row
 * counts plus row errors. organizationId comes from the caller, never from a
 * CSV column. This service must not gain a database client, create User rows,
 * or store passwords.
 */
@Injectable()
export class MigrationImportService {
  dryRun(input: MigrationImportDryRunInput): MigrationImportDryRunResult {
    const organizationId = typeof input?.organizationId === 'string' ? input.organizationId.trim() : '';
    const errors: MigrationImportRowError[] = [];
    const rowCounts: Record<MigrationCsvFile, number> = {
      properties: 0,
      units: 0,
      tenants: 0,
      leases: 0,
    };
    const accepted = new Map<MigrationCsvFile, AcceptedRow[]>();
    const ids = new Map<MigrationCsvFile, Set<string>>();

    if (!organizationId) {
      errors.push({
        code: 'organization_id_required',
        message: 'organizationId must be provided by the caller and is not read from a CSV.',
      });
    }

    const csvByFile: Record<MigrationCsvFile, string> = {
      properties: asCsv(input?.propertiesCsv),
      units: asCsv(input?.unitsCsv),
      tenants: asCsv(input?.tenantsCsv),
      leases: asCsv(input?.leasesCsv),
    };

    for (const file of FILES) {
      const parsed = inspectFile(file, csvByFile[file]);
      rowCounts[file] = parsed.rowCount;
      errors.push(...parsed.errors);
      if (parsed.accepted) {
        accepted.set(file, parsed.rows);
        ids.set(file, parsed.ids);
      }
    }

    for (const file of FILES) {
      const rows = accepted.get(file);
      if (!rows) {
        continue;
      }
      for (const ref of REFERENCE_COLUMNS[file]) {
        const known = ids.get(ref.target);
        if (!known) {
          for (const row of rows) {
            const value = row.values[ref.column];
            if (!value) {
              continue;
            }
            errors.push({
              file,
              row: row.line,
              column: ref.column,
              code: 'unresolved_reference',
              message: `${ref.column} "${value}" does not resolve because ${ref.target}.csv was rejected.`,
            });
          }
          continue;
        }
        for (const row of rows) {
          const value = row.values[ref.column];
          if (!value || known.has(value)) {
            continue;
          }
          errors.push({
            file,
            row: row.line,
            column: ref.column,
            code: 'unresolved_reference',
            message: `${ref.column} "${value}" does not match an external_id in ${ref.target}.csv.`,
          });
        }
      }
    }

    return {
      organizationId,
      dryRun: true,
      written: false,
      rowCounts,
      errors,
    };
  }
}

function asCsv(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function inspectFile(
  file: MigrationCsvFile,
  csv: string,
): { rowCount: number; errors: MigrationImportRowError[]; accepted: boolean; rows: AcceptedRow[]; ids: Set<string> } {
  const errors: MigrationImportRowError[] = [];
  const empty = { rowCount: 0, errors, accepted: false, rows: [], ids: new Set<string>() };
  if (csv.trim() === '') {
    errors.push({
      file,
      code: 'header_required',
      message: `${file}.csv requires a header row.`,
    });
    return empty;
  }

  const parsed = parseCsv(csv);
  if (parsed.error) {
    errors.push({
      file,
      code: 'invalid_csv',
      message: `${file}.csv could not be parsed. Close quoted fields and upload UTF-8 CSV.`,
    });
    return empty;
  }

  const records = parsed.records.filter((record) => !isBlankRecord(record));
  if (records.length === 0) {
    errors.push({
      file,
      code: 'header_required',
      message: `${file}.csv requires a header row.`,
    });
    return empty;
  }

  const header = records[0];
  const headers = header.fields.map((name) => name.trim());
  const dataRecords = records.slice(1);
  const expected = COLUMNS[file];
  let headerRejected = false;

  const seenHeaders = new Set<string>();
  for (const name of headers) {
    if (!name) {
      headerRejected = true;
      errors.push({
        file,
        row: header.line,
        code: 'missing_column',
        message: `${file}.csv has an empty column name.`,
      });
      continue;
    }
    if (seenHeaders.has(name)) {
      headerRejected = true;
      errors.push({
        file,
        row: header.line,
        column: name,
        code: 'duplicate_column',
        message: `${file}.csv repeats column "${name}".`,
      });
      continue;
    }
    seenHeaders.add(name);
    const forbidden = forbiddenColumnKind(name);
    if (forbidden) {
      headerRejected = true;
      errors.push({
        file,
        row: header.line,
        column: name,
        code: 'forbidden_column',
        message: `Column "${name}" looks like ${forbiddenLabel(forbidden)} and is not accepted. Remove the column. Values from this file were not stored.`,
      });
      continue;
    }
    if (!expected.includes(name)) {
      headerRejected = true;
      errors.push({
        file,
        row: header.line,
        column: name,
        code: 'unexpected_column',
        message: `Column "${name}" is not part of ${file}.csv. Map the export onto the expected headers. No vendor column map is applied.`,
      });
    }
  }

  for (const name of expected) {
    if (!seenHeaders.has(name)) {
      headerRejected = true;
      errors.push({
        file,
        row: header.line,
        column: name,
        code: 'missing_column',
        message: `${file}.csv is missing required column "${name}".`,
      });
    }
  }

  if (headerRejected) {
    return { rowCount: dataRecords.length, errors, accepted: false, rows: [], ids: new Set<string>() };
  }

  const rows: AcceptedRow[] = [];
  const ids = new Set<string>();
  for (const record of dataRecords) {
    const values: Record<string, string> = {};
    headers.forEach((name, index) => {
      values[name] = (record.fields[index] ?? '').trim();
    });
    for (const name of expected) {
      if (!values[name]) {
        errors.push({
          file,
          row: record.line,
          column: name,
          code: 'missing_value',
          message: `${name} is required.`,
        });
      }
    }
    if (values.email && !EMAIL_RE.test(values.email)) {
      errors.push({
        file,
        row: record.line,
        column: 'email',
        code: 'invalid_email',
        message: 'email is not a valid address.',
      });
    }
    if (values.start_date && !isIsoDate(values.start_date)) {
      errors.push({
        file,
        row: record.line,
        column: 'start_date',
        code: 'invalid_date',
        message: 'start_date must be a real YYYY-MM-DD date.',
      });
    }
    if (values.end_date && !isIsoDate(values.end_date)) {
      errors.push({
        file,
        row: record.line,
        column: 'end_date',
        code: 'invalid_date',
        message: 'end_date must be a real YYYY-MM-DD date.',
      });
    }
    if (values.start_date && values.end_date && isIsoDate(values.start_date) && isIsoDate(values.end_date) && values.end_date < values.start_date) {
      errors.push({
        file,
        row: record.line,
        column: 'end_date',
        code: 'invalid_date_range',
        message: 'end_date must be on or after start_date.',
      });
    }
    if (values.rent_amount_cents && !/^\d+$/.test(values.rent_amount_cents)) {
      errors.push({
        file,
        row: record.line,
        column: 'rent_amount_cents',
        code: 'invalid_rent_amount',
        message: 'rent_amount_cents must be an integer number of cents with no dollar sign or decimal.',
      });
    }
    if (values.external_id) {
      if (ids.has(values.external_id)) {
        errors.push({
          file,
          row: record.line,
          column: 'external_id',
          code: 'duplicate_external_id',
          message: `external_id "${values.external_id}" is already used in ${file}.csv.`,
        });
      } else {
        ids.add(values.external_id);
      }
    }
    rows.push({ line: record.line, values });
  }

  return { rowCount: rows.length, errors, accepted: true, rows, ids };
}

function forbiddenLabel(kind: 'ssn' | 'driver_license' | 'password' | 'bank_account'): string {
  switch (kind) {
    case 'ssn':
      return 'an SSN';
    case 'driver_license':
      return 'a driver license';
    case 'password':
      return 'a password';
    case 'bank_account':
      return 'a bank account';
  }
}

function isIsoDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
