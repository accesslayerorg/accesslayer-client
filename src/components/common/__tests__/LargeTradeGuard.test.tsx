import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LargeTradeGuard } from '@/components/common/LargeTradeGuard';
import { evaluateLargeTradeRules } from '@/utils/largeTradeGuard.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { telemetryClient } from '@/telemetry/TelemetryClient';

vi.mock('@/telemetry/TelemetryClient', () => ({
	telemetryClient: {
		track: vi.fn(),
	},
}));

describe('LargeTradeGuard Component (#1480)', () => {
	it('renders triggered rules, spot vs avg price, split savings, and handles checkbox acknowledgement', () => {
		const onAck = vi.fn();
		const rules = evaluateLargeTradeRules({
			amount: 150,
			unitPriceStroops: 100 * STROOPS_PER_XLM,
			totalStroops: 18000 * STROOPS_PER_XLM,
			priceImpactPercent: 8.5,
			currentSupply: 1000,
		});

		render(
			<LargeTradeGuard
				triggeredRules={rules}
				amount={150}
				unitPriceStroops={100 * STROOPS_PER_XLM}
				totalStroops={18000 * STROOPS_PER_XLM}
				side="buy"
				creatorName="Alice"
				onAcknowledgementChange={onAck}
			/>
		);

		// Initially not acknowledged
		expect(onAck).toHaveBeenCalledWith(false);

		// All 3 rules displayed
		expect(screen.getByTestId('rule-item-PRICE_IMPACT')).toBeInTheDocument();
		expect(screen.getByTestId('rule-item-TRADE_VALUE')).toBeInTheDocument();
		expect(screen.getByTestId('rule-item-SUPPLY_PERCENT')).toBeInTheDocument();

		// Price comparison and split preview displayed
		expect(screen.getByTestId('spot-price-val')).toHaveTextContent('100.0000 XLM');
		expect(screen.getByTestId('avg-price-val')).toHaveTextContent('120.0000 XLM');
		expect(screen.getByTestId('split-savings-val')).toBeInTheDocument();

		// Telemetry logged without wallet addresses
		expect(telemetryClient.track).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'UserAction',
				action: 'large_trade_guard_triggered',
			})
		);
		const trackCall = vi.mocked(telemetryClient.track).mock.calls[0][0];
		expect(JSON.stringify(trackCall)).not.toMatch(/GB[A-Z0-9]{54}/);

		// Toggle acknowledgement checkbox
		const checkbox = screen.getByTestId('large-trade-acknowledge-checkbox');
		fireEvent.click(checkbox);
		expect(onAck).toHaveBeenLastCalledWith(true);
	});

	it('allows verification by typing exact quantity', () => {
		const onAck = vi.fn();
		const rules = evaluateLargeTradeRules({
			amount: 50,
			totalStroops: 1000 * STROOPS_PER_XLM,
			priceImpactPercent: 6.0,
		});

		render(
			<LargeTradeGuard
				triggeredRules={rules}
				amount={50}
				totalStroops={1000 * STROOPS_PER_XLM}
				side="buy"
				creatorName="Alice"
				onAcknowledgementChange={onAck}
			/>
		);

		fireEvent.click(screen.getByText('Type Quantity'));
		const input = screen.getByTestId('large-trade-quantity-input');

		fireEvent.change(input, { target: { value: '49' } });
		expect(onAck).toHaveBeenLastCalledWith(false);

		fireEvent.change(input, { target: { value: '50' } });
		expect(onAck).toHaveBeenLastCalledWith(true);
	});
});
