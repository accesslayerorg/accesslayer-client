import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { useAccount } from 'wagmi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyRentalsPage from '../MyRentalsPage';
import { useWalletRentals } from '@/hooks/useKeyRentals';
import type { RentalListing } from '@/types/keyRental';

const NOW = 1_800_000_000_000;
const DAY_MS = 86_400_000;
const ME = 'GME';

const endMutate = vi.fn();
const claimMutate = vi.fn();

vi.mock('@/hooks/useKeyRentals', () => ({
	useKeyRentalsEnabled: () => true,
	useWalletRentals: vi.fn(),
	useListRentalMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useEndRentalMutation: () => ({ mutate: endMutate, isPending: false }),
	useClaimCollateralMutation: () => ({
		mutate: claimMutate,
		isPending: false,
	}),
}));

vi.mock('@/hooks/useListableRentalKeys', () => ({
	useListableRentalKeys: () => [],
}));

vi.mock('@/hooks/useSigner', () => ({
	useSigner: () => ({ activeSigner: null }),
}));

vi.mock('@/components/common/ConnectWalletButton', () => ({
	default: () => <button type="button">Connect wallet</button>,
}));

vi.mock('@/hooks/useNowMs', () => ({
	useNowMs: () => NOW,
}));

function rental(overrides: Partial<RentalListing>): RentalListing {
	return {
		id: '1',
		keyId: 'key-a',
		keyName: 'Alpha',
		owner: ME,
		quantity: 1,
		feePerDayStroops: 5_000_000n,
		maxDays: 7,
		collateralStroops: 50_000_000n,
		status: 'listed',
		renter: null,
		rentedDays: null,
		rentedAtMs: null,
		expiresAtMs: null,
		graceEndsAtMs: null,
		...overrides,
	};
}

const rentals = [
	rental({ id: 'listed-1' }),
	rental({
		id: 'out-active',
		keyName: 'Active Out',
		status: 'rented',
		renter: 'GSOMEONE',
		expiresAtMs: NOW + 3 * DAY_MS,
		graceEndsAtMs: NOW + 4 * DAY_MS,
	}),
	rental({
		id: 'out-overdue',
		keyName: 'Overdue Out',
		status: 'rented',
		renter: 'GSOMEONE',
		expiresAtMs: NOW - 3 * DAY_MS,
		graceEndsAtMs: NOW - DAY_MS,
	}),
	rental({
		id: 'in-expired',
		keyName: 'Expired In',
		owner: 'GOWNER',
		status: 'rented',
		renter: ME,
		expiresAtMs: NOW - 60_000,
		graceEndsAtMs: NOW + DAY_MS,
	}),
	rental({ id: 'closed', status: 'ended' }),
];

function renderPage() {
	return render(
		<MemoryRouter>
			<MyRentalsPage />
		</MemoryRouter>
	);
}

describe('MyRentalsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAccount).mockReturnValue({
			address: ME,
			isConnected: true,
		} as never);
		vi.mocked(useWalletRentals).mockReturnValue({
			data: rentals,
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		} as never);
	});

	it('splits rentals into listed, rented out and rented in tabs', () => {
		renderPage();

		expect(screen.getByTestId('my-rentals-tab-listed')).toHaveTextContent(
			'Listed (1)'
		);
		expect(screen.getByTestId('my-rentals-tab-rentedOut')).toHaveTextContent(
			'Rented out (2)'
		);
		expect(screen.getByTestId('my-rentals-tab-rentedIn')).toHaveTextContent(
			'Rented in (1)'
		);
	});

	it('shows time remaining and claims collateral only for the overdue rental', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByTestId('my-rentals-tab-rentedOut'));
		const [active, overdue] = screen.getAllByTestId('rental-row');

		expect(within(active).getByTestId('rental-row-status')).toHaveTextContent(
			'3d remaining'
		);
		expect(within(active).queryByRole('button')).not.toBeInTheDocument();

		await user.click(within(overdue).getByTestId('rental-row-claim'));
		expect(claimMutate).toHaveBeenCalledWith('out-overdue');
	});

	it('ends an expired rented-in rental', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByTestId('my-rentals-tab-rentedIn'));
		const [row] = screen.getAllByTestId('rental-row');
		expect(
			within(row).queryByTestId('rental-row-claim')
		).not.toBeInTheDocument();

		await user.click(within(row).getByTestId('rental-row-end'));
		expect(endMutate).toHaveBeenCalledWith('in-expired');
	});

	it('asks for a wallet when none is connected', () => {
		vi.mocked(useAccount).mockReturnValue({
			address: undefined,
			isConnected: false,
		} as never);
		renderPage();

		expect(screen.getByTestId('my-rentals-connect')).toBeInTheDocument();
	});
});
