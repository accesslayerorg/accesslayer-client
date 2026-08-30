import { useEffect, useState } from 'react';
import {
	computeBuyCost,
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

export interface BuyPriceEstimateProps {
	/** Current key supply for the creator being priced. */
	currentSupply: number;
	/** Number of keys the user intends to buy. */
	quantity: number;
	/** Bonding curve parameters; defaults to the platform-wide curve. */
	params?: BondingCurveParams;
	/** Called with the quantity when the buy button is pressed. */
	onBuy?: (quantity: number) => void;
}

/**
 * Debounce before recomputing the bonding-curve price preview after the
 * quantity changes. computeBuyCost() itself is synchronous, but debouncing
 * avoids recalculating (and re-rendering) on every keystroke while the user
 * is still typing a multi-digit quantity.
 */
const PRICE_CALCULATION_DEBOUNCE_MS = 150;

/**
 * Shows the total XLM cost to buy `quantity` keys at the current bonding
 * curve price, recalculating via computeBuyCost() whenever the quantity (or
 * current supply) changes. Invalid quantities show an error and disable the
 * buy button.
 */
export default function BuyPriceEstimate({
	currentSupply,
	quantity,
	params = DEFAULT_BONDING_CURVE_PARAMS,
	onBuy,
}: BuyPriceEstimateProps) {
	const [isCalculating, setIsCalculating] = useState(false);
	const [totalCostStroops, setTotalCostStroops] = useState<number>(() =>
		quantity > 0 ? computeBuyCost(currentSupply, quantity, params) : 0
	);

	useEffect(() => {
		if (quantity <= 0) {
			setIsCalculating(false);
			setTotalCostStroops(0);
			return;
		}

		setIsCalculating(true);
		const timer = window.setTimeout(() => {
			setTotalCostStroops(computeBuyCost(currentSupply, quantity, params));
			setIsCalculating(false);
		}, PRICE_CALCULATION_DEBOUNCE_MS);

		return () => window.clearTimeout(timer);
	}, [currentSupply, quantity, params]);

	const canBuy = quantity > 0 && !isCalculating;

	return (
		<div data-testid="buy-price-estimate">
			{quantity <= 0 ? (
				<span role="alert" data-testid="buy-price-invalid-quantity">
					Enter a valid quantity
				</span>
			) : isCalculating ? (
				<span role="status" aria-live="polite" data-testid="buy-price-loading">
					Calculating price…
				</span>
			) : (
				<span data-testid="buy-price-total">
					{formatDisplayKeyPrice(totalCostStroops)}
				</span>
			)}
			<button
				type="button"
				disabled={!canBuy}
				onClick={() => onBuy?.(quantity)}
				data-testid="buy-price-estimate-buy-button"
			>
				Buy {quantity} {quantity === 1 ? 'key' : 'keys'}
			</button>
		</div>
	);
}
