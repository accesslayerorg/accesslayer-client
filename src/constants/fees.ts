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
