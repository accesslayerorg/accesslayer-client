import { BaseApiService, type APIResponse } from './api.service';
import {
	PasskeyError,
	getPasskeyAssertion,
	type AuthenticationCredentialJSON,
	type CreationOptionsJSON,
	type RegistrationCredentialJSON,
	type RequestOptionsJSON,
	type WebAuthnEnvironment,
} from '@/lib/webauthn';
import { EmbeddedWalletAdapter } from '@/lib/signing/embedded-wallet-adapter';
import { env } from '@/utils/env.utils';

/**
 * Passkey / email sign-in with an embedded wallet (#1477).
 *
 * The client never holds wallet key material. The server creates the wallet,
 * keeps its key in its signing service, and signs transactions on request.
 * This service is the client half of that contract; the endpoints below are
 * what the server must implement (they do not exist in accesslayer-server yet):
 *
 *   POST /auth/passkey/register/options   { displayName, custodyNoticeVersion } → { options }
 *   POST /auth/passkey/register/verify    { credential, custodyNoticeVersion }  → EmbeddedAuthResult
 *   POST /auth/passkey/login/options      {}                                    → { options }
 *   POST /auth/passkey/login/verify       { credential }                        → EmbeddedAuthResult
 *   POST /auth/email/start                { email }                             → { isNewUser }
 *   POST /auth/email/verify               { email, code, custodyNoticeVersion? } → EmbeddedAuthResult
 *   POST /wallet/embedded/reauth/options  { purpose }                           → { options }
 *   POST /wallet/embedded/sign            { xdr, networkPassphrase, reauth? }   → { signedXdr }
 *   POST /wallet/embedded/export          { reauth }                            → { secretKey }
 *   POST /wallet/embedded/link/challenge  { publicKey }                         → { challenge }
 *   POST /wallet/embedded/link            { publicKey, signedChallenge }        → { linkedWallet }
 *
 * The server must enforce the re-authentication threshold itself (respond
 * 403 { code: 'REAUTH_REQUIRED' }); the client-side check only decides when
 * to prompt.
 */

/** Bumped whenever the custody notice text changes materially. */
export const CUSTODY_NOTICE_VERSION = '2026-11-1';

export interface EmbeddedWallet {
	publicKey: string;
	createdAt: string;
}

export interface LinkedWallet {
	publicKey: string;
	linkedAt: string;
}

export interface EmbeddedSession {
	method: 'passkey' | 'email';
	email?: string | null;
	/** Whether this account can re-authenticate with a passkey. */
	hasPasskey: boolean;
	wallet: EmbeddedWallet;
	linkedWallet?: LinkedWallet | null;
}

export interface EmbeddedAuthResult extends EmbeddedSession {
	token: string;
}

export type ReauthPurpose = 'sign' | 'export';

/** Only public data: the wallet address and how the user signed in. */
export const EMBEDDED_SESSION_KEY = 'accesslayer.embeddedWallet.session';

type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStorage = (): SessionStorage | null => (typeof window === 'undefined' ? null : window.localStorage);

