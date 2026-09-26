import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoyaltyEarningsSection from '../RoyaltyEarningsSection';
import { useClaimRoyaltiesMutation } from '@/hooks/useRoyaltyClaim';
import {
	ROYALTY_EARNINGS_REFETCH_INTERVAL_MS,
} from '@/hooks/useRoyaltyEarnings';
import type { RoyaltyEarnings } from '@/services/royaltyEarnings.service';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));
vi.mock('@/hooks/useRoyaltyClaim', () => ({
	useClaimRoyaltiesMutation: vi.fn(() => ({
		mutate: mockMutate,
		isPending: false,
	})),
}));

const NOW = Date.UTC(2026, 8, 26, 12, 0, 0); // 2026-09-26T12:00:00Z

function makeEarnings(
	overrides: Partial<RoyaltyEarnings> = {}
): RoyaltyEarnings {
	return {
		totalEarned: 45,
		pending: 20,
		claimed: 25,
		events: [
			{
				id: 'evt-1',
				timestamp: NOW - 60_000,
				transferAmount: 100,
				royaltyEarned: 2.5,
			},
			{
				id: 'evt-2',
				timestamp: NOW - 3_600_000,
				transferAmount: 250,
				royaltyEarned: 6.25,
			},
		],
		claims: [
			{
				id: 'claim-1',
				timestamp: NOW - 86_400_000,
				amount: 25,
				txHash: 'abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890',
			},
		],
		...overrides,
	};
}

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('RoyaltyEarningsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders totals aggregated from the earnings payload', async () => {
		render(
			<RoyaltyEarningsSection creatorId="c1" queryFn={async () => makeEarnings()} />,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('royalty-total-earned')).toHaveTextContent('45.00 XLM');
		});
		expect(screen.getByTestId('royalty-pending')).toHaveTextContent('20.00 XLM');
		expect(screen.getByTestId('royalty-claimed')).toHaveTextContent('25.00 XLM');
	});

	it('lists every per-transfer royalty event with amount and royalty earned', async () => {
		render(
			<RoyaltyEarningsSection creatorId="c1" queryFn={async () => makeEarnings()} />,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getAllByTestId('royalty-event-amount')).toHaveLength(2);
		});
		expect(screen.getAllByTestId('royalty-event-amount')[0]).toHaveTextContent('100 XLM');
		expect(screen.getAllByTestId('royalty-event-royalty')[0]).toHaveTextContent('+2.5 XLM');
		expect(screen.getAllByTestId('royalty-event-royalty')[1]).toHaveTextContent('+6.25 XLM');
	});

	it('populates claimed history with transaction hash links', async () => {
		render(
			<RoyaltyEarningsSection creatorId="c1" queryFn={async () => makeEarnings()} />,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('royalty-claims-list')).toBeInTheDocument();
		});
		const link = screen.getByTestId('royalty-claim-tx-link');
		expect(link).toHaveAttribute('href', expect.stringContaining('stellar.expert'));
		expect(link).toHaveTextContent('abc123de…4567890');
	});

	it('submits a claim transaction when the claim button is clicked', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(
			<RoyaltyEarningsSection creatorId="c1" queryFn={async () => makeEarnings()} />,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('claim-royalties-button')).toBeInTheDocument();
		});
		await user.click(screen.getByTestId('claim-royalties-button'));

		expect(mockMutate).toHaveBeenCalledTimes(1);
	});

	it('refreshes earnings every 60 seconds', async () => {
		const queryFn = vi.fn(async () => makeEarnings());
		render(<RoyaltyEarningsSection creatorId="c1" queryFn={queryFn} />, {
			wrapper: makeWrapper(),
		});

		await waitFor(() => {
			expect(queryFn).toHaveBeenCalledTimes(1);
		});

		await act(async () => {
			vi.advanceTimersByTime(ROYALTY_EARNINGS_REFETCH_INTERVAL_MS + 1_000);
		});

		await waitFor(() => {
			expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(2);
		});
	});

	it('shows an empty state when there are no royalty events or claims', async () => {
		render(
			<RoyaltyEarningsSection
				creatorId="c1"
				queryFn={async () => makeEarnings({ events: [], claims: [] })}
			/>,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('royalty-events-empty')).toBeInTheDocument();
		});
		expect(screen.getByTestId('royalty-claims-empty')).toBeInTheDocument();
	});

	it('shows an error state when the earnings query fails', async () => {
		render(
			<RoyaltyEarningsSection
				creatorId="c1"
				queryFn={async () => {
					throw new Error('boom');
				}}
			/>,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('royalty-earnings-error')).toBeInTheDocument();
		});
	});

	it('disables the claim button while a claim is in progress', async () => {
		vi.mocked(useClaimRoyaltiesMutation).mockReturnValueOnce({
			mutate: mockMutate,
			isPending: true,
		} as ReturnType<typeof useClaimRoyaltiesMutation>);

		render(
			<RoyaltyEarningsSection creatorId="c1" queryFn={async () => makeEarnings()} />,
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => {
			expect(screen.getByTestId('claim-royalties-button')).toBeDisabled();
		});
		expect(screen.getByTestId('claim-royalties-button')).toHaveTextContent('Claiming…');
	});
});
