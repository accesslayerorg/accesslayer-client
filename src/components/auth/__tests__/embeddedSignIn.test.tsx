import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInOptionsModal from '@/components/auth/SignInOptionsModal';
import EmbeddedWalletSection from '@/components/settings/EmbeddedWalletSection';
import { CustodyNoticeRequiredError, usePasskeyAuth } from '@/hooks/usePasskeyAuth';
import { useSigner } from '@/hooks/useSigner';
import { EmbeddedWalletAdapter } from '@/lib/signing';
import { bufferToBase64url, type WebAuthnEnvironment } from '@/lib/webauthn';
import {
	EMBEDDED_SESSION_KEY,
	createEmbeddedSigner,
	readEmbeddedSession,
	writeEmbeddedSession,
	type EmbeddedAuthResult,
	type EmbeddedWalletApi,
} from '@/services/embeddedWallet.service';

const ADDRESS = 'GEMBEDDEDWALLETADDRESS';
const result = (overrides: Partial<EmbeddedAuthResult> = {}): EmbeddedAuthResult => ({
	token: 'session-token',
	method: 'passkey',
	hasPasskey: true,
	wallet: { publicKey: ADDRESS, createdAt: '2026-11-23T00:00:00Z' },
	...overrides,
});
const buf = (...b: number[]) => new Uint8Array(b).buffer;

/**
 * An API double that behaves like the server contract: verify calls store the
 * session the way the real service does.
 */
function fakeApi(): EmbeddedWalletApi & Record<string, ReturnType<typeof vi.fn>> {
	const finish = (r: EmbeddedAuthResult) => {
		const { token: _t, ...session } = r;
		void _t;
		writeEmbeddedSession(session);
		return session;
	};
	return {
		passkeyRegistrationOptions: vi.fn(async () => ({
			options: {
				challenge: bufferToBase64url(buf(1, 2, 3)),
				rp: { name: 'AccessLayer' },
				user: { id: bufferToBase64url(buf(4)), name: 'ada', displayName: 'Ada' },
				pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
			},
		})),
		verifyPasskeyRegistration: vi.fn(async () => finish(result())),
		passkeyLoginOptions: vi.fn(async () => ({ options: { challenge: bufferToBase64url(buf(5)) } })),
		verifyPasskeyLogin: vi.fn(async () => finish(result())),
		startEmailSignIn: vi.fn(async () => ({ isNewUser: true })),
		verifyEmailSignIn: vi.fn(async () => finish(result({ method: 'email', hasPasskey: false, email: 'ada@example.com' }))),
		reauthOptions: vi.fn(async () => ({ options: { challenge: bufferToBase64url(buf(6)) } })),
		sign: vi.fn(async () => 'SIGNED'),
		exportSecret: vi.fn(async () => 'SSECRETKEYVALUE'),
		linkChallenge: vi.fn(async () => ({ challenge: 'prove-it' })),
		linkWallet: vi.fn(async (publicKey: string) => {
			const s = readEmbeddedSession()!;
			writeEmbeddedSession({ ...s, linkedWallet: { publicKey, linkedAt: 'now' } });
			return { publicKey, linkedAt: 'now' };
		}),
		signOut: vi.fn(() => writeEmbeddedSession(null)),
	} as never;
}

function fakeEnvironment(): WebAuthnEnvironment & { credentials: { create: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } } {
	return {
		PublicKeyCredential: class {},
		isSecureContext: true,
		credentials: {
			create: vi.fn(async () => ({
				id: 'cred',
				rawId: buf(1),
				type: 'public-key',
				response: { clientDataJSON: buf(2), attestationObject: buf(3) },
			})),
			get: vi.fn(async () => ({
				id: 'cred',
				rawId: buf(1),
				type: 'public-key',
				response: { clientDataJSON: buf(2), authenticatorData: buf(3), signature: buf(4), userHandle: null },
			})),
		},
	};
}

beforeEach(() => writeEmbeddedSession(null));

