import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BondingCurvePriceChart } from '../BondingCurvePriceChart';
import { courseService } from '@/services/course.service';
import type { WebSocketLike } from '@/services/realtime.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getPriceHistory: vi.fn(),
		getKeyStats: vi.fn(),
	},
}));

/**
 * Swaps the app-wide socket singleton for one wired to a controllable fake,
 * so the test can drive connect/tick events deterministically.
 */
const { socketInstances } = vi.hoisted(() => ({
	socketInstances: [] as Array<{
		readyState: number;
		send: (data: string) => void;
		close: () => void;
		onopen: ((event: unknown) => void) | null;
		onmessage: ((event: { data: unknown }) => void) | null;
		onclose: ((event: unknown) => void) | null;
		onerror: ((event: unknown) => void) | null;
	}>,
}));

vi.mock('@/services/realtime.service', async importOriginal => {
	const actual =
		await importOriginal<typeof import('@/services/realtime.service')>();
	const socket = new actual.KeyPriceSocket('wss://test.example/keys', url => {
		const instance: WebSocketLike = {
			readyState: 0,
			send: vi.fn(),
			close: vi.fn(),
			onopen: null,
			onmessage: null,
			onclose: null,
			onerror: null,
		};
		socketInstances.push(instance);
		void url;
		return instance;
	});
	return { ...actual, keyPriceSocket: socket };
});

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return {
		queryClient,
		wrapper: ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		),
	};
}

const HISTORY_POINTS = [
	{ timestamp: '2026-10-01T10:00:00.000Z', price: 1 },
	{ timestamp: '2026-10-01T11:00:00.000Z', price: 1.5 },
];

describe('BondingCurvePriceChart (#1115)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		socketInstances.length = 0;

		vi.mocked(courseService.getPriceHistory).mockResolvedValue(
			HISTORY_POINTS
		);
		vi.mocked(courseService.getCourse).mockResolvedValue({
			id: 'key-1',
			title: 'Alice Key',
			description: '',
			instructorId: 'alice',
			category: 'Art',
			level: 'BEGINNER',
			priceStroops: 10_000_000,
			change24h: 12.5,
		});
		vi.mocked(courseService.getKeyStats).mockResolvedValue({
			supply: 100,
			holderCount: 10,
			volume24h: 420_000_000,
			totalVolume: 1_000_000_000,
			twap1h: null,
			twap24h: null,
		});
	});

	it('shows a loading skeleton while the initial fetch is pending', async () => {
		vi.mocked(courseService.getPriceHistory).mockImplementation(
			() => new Promise(() => {})
		);
		const { wrapper } = makeWrapper();

		render(<BondingCurvePriceChart creatorId="key-1" />, { wrapper });

		expect(
			screen.getByTestId('bonding-curve-price-chart-skeleton')
		).toBeInTheDocument();
		// Stat chips show placeholders until their source resolves.
		expect(screen.getByTestId('bonding-curve-chart-current-price')).toHaveTextContent(
			'—'
		);
	});

	it('renders the series and stat chips once data resolves', async () => {
		const { wrapper } = makeWrapper();

		render(<BondingCurvePriceChart creatorId="key-1" />, { wrapper });

		await waitFor(() => {
			expect(
				screen.getByTestId('bonding-curve-price-chart-series')
			).toBeInTheDocument();
		});

		expect(
			screen.getByTestId('bonding-curve-chart-current-price')
		).toHaveTextContent('1 XLM');
		expect(screen.getByTestId('bonding-curve-chart-24h-change')).toHaveTextContent(
			'+12.5%'
		);
		expect(screen.getByTestId('bonding-curve-chart-24h-volume')).toHaveTextContent(
			'42 XLM'
		);
		// Polling-only mode: no live badge until the socket connects.
		expect(
			screen.queryByTestId('bonding-curve-chart-live-badge')
		).not.toBeInTheDocument();
	});

	it('refetches the series when the 4h range is selected', async () => {
		const user = userEvent.setup();
		const { wrapper } = makeWrapper();

		render(<BondingCurvePriceChart creatorId="key-1" />, { wrapper });
		await waitFor(() => {
			expect(courseService.getPriceHistory).toHaveBeenCalledWith(
				'key-1',
				'24h'
			);
		});

		await user.click(screen.getByTestId('bonding-curve-chart-range-4h'));

		await waitFor(() => {
			expect(courseService.getPriceHistory).toHaveBeenCalledWith(
				'key-1',
				'4h'
			);
		});
		expect(screen.getByTestId('bonding-curve-chart-range-4h')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('shows the live badge and applies WebSocket ticks without a reload', async () => {
		const { wrapper } = makeWrapper();

		render(<BondingCurvePriceChart creatorId="key-1" />, { wrapper });
		await waitFor(() => {
			expect(
				screen.getByTestId('bonding-curve-price-chart-series')
			).toBeInTheDocument();
		});
		expect(
			screen.getByTestId('bonding-curve-chart-current-price')
		).toHaveTextContent('1 XLM');

		// Connect the (faked) socket.
		const socket = socketInstances[0];
		await act(async () => {
			socket.readyState = 1;
			socket.onopen?.(null);
		});
		expect(screen.getByTestId('bonding-curve-chart-live-badge')).toBeInTheDocument();

		// A post-trade tick updates the current-price chip in place.
		await act(async () => {
			socket.onmessage?.({
				data: JSON.stringify({
					type: 'price_update',
					keyId: 'key-1',
					priceStroops: 25_000_000,
					timestamp: '2026-10-01T12:00:00Z',
				}),
			});
		});

		expect(
			screen.getByTestId('bonding-curve-chart-current-price')
		).toHaveTextContent('2.5 XLM');
	});
});
