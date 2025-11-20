export function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new Error(`Cannot parse boolean value from "${value}"`);
}

export function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(parsed)) {
    throw new Error(`Cannot parse number value from "${value}"`);
  }

  return Math.trunc(parsed);
}

export function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Cannot parse date value from "${value}"`);
  }

  return date;
}

export function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function emptyToNull(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
