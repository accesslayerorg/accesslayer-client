/**
 * WebAuthn helpers for passkey sign-in (#1477).
 *
 * The server issues the challenge and verifies the result; this module only
 * converts between the JSON options the server sends and the binary
 * structures `navigator.credentials` expects, and serialises the credential
 * back to JSON. Nothing secret is created or stored here: the private key
 * stays inside the authenticator.
 */

/** Server-sent creation options (PublicKeyCredentialCreationOptionsJSON). */
export interface CreationOptionsJSON {
	challenge: string;
	rp: { id?: string; name: string };
	user: { id: string; name: string; displayName: string };
	pubKeyCredParams: { type: 'public-key'; alg: number }[];
	timeout?: number;
	excludeCredentials?: { id: string; type: 'public-key'; transports?: string[] }[];
	authenticatorSelection?: AuthenticatorSelectionCriteria;
	attestation?: AttestationConveyancePreference;
}

/** Server-sent request options (PublicKeyCredentialRequestOptionsJSON). */
export interface RequestOptionsJSON {
	challenge: string;
	rpId?: string;
	timeout?: number;
	allowCredentials?: { id: string; type: 'public-key'; transports?: string[] }[];
	userVerification?: UserVerificationRequirement;
}

export interface RegistrationCredentialJSON {
	id: string;
	rawId: string;
	type: 'public-key';
	response: { clientDataJSON: string; attestationObject: string; transports?: string[] };
}

export interface AuthenticationCredentialJSON {
	id: string;
	rawId: string;
	type: 'public-key';
	response: {
		clientDataJSON: string;
		authenticatorData: string;
		signature: string;
		userHandle: string | null;
	};
}

export class PasskeyError extends Error {
	readonly code: 'unsupported' | 'cancelled' | 'failed';

	constructor(code: PasskeyError['code'], message: string) {
		super(message);
		this.name = 'PasskeyError';
		this.code = code;
	}
}

export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlToBuffer(value: string): ArrayBuffer {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}

export interface WebAuthnEnvironment {
	PublicKeyCredential?: unknown;
	credentials?: Pick<CredentialsContainer, 'create' | 'get'>;
	isSecureContext?: boolean;
}

function defaultEnvironment(): WebAuthnEnvironment {
	if (typeof window === 'undefined') return {};
	return {
		PublicKeyCredential: (window as { PublicKeyCredential?: unknown }).PublicKeyCredential,
		credentials: typeof navigator !== 'undefined' ? navigator.credentials : undefined,
		isSecureContext: window.isSecureContext,
	};
}

/** True when this browser can create and use passkeys. */
export function isWebAuthnSupported(environment: WebAuthnEnvironment = defaultEnvironment()): boolean {
	return Boolean(
		environment.PublicKeyCredential &&
			environment.credentials &&
			typeof environment.credentials.create === 'function' &&
			typeof environment.credentials.get === 'function' &&
			environment.isSecureContext !== false
	);
}

const toDescriptor = (c: { id: string; type: 'public-key'; transports?: string[] }): PublicKeyCredentialDescriptor => ({
	id: base64urlToBuffer(c.id),
	type: c.type,
	transports: c.transports as AuthenticatorTransport[] | undefined,
});

export function toCreationOptions(json: CreationOptionsJSON): PublicKeyCredentialCreationOptions {
	return {
		...json,
		challenge: base64urlToBuffer(json.challenge),
		user: { ...json.user, id: base64urlToBuffer(json.user.id) },
		excludeCredentials: json.excludeCredentials?.map(toDescriptor),
	};
}

export function toRequestOptions(json: RequestOptionsJSON): PublicKeyCredentialRequestOptions {
	return {
		...json,
		challenge: base64urlToBuffer(json.challenge),
		allowCredentials: json.allowCredentials?.map(toDescriptor),
	};
}

function mapError(error: unknown): PasskeyError {
	const name = error instanceof Error ? error.name : '';
	if (name === 'NotAllowedError' || name === 'AbortError')
		return new PasskeyError('cancelled', 'The passkey prompt was cancelled or timed out.');
	if (name === 'NotSupportedError')
		return new PasskeyError('unsupported', 'This device cannot create a passkey.');
	return new PasskeyError('failed', error instanceof Error && error.message ? error.message : 'The passkey request failed.');
}

/** Runs `navigator.credentials.create` and returns the credential as JSON. */
export async function createPasskey(
	options: CreationOptionsJSON,
	environment: WebAuthnEnvironment = defaultEnvironment()
): Promise<RegistrationCredentialJSON> {
	if (!isWebAuthnSupported(environment))
		throw new PasskeyError('unsupported', 'This browser does not support passkeys.');
	let credential: Credential | null;
	try {
		credential = await environment.credentials!.create({ publicKey: toCreationOptions(options) });
	} catch (error) {
		throw mapError(error);
	}
	if (!credential) throw new PasskeyError('cancelled', 'No passkey was created.');
	const pk = credential as PublicKeyCredential;
	const response = pk.response as AuthenticatorAttestationResponse;
	return {
		id: pk.id,
		rawId: bufferToBase64url(pk.rawId),
		type: 'public-key',
		response: {
			clientDataJSON: bufferToBase64url(response.clientDataJSON),
			attestationObject: bufferToBase64url(response.attestationObject),
			transports: typeof response.getTransports === 'function' ? response.getTransports() : undefined,
		},
	};
}

/** Runs `navigator.credentials.get` and returns the assertion as JSON. */
export async function getPasskeyAssertion(
	options: RequestOptionsJSON,
	environment: WebAuthnEnvironment = defaultEnvironment()
): Promise<AuthenticationCredentialJSON> {
	if (!isWebAuthnSupported(environment))
		throw new PasskeyError('unsupported', 'This browser does not support passkeys.');
	let credential: Credential | null;
	try {
		credential = await environment.credentials!.get({ publicKey: toRequestOptions(options) });
	} catch (error) {
		throw mapError(error);
	}
	if (!credential) throw new PasskeyError('cancelled', 'No passkey was used.');
	const pk = credential as PublicKeyCredential;
	const response = pk.response as AuthenticatorAssertionResponse;
	return {
		id: pk.id,
		rawId: bufferToBase64url(pk.rawId),
		type: 'public-key',
		response: {
			clientDataJSON: bufferToBase64url(response.clientDataJSON),
			authenticatorData: bufferToBase64url(response.authenticatorData),
			signature: bufferToBase64url(response.signature),
			userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
		},
	};
}
