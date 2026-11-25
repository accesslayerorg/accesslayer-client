import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DebugDrawer from '../DebugDrawer';
import { useDebugDrawerStore } from '@/hooks/useDebugDrawerStore';
import { recentErrorsBuffer } from '@/utils/recentErrors.utils';
import * as clipboardUtils from '@/utils/clipboard.utils';

vi.mock('wagmi', () => ({
	useAccount: () => ({
		connector: { name: 'Mock Freighter' },
	}),
}));

vi.mock('@/hooks/useSigner', () => ({
	useSigner: () => ({
		activeSigner: { type: 'software' },
	}),
}));

describe('DebugDrawer (#1447)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		useDebugDrawerStore.setState({ isOpen: false });
		recentErrorsBuffer.clear();
		queryClient = new QueryClient();
	});

	function renderDrawer() {
		return render(
			<QueryClientProvider client={queryClient}>
				<DebugDrawer />
			</QueryClientProvider>
		);
	}

	it('opens via keyboard shortcut Ctrl+Shift+D and closes via close button', async () => {
		const user = userEvent.setup();
		renderDrawer();

		expect(screen.queryByTestId('debug-drawer')).not.toBeInTheDocument();

		// Trigger keyboard shortcut
		fireEvent.keyDown(window, {
			key: 'd',
			code: 'KeyD',
			ctrlKey: true,
			shiftKey: true,
		});

		expect(screen.getByTestId('debug-drawer')).toBeInTheDocument();

		// Close via close button
		await user.click(screen.getByTestId('debug-drawer-close-btn'));
		expect(screen.queryByTestId('debug-drawer')).not.toBeInTheDocument();
	});

	it('renders environment, network passphrase, and wallet adapter without exposing addresses', async () => {
		useDebugDrawerStore.setState({ isOpen: true });
		renderDrawer();

		expect(screen.getByTestId('debug-drawer')).toBeInTheDocument();
		expect(screen.getByTestId('debug-version')).toBeInTheDocument();
		expect(screen.getByTestId('debug-network-passphrase')).toBeInTheDocument();
		expect(screen.getByTestId('debug-wallet-adapter')).toBeInTheDocument();

		// Ensures no address is leaked in wallet adapter display
		const walletText = screen.getByTestId('debug-wallet-adapter').textContent;
		expect(walletText).not.toMatch(/\bG[A-Z0-9]{55}\b/);
	});

	it('lists active React queries and allows clearing cache and refetching', async () => {
		const user = userEvent.setup();
		// Seed a query into cache
		queryClient.setQueryData(['test-query', '1'], { data: 'hello' });

		useDebugDrawerStore.setState({ isOpen: true });
		renderDrawer();

		// Switch to queries tab
		await user.click(screen.getByTestId('tab-queries'));

		expect(screen.getByTestId('panel-queries')).toBeInTheDocument();
		expect(screen.getByTestId('query-cache-item')).toHaveTextContent('test-query / 1');
		expect(screen.getByTestId('query-item-status')).toHaveTextContent('success');

		// Spy on refetch
		const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

		await user.click(screen.getByTestId('clear-refetch-queries-btn'));
		expect(refetchSpy).toHaveBeenCalled();
	});

	it('displays recent errors without exposing secrets in message', async () => {
		const user = userEvent.setup();
		const stellarKey = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';
		recentErrorsBuffer.record(
			`Network error while querying wallet ${stellarKey} with token eyJhbGciOi.eyJzdWIi.secret`,
			'api'
		);

		useDebugDrawerStore.setState({ isOpen: true });
		renderDrawer();

		await user.click(screen.getByTestId('tab-errors'));

		expect(screen.getByTestId('panel-errors')).toBeInTheDocument();
		const errorMsg = screen.getByTestId('recent-error-message').textContent;
		expect(errorMsg).not.toContain(stellarKey);
		expect(errorMsg).not.toContain('eyJhbGciOi.eyJzdWIi.secret');
		expect(errorMsg).toContain('[REDACTED_STELLAR_ADDR]');
	});

	it('produces redacted diagnostics JSON blob when Copy Diagnostics is clicked', async () => {
		const user = userEvent.setup();
		let copiedText = '';
		vi.spyOn(clipboardUtils, 'copyTextToClipboard').mockImplementation(async text => {
			copiedText = text;
			return true;
		});

		useDebugDrawerStore.setState({ isOpen: true });
		renderDrawer();

		await user.click(screen.getByTestId('copy-diagnostics-btn'));

		expect(copiedText).toBeTruthy();
		const parsed = JSON.parse(copiedText);
		expect(parsed.build).toBeDefined();
		expect(parsed.network).toBeDefined();
		expect(parsed.wallet).toBeDefined();
	});
});
