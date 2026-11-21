import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KeySplitBanner from '../KeySplitBanner';
import type { SplitExecutedEvent } from '@/types/keySplit';
import { clearSplitDismissal } from '@/utils/keySplit.utils';
import { keySplitEventService } from '@/services/keySplitEvents.service';

function renderWithClient(ui: React.ReactElement) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('KeySplitBanner (#1151)', () => {
	beforeEach(() => {
		clearSplitDismissal();
		keySplitEventService.reset();
		vi.clearAllMocks();
	});

	it('renders banner when split occurred within 48h with ratio, pre-split and post-split balances', () => {
		const recentSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1h ago
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		renderWithClient(
			<KeySplitBanner
				keyId="creator-1"
				split={recentSplit}
			/>
		);

		expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		expect(screen.getByTestId('split-ratio')).toHaveTextContent('2:1');
		expect(screen.getByTestId('pre-split-balance')).toHaveTextContent('10');
		expect(screen.getByTestId('post-split-balance')).toHaveTextContent('20');
	});

	it('does not render banner when split is older than 48h', () => {
		const expiredSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), // 50h ago
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		renderWithClient(
			<KeySplitBanner
				keyId="creator-1"
				split={expiredSplit}
			/>
		);

		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();
	});

	it('dismiss button clears the banner for the session and calls onDismiss', async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();
		const recentSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 3,
			executedAt: new Date().toISOString(),
			preSplitBalance: 5,
			postSplitBalance: 15,
		};

		const { unmount } = renderWithClient(
			<KeySplitBanner
				keyId="creator-1"
				split={recentSplit}
				onDismiss={onDismiss}
			/>
		);

		const banner = screen.getByTestId('key-split-banner');
		expect(banner).toBeInTheDocument();

		const dismissBtn = screen.getByTestId('split-banner-dismiss');
		await user.click(dismissBtn);

		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();

		// Re-rendering in the same session stays dismissed
		unmount();
		renderWithClient(
			<KeySplitBanner
				keyId="creator-1"
				split={recentSplit}
			/>
		);
		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();
	});

	it('displays creator title and explicit balance overrides', () => {
		const recentSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date().toISOString(),
		};

		renderWithClient(
			<KeySplitBanner
				keyId="creator-1"
				split={recentSplit}
				preSplitBalance={25}
				postSplitBalance={50}
				creator={{
					id: 'creator-1',
					title: 'Apex Key',
					description: '',
					price: 1,
					instructorId: 'inst-1',
					category: 'Tech',
					level: 'BEGINNER',
				}}
			/>
		);

		expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		expect(screen.getByText(/for Apex Key/i)).toBeInTheDocument();
		expect(screen.getByTestId('pre-split-balance')).toHaveTextContent('25');
		expect(screen.getByTestId('post-split-balance')).toHaveTextContent('50');
	});
});
