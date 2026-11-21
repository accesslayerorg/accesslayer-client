import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevenueSharePanel } from '../RevenueSharePanel';
import {
	useClaimAllRevenueShareMutation,
	useClaimRevenueShareMutation,
	useRevenueShareDistributions,
} from '@/hooks/useRevenueShare';
import type { RevenueShareDistribution } from '@/types/revenueShare';

vi.mock('@/hooks/useRevenueShare', () => ({
	useRevenueShareDistributions: vi.fn(),
	useClaimRevenueShareMutation: vi.fn(),
	useClaimAllRevenueShareMutation: vi.fn(),
}));

const KEY_ID = 'key-1';
const WALLET = '0xAAA';

/** Local noon, so the formatted date is stable in every timezone. */
const DISTRIBUTION_DATE = new Date(2026, 9, 1, 12, 0, 0).getTime();
const CLAIM_DATE = new Date(2026, 9, 3, 9, 30, 0).getTime();

function distribution(
	overrides: Partial<RevenueShareDistribution> = {}
): RevenueShareDistribution {
	return {
		id: 'dist-1',
		creatorId: KEY_ID,
		amount: 100,
		timestamp: DISTRIBUTION_DATE,
		holderCount: 4,
		userShare: 25,
		claimed: false,
		receivedAmount: null,
		claimedAt: null,
		...overrides,
	};
}

const mockClaimMutate = vi.fn();
const mockClaimAllMutate = vi.fn();

describe('RevenueSharePanel (#1223)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useRevenueShareDistributions).mockReturnValue({
			distributions: [],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});
		vi.mocked(useClaimRevenueShareMutation).mockReturnValue({
			mutate: mockClaimMutate,
			isPending: false,
			variables: undefined,
		} as unknown as ReturnType<typeof useClaimRevenueShareMutation>);
		vi.mocked(useClaimAllRevenueShareMutation).mockReturnValue({
			mutate: mockClaimAllMutate,
			isPending: false,
			variables: undefined,
		} as unknown as ReturnType<typeof useClaimAllRevenueShareMutation>);
	});

	it('lists each distribution with its date, total amount and the user share', () => {
		vi.mocked(useRevenueShareDistributions).mockReturnValue({
			distributions: [distribution()],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		render(<RevenueSharePanel keyId={KEY_ID} wallet={WALLET} />);

		expect(screen.getByTestId('revenue-share-date-dist-1')).toBeInTheDocument();
		expect(screen.getByTestId('revenue-share-row-dist-1')).toHaveTextContent(
			'100.00 XLM distributed'
		);
		expect(screen.getByTestId('revenue-share-row-dist-1')).toHaveTextContent(
			'4 holders'
		);
		expect(screen.getByTestId('revenue-share-share-dist-1')).toHaveTextContent(
			'25.00 XLM'
		);
		expect(screen.getByTestId('revenue-share-claimable-total')).toHaveTextContent(
			'25.00 XLM'
		);
	});

	it('submits the claim for the distribution when the claim button is used', async () => {
		const user = userEvent.setup();
		vi.mocked(useRevenueShareDistributions).mockReturnValue({
			distributions: [distribution()],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		render(<RevenueSharePanel keyId={KEY_ID} wallet={WALLET} />);
		await user.click(screen.getByTestId('revenue-share-claim-dist-1'));

		expect(mockClaimMutate).toHaveBeenCalledWith('dist-1');
	});

	it('claims every unclaimed distribution at once', async () => {
		const user = userEvent.setup();
		vi.mocked(useRevenueShareDistributions).mockReturnValue({
			distributions: [
				distribution({ id: 'dist-1' }),
				distribution({ id: 'dist-2' }),
				distribution({ id: 'dist-3', claimed: true }),
			],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		render(<RevenueSharePanel keyId={KEY_ID} wallet={WALLET} />);
		await user.click(screen.getByTestId('revenue-share-claim-all'));

		expect(mockClaimAllMutate).toHaveBeenCalledWith(['dist-1', 'dist-2']);
	});

	it('shows the received amount and claim date for claimed distributions', () => {
		vi.mocked(useRevenueShareDistributions).mockReturnValue({
			distributions: [
				distribution({
					id: 'dist-1',
					claimed: true,
					receivedAmount: 25,
					claimedAt: CLAIM_DATE,
				}),
			],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		render(<RevenueSharePanel keyId={KEY_ID} wallet={WALLET} />);

		expect(screen.getByTestId('revenue-share-claimed-dist-1')).toHaveTextContent(
			'25.00 XLM'
		);
		expect(
			screen.getByTestId('revenue-share-claimed-at-dist-1')
		).toHaveTextContent('Oct 3, 2026');
		expect(
			screen.queryByTestId('revenue-share-claim-dist-1')
		).not.toBeInTheDocument();
	});

	it('shows the empty state when the creator has made no distributions', () => {
		render(<RevenueSharePanel keyId={KEY_ID} wallet={WALLET} />);

		expect(screen.getByTestId('revenue-share-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('revenue-share-list')).not.toBeInTheDocument();
	});

	it('asks for a connected wallet when there is none', () => {
		render(<RevenueSharePanel keyId={KEY_ID} />);

		expect(screen.getByTestId('revenue-share-connect-wallet')).toBeInTheDocument();
		expect(screen.queryByTestId('revenue-share-list')).not.toBeInTheDocument();
	});
});
