import { describe, expect, it } from 'vitest';
import {
	clampBuyQuantityToCapacity,
	computeHoldingCapState,
	HOLDING_CAP_WARNING_THRESHOLD_PERCENT,
} from '../holdingCap.utils';

describe('computeHoldingCapState', () => {
	it('reports no cap when the key has no holding cap', () => {
		const state = computeHoldingCapState(12, null);

		expect(state.status).toBe('no-cap');
		expect(state.maxCap).toBeNull();
		expect(state.percentUsed).toBeNull();
		expect(state.remaining).toBeNull();
	});

	it('treats a non-positive cap as no cap', () => {
		expect(computeHoldingCapState(3, 0).status).toBe('no-cap');
		expect(computeHoldingCapState(3, -5).status).toBe('no-cap');
	});

	it('computes percent used and remaining capacity', () => {
		const state = computeHoldingCapState(25, 100);

		expect(state.status).toBe('ok');
		expect(state.percentUsed).toBe(25);
		expect(state.remaining).toBe(75);
	});

	it('flags a warning at the 80% threshold', () => {
		const state = computeHoldingCapState(
			HOLDING_CAP_WARNING_THRESHOLD_PERCENT,
			100
		);

		expect(state.status).toBe('warning');
		expect(state.percentUsed).toBe(80);
		expect(state.remaining).toBe(20);
	});

	it('flags reached at 100% with no remaining capacity', () => {
		const state = computeHoldingCapState(100, 100);

		expect(state.status).toBe('reached');
		expect(state.percentUsed).toBe(100);
		expect(state.remaining).toBe(0);
	});

	it('caps percentUsed at 100 when holding exceeds the cap', () => {
		const state = computeHoldingCapState(140, 100);

		expect(state.status).toBe('reached');
		expect(state.percentUsed).toBe(100);
		expect(state.remaining).toBe(0);
	});

	it('treats negative holding as zero', () => {
		const state = computeHoldingCapState(-4, 100);

		expect(state.holding).toBe(0);
		expect(state.remaining).toBe(100);
	});
});

describe('clampBuyQuantityToCapacity', () => {
	it('returns 0 for non-numeric input', () => {
		expect(clampBuyQuantityToCapacity('abc', 10, null)).toBe(0);
	});

	it('clamps to remaining capacity when a cap exists', () => {
		expect(clampBuyQuantityToCapacity(25, 20, null)).toBe(20);
		expect(clampBuyQuantityToCapacity('25', 20, null)).toBe(20);
	});

	it('clamps to the per-transaction maximum', () => {
		expect(clampBuyQuantityToCapacity(50, null, 10)).toBe(10);
	});

	it('applies both remaining capacity and per-transaction maximum', () => {
		expect(clampBuyQuantityToCapacity(50, 20, 10)).toBe(10);
		expect(clampBuyQuantityToCapacity(8, 20, 10)).toBe(8);
	});

	it('returns 0 when no capacity remains', () => {
		expect(clampBuyQuantityToCapacity(5, 0, null)).toBe(0);
	});

	it('rounds fractional quantities to integers', () => {
		expect(clampBuyQuantityToCapacity(7.6, 20, null)).toBe(8);
	});
});