export function readEmbeddedSession(storage: SessionStorage | null = defaultStorage()): EmbeddedSession | null {
	try {
		const raw = storage?.getItem(EMBEDDED_SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as EmbeddedSession;
		return parsed?.wallet?.publicKey ? parsed : null;
	} catch {
		return null;
	}
}

const listeners = new Set<() => void>();

/** Subscribes to embedded-session changes (sign-in, sign-out, linking). */
export function onEmbeddedSessionChange(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function writeEmbeddedSession(session: EmbeddedSession | null, storage: SessionStorage | null = defaultStorage()): void {
	if (!storage) return;
	if (!session) storage.removeItem(EMBEDDED_SESSION_KEY);
	else {
		// Keep only public fields, whatever the server returned.
		const { method, email, hasPasskey, wallet, linkedWallet } = session;
		storage.setItem(EMBEDDED_SESSION_KEY, JSON.stringify({ method, email, hasPasskey, wallet, linkedWallet }));
	}
	for (const l of listeners) l();
}

export class ReauthRequiredError extends Error {
	constructor() {
		super('Confirm with your passkey to sign this transaction.');
		this.name = 'ReauthRequiredError';
	}
}

class EmbeddedWalletService extends BaseApiService {
	private async post<T>(url: string, body: unknown): Promise<T> {
		try {
			const res = await this.api.post<APIResponse<T>>(url, body);
			return res.data.data;
		} catch (error) {
			const apiError = this.handleError(error);
			if (apiError.status === 403 && apiError.response?.code === 'REAUTH_REQUIRED')
				throw new ReauthRequiredError();
			throw apiError;
		}
	}

	private finish(result: EmbeddedAuthResult): EmbeddedSession {
		this.setAuthToken(result.token);
		const { token: _token, ...session } = result;
		void _token;
		writeEmbeddedSession(session);
		return session;
	}

	passkeyRegistrationOptions(displayName: string) {
		return this.post<{ options: CreationOptionsJSON }>('/auth/passkey/register/options', {
			displayName,
			custodyNoticeVersion: CUSTODY_NOTICE_VERSION,
		});
	}

	async verifyPasskeyRegistration(credential: RegistrationCredentialJSON): Promise<EmbeddedSession> {
		return this.finish(
			await this.post<EmbeddedAuthResult>('/auth/passkey/register/verify', {
				credential,
				custodyNoticeVersion: CUSTODY_NOTICE_VERSION,
			})
		);
	}

	passkeyLoginOptions() {
		return this.post<{ options: RequestOptionsJSON }>('/auth/passkey/login/options', {});
	}

	async verifyPasskeyLogin(credential: AuthenticationCredentialJSON): Promise<EmbeddedSession> {
		return this.finish(await this.post<EmbeddedAuthResult>('/auth/passkey/login/verify', { credential }));
	}

	startEmailSignIn(email: string) {
		return this.post<{ isNewUser: boolean }>('/auth/email/start', { email });
	}

	async verifyEmailSignIn(email: string, code: string, acknowledgedNotice: boolean): Promise<EmbeddedSession> {
		return this.finish(
			await this.post<EmbeddedAuthResult>('/auth/email/verify', {
				email,
				code,
				custodyNoticeVersion: acknowledgedNotice ? CUSTODY_NOTICE_VERSION : undefined,
			})
		);
	}

	reauthOptions(purpose: ReauthPurpose) {
		return this.post<{ options: RequestOptionsJSON }>('/wallet/embedded/reauth/options', { purpose });
	}

	async sign(xdr: string, networkPassphrase: string, reauth?: AuthenticationCredentialJSON): Promise<string> {
		const res = await this.post<{ signedXdr: string }>('/wallet/embedded/sign', { xdr, networkPassphrase, reauth });
		return res.signedXdr;
	}

	async exportSecret(reauth: AuthenticationCredentialJSON): Promise<string> {
		const res = await this.post<{ secretKey: string }>('/wallet/embedded/export', { reauth });
		return res.secretKey;
	}

	linkChallenge(publicKey: string) {
		return this.post<{ challenge: string }>('/wallet/embedded/link/challenge', { publicKey });
	}

	async linkWallet(publicKey: string, signedChallenge: string): Promise<LinkedWallet> {
		const res = await this.post<{ linkedWallet: LinkedWallet }>('/wallet/embedded/link', { publicKey, signedChallenge });
		const session = readEmbeddedSession();
		if (session) writeEmbeddedSession({ ...session, linkedWallet: res.linkedWallet });
		return res.linkedWallet;
	}

	signOut(): void {
		writeEmbeddedSession(null);
	}
}

export const embeddedWalletService = new EmbeddedWalletService();

/** A fresh passkey assertion for a sensitive action; needs a passkey account. */
export async function passkeyReauthenticate(
	purpose: ReauthPurpose,
	api: Pick<EmbeddedWalletService, 'reauthOptions'> = embeddedWalletService,
	environment?: WebAuthnEnvironment
): Promise<AuthenticationCredentialJSON> {
	if (!readEmbeddedSession()?.hasPasskey)
		throw new PasskeyError('unsupported', 'Add a passkey to this account to confirm sensitive actions.');
	const { options } = await api.reauthOptions(purpose);
	return getPasskeyAssertion(options, environment);
}

/** The signer for the signed-in embedded wallet, or null when there is none. */
export function createEmbeddedSigner(
	networkPassphrase: string,
	api: Pick<EmbeddedWalletService, 'sign' | 'reauthOptions'> = embeddedWalletService
): EmbeddedWalletAdapter | null {
	const session = readEmbeddedSession();
	if (!session) return null;
	return new EmbeddedWalletAdapter({
		publicKey: session.wallet.publicKey,
		networkPassphrase,
		reauthThresholdXlm: env.VITE_EMBEDDED_REAUTH_THRESHOLD_XLM,
		api,
		reauthenticate: () => passkeyReauthenticate('sign', api),
	});
}
export type EmbeddedWalletApi = Pick<
	EmbeddedWalletService,
	| 'passkeyRegistrationOptions'
	| 'verifyPasskeyRegistration'
	| 'passkeyLoginOptions'
	| 'verifyPasskeyLogin'
	| 'startEmailSignIn'
	| 'verifyEmailSignIn'
	| 'reauthOptions'
	| 'sign'
	| 'exportSecret'
	| 'linkChallenge'
	| 'linkWallet'
	| 'signOut'
>;
