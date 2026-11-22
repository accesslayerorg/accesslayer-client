/**
 * Tests for the configurable bid-ask spread shown in the quick-trade
 * modal (#951). The spread is passed in from the key config query and must
 * render on both the buy and sell side, and disappear entirely at zero
 * spread.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import type { KeyConfig } from '@/services/course.service';

const SPREAD_CONFIG: KeyConfig = {
	buyPriceStroops: 1_000_000,
	sellPriceStroops: 950_000,
	spreadStroops: 50_000,
	spreadBps: 500,
};

function renderDialog(
	overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
) {
	return render(
		<TradeDialog
			open={true}
			side="buy"
			creatorName="Alice"
			availableHoldings={10}
			keyPriceStroops={1_000_000}
			currentSupply={100}
			keyConfig={SPREAD_CONFIG}
			onOpenChange={vi.fn()}
			onConfirm={vi.fn()}
			{...overrides}
		/>
	);
}

describe('TradeDialog – configurable spread (#951)', () => {
	it('shows the spread amount and percentage on the buy side', () => {
		renderDialog();

		expect(screen.getByTestId('key-spread')).toBeInTheDocument();
		expect(screen.getByTestId('key-spread-amount')).toHaveTextContent(
			'0.005 XLM'
		);
		expect(screen.getByTestId('key-spread-percent')).toHaveTextContent('5%');
	});

	it('shows the spread on the sell side too', () => {
		renderDialog({ side: 'sell' });

		expect(screen.getByTestId('key-spread-row')).toBeInTheDocument();
		expect(screen.getByTestId('key-spread-percent')).toHaveTextContent('5%');
	});

	it('omits the spread row when the config reports equal buy and sell prices', () => {
		renderDialog({
			keyConfig: {
				buyPriceStroops: 1_000_000,
				sellPriceStroops: 1_000_000,
			},
		});

		expect(screen.getByTestId('key-spread-buy-price')).toHaveTextContent(
			'0.1 XLM'
		);
		expect(screen.getByTestId('key-spread-sell-price')).toHaveTextContent(
			'0.1 XLM'
		);
		expect(screen.queryByTestId('key-spread-row')).not.toBeInTheDocument();
	});

	it('renders no spread surface when the key config is unavailable', () => {
		renderDialog({ keyConfig: null });

		expect(screen.queryByTestId('key-spread')).not.toBeInTheDocument();
	});
});
