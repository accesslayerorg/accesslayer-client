/**
 * Diagnostic data redaction utilities (#1447).
 *
 * Ensures all telemetry, debug dumps, and diagnostic export blobs strictly
 * scrub public and private Stellar addresses, EVM addresses, authentication tokens,
 * passwords, and sensitive form values.
 */

// Matches Stellar Public Ed25519 addresses (G...), Secret keys (S...), and Contract IDs (C...)
const STELLAR_ADDRESS_REGEX = /\b[GSC][A-Za-z0-9]{19,70}\b/g;

// Matches Ethereum / EVM hex addresses
const EVM_ADDRESS_REGEX = /\b0x[a-fA-F0-9]{40}\b/g;

// Matches JWT tokens
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;

// Matches Authorization: Bearer tokens
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;

const SENSITIVE_KEY_REGEX =
	/^(password|secret|token|auth|credential|seed|mnemonic|privateKey|apiKey|address|wallet|account)$/i;

/**
 * Redacts any detected addresses, secrets, and auth tokens from a raw string.
 */
export function redactString(text: string): string {
	if (!text) return '';
	return text
		.replace(STELLAR_ADDRESS_REGEX, '[REDACTED_STELLAR_ADDR]')
		.replace(EVM_ADDRESS_REGEX, '[REDACTED_EVM_ADDR]')
		.replace(JWT_REGEX, '[REDACTED_JWT_TOKEN]')
		.replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]');
}

/**
 * Recursively deep-redacts any data structure (objects, arrays, strings) to produce
 * a safe diagnostic structure without leaking user or system secrets.
 */
export function redactDiagnostics<T = unknown>(value: T): T {
	if (value == null) {
		return value;
	}

	if (typeof value === 'string') {
		return redactString(value) as unknown as T;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map(item => redactDiagnostics(item)) as unknown as T;
	}

	if (typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (SENSITIVE_KEY_REGEX.test(k)) {
				result[k] = '[REDACTED]';
			} else {
				result[k] = redactDiagnostics(v);
			}
		}
		return result as T;
	}

	return value;
}

/**
 * Produces a formatted JSON string of diagnostics safe for sharing with support.
 */
export function serializeRedactedDiagnostics(diagnostics: Record<string, unknown>): string {
	const sanitized = redactDiagnostics(diagnostics);
	return JSON.stringify(sanitized, null, 2);
}
