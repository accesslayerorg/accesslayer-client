import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionAccessGate from '../common/SubscriptionAccessGate';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useIsActiveRenter, useWalletRentals } from '@/hooks/useKeyRentals';

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
}));

vi.mock('@/hooks/useProfileStore', () => ({
	useProfileStore: vi.fn(),
}));

vi.mock('@/hooks/useKeyRentals', () => ({
	useIsActiveRenter: vi.fn(() => ({ data: false, isLoading: false })),
	useWalletRentals: vi.fn(() => ({ data: [] })),
}));

describe('SubscriptionAccessGate', () => {
	const mockOnBuyClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useIsActiveRenter).mockReturnValue({
			data: false,
			isLoading: false,
		} as never);
		vi.mocked(useWalletRentals).mockReturnValue({ data: [] } as never);
	});

	it('shows non-connected state when no wallet is connected', () => {
		(
			useProfileStore as unknown as ReturnType<typeof vi.fn>
		).mockImplementation((selector: unknown) =>
			(selector as (state: unknown) => unknown)({ profile: null })
		);
		(
			useWalletHoldings as unknown as ReturnType<typeof vi.fn>
		).mockReturnValue({ data: [], isLoading: false });

		render(
			<SubscriptionAccessGate
				creatorId="creator1"
				onBuyClick={mockOnBuyClick}
			>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(
			screen.getByTestId('subscription-gate-unconnected')
		).toBeInTheDocument();
		expect(screen.getByText(/Wallet Not Connected/i)).toBeInTheDocument();
	});

	it('shows loading state while fetching holdings', () => {
		(
			useProfileStore as unknown as ReturnType<typeof vi.fn>
		).mockImplementation((selector: unknown) =>
			(selector as (state: unknown) => unknown)({
				profile: { id: 'wallet1' },
			})
		);
		(
			useWalletHoldings as unknown as ReturnType<typeof vi.fn>
		).mockReturnValue({ data: [], isLoading: true });

		render(
			<SubscriptionAccessGate
				creatorId="creator1"
				onBuyClick={mockOnBuyClick}
			>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(
			screen.getByTestId('subscription-gate-loading')
		).toBeInTheDocument();
	});

	it('shows locked state when holding is below minimum threshold', () => {
		(
			useProfileStore as unknown as ReturnType<typeof vi.fn>
		).mockImplementation((selector: unknown) =>
			(selector as (state: unknown) => unknown)({
				profile: { id: 'wallet1' },
			})
		);
		(
			useWalletHoldings as unknown as ReturnType<typeof vi.fn>
		).mockReturnValue({
			data: [{ creatorId: 'creator1', quantity: 0 }],
			isLoading: false,
		});

		render(
			<SubscriptionAccessGate
				creatorId="creator1"
				onBuyClick={mockOnBuyClick}
				minimumHolding={1}
			>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(
			screen.getByTestId('subscription-gate-locked')
		).toBeInTheDocument();
		expect(screen.getByText(/Content Locked/i)).toBeInTheDocument();

		const buyButton = screen.getByRole('button', {
			name: /Buy Keys to Unlock/i,
		});
		fireEvent.click(buyButton);
		expect(mockOnBuyClick).toHaveBeenCalled();
	});

	it('shows unlocked state and content when holding meets minimum threshold', () => {
		(
			useProfileStore as unknown as ReturnType<typeof vi.fn>
		).mockImplementation((selector: unknown) =>
			(selector as (state: unknown) => unknown)({
				profile: { id: 'wallet1' },
			})
		);
		(
			useWalletHoldings as unknown as ReturnType<typeof vi.fn>
		).mockReturnValue({
			data: [
				{
					creatorId: 'creator1',
					quantity: 1,
					last_buy_timestamp: Date.now(),
				},
			],
			isLoading: false,
		});

		render(
			<SubscriptionAccessGate
				creatorId="creator1"
				onBuyClick={mockOnBuyClick}
				minimumHolding={1}
			>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(
			screen.getByTestId('subscription-gate-unlocked')
		).toBeInTheDocument();
		expect(screen.getByText(/Active Subscription/i)).toBeInTheDocument();
		expect(screen.getByText('Exclusive Content')).toBeInTheDocument();
	});

	describe('rental access (#1360)', () => {
		const connectAs = (wallet: string) =>
			(
				useProfileStore as unknown as ReturnType<typeof vi.fn>
			).mockImplementation((selector: unknown) =>
				(selector as (state: unknown) => unknown)({
					profile: { id: wallet },
				})
			);

		it('unlocks for an active renter and shows the Rented badge with time left', () => {
			connectAs('renter1');
			(
				useWalletHoldings as unknown as ReturnType<typeof vi.fn>
			).mockReturnValue({
				data: [],
				isLoading: false,
			});
			vi.mocked(useIsActiveRenter).mockReturnValue({
				data: true,
				isLoading: false,
			} as never);
			vi.mocked(useWalletRentals).mockReturnValue({
				data: [
					{
						id: '1',
						keyId: 'creator1',
						keyName: 'Creator',
						owner: 'owner1',
						quantity: 1,
						feePerDayStroops: 1n,
						maxDays: 7,
						collateralStroops: 0n,
						status: 'rented',
						renter: 'renter1',
						rentedDays: 2,
						rentedAtMs: Date.now(),
						expiresAtMs: Date.now() + 2 * 86_400_000,
						graceEndsAtMs: null,
					},
				],
			} as never);

			render(
				<SubscriptionAccessGate creatorId="creator1" minimumHolding={1}>
					<div>Exclusive Content</div>
				</SubscriptionAccessGate>
			);

			expect(vi.mocked(useIsActiveRenter)).toHaveBeenCalledWith(
				'creator1',
				'renter1'
			);
			expect(
				screen.getByTestId('subscription-gate-rental-access')
			).toBeInTheDocument();
			expect(screen.getByTestId('rented-badge')).toHaveTextContent(
				/Rented.*left/
			);
			expect(screen.getByText('Exclusive Content')).toBeInTheDocument();
		});

		it('keeps the holder view, without the Rented badge, for key holders', () => {
			connectAs('wallet1');
			(
				useWalletHoldings as unknown as ReturnType<typeof vi.fn>
			).mockReturnValue({
				data: [{ creatorId: 'creator1', quantity: 2 }],
				isLoading: false,
			});
			vi.mocked(useIsActiveRenter).mockReturnValue({
				data: true,
				isLoading: false,
			} as never);

			render(
				<SubscriptionAccessGate creatorId="creator1" minimumHolding={1}>
					<div>Exclusive Content</div>
				</SubscriptionAccessGate>
			);

			expect(screen.getByText(/Active Subscription/i)).toBeInTheDocument();
			expect(screen.queryByTestId('rented-badge')).not.toBeInTheDocument();
		});

		it('waits for the renter check before locking a non-holder out', () => {
			connectAs('wallet1');
			(
				useWalletHoldings as unknown as ReturnType<typeof vi.fn>
			).mockReturnValue({
				data: [],
				isLoading: false,
			});
			vi.mocked(useIsActiveRenter).mockReturnValue({
				data: undefined,
				isLoading: true,
			} as never);

			render(
				<SubscriptionAccessGate creatorId="creator1" minimumHolding={1}>
					<div>Exclusive Content</div>
				</SubscriptionAccessGate>
			);

			expect(
				screen.getByTestId('subscription-gate-loading')
			).toBeInTheDocument();
			expect(
				screen.queryByText('Exclusive Content')
			).not.toBeInTheDocument();
		});
	});
});
