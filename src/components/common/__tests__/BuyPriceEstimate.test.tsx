/**
 * Unit tests for BuyPriceEstimate — the bonding curve price preview
 * component that renders the correct total XLM amount for buying N keys
 * (#684).
 */
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuyPriceEstimate from '@/components/common/BuyPriceEstimate';
import * as bondingCurveUtils from '@/utils/bondingCurve.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

describe('BuyPriceEstimate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('displays the correct XLM price for quantity 1', () => {
		render(<BuyPriceEstimate currentSupply={0} quantity={1} />);

		act(() => {
			vi.runAllTimers();
		});

		const expectedCostStroops = bondingCurveUtils.computeBuyCost(
			0,
			1,
			bondingCurveUtils.DEFAULT_BONDING_CURVE_PARAMS
		);
		expect(screen.getByTestId('buy-price-total')).toHaveTextContent(
			formatDisplayKeyPrice(expectedCostStroops)
		);
		expect(screen.getByTestId('buy-price-estimate-buy-button')).toBeInTheDocument();
	});

	it.each([0, -1])(
		'shows an invalid quantity error and disables confirm for quantity %s',
		quantity => {
		render(<BuyPriceEstimate currentSupply={0} quantity={quantity} />);

		act(() => {
			vi.runAllTimers();
		});

		expect(screen.getByTestId('buy-price-invalid-quantity')).toHaveTextContent(
			'Enter a valid quantity'
		);
		expect(screen.queryByTestId('buy-price-total')).not.toBeInTheDocument();
		expect(screen.getByTestId('buy-price-estimate-buy-button')).toBeDisabled();
		}
	);

	it('displays the base price at supply 0', () => {
		render(<BuyPriceEstimate currentSupply={0} quantity={1} />);

		act(() => {
			vi.runAllTimers();
		});

		const expectedCostStroops = bondingCurveUtils.computeBuyCost(
			0,
			1,
			bondingCurveUtils.DEFAULT_BONDING_CURVE_PARAMS
		);
		expect(screen.getByTestId('buy-price-total')).toHaveTextContent(
			formatDisplayKeyPrice(expectedCostStroops)
		);
	});

	it('displays the curve step-up at supply 10', () => {
		render(<BuyPriceEstimate currentSupply={10} quantity={1} />);

		act(() => {
			vi.runAllTimers();
		});

		const expectedCostStroops = bondingCurveUtils.computeBuyCost(
			10,
			1,
			bondingCurveUtils.DEFAULT_BONDING_CURVE_PARAMS
		);
		expect(screen.getByTestId('buy-price-total')).toHaveTextContent(
			formatDisplayKeyPrice(expectedCostStroops)
		);
	});

	it('displays a higher total price for a large quantity than for quantity 1', () => {
		const { unmount } = render(<BuyPriceEstimate currentSupply={0} quantity={1} />);
		act(() => {
			vi.runAllTimers();
		});
		const priceForOneText = screen.getByTestId('buy-price-total').textContent;
		unmount();

		render(<BuyPriceEstimate currentSupply={0} quantity={100} />);
		act(() => {
			vi.runAllTimers();
		});
		const priceForHundredText = screen.getByTestId('buy-price-total').textContent;

		const expectedForHundred = bondingCurveUtils.computeBuyCost(
			0,
			100,
			bondingCurveUtils.DEFAULT_BONDING_CURVE_PARAMS
		);
		const expectedForOne = bondingCurveUtils.computeBuyCost(
			0,
			1,
			bondingCurveUtils.DEFAULT_BONDING_CURVE_PARAMS
		);

		expect(expectedForHundred).toBeGreaterThan(expectedForOne);
		expect(priceForHundredText).not.toBe(priceForOneText);
		expect(priceForHundredText).toContain('XLM');
	});

	it('updates the displayed price when the quantity prop changes, without unmounting', () => {
		const { rerender } = render(<BuyPriceEstimate currentSupply={0} quantity={1} />);
		act(() => {
			vi.runAllTimers();
		});
		const firstPrice = screen.getByTestId('buy-price-total').textContent;

		rerender(<BuyPriceEstimate currentSupply={0} quantity={5} />);
		act(() => {
			vi.runAllTimers();
		});
		const secondPrice = screen.getByTestId('buy-price-total').textContent;

		expect(secondPrice).not.toBe(firstPrice);
	});

	it('shows a loading state while the price is being (re)calculated', () => {
		const { rerender } = render(<BuyPriceEstimate currentSupply={0} quantity={1} />);
		act(() => {
			vi.runAllTimers();
		});
		expect(screen.queryByTestId('buy-price-loading')).not.toBeInTheDocument();

		rerender(<BuyPriceEstimate currentSupply={0} quantity={2} />);
		// Before the debounce timer fires, the loading state should be visible
		// and the buy button disabled (it stays mounted for layout stability,
		// but must not be clickable while the price is stale/recalculating).
		expect(screen.getByTestId('buy-price-loading')).toBeInTheDocument();
		expect(screen.getByTestId('buy-price-estimate-buy-button')).toBeDisabled();

		act(() => {
			vi.runAllTimers();
		});
		expect(screen.queryByTestId('buy-price-loading')).not.toBeInTheDocument();
		expect(screen.getByTestId('buy-price-estimate-buy-button')).toBeEnabled();
	});

	it('calls the bonding curve calculation function with the correct arguments', () => {
		const spy = vi.spyOn(bondingCurveUtils, 'computeBuyCost');
		const params = { basePriceStroops: 5_000_000, growthFactor: 1.02 };

		render(<BuyPriceEstimate currentSupply={42} quantity={7} params={params} />);
		act(() => {
			vi.runAllTimers();
		});

		expect(spy).toHaveBeenCalledWith(42, 7, params);
	});
});
