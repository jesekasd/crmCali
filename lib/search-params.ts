export function parseScalarParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePageParam(value: string | string[] | undefined, defaultValue = 1) {
  const pageText = parseScalarParam(value);
  const page = Number(pageText);

  if (!Number.isFinite(page) || page < 1) {
    return defaultValue;
  }

  return Math.floor(page);
}

export function normalizeDateParam(value: string | string[] | undefined, fallback: string) {
  const normalized = parseScalarParam(value);

  if (normalized === "all") {
    return "";
  }

  if (!normalized) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeEnumParam<T extends string>(
  value: string | string[] | undefined,
  allowedValues: readonly T[],
  fallback: T
) {
  const normalized = parseScalarParam(value);
  return normalized && allowedValues.includes(normalized as T) ? (normalized as T) : fallback;
}

export function normalizeTextParam(value: string | string[] | undefined) {
  const normalized = parseScalarParam(value)?.trim() ?? "";
  return normalized.replace(/[(),]/g, " ").slice(0, 100);
}

export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  return { from, to };
}