describe('passkey registration (#1477)', () => {
	it('creates a passkey and shows the new wallet address', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		const environment = fakeEnvironment();
		render(<SignInOptionsModal open onOpenChange={vi.fn()} onConnectWallet={vi.fn()} dependencies={{ api, environment }} />);
		await user.click(screen.getByRole('button', { name: 'Continue with passkey' }));
		await user.type(screen.getByLabelText('Name for this passkey'), 'Ada');
		await user.click(screen.getByRole('checkbox'));
		await user.click(screen.getByRole('button', { name: 'Create passkey and wallet' }));
		expect(await screen.findByTestId('embedded-wallet-address')).toHaveTextContent(ADDRESS);
		expect(api.passkeyRegistrationOptions).toHaveBeenCalledWith('Ada');
		expect(environment.credentials.create).toHaveBeenCalledTimes(1);
		expect(api.verifyPasskeyRegistration).toHaveBeenCalledWith(expect.objectContaining({ id: 'cred', type: 'public-key' }));
	});

	it('cannot create a wallet before the custody notice is acknowledged', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		render(<SignInOptionsModal open onOpenChange={vi.fn()} onConnectWallet={vi.fn()} dependencies={{ api, environment: fakeEnvironment() }} />);
		await user.click(screen.getByRole('button', { name: 'Continue with passkey' }));
		await user.type(screen.getByLabelText('Name for this passkey'), 'Ada');
		expect(screen.getByTestId('custody-notice')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create passkey and wallet' })).toBeDisabled();

		// The hook enforces it too, not just the button.
		const { result } = renderHook(() => usePasskeyAuth({ api, environment: fakeEnvironment() }));
		await act(async () => {
			await expect(result.current.register('Ada', false)).rejects.toBeInstanceOf(CustodyNoticeRequiredError);
		});
		expect(api.passkeyRegistrationOptions).not.toHaveBeenCalled();
	});

	it('stores only public session data, never the token', async () => {
		const { result } = renderHook(() => usePasskeyAuth({ api: fakeApi(), environment: fakeEnvironment() }));
		await act(async () => {
			await result.current.register('Ada', true);
		});
		const stored = window.localStorage.getItem(EMBEDDED_SESSION_KEY)!;
		expect(stored).not.toContain('session-token');
		expect(result.current.session?.wallet.publicKey).toBe(ADDRESS);
	});
});

describe('session storage (#1477)', () => {
	it('keeps only public fields even if the server sends more', () => {
		writeEmbeddedSession({
			...result(),
			secretKey: 'SLEAKED',
		} as never);
		const stored = JSON.parse(window.localStorage.getItem(EMBEDDED_SESSION_KEY)!);
		expect(Object.keys(stored).sort()).toEqual(['hasPasskey', 'method', 'wallet']);
		expect(JSON.stringify(stored)).not.toMatch(/session-token|SLEAKED/);
	});
});

describe('accounts without a passkey (#1477)', () => {
	it('cannot re-authenticate for signing or export', async () => {
		writeEmbeddedSession({ method: 'email', hasPasskey: false, email: 'ada@example.com', wallet: { publicKey: ADDRESS, createdAt: 'x' } });
		const api = fakeApi();
		const { result: hook } = renderHook(() => usePasskeyAuth({ api, environment: fakeEnvironment() }));
		await expect(hook.current.reauthenticate('sign')).rejects.toThrow(/Add a passkey/);
		expect(api.reauthOptions).not.toHaveBeenCalled();
		render(<EmbeddedWalletSection dependencies={{ api, environment: fakeEnvironment() }} />);
		expect(screen.queryByRole('button', { name: 'Export secret key' })).not.toBeInTheDocument();
		expect(screen.getByText(/Sign in with a passkey to export/)).toBeInTheDocument();
	});
});

