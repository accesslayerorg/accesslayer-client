import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApiKeysPage from '@/pages/ApiKeysPage';
import {
	apiKeyService,
	type ApiKey,
	type CreatedApiKey,
} from '@/services/apiKey.service';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

vi.mock('@/services/apiKey.service', async () => {
	const actual = await vi.importActual<
		typeof import('@/services/apiKey.service')
	>('@/services/apiKey.service');
	return {
		...actual,
		apiKeyService: {
			listApiKeys: vi.fn(),
			createApiKey: vi.fn(),
			revokeApiKey: vi.fn(),
		},
	};
});

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const SECRET = 'ak_live_9f2c_thisIsTheOnlyTimeYouWillSeeThisSecret';

function makeKey(overrides: Partial<ApiKey> = {}): ApiKey {
	return {
		id: 'key-1',
		name: 'Production integration',
		prefix: 'ak_live_9f2c',
		scopes: ['read:keys', 'read:trades'],
		lastUsedAt: new Date().toISOString(),
		status: 'active',
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<ApiKeysPage />
			</MemoryRouter>
		</QueryClientProvider>
	);

	return { queryClient };
}

async function createKeyThroughForm() {
	fireEvent.click(screen.getByTestId('create-api-key-button'));

	const nameInput = await screen.findByLabelText('Name');
	fireEvent.change(nameInput, { target: { value: 'Production integration' } });
	fireEvent.click(screen.getByLabelText(/read:keys/));
	fireEvent.click(screen.getByLabelText(/read:holders/));
	fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
}

describe('ApiKeysPage (#1322)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	it('lists keys with prefix, scopes, last used and status', async () => {
		vi.mocked(apiKeyService.listApiKeys).mockResolvedValue([makeKey()]);

		renderPage();

		await screen.findByText('Production integration');
		expect(screen.getByTestId('api-key-prefix-key-1')).toHaveTextContent(
			'ak_live_9f2c'
		);
		expect(screen.getByTestId('api-key-status-key-1')).toHaveTextContent(
			'Active'
		);
		expect(screen.getByText('read:keys')).toBeInTheDocument();
		expect(screen.getByText('read:trades')).toBeInTheDocument();
		expect(screen.getByText(/Last used/)).not.toHaveTextContent('never');
	});

	it('creates a key, reveals the secret once and keeps it out of caches', async () => {
		const created: CreatedApiKey = {
			apiKey: makeKey({ id: 'key-2', prefix: 'ak_live_7a1b' }),
			secret: SECRET,
		};
		vi.mocked(apiKeyService.listApiKeys).mockResolvedValue([]);
		vi.mocked(apiKeyService.createApiKey).mockResolvedValue(created);

		const { queryClient } = renderPage();
		await screen.findByTestId('api-keys-empty');

		await createKeyThroughForm();

		expect(
			await screen.findByTestId('secret-reveal-dialog')
		).toBeInTheDocument();
		expect(apiKeyService.createApiKey).toHaveBeenCalledWith({
			name: 'Production integration',
			scopes: ['read:keys', 'read:holders'],
		});
		expect(screen.getByTestId('api-key-secret')).toHaveTextContent(SECRET);

		fireEvent.click(screen.getByTestId('copy-api-key-secret'));
		await waitFor(() =>
			expect(copyTextToClipboard).toHaveBeenCalledWith(SECRET)
		);

		// The secret must never reach the React Query cache or browser storage.
		const queryCache = JSON.stringify(
			queryClient
				.getQueryCache()
				.getAll()
				.map(query => query.state.data)
		);
		const mutationCache = JSON.stringify(
			queryClient
				.getMutationCache()
				.getAll()
				.map(mutation => mutation.state.data)
		);
		expect(queryCache).not.toContain(SECRET);
		expect(mutationCache).not.toContain(SECRET);
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);

		// The cached metadata still holds the new key, and the sample request
		// uses its prefix.
		expect(queryCache).toContain('ak_live_7a1b');
		expect(screen.getByTestId('api-key-sample-request')).toHaveTextContent(
			'X-API-Key: ak_live_7a1b'
		);
	});

	it('cannot close the secret dialog until it is acknowledged', async () => {
		vi.mocked(apiKeyService.listApiKeys).mockResolvedValue([]);
		vi.mocked(apiKeyService.createApiKey).mockResolvedValue({
			apiKey: makeKey({ id: 'key-2' }),
			secret: SECRET,
		});

		renderPage();
		await screen.findByTestId('api-keys-empty');
		await createKeyThroughForm();

		await screen.findByTestId('secret-reveal-dialog');
		const doneButton = screen.getByTestId('secret-reveal-done');

		expect(doneButton).toBeDisabled();
		fireEvent.click(doneButton);
		expect(screen.getByTestId('secret-reveal-dialog')).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText(/saved this key/i));
		expect(doneButton).toBeEnabled();

		fireEvent.click(doneButton);
		await waitFor(() =>
			expect(
				screen.queryByTestId('secret-reveal-dialog')
			).not.toBeInTheDocument()
		);
	});

	it('revokes a key after confirmation and removes it optimistically', async () => {
		vi.mocked(apiKeyService.listApiKeys).mockResolvedValue([makeKey()]);
		let resolveRevoke: () => void = () => {};
		vi.mocked(apiKeyService.revokeApiKey).mockReturnValue(
			new Promise<void>(resolve => {
				resolveRevoke = resolve;
			})
		);

		renderPage();
		await screen.findByText('Production integration');

		fireEvent.click(screen.getByTestId('revoke-api-key-key-1'));
		expect(screen.getByTestId('revoke-api-key-dialog')).toBeInTheDocument();
		expect(apiKeyService.revokeApiKey).not.toHaveBeenCalled();

		fireEvent.click(screen.getByTestId('revoke-api-key-confirm'));

		await waitFor(() =>
			expect(apiKeyService.revokeApiKey).toHaveBeenCalledWith('key-1')
		);
		await waitFor(() =>
			expect(screen.getByTestId('api-key-status-key-1')).toHaveTextContent(
				'Revoked'
			)
		);
		expect(
			screen.queryByTestId('revoke-api-key-key-1')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('revoke-api-key-dialog')
		).not.toBeInTheDocument();

		vi.mocked(apiKeyService.listApiKeys).mockResolvedValue([
			makeKey({ status: 'revoked' }),
		]);
		resolveRevoke();

		await waitFor(() =>
			expect(screen.getByTestId('api-key-status-key-1')).toHaveTextContent(
				'Revoked'
			)
		);
	});
});
