export function resolveCorsOrigin() {
  const raw = process.env.CORS_ORIGIN?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!raw) {
    if (isProduction) {
      throw new Error('CORS_ORIGIN must be set in production');
    }
    return '*';
  }

  if (raw === '*') {
    if (isProduction) {
      throw new Error('CORS_ORIGIN cannot be wildcard (*) in production');
    }
    return '*';
  }

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return raw;
}
