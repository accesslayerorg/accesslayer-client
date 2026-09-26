/**
 * Minimal, dependency-free JWT decoding — issue #878.
 *
 * We only ever need the `exp` claim from the access token to schedule a
 * session-expiry warning, so a full JWT verification/parsing library is
 * unnecessary here: the token is already trusted (it's the one we just
 * received from — or previously stored after — our own backend), we are
 * not verifying its signature client-side, and the standard base64url
 * JSON payload decode below is ~15 lines with no new dependency.
 */

interface JwtPayload {
	/** Expiration time, in seconds since the Unix epoch (per RFC 7519). */
	exp?: number;
	[claim: string]: unknown;
}

/**
 * Decodes the payload segment of a JWT without verifying its signature.
 *
 * Returns `null` for a malformed token (wrong number of segments, invalid
 * base64url, or non-JSON payload) rather than throwing, since callers use
 * this defensively on a token from cookie storage that could in principle
 * be corrupted or absent.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
	const segments = token.split('.');
	if (segments.length !== 3) {
		return null;
	}

	const [, payloadSegment] = segments;

	try {
		const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64.padEnd(
			base64.length + ((4 - (base64.length % 4)) % 4),
			'='
		);
		const json = atob(padded);
		// decodeURIComponent + escape handles multi-byte (UTF-8) claim
		// values correctly; atob alone would mangle them.
		const decoded = decodeURIComponent(
			Array.from(json)
				.map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
				.join('')
		);
		const parsed: unknown = JSON.parse(decoded);
		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}
		return parsed as JwtPayload;
	} catch {
		return null;
	}
}

/**
 * Returns the JWT's expiry as a millisecond epoch timestamp, or `null` if
 * the token is malformed or carries no `exp` claim.
 */
export function decodeJwtExpiryMs(token: string): number | null {
	const payload = decodeJwtPayload(token);
	if (!payload || typeof payload.exp !== 'number') {
		return null;
	}
	return payload.exp * 1000;
}
