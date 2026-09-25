// Fee bound defaults — import from here to keep fee limits centrally adjustable.
// Values are in basis points (bps): 100 bps = 1%.

export const FEE_BOUNDS = {
	MIN_FEE_BPS: 100, // 1%
	DEFAULT_FEE_BPS: 500, // 5%
	MAX_FEE_BPS: 1000, // 10%
} as const;

export const KEY_PRICE_BOUNDS = {
	MIN_PRICE: 0.001,
	MAX_PRICE: 100,
} as const;

export const BUY_QUANTITY_BOUNDS = {
	MIN_QTY: 1,
	MAX_QTY: 100,
} as const;

export const TRADE_FEE_ESTIMATE = {
	DEFAULT_NETWORK_FEE: 0.0001,
	UNIT: 'ETH',
	BUY_GAS_LIMIT: 180_000n,
	SELL_GAS_LIMIT: 150_000n,
} as const;

/**
 * Batch buy constraints (#954).
 *
 * MAX_BASKET_ITEMS  — maximum number of distinct creators in one batch.
 *                     Mirrors the contract-defined batch cap.
 * DEFAULT_SLIPPAGE_BPS — per-key slippage tolerance expressed in basis points
 *                        (100 bps = 1%).  Used to compute max_price per key
 *                        before the transaction is submitted.
 * MAX_SLIPPAGE_BPS  — upper bound surfaced in the slippage settings UI.
 */
export const BATCH_BUY = {
	MAX_BASKET_ITEMS: 20,
	DEFAULT_SLIPPAGE_BPS: 100, // 1%
	MAX_SLIPPAGE_BPS: 500, // 5%
	MIN_SLIPPAGE_BPS: 0,
} as const;
