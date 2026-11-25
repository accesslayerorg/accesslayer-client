import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
	createPasskey,
	getPasskeyAssertion,
	isWebAuthnSupported,
	PasskeyError,
	type AuthenticationCredentialJSON,
	type WebAuthnEnvironment,
} from '@/lib/webauthn';
import {
	EMBEDDED_SESSION_KEY,
	embeddedWalletService,
	onEmbeddedSessionChange,
	passkeyReauthenticate,
	readEmbeddedSession,
	type EmbeddedSession,
	type EmbeddedWalletApi,
	type ReauthPurpose,
} from '@/services/embeddedWallet.service';

export class CustodyNoticeRequiredError extends Error {
	constructor() {
		super('Read and accept the custody notice before creating a wallet.');
		this.name = 'CustodyNoticeRequiredError';
	}
}

export interface PasskeyAuthDependencies {
	api?: EmbeddedWalletApi;
	environment?: WebAuthnEnvironment;
}

let cachedRaw: string | null | undefined;
let cachedSession: EmbeddedSession | null = null;
function snapshot(): EmbeddedSession | null {
	// useSyncExternalStore needs a stable value between changes.
	const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(EMBEDDED_SESSION_KEY);
	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedSession = readEmbeddedSession();
	}
	return cachedSession;
}

/** The signed-in embedded wallet, if any; updates on sign-in and sign-out. */
export function useEmbeddedSession(): EmbeddedSession | null {
	return useSyncExternalStore(onEmbeddedSessionChange, snapshot, () => null);
}

export function describeAuthError(error: unknown): string {
	if (error instanceof PasskeyError || error instanceof CustodyNoticeRequiredError) return error.message;
	if (error instanceof Error && error.message) return error.message;
	return 'Sign-in failed. Try again.';
}

/**
 * Passkey sign-in for embedded wallets (#1477): WebAuthn registration and
 * authentication through the embedded wallet service, plus passkey
 * re-authentication for sensitive actions.
 */
export function usePasskeyAuth({ api = embeddedWalletService, environment }: PasskeyAuthDependencies = {}) {
	const session = useEmbeddedSession();
	const supported = useMemo(() => isWebAuthnSupported(environment), [environment]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
		setPending(true);
		setError(null);
		try {
			return await fn();
		} catch (e) {
			setError(describeAuthError(e));
			throw e;
		} finally {
			setPending(false);
		}
	}, []);

	/** Creates a passkey and an embedded wallet. The custody notice must be accepted. */
	const register = useCallback(
		(displayName: string, acknowledgedCustodyNotice: boolean) =>
			run(async () => {
				if (!acknowledgedCustodyNotice) throw new CustodyNoticeRequiredError();
				const { options } = await api.passkeyRegistrationOptions(displayName);
				const credential = await createPasskey(options, environment);
				return api.verifyPasskeyRegistration(credential);
			}),
		[api, environment, run]
	);

	/** Signs in with an existing passkey. */
	const signIn = useCallback(
		() =>
			run(async () => {
				const { options } = await api.passkeyLoginOptions();
				const credential = await getPasskeyAssertion(options, environment);
				return api.verifyPasskeyLogin(credential);
			}),
		[api, environment, run]
	);

	/** A fresh passkey assertion for signing above the threshold or exporting keys. */
	const reauthenticate = useCallback(
		(purpose: ReauthPurpose): Promise<AuthenticationCredentialJSON> =>
			passkeyReauthenticate(purpose, api, environment),
		[api, environment]
	);

	const signOut = useCallback(() => api.signOut(), [api]);

	return { supported, session, pending, error, register, signIn, reauthenticate, signOut };
}

/** Email sign-in with a one-time code (#1477). */
export function useEmailSignIn({ api = embeddedWalletService }: Pick<PasskeyAuthDependencies, 'api'> = {}) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const wrap = useCallback(async <T,>(fn: () => Promise<T>) => {
		setPending(true);
		setError(null);
		try {
			return await fn();
		} catch (e) {
			setError(describeAuthError(e));
			throw e;
		} finally {
			setPending(false);
		}
	}, []);
	const start = useCallback((email: string) => wrap(() => api.startEmailSignIn(email.trim())), [api, wrap]);
	const verify = useCallback(
		(email: string, code: string, isNewUser: boolean, acknowledgedCustodyNotice: boolean) =>
			wrap(async () => {
				if (isNewUser && !acknowledgedCustodyNotice) throw new CustodyNoticeRequiredError();
				return api.verifyEmailSignIn(email.trim(), code.trim(), acknowledgedCustodyNotice);
			}),
		[api, wrap]
	);
	return { pending, error, start, verify };
}
