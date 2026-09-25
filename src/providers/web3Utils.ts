import { QueryClient, MutationCache } from '@tanstack/react-query';

/**
 * Sanitizes values for logging, redacting sensitive information.
 * Returns the sanitized value as `unknown`.
 */
export function sanitizeValue(val: unknown): unknown {
  if (typeof val === 'string') {
    const stellarRegex = /\b[G][A-D2-7][A-Z2-7]{54}\b/g;
    const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    let sanitized = val.replace(stellarRegex, '[REDACTED_ADDRESS]');
    sanitized = sanitized.replace(ethRegex, '[REDACTED_ADDRESS]');
    if (/^\d+(?:\.\d+)?$/.test(sanitized)) {
      return '[REDACTED]';
    }
    // Redact numbers that are not standard HTTP status codes and not part of alphanumeric identifiers
    sanitized = sanitized.replace(/(?<![a-zA-Z-])\b(?!(?:200|201|204|304|400|401|403|404|409|422|500)\b)\d+(?:\.\d+)?\b(?![a-zA-Z-])/g, '[REDACTED]');
    return sanitized;
  }
  if (typeof val === 'number') {
    return '[REDACTED]';
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val && typeof val === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val)) {
      if (/address|wallet|amount|price|value|stroops/i.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeValue((val as Record<string, unknown>)[key]);
      }
    }
    return result;
  }
  return val;
}

/** Shared QueryClient with MutationCache that logs structured errors */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      const rawKey = (mutation as { options?: { mutationKey?: unknown } }).options?.mutationKey;
      const mutation_key = Array.isArray(rawKey)
        ? (rawKey as unknown[]).map(sanitizeValue)
        : sanitizeValue(rawKey);

      let status_code: number | undefined;
      if (error && typeof error === 'object') {
        const err = error as { status?: number; statusCode?: number; response?: { status?: number } };
        status_code = err.status ?? err.statusCode ?? err.response?.status;
      }

      let error_message: unknown = '';
      if (error instanceof Error) {
        error_message = error.message;
      } else if (error && typeof error === 'object') {
        error_message = (error as { message?: string }).message ?? JSON.stringify(error);
      } else {
        error_message = String(error);
      }
      error_message = sanitizeValue(error_message);

      let creator_id: string | undefined;
      if (variables && typeof variables === 'object') {
        const rawCreatorId = (variables as { creator_id?: unknown; creatorId?: unknown }).creator_id ?? (variables as { creatorId?: unknown }).creatorId;
        if (rawCreatorId !== undefined) {
          creator_id = sanitizeValue(String(rawCreatorId)) as unknown as string;
        }
      }

      console.debug('[mutation-failure]', {
        mutation_key,
        status_code,
        error_message,
        creator_id,
      });
    },
  }),
});
