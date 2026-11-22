import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeDialog from '../TradeDialog';

describe('TradeDialog Price Floor Enforcement (#1152)', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={1_000_000} // 0.1 XLM
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('disables input, MAX button, and confirm button when side="sell" and price <= floor', () => {
		renderDialog({
			side: 'sell',
			keyPriceStroops: 1_000_000,
			priceFloorStroops: 1_200_000, // Spot (1.0M) <= Floor (1.2M)
		});

		// Amount input disabled
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		expect(input).toBeDisabled();

		// MAX button disabled
		expect(screen.getByTestId('trade-dialog-max-button')).toBeDisabled();

		// Confirm button disabled
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
		expect(screen.getByTestId('trade-dialog-confirm')).toHaveTextContent(/Price Floor Active/i);

		// Price floor alert banner is visible
		const alert = screen.getByTestId('trade-dialog-price-floor-alert');
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveAttribute('role', 'alert');
		expect(screen.getByTestId('trade-dialog-price-floor-reason')).toHaveTextContent(/PriceFloorActive/i);

		// Tooltip surfaces the PriceFloorActive reason
		const tooltips = screen.getAllByRole('tooltip');
		const floorTooltip = tooltips.find(t =>
			t.textContent?.includes('PriceFloorActive')
		);
		expect(floorTooltip).toBeDefined();
	});

	it('respects explicit priceFloorActive prop on side="sell"', () => {
		renderDialog({
			side: 'sell',
			priceFloorActive: true,
			priceFloorStroops: 1_500_000,
		});

		expect(screen.getByTestId('trade-dialog-amount')).toBeDisabled();
		expect(screen.getByTestId('trade-dialog-max-button')).toBeDisabled();
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
		expect(screen.getByTestId('trade-dialog-price-floor-alert')).toBeInTheDocument();
	});

	it('does NOT block or disable buying when side="buy" even if price <= floor', () => {
		renderDialog({
			side: 'buy',
			keyPriceStroops: 1_000_000,
			priceFloorStroops: 1_200_000,
			priceFloorActive: true,
		});

		expect(screen.getByTestId('trade-dialog-amount')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-max-button')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
		expect(screen.queryByTestId('trade-dialog-price-floor-alert')).not.toBeInTheDocument();
	});

	it('allows selling when current price is strictly above the floor price (spot > floor)', () => {
		renderDialog({
			side: 'sell',
			keyPriceStroops: 2_000_000, // Spot (2.0M) > Floor (1.2M)
			priceFloorStroops: 1_200_000,
		});

		expect(screen.getByTestId('trade-dialog-amount')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-max-button')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
		expect(screen.queryByTestId('trade-dialog-price-floor-alert')).not.toBeInTheDocument();
	});

	it('allows selling normally when no price floor is configured (priceFloorStroops=null)', () => {
		renderDialog({
			side: 'sell',
			keyPriceStroops: 1_000_000,
			priceFloorStroops: null,
		});

		expect(screen.getByTestId('trade-dialog-amount')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-max-button')).not.toBeDisabled();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
		expect(screen.queryByTestId('trade-dialog-price-floor-alert')).not.toBeInTheDocument();
	});
});
