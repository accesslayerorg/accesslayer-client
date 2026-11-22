import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { useAccount } from 'wagmi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RentalMarketPage from '../RentalMarketPage';
import {
	useAvailableRentals,
	useKeyRentalsEnabled,
} from '@/hooks/useKeyRentals';
import type { RentalListing } from '@/types/keyRental';

const rentMutateAsync = vi.fn();
const listMutateAsync = vi.fn();

vi.mock('@/hooks/useKeyRentals', () => ({
	useKeyRentalsEnabled: vi.fn(() => true),
	useAvailableRentals: vi.fn(),
	useRentKeyMutation: () => ({
		mutateAsync: rentMutateAsync,
		isPending: false,
	}),
	useListRentalMutation: () => ({
		mutateAsync: listMutateAsync,
		isPending: false,
	}),
}));

vi.mock('@/hooks/useListableRentalKeys', () => ({
	useListableRentalKeys: () => [
		{ keyId: 'key-a', keyName: 'Alpha', availableBalance: 3 },
	],
}));

vi.mock('@/hooks/useSigner', () => ({
	useSigner: () => ({ activeSigner: null }),
}));

const ME = 'GME';

function listing(overrides: Partial<RentalListing>): RentalListing {
	return {
		id: '1',
		keyId: 'key-a',
		keyName: 'Alpha',
		owner: 'GOWNER',
		quantity: 2,
		feePerDayStroops: 5_000_000n,
		maxDays: 30,
		collateralStroops: 100_000_000n,
		status: 'listed',
		renter: null,
		rentedDays: null,
		rentedAtMs: null,
		expiresAtMs: null,
		graceEndsAtMs: null,
		...overrides,
	};
}

function renderPage() {
	return render(
		<MemoryRouter>
			<RentalMarketPage />
		</MemoryRouter>
	);
}

describe('RentalMarketPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rentMutateAsync.mockResolvedValue({ hash: 'tx' });
		listMutateAsync.mockResolvedValue({ hash: 'tx' });
		vi.mocked(useKeyRentalsEnabled).mockReturnValue(true);
		vi.mocked(useAccount).mockReturnValue({
			address: ME,
			isConnected: true,
		} as never);
		vi.mocked(useAvailableRentals).mockReturnValue({
			data: [
				listing({ id: '1', keyName: 'Alpha' }),
				listing({
					id: '2',
					keyId: 'key-b',
					keyName: 'Beta',
					owner: ME,
					feePerDayStroops: 1_234_567n,
					maxDays: 7,
					collateralStroops: 0n,
				}),
			],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		} as never);
	});

	it('shows each listing with its fee per day, maximum days and collateral', () => {
		renderPage();

		const [alpha, beta] = screen.getAllByTestId('rental-listing-card');
		expect(within(alpha).getByTestId('rental-listing-fee')).toHaveTextContent(
			'0.5 XLM'
		);
		expect(
			within(alpha).getByTestId('rental-listing-max-days')
		).toHaveTextContent('30');
		expect(
			within(alpha).getByTestId('rental-listing-collateral')
		).toHaveTextContent('10 XLM');
		expect(within(beta).getByTestId('rental-listing-fee')).toHaveTextContent(
			'0.1234567 XLM'
		);
		expect(
			within(beta).getByTestId('rental-listing-collateral')
		).toHaveTextContent('0 XLM');
	});

	it('rents a listing for the chosen number of days', async () => {
		const user = userEvent.setup();
		renderPage();

		const [alpha] = screen.getAllByTestId('rental-listing-card');
		await user.click(within(alpha).getByTestId('rental-listing-rent'));
		const days = screen.getByTestId('rent-days-input');
		await user.clear(days);
		await user.type(days, '4');
		expect(screen.getByTestId('rent-total-fee')).toHaveTextContent('2 XLM');
		await user.click(screen.getByTestId('rent-confirm'));

		expect(rentMutateAsync).toHaveBeenCalledWith({ listingId: '1', days: 4 });
	});

	it('does not let the owner rent their own listing', () => {
		renderPage();
		const [, beta] = screen.getAllByTestId('rental-listing-card');
		expect(within(beta).getByTestId('rental-listing-rent')).toBeDisabled();
	});

	it('lists keys from the market page', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByTestId('rentals-list-keys'));
		await user.type(screen.getByTestId('list-rental-fee'), '1');
		await user.click(screen.getByTestId('list-rental-confirm'));

		expect(listMutateAsync).toHaveBeenCalledWith({
			keyId: 'key-a',
			quantity: 1,
			feePerDayStroops: 10_000_000n,
			maxDays: 7,
			collateralStroops: 0n,
		});
	});

	it('explains that rentals are not live when no rental contract is configured', () => {
		vi.mocked(useKeyRentalsEnabled).mockReturnValue(false);
		renderPage();

		expect(screen.getByTestId('rentals-unavailable')).toBeInTheDocument();
		expect(
			screen.queryByTestId('rental-listing-card')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('rentals-list-keys')).toBeDisabled();
	});

	it('shows an empty state when nothing is listed', () => {
		vi.mocked(useAvailableRentals).mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		} as never);
		renderPage();

		expect(screen.getByText('No keys listed for rent')).toBeInTheDocument();
	});
});
