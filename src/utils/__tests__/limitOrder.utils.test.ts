import { describe, expect, it } from 'vitest';
import { validateLimitOrderPrice } from '../limitOrder.utils';

describe('validateLimitOrderPrice', () => {
	it('rejects a buy at or above the current price', () => {
		expect(validateLimitOrderPrice('buy', 10, 10)).toMatch(/below/);
		expect(validateLimitOrderPrice('buy', 11, 10)).toMatch(/below/);
	});
	it('rejects a sell at or below the current price', () => {
		expect(validateLimitOrderPrice('sell', 10, 10)).toMatch(/above/);
		expect(validateLimitOrderPrice('sell', 9, 10)).toMatch(/above/);
	});
	it('accepts targets on the correct side of the market', () => {
		expect(validateLimitOrderPrice('buy', 9, 10)).toBeNull();
		expect(validateLimitOrderPrice('sell', 11, 10)).toBeNull();
	});
});
