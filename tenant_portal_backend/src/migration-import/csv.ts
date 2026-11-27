export interface CsvRecord {
  line: number;
  fields: string[];
}

export interface ParsedCsv {
  records: CsvRecord[];
  error?: 'unclosed_quote';
}

export type ForbiddenColumnKind = 'ssn' | 'driver_license' | 'password' | 'bank_account';

function columnTokens(header: string): string[] {
  return header
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function compactColumn(header: string): string {
  return columnTokens(header).join('');
}

/**
 * Header-name check only. Callers must not pass cell values in, and this
 * function never returns cell values.
 */
export function forbiddenColumnKind(header: string): ForbiddenColumnKind | null {
  const tokens = columnTokens(header);
  if (tokens.length === 0) {
    return null;
  }
  const compact = tokens.join('');
  const has = (token: string) => tokens.includes(token);

  if (has('ssn') || compact.includes('socialsecurity') || (has('ss') && (has('number') || has('no') || has('num')))) {
    return 'ssn';
  }

  const driver = has('driver') || has('drivers');
  const license = has('license') || has('licence') || has('lic');
  if (
    (driver && license) ||
    compact.includes('driverlicense') ||
    compact.includes('driverslicense') ||
    compact.includes('driverlicence') ||
    compact.includes('driverslicence') ||
    (has('dl') && (has('number') || has('no') || has('num')))
  ) {
    return 'driver_license';
  }

  if (has('password') || has('passwd') || has('pwd')) {
    return 'password';
  }

  const accountNumber =
    (has('account') || has('acct')) && (has('number') || has('no') || has('num'));
  if (
    has('iban') ||
    has('routing') ||
    compact.includes('bankaccount') ||
    compact.includes('bankacct') ||
    compact.includes('checkingaccount') ||
    compact.includes('savingsaccount') ||
    accountNumber
  ) {
    return 'bank_account';
  }

  return null;
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;

  const pushField = () => {
    fields.push(field);
    field = '';
  };

  const pushRecord = () => {
    records.push({ line: recordLine, fields });
    fields = [];
    recordLine = line;
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (char === '\n') {
        line += 1;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      pushField();
      pushRecord();
      i += 1;
      if (text[i] === '\n') {
        i += 1;
      }
      line += 1;
      recordLine = line;
      continue;
    }
    if (char === '\n') {
      pushField();
      pushRecord();
      i += 1;
      line += 1;
      recordLine = line;
      continue;
    }
    field += char;
    i += 1;
  }

  if (inQuotes) {
    return { records, error: 'unclosed_quote' };
  }
  if (field.length > 0 || fields.length > 0) {
    pushField();
    pushRecord();
  }
  return { records };
}

export function isBlankRecord(record: CsvRecord): boolean {
  return record.fields.length === 1 && record.fields[0].trim() === '';
}
