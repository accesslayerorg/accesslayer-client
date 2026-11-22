import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyDepthChart } from '../KeyDepthChart';
import { fetchKeyDepth, type KeyDepthSnapshot } from '@/services/keyDepth.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/keyDepth.service', () => ({
	fetchKeyDepth: vi.fn(),
	KEY_DEPTH_LEVELS: 20,
}));

const SNAPSHOT = {
	bids: [
		{ price: 1.05, volume: 10 },
		{ price: 1.0, volume: 20 },
	],
	asks: [
		{ price: 1.15, volume: 5 },
		{ price: 1.2, volume: 15 },
	],
	midPrice: null,
	spread: null,
};

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return {
		queryClient,
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	};
}

describe('KeyDepthChart (#1220)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fetchKeyDepth).mockResolvedValue(SNAPSHOT);
	});

	it('shows a loading skeleton while the initial fetch is pending', () => {
		vi.mocked(fetchKeyDepth).mockImplementation(
			() => new Promise<KeyDepthSnapshot>(() => {})
		);
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		expect(screen.getByTestId('key-depth-chart-skeleton')).toBeInTheDocument();
		expect(screen.getByTestId('key-depth-best-bid')).toHaveTextContent('—');
	});

	it('requests 20 levels from the depth endpoint', async () => {
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(fetchKeyDepth).toHaveBeenCalledWith('key-1', 20);
		});
	});

	it('renders the book summary once the depth resolves', async () => {
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart-series')).toBeInTheDocument();
		});

		expect(screen.getByTestId('key-depth-best-bid')).toHaveTextContent('1.05 XLM');
		expect(screen.getByTestId('key-depth-best-ask')).toHaveTextContent('1.15 XLM');
		expect(screen.getByTestId('key-depth-mid-price')).toHaveTextContent('1.10 XLM');
		expect(screen.getByTestId('key-depth-spread')).toHaveTextContent(
			'0.1000 XLM (9.09%)'
		);
	});

	it('marks the mid price on the chart and shows the spread at the centre', async () => {
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart-mid-marker')).toBeInTheDocument();
		});

		const marker = screen.getByTestId('key-depth-chart-mid-marker');
		expect(marker).toHaveAttribute('data-mid-price', '1.1');
		expect(marker).toHaveAttribute('data-best-bid', '1.05');
		expect(marker).toHaveAttribute('data-best-ask', '1.15');
		expect(
			screen.getByTestId('key-depth-chart-spread-marker')
		).toHaveTextContent('Spread 0.1000 XLM');
	});

	it('shows the empty state when the key has no open orders', async () => {
		vi.mocked(fetchKeyDepth).mockResolvedValue({
			bids: [],
			asks: [],
			midPrice: null,
			spread: null,
		});
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart-empty')).toBeInTheDocument();
		});
		expect(screen.queryByTestId('key-depth-chart-series')).not.toBeInTheDocument();
	});

	it('shows an error state when the depth request fails', async () => {
		vi.mocked(fetchKeyDepth).mockRejectedValue(new Error('Network error'));
		const { wrapper } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart-error')).toBeInTheDocument();
		});
	});

	it('keeps the previous snapshot on screen while a refresh is in flight', async () => {
		const { wrapper, queryClient } = makeWrapper();

		render(<KeyDepthChart keyId="key-1" />, { wrapper });
		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart-series')).toBeInTheDocument();
		});

		// The next poll never resolves: the chart must not fall back to the
		// skeleton, it keeps rendering the last snapshot.
		vi.mocked(fetchKeyDepth).mockImplementationOnce(
			() => new Promise<KeyDepthSnapshot>(() => {})
		);

		await act(async () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.depth('key-1', 20),
			});
		});

		expect(screen.getByTestId('key-depth-chart-series')).toBeInTheDocument();
		expect(screen.queryByTestId('key-depth-chart-skeleton')).not.toBeInTheDocument();
		await waitFor(() => {
			expect(
				screen.getByTestId('key-depth-chart-refreshing')
			).toBeInTheDocument();
		});
	});
});
