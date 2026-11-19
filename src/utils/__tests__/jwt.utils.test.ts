import { describe, expect, it } from 'vitest';
import { decodeJwtExpiryMs, decodeJwtPayload } from '@/utils/jwt.utils';

/** Builds a syntactically valid (unsigned) JWT for a given payload. */
function makeJwt(payload: Record<string, unknown>): string {
	const base64url = (obj: unknown) => {
		const json = JSON.stringify(obj);
		// UTF-8 encode before base64, mirroring the inverse of what
		// decodeJwtPayload does when decoding multi-byte claim values.
		const utf8Bytes = encodeURIComponent(json).replace(
			/%([0-9A-F]{2})/g,
			(_, hex) => String.fromCharCode(parseInt(hex, 16))
		);
		return btoa(utf8Bytes)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	};

	const header = base64url({ alg: 'HS256', typ: 'JWT' });
	const body = base64url(payload);
	return `${header}.${body}.fake-signature`;
}

describe('decodeJwtPayload (#878)', () => {
	it('decodes a well-formed JWT payload', () => {
		const token = makeJwt({ sub: 'user-123', exp: 1893456000, role: 'holder' });

		expect(decodeJwtPayload(token)).toEqual({
			sub: 'user-123',
			exp: 1893456000,
			role: 'holder',
		});
	});

	it('decodes multi-byte (UTF-8) claim values correctly', () => {
		const token = makeJwt({ sub: 'user-123', name: 'Café ☕️', exp: 100 });

		expect(decodeJwtPayload(token)).toEqual({
			sub: 'user-123',
			name: 'Café ☕️',
			exp: 100,
		});
	});

	it('returns null for a token with the wrong number of segments', () => {
		expect(decodeJwtPayload('not-a-jwt')).toBeNull();
		expect(decodeJwtPayload('only.two')).toBeNull();
		expect(decodeJwtPayload('a.b.c.d')).toBeNull();
	});

	it('returns null for a token with invalid base64 in the payload segment', () => {
		expect(decodeJwtPayload('header.not!valid!base64.signature')).toBeNull();
	});

	it('returns null when the decoded payload is not JSON', () => {
		const notJson = btoa('not json at all');
		expect(decodeJwtPayload(`header.${notJson}.signature`)).toBeNull();
	});

	it('returns null when the decoded payload is a JSON primitive, not an object', () => {
		const primitive = btoa(JSON.stringify(42));
		expect(decodeJwtPayload(`header.${primitive}.signature`)).toBeNull();
	});

	it('handles unpadded base64url payloads (no trailing =)', () => {
		// A payload whose base64 length is not a multiple of 4 exercises the
		// padding logic.
		const token = makeJwt({ a: 1 });
		expect(decodeJwtPayload(token)).toEqual({ a: 1 });
	});
});

describe('decodeJwtExpiryMs (#878)', () => {
	it('converts the exp claim (seconds) to a millisecond epoch timestamp', () => {
		const token = makeJwt({ exp: 1700000000 });
		expect(decodeJwtExpiryMs(token)).toBe(1700000000 * 1000);
	});

	it('returns null when the token has no exp claim', () => {
		const token = makeJwt({ sub: 'user-123' });
		expect(decodeJwtExpiryMs(token)).toBeNull();
	});

	it('returns null when exp is not a number', () => {
		const token = makeJwt({ exp: '1700000000' });
		expect(decodeJwtExpiryMs(token)).toBeNull();
	});

	it('returns null for a malformed token', () => {
		expect(decodeJwtExpiryMs('garbage')).toBeNull();
	});
});
