import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { useAccount } from 'wagmi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioHoldingRow from '../PortfolioHoldingRow';
import { useWalletRentals } from '@/hooks/useKeyRentals';
import type { RentalListing } from '@/types/keyRental';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

vi.mock('@/hooks/useKeyRentals', () => ({
	useWalletRentals: vi.fn(),
}));

const ME = 'GME';

const position: HeldKeyPosition = {
	creatorId: 'creator-1',
	quantity: 3,
	liquidQuantity: 3,
	frozenQuantity: 0,
	priceStroops: 5_000_000,
	last_buy_timestamp: null,
};

const creator = {
	id: 'creator-1',
	title: 'Alex Rivers',
	description: 'Artist',
	price: 0.5,
	instructorId: 'inst-1',
	category: 'Art',
	level: 'BEGINNER' as const,
};

function listed(quantity: number, status: RentalListing['status'] = 'listed') {
	return {
		id: `l-${quantity}-${status}`,
		keyId: 'creator-1',
		keyName: 'Alex Rivers',
		owner: ME,
		quantity,
		feePerDayStroops: 1n,
		maxDays: 7,
		collateralStroops: 0n,
		status,
		renter: status === 'rented' ? 'GRENTER' : null,
		rentedDays: null,
		rentedAtMs: null,
		expiresAtMs: null,
		graceEndsAtMs: null,
	} satisfies RentalListing;
}

function renderRow(rentals: RentalListing[]) {
	vi.mocked(useWalletRentals).mockReturnValue({ data: rentals } as never);
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<PortfolioHoldingRow
					position={position}
					creator={creator}
					onSell={vi.fn()}
					onTransfer={vi.fn()}
				/>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('PortfolioHoldingRow — keys listed for rent (#1360)', () => {
	beforeEach(() => {
		vi.mocked(useAccount).mockReturnValue({
			address: ME,
			isConnected: true,
		} as never);
	});

	it('shows no rental notice when nothing is listed', () => {
		renderRow([]);
		expect(
			screen.queryByTestId('rental-escrow-notice')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('holding-sell-button')).toBeEnabled();
	});

	it('explains why listed keys cannot be sold or transferred', () => {
		renderRow([listed(1)]);
		const notice = screen.getByTestId('rental-escrow-notice');
		expect(notice).toHaveTextContent('1 key listed for rent.');
		expect(notice).toHaveTextContent(
			'cannot be sold or transferred while they are listed or rented out'
		);
		// Two keys are still free, so selling stays available.
		expect(screen.getByTestId('holding-sell-button')).toBeEnabled();
	});

	it('blocks selling and transferring when every key is listed or rented out', async () => {
		const user = userEvent.setup();
		renderRow([listed(2), listed(1, 'rented')]);

		expect(screen.getByTestId('rental-escrow-notice')).toHaveTextContent(
			'3 keys listed for rent.'
		);
		expect(screen.getByTestId('holding-sell-button')).toBeDisabled();

		await user.click(screen.getByTestId('holding-expand-button'));
		expect(screen.getByRole('button', { name: /^Transfer$/ })).toBeDisabled();
	});
});
