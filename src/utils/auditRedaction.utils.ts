const SECRET_KEY_PATTERN =
  /(secret|password|token|apikey|api_key|private|credential|authorization|auth)/i;
const REDACTED = '[REDACTED]';

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSecrets(val);
      }
    }
    return result;
  }
  return value;
}
