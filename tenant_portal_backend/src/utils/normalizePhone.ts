const E164_REGEX = /^\+[1-9]\d{7,14}$/;

const stripToDigits = (value: string): string => value.replace(/\D/g, '');

export const normalizePhone = (
  phone?: string | null,
  defaultCountryCode = '1',
): string | null => {
  if (!phone) {
    return null;
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('+')) {
    const normalized = `+${stripToDigits(trimmed)}`;
    return E164_REGEX.test(normalized) ? normalized : null;
  }

  const digits = stripToDigits(trimmed);
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length > 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
};

export const isValidE164Phone = (phone?: string | null): boolean => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return false;
  }

  return E164_REGEX.test(normalized);
};
