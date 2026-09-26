import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionAccessGate from '../common/SubscriptionAccessGate';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useProfileStore } from '@/hooks/useProfileStore';

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
}));

vi.mock('@/hooks/useProfileStore', () => ({
	useProfileStore: vi.fn(),
}));

describe('SubscriptionAccessGate', () => {
	const mockOnBuyClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows non-connected state when no wallet is connected', () => {
		(useProfileStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: unknown) => (selector as (state: unknown) => unknown)({ profile: null }));
		(useWalletHoldings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false });

		render(
			<SubscriptionAccessGate creatorId="creator1" onBuyClick={mockOnBuyClick}>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(screen.getByTestId('subscription-gate-unconnected')).toBeInTheDocument();
		expect(screen.getByText(/Wallet Not Connected/i)).toBeInTheDocument();
	});

	it('shows loading state while fetching holdings', () => {
		(useProfileStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: unknown) => (selector as (state: unknown) => unknown)({ profile: { id: 'wallet1' } }));
		(useWalletHoldings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: true });

		render(
			<SubscriptionAccessGate creatorId="creator1" onBuyClick={mockOnBuyClick}>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(screen.getByTestId('subscription-gate-loading')).toBeInTheDocument();
	});

	it('shows locked state when holding is below minimum threshold', () => {
		(useProfileStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: unknown) => (selector as (state: unknown) => unknown)({ profile: { id: 'wallet1' } }));
		(useWalletHoldings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			data: [{ creatorId: 'creator1', quantity: 0 }],
			isLoading: false,
		});

		render(
			<SubscriptionAccessGate creatorId="creator1" onBuyClick={mockOnBuyClick} minimumHolding={1}>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(screen.getByTestId('subscription-gate-locked')).toBeInTheDocument();
		expect(screen.getByText(/Content Locked/i)).toBeInTheDocument();

		const buyButton = screen.getByRole('button', { name: /Buy Keys to Unlock/i });
		fireEvent.click(buyButton);
		expect(mockOnBuyClick).toHaveBeenCalled();
	});

	it('shows unlocked state and content when holding meets minimum threshold', () => {
		(useProfileStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: unknown) => (selector as (state: unknown) => unknown)({ profile: { id: 'wallet1' } }));
		(useWalletHoldings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			data: [{ creatorId: 'creator1', quantity: 1, last_buy_timestamp: Date.now() }],
			isLoading: false,
		});

		render(
			<SubscriptionAccessGate creatorId="creator1" onBuyClick={mockOnBuyClick} minimumHolding={1}>
				<div>Exclusive Content</div>
			</SubscriptionAccessGate>
		);

		expect(screen.getByTestId('subscription-gate-unlocked')).toBeInTheDocument();
		expect(screen.getByText(/Active Subscription/i)).toBeInTheDocument();
		expect(screen.getByText('Exclusive Content')).toBeInTheDocument();
	});
});
