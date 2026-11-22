import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecondaryMarketSellPanel from '@/components/common/SecondaryMarketSellPanel';
import { useSellableNow } from '@/hooks/useSellableNow';

vi.mock('@/hooks/useSellableNow');

describe('SecondaryMarketSellPanel with sellable balance (#1354)', () => {
	const noop = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders SameLedgerNotice when partially locked and not exempt', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 60,
			isFullySellable: false,
			isFullyLocked: false,
			isExempt: false,
			lockedBalance: 40,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		expect(screen.getByTestId('same-ledger-notice')).toBeInTheDocument();
		expect(screen.getByText(/40 of 100 keys \(40%\) are locked/)).toBeInTheDocument();
	});

	it('does not render SameLedgerNotice when fully sellable', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 100,
			isFullySellable: true,
			isFullyLocked: false,
			isExempt: false,
			lockedBalance: 0,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		expect(screen.queryByTestId('same-ledger-notice')).not.toBeInTheDocument();
	});

	it('does not render SameLedgerNotice when exempt', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 100,
			isFullySellable: true,
			isFullyLocked: false,
			isExempt: true,
			lockedBalance: 0,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		expect(screen.queryByTestId('same-ledger-notice')).not.toBeInTheDocument();
	});

	it('uses sellableNow for max fraction amount', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 60,
			isFullySellable: false,
			isFullyLocked: false,
			isExempt: false,
			lockedBalance: 40,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		const input = screen.getByTestId('auction-fraction-amount');
		expect(input).toHaveAttribute('max', '60');
		expect(screen.getByText('60 sellable (40 locked)')).toBeInTheDocument();
	});

	it('disables sell inputs and buttons when sellableNow is zero', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 0,
			isFullySellable: false,
			isFullyLocked: true,
			isExempt: false,
			lockedBalance: 100,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		const input = screen.getByTestId('auction-fraction-amount');
		expect(input).toBeDisabled();

		const submitButton = screen.getByTestId('submit-fixed-price');
		expect(submitButton).toBeDisabled();
	});

	it('shows loading state while fetching sellable balance', () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 0,
			isFullySellable: false,
			isFullyLocked: false,
			isExempt: false,
			lockedBalance: 0,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: true,
			data: null,
			error: null,
			isError: false,
			isSuccess: false,
			refetch: vi.fn(),
			fetchStatus: 'fetching',
			status: 'loading',
		});

		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateAuction={noop}
			/>
		);

		expect(screen.getByText('100 sellable (loading…)')).toBeInTheDocument();
	});

	it('submits fixed price listing with sellable amount', async () => {
		vi.mocked(useSellableNow).mockReturnValue({
			sellableNow: 60,
			isFullySellable: false,
			isFullyLocked: false,
			isExempt: false,
			lockedBalance: 40,
			totalBalance: 100,
			nextLedgerCloseEstimate: Date.now() + 5000,
			isLoading: false,
			data: null,
			error: null,
			isError: false,
			isSuccess: true,
			refetch: vi.fn(),
			fetchStatus: 'idle',
			status: 'success',
		});

		const onCreateFixedPriceListing = vi.fn().mockResolvedValue(undefined);
		render(
			<SecondaryMarketSellPanel
				wallet="wallet1"
				keyId="key1"
				availableFractions={100}
				onCreateFixedPriceListing={onCreateFixedPriceListing}
			/>
		);

		fireEvent.change(screen.getByTestId('auction-fraction-amount'), { target: { value: '30' } });
		fireEvent.change(screen.getByTestId('fixed-price-input'), { target: { value: '1000000' } });
		fireEvent.click(screen.getByTestId('submit-fixed-price'));

		await waitFor(() => expect(onCreateFixedPriceListing).toHaveBeenCalledTimes(1));
		expect(onCreateFixedPriceListing).toHaveBeenCalledWith({
			fractionAmount: 30,
			priceStroops: 1000000,
		});
	});
});