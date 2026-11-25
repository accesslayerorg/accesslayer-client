import { describe, expect, it, vi } from 'vitest';
import {
	PasskeyError,
	base64urlToBuffer,
	bufferToBase64url,
	createPasskey,
	getPasskeyAssertion,
	isWebAuthnSupported,
	toCreationOptions,
} from '@/lib/webauthn';

const bytes = (...b: number[]) => new Uint8Array(b).buffer;
const creation = {
	challenge: bufferToBase64url(bytes(1, 2, 3, 250, 251)),
	rp: { name: 'AccessLayer' },
	user: { id: bufferToBase64url(bytes(9, 9)), name: 'ada', displayName: 'Ada' },
	pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
};

describe('webauthn helpers (#1477)', () => {
	it('round-trips base64url without padding or unsafe characters', () => {
		const data = new Uint8Array([0, 255, 62, 63, 250, 251, 252]);
		const encoded = bufferToBase64url(data);
		expect(encoded).not.toMatch(/[+/=]/);
		expect(new Uint8Array(base64urlToBuffer(encoded))).toEqual(data);
	});

	it('detects support and refuses insecure contexts', () => {
		const credentials = { create: vi.fn(), get: vi.fn() };
		expect(isWebAuthnSupported({ PublicKeyCredential: class {}, credentials, isSecureContext: true })).toBe(true);
		expect(isWebAuthnSupported({ credentials, isSecureContext: true })).toBe(false);
		expect(isWebAuthnSupported({ PublicKeyCredential: class {}, isSecureContext: true })).toBe(false);
		expect(isWebAuthnSupported({ PublicKeyCredential: class {}, credentials, isSecureContext: false })).toBe(false);
	});

	it('decodes the server challenge and user id into buffers', () => {
		const native = toCreationOptions(creation);
		expect(new Uint8Array(native.challenge as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 250, 251]));
		expect(new Uint8Array(native.user.id as ArrayBuffer)).toEqual(new Uint8Array([9, 9]));
	});

	it('creates a passkey and serialises the attestation', async () => {
		const create = vi.fn(async () => ({
			id: 'cred-1',
			rawId: bytes(7, 7),
			type: 'public-key',
			response: { clientDataJSON: bytes(1), attestationObject: bytes(2), getTransports: () => ['internal'] },
		}));
		const result = await createPasskey(creation, {
			PublicKeyCredential: class {},
			credentials: { create, get: vi.fn() } as never,
			isSecureContext: true,
		});
		expect(result).toEqual({
			id: 'cred-1',
			rawId: bufferToBase64url(bytes(7, 7)),
			type: 'public-key',
			response: { clientDataJSON: 'AQ', attestationObject: 'Ag', transports: ['internal'] },
		});
	});

	it('maps a dismissed prompt to a cancelled error and an old browser to unsupported', async () => {
		const get = vi.fn(async () => {
			throw Object.assign(new Error('dismissed'), { name: 'NotAllowedError' });
		});
		await expect(
			getPasskeyAssertion({ challenge: 'AQ' }, { PublicKeyCredential: class {}, credentials: { create: vi.fn(), get } as never, isSecureContext: true })
		).rejects.toMatchObject({ code: 'cancelled' });
		await expect(createPasskey(creation, {})).rejects.toBeInstanceOf(PasskeyError);
		await expect(createPasskey(creation, {})).rejects.toMatchObject({ code: 'unsupported' });
	});
});
