import { describe, it, expect, beforeEach } from 'vitest';
import {
	useHoldingCapStore,
	capUsedFraction,
	isApproachingCap,
	isAtHoldingCap,
	remainingCapacity,
	type HoldingCapData,
} from '../useHoldingCapStore';

describe('useHoldingCapStore (#961)', () => {
	beforeEach(() => {
		useHoldingCapStore.setState({ caps: {} });
	});

	it('initializes with empty caps record', () => {
		expect(useHoldingCapStore.getState().caps).toEqual({});
	});

	it('fetches holding cap data and populates store', async () => {
		const creatorId = 'creator-alice';
		const wallet = '0x1234567890123456789012345678901234567890';

		const fetchPromise = useHoldingCapStore.getState().fetchCap(creatorId, wallet);
		expect(useHoldingCapStore.getState().caps[creatorId]?.isLoading).toBe(true);

		await fetchPromise;

		const cap = useHoldingCapStore.getState().caps[creatorId];
		expect(cap).toBeDefined();
		expect(cap.isLoading).toBe(false);
		expect(cap.maxCap).toBeGreaterThan(0);
		expect(typeof cap.currentHolding).toBe('number');
	});

	it('increments holding after a successful buy', () => {
		const creatorId = 'creator-test';
		useHoldingCapStore.setState({
			caps: {
				[creatorId]: {
					creatorId,
					currentHolding: 10,
					maxCap: 50,
					isLoading: false,
					error: null,
				},
			},
		});

		useHoldingCapStore.getState().incrementHolding(creatorId, 5);
		expect(useHoldingCapStore.getState().caps[creatorId].currentHolding).toBe(15);

		// Clamps at maxCap
		useHoldingCapStore.getState().incrementHolding(creatorId, 100);
		expect(useHoldingCapStore.getState().caps[creatorId].currentHolding).toBe(50);
	});

	describe('Holding cap helper selectors', () => {
		it('calculates capUsedFraction accurately', () => {
			const data: HoldingCapData = {
				creatorId: 'c1',
				currentHolding: 25,
				maxCap: 50,
				isLoading: false,
				error: null,
			};
			expect(capUsedFraction(data)).toBe(0.5);

			// Edge case: maxCap 0
			expect(capUsedFraction({ ...data, maxCap: 0 })).toBe(0);

			// Over cap clamp
			expect(capUsedFraction({ ...data, currentHolding: 60 })).toBe(1);
		});

		it('detects approaching cap when >= 80% and < 100%', () => {
			const data: HoldingCapData = {
				creatorId: 'c1',
				currentHolding: 39,
				maxCap: 50,
				isLoading: false,
				error: null,
			};
			// 39 / 50 = 78% -> not approaching
			expect(isApproachingCap(data)).toBe(false);

			// 40 / 50 = 80% -> approaching
			expect(isApproachingCap({ ...data, currentHolding: 40 })).toBe(true);

			// 49 / 50 = 98% -> approaching
			expect(isApproachingCap({ ...data, currentHolding: 49 })).toBe(true);

			// 50 / 50 = 100% -> at cap, not approaching
			expect(isApproachingCap({ ...data, currentHolding: 50 })).toBe(false);
		});

		it('detects at cap when currentHolding >= maxCap', () => {
			const data: HoldingCapData = {
				creatorId: 'c1',
				currentHolding: 49,
				maxCap: 50,
				isLoading: false,
				error: null,
			};
			expect(isAtHoldingCap(data)).toBe(false);
			expect(isAtHoldingCap({ ...data, currentHolding: 50 })).toBe(true);
			expect(isAtHoldingCap({ ...data, currentHolding: 55 })).toBe(true);
		});

		it('calculates remainingCapacity accurately', () => {
			const data: HoldingCapData = {
				creatorId: 'c1',
				currentHolding: 35,
				maxCap: 50,
				isLoading: false,
				error: null,
			};
			expect(remainingCapacity(data)).toBe(15);
			expect(remainingCapacity({ ...data, currentHolding: 50 })).toBe(0);
			expect(remainingCapacity({ ...data, currentHolding: 60 })).toBe(0);
		});
	});
});
