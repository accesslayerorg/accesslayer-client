/**
 * Integration test: TradeDialog fetches the dynamic fee rate from the
 * contract and renders the fee breakdown on the confirmation screen,
 * refreshing when the trade amount changes (#994).
 *
 * Real timers are used (per docs/testing-conventions.md): the dialog's
 * 200ms fee-rate debounce and the price-preview's 300ms simulated delay
 * both resolve on real timers, and `waitFor` handles the settle.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TradeDialog from '@/components/common/TradeDialog';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getDynamicFeeRate: vi.fn(),
	},
}));

const mockGetDynamicFeeRate = vi.mocked(courseService.getDynamicFeeRate);

const CONTRACT_RATES = {
	baseFeeBps: 500,
	volumeTierDiscountBps: 0,
	protocolFeeBps: 250,
	creatorRoyaltyBps: 250,
};

function mockRates(
	overrides: {
		rates?: Record<string, number | undefined>;
		rejects?: boolean;
	} = {}
) {
	if (overrides.rejects) {
		mockGetDynamicFeeRate.mockRejectedValue(new Error('rpc unavailable'));
		return;
	}
	mockGetDynamicFeeRate.mockResolvedValue(
		(overrides.rates ?? CONTRACT_RATES) as typeof CONTRACT_RATES
	);
}

function renderDialog(
	props: Partial<React.ComponentProps<typeof TradeDialog>> = {}
) {
	return render(
		<TradeDialog
			open={true}
			side="buy"
			creatorName="Alice"
			availableHoldings={100}
			keyPriceStroops={1_000_000}
			protocolFeeBps={250}
			creatorFeeBps={250}
			requireConfirmation={true}
			xlmUsdRate={0.5}
			onOpenChange={vi.fn()}
			onConfirm={vi.fn()}
			{...props}
		/>
	);
}

/** Opens the confirmation step and waits for the fee breakdown to settle. */
async function openConfirmation(amount: string) {
	fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
		target: { value: amount },
	});
	fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

	await waitFor(
		() => {
			const modal = screen.queryByTestId('trade-confirmation-modal');
			expect(modal).not.toBeNull();
			// Either the settled breakdown or an explicit error must be up.
			expect(
				screen.queryByTestId('dynamic-fee-breakdown') !== null ||
					screen.queryByTestId('dynamic-fee-breakdown-error') !== null
			).toBe(true);
		},
		{ timeout: 3000 }
	);
}

describe('TradeDialog confirmation fee breakdown (#994)', () => {
	beforeEach(() => {
		mockRates();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the contract-driven fee breakdown on the confirmation screen', async () => {
		renderDialog();
		await openConfirmation('2');

		// 2 keys × 0.1 XLM = 0.2 XLM notional; base 5% → 0.01 XLM,
		// protocol 2.5% → 0.005 XLM, royalty 2.5% → 0.005 XLM.
		expect(screen.getByTestId('dynamic-fee-breakdown')).toBeInTheDocument();
		expect(screen.getByTestId('fee-breakdown-base-fee')).toHaveTextContent(
			'0.01 XLM'
		);
		expect(
			screen.getByTestId('fee-breakdown-protocol-fee')
		).toHaveTextContent('0.005 XLM');
		expect(
			screen.getByTestId('fee-breakdown-creator-royalty')
		).toHaveTextContent('0.005 XLM');
		expect(
			screen.getByTestId('fee-breakdown-effective-rate-value')
		).toHaveTextContent('10%');
	});

	it('shows the total fee in key units and the USD equivalent', async () => {
		renderDialog();
		await openConfirmation('2');

		// 0.02 XLM total fee × $0.50/XLM = $0.01.
		expect(
			screen.getByTestId('fee-breakdown-total-key')
		).toHaveTextContent('0.02 XLM');
		expect(screen.getByTestId('fee-breakdown-total-usd')).toHaveTextContent(
			'≈ $0.01 USD'
		);
	});

	it('refreshes the breakdown when the trade amount changes', async () => {
		renderDialog();
		await openConfirmation('2');
		expect(
			screen.getByTestId('fee-breakdown-total-key')
		).toHaveTextContent('0.02 XLM');

		// Back out and change the amount — the quote must follow.
		fireEvent.click(screen.getByTestId('confirmation-modal-cancel'));
		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value: '4' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(() =>
			expect(
				screen.queryByTestId('fee-breakdown-total-key')?.textContent
			).toContain('0.04 XLM')
		);
	});

	it('applies a volume-tier discount once the notional reaches the tier', async () => {
		// Contract omits the discount, so it is derived from the notional.
		mockRates({
			rates: { baseFeeBps: 500, protocolFeeBps: 250, creatorRoyaltyBps: 250 },
		});
		renderDialog();
		await openConfirmation('100');

		// 100 keys × 0.1 XLM = 10 XLM → first tier → 50 bps discount:
		// 0.5 − 0.05 + 0.25 + 0.25 = 0.95 XLM, effective 9.5%.
		expect(
			screen.getByTestId('fee-breakdown-volume-tier-discount')
		).toHaveTextContent('-0.05 XLM');
		expect(
			screen.getByTestId('fee-breakdown-effective-rate-value')
		).toHaveTextContent('9.5%');
		expect(
			screen.getByTestId('fee-breakdown-total-key')
		).toHaveTextContent('0.95 XLM');
	});

	it('shows a sell-side breakdown with net proceeds', async () => {
		renderDialog({ side: 'sell', currentSupply: 1_000 });
		await openConfirmation('10');

		expect(screen.getByTestId('dynamic-fee-breakdown')).toBeInTheDocument();
		// 10 keys × 0.1 XLM = 1 XLM proceeds; 10% fee → 0.9 XLM net.
		expect(
			screen.getByTestId('fee-breakdown-net-proceeds')
		).toHaveTextContent('0.9 XLM');
	});

	it('shows the error state with a working retry when the rate fetch fails', async () => {
		mockRates({ rejects: true });
		renderDialog();

		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value: '2' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(() =>
			expect(
				screen.getByTestId('dynamic-fee-breakdown-error')
			).toBeInTheDocument()
		);

		// Recovery: retry resolves, error clears, breakdown renders.
		mockRates();
		fireEvent.click(screen.getByTestId('dynamic-fee-breakdown-retry'));
		await waitFor(() =>
			expect(screen.getByTestId('dynamic-fee-breakdown')).toBeInTheDocument()
		);
	});

	it('keeps the confirm→onConfirm pipeline intact after the fee section renders', async () => {
		const onConfirm = vi.fn();
		renderDialog({ onConfirm });
		await openConfirmation('2');

		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));
		await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
		expect(onConfirm.mock.calls[0][0]).toBe(2);
	});
});
