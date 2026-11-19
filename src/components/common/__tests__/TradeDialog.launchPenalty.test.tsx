/**
 * Unit tests for the launch penalty warning on the sell confirmation
 * modal (#825). Holders selling within 7 days of a key's creation incur
 * an early-sell penalty; the modal must surface a warning plus an updated
 * fee breakdown before the user signs, and let them proceed anyway.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import { LAUNCH_WINDOW_LEDGERS } from '@/utils/launchPenalty.utils';

describe('TradeDialog – launch penalty warning (#825)', () => {
	function renderSellDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={500_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('shows the warning when selling within the 7-day launch window', () => {
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1000 + 100,
			launchPenaltyBps: 500, // 5%
		});

		const warning = screen.getByTestId('launch-penalty-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent('Early sell penalty applies');
		expect(screen.getByTestId('launch-penalty-rate')).toHaveTextContent('5%');
	});

	it('hides the warning once the key is past the launch window', () => {
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1000 + LAUNCH_WINDOW_LEDGERS + 1,
			launchPenaltyBps: 500,
		});

		expect(
			screen.queryByTestId('launch-penalty-warning')
		).not.toBeInTheDocument();
	});

	it('hides the warning when no launch penalty is configured', () => {
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1000 + 10,
			launchPenaltyBps: 0,
		});

		expect(
			screen.queryByTestId('launch-penalty-warning')
		).not.toBeInTheDocument();
	});

	it('hides the warning when ledger data is unavailable', () => {
		renderSellDialog();

		expect(
			screen.queryByTestId('launch-penalty-warning')
		).not.toBeInTheDocument();
	});

	it('never shows the warning on the buy side', () => {
		renderSellDialog({
			side: 'buy',
			createdAtLedger: 1000,
			currentLedger: 1050,
			launchPenaltyBps: 500,
		});

		expect(
			screen.queryByTestId('launch-penalty-warning')
		).not.toBeInTheDocument();
	});

	it('displays the penalty amount and net proceeds in the fee breakdown', () => {
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1050,
			launchPenaltyBps: 500, // 5%
		});

		const input = screen.getByTestId('trade-dialog-amount');
		// keyPriceStroops=500_000 * quantity=4 = 2_000_000 stroops gross (0.2 XLM)
		fireEvent.change(input, { target: { value: '4' } });

		expect(screen.getByTestId('sell-fee-breakdown-penalty')).toHaveTextContent(
			'Launch penalty (5%)'
		);
		// 5% of 0.2 XLM = 0.01 XLM
		expect(screen.getByTestId('sell-fee-breakdown-penalty')).toHaveTextContent(
			'0.01 XLM'
		);
		expect(screen.getByTestId('sell-fee-breakdown-net')).toHaveTextContent(
			'Net proceeds'
		);
		// 0.2 XLM - 0.01 XLM = 0.19 XLM
		expect(screen.getByTestId('sell-fee-breakdown-net')).toHaveTextContent(
			'0.19 XLM'
		);
	});

	it('does not show a penalty line item when past the launch window', () => {
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1000 + LAUNCH_WINDOW_LEDGERS + 1,
			launchPenaltyBps: 500,
		});

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '4' } });

		expect(
			screen.queryByTestId('sell-fee-breakdown-penalty')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('sell-fee-breakdown-net')
		).not.toBeInTheDocument();
	});

	it('still lets the user confirm the sale after the warning is shown', () => {
		const onConfirm = vi.fn();
		renderSellDialog({
			createdAtLedger: 1000,
			currentLedger: 1050,
			launchPenaltyBps: 500,
			onConfirm,
		});

		expect(screen.getByTestId('launch-penalty-warning')).toBeInTheDocument();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '2' } });
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		// #872 added a third `slippage` argument (the computed min/max price
		// bound); this test only asserts on the amount and price-preview
		// arguments it was written to cover.
		expect(onConfirm).toHaveBeenCalledWith(
			2,
			null,
			expect.objectContaining({ minPriceStroops: expect.any(Number) })
		);
	});
});