describe('passkey sign-in (#1477)', () => {
	it('signs in with an existing passkey', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		const environment = fakeEnvironment();
		render(<SignInOptionsModal open onOpenChange={vi.fn()} onConnectWallet={vi.fn()} dependencies={{ api, environment }} />);
		await user.click(screen.getByRole('button', { name: 'Continue with passkey' }));
		await user.click(screen.getByRole('button', { name: 'Sign in with passkey' }));
		expect(await screen.findByTestId('embedded-wallet-address')).toHaveTextContent(ADDRESS);
		expect(environment.credentials.get).toHaveBeenCalledTimes(1);
		expect(environment.credentials.create).not.toHaveBeenCalled();
	});

	it('shows the error when the passkey prompt is dismissed', async () => {
		const user = userEvent.setup();
		const environment = fakeEnvironment();
		environment.credentials.get.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
		render(<SignInOptionsModal open onOpenChange={vi.fn()} onConnectWallet={vi.fn()} dependencies={{ api: fakeApi(), environment }} />);
		await user.click(screen.getByRole('button', { name: 'Continue with passkey' }));
		await user.click(screen.getByRole('button', { name: 'Sign in with passkey' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(/cancelled or timed out/);
	});

	it('signs in by email, with the custody notice for a new account', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		render(<SignInOptionsModal open onOpenChange={vi.fn()} onConnectWallet={vi.fn()} dependencies={{ api, environment: fakeEnvironment() }} />);
		await user.click(screen.getByRole('button', { name: 'Continue with email' }));
		await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
		await user.click(screen.getByRole('button', { name: 'Email me a sign-in code' }));
		await user.type(await screen.findByLabelText('Code from the email'), '123456');
		expect(screen.getByRole('button', { name: 'Create wallet' })).toBeDisabled();
		await user.click(screen.getByRole('checkbox'));
		await user.click(screen.getByRole('button', { name: 'Create wallet' }));
		expect(await screen.findByTestId('embedded-wallet-address')).toHaveTextContent(ADDRESS);
		expect(api.verifyEmailSignIn).toHaveBeenCalledWith('ada@example.com', '123456', true);
	});
});

describe('unsupported browsers (#1477)', () => {
	it('disables passkeys and points to wallet connection', async () => {
		const user = userEvent.setup();
		const onConnectWallet = vi.fn();
		const onOpenChange = vi.fn();
		render(<SignInOptionsModal open onOpenChange={onOpenChange} onConnectWallet={onConnectWallet} dependencies={{ api: fakeApi(), environment: {} }} />);
		expect(screen.getByRole('button', { name: 'Continue with passkey' })).toBeDisabled();
		expect(screen.getByTestId('passkey-unsupported')).toHaveTextContent(/does not support passkeys. Connect a Stellar wallet/);
		await user.click(screen.getByRole('button', { name: 'Connect wallet' }));
		expect(onConnectWallet).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe('embedded wallet settings (#1477)', () => {
	beforeEach(() => writeEmbeddedSession({ method: 'passkey', hasPasskey: true, wallet: { publicKey: ADDRESS, createdAt: 'x' } }));

	it('exports the key only after a passkey check, and hides it again', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		const environment = fakeEnvironment();
		render(<EmbeddedWalletSection dependencies={{ api, environment }} />);
		await user.click(screen.getByRole('button', { name: 'Export secret key' }));
		expect(await screen.findByTestId('exported-secret')).toHaveTextContent('SSECRETKEYVALUE');
		expect(api.reauthOptions).toHaveBeenCalledWith('export');
		expect(environment.credentials.get).toHaveBeenCalledTimes(1);
		expect(api.exportSecret).toHaveBeenCalledWith(expect.objectContaining({ id: 'cred' }));
		expect(window.localStorage.getItem(EMBEDDED_SESSION_KEY)).not.toContain('SSECRET');
		expect(screen.getByRole('button', { name: 'Hide key' })).toBeDisabled();
		await user.click(screen.getByRole('checkbox'));
		await user.click(screen.getByRole('button', { name: 'Hide key' }));
		expect(screen.queryByTestId('exported-secret')).not.toBeInTheDocument();
	});

	it('does not export when the passkey check fails', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		const environment = fakeEnvironment();
		environment.credentials.get.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
		render(<EmbeddedWalletSection dependencies={{ api, environment }} />);
		await user.click(screen.getByRole('button', { name: 'Export secret key' }));
		expect(await screen.findByRole('alert')).toBeInTheDocument();
		expect(api.exportSecret).not.toHaveBeenCalled();
	});

	it('links a self-custody wallet by signed challenge and shows migration steps', async () => {
		const user = userEvent.setup();
		const api = fakeApi();
		const signer = { type: 'software' as const, sign: vi.fn(), getPublicKey: vi.fn(async () => 'GMYOWNWALLET'), signMessage: vi.fn(async () => 'signed-challenge') };
		render(<EmbeddedWalletSection dependencies={{ api, environment: fakeEnvironment() }} createSelfCustodySigner={() => signer} />);
		await user.click(screen.getByRole('button', { name: 'Link a wallet' }));
		expect(await screen.findByTestId('linked-wallet')).toHaveTextContent('GMYOWNWALLET');
		expect(signer.signMessage).toHaveBeenCalledWith('prove-it');
		expect(api.linkWallet).toHaveBeenCalledWith('GMYOWNWALLET', 'signed-challenge');
		expect(screen.getByRole('list', { name: 'Move your holdings' })).toBeInTheDocument();
	});

	it('renders nothing without an embedded wallet', () => {
		writeEmbeddedSession(null);
		const { container } = render(<EmbeddedWalletSection dependencies={{ api: fakeApi(), environment: fakeEnvironment() }} />);
		expect(container).toBeEmptyDOMElement();
	});
});

describe('signer selection (#1477)', () => {
	it('uses the embedded wallet when no browser wallet is installed', async () => {
		writeEmbeddedSession({ method: 'passkey', hasPasskey: true, wallet: { publicKey: ADDRESS, createdAt: 'x' } });
		const { result } = renderHook(() =>
			useSigner('Test SDF Network ; September 2015', {
				detectSoftware: vi.fn().mockResolvedValue(false),
				detectHardware: vi.fn().mockResolvedValue(false),
			})
		);
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.activeSigner).toBeInstanceOf(EmbeddedWalletAdapter);
		expect(await result.current.activeSigner!.getPublicKey()).toBe(ADDRESS);
	});

	it('has no embedded signer when signed out', () => {
		expect(createEmbeddedSigner('net')).toBeNull();
	});
});
