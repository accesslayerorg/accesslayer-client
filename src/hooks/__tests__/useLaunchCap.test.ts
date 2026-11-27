import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLaunchCap } from '../useLaunchCap';
import { launchCapService } from '@/services/launchCap.service';
import type { LaunchCapConfig } from '@/types/launchCap';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLaunchCap hook & launchCapService (#1385)', () => {
	const baseNow = 1_700_000_000_000;
	const sampleConfig: LaunchCapConfig = {
		enabled: true,
		windowStart: baseNow,
		windowEnd: baseNow + 3_600_000, // 1 hour window
		creatorAddress: 'GC_CREATOR_123',
		allowlist: ['GC_ALLOWLIST_456', 'GC_VIP_789'],
		steps: [
			{ timestamp: baseNow, cap: 5, label: 'Initial tier' },
			{ timestamp: baseNow + 1_200_000, cap: 15, label: 'Tier 2' },
			{ timestamp: baseNow + 2_400_000, cap: 50, label: 'Tier 3' },
		],
	};

	beforeEach(() => {
		launchCapService.reset();
	});

	it('returns hasCap = false when no config exists', () => {
		const { result } = renderHook(
			() => useLaunchCap('key-unknown', 'GC_USER_1'),
			{ wrapper: createWrapper() }
		);

		expect(result.current.hasCap).toBe(false);
		expect(result.current.currentCap).toBeNull();
		expect(result.current.remainingAllowance).toBe(Infinity);
		expect(result.current.isWindowEnded).toBe(false);
	});

	it('reads current cap, purchased amount, and window end correctly', () => {
		const { result } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 100_000,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.hasCap).toBe(true);
		expect(result.current.currentCap).toBe(5);
		expect(result.current.purchasedAmount).toBe(0);
		expect(result.current.remainingAllowance).toBe(5);
		expect(result.current.windowEnd).toBe(sampleConfig.windowEnd);
		expect(result.current.nextIncrease).toEqual({
			timestamp: baseNow + 1_200_000,
			cap: 15,
		});
		expect(result.current.isExempt).toBe(false);
		expect(result.current.isWindowEnded).toBe(false);
	});

	it('tracks cumulative purchases and decreases remaining allowance accordingly', () => {
		const { result } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 100_000,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.remainingAllowance).toBe(5);

		act(() => {
			result.current.recordPurchase(2);
		});

		expect(result.current.purchasedAmount).toBe(2);
		expect(result.current.remainingAllowance).toBe(3);

		act(() => {
			result.current.recordPurchase(3);
		});

		expect(result.current.purchasedAmount).toBe(5);
		expect(result.current.remainingAllowance).toBe(0);
	});

	it('ramps cap upward across schedule tiers as time advances', () => {
		// Tier 1: now at baseNow
		const { result: r1 } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 500_000,
				}),
			{ wrapper: createWrapper() }
		);
		expect(r1.current.currentCap).toBe(5);
		expect(r1.current.nextIncrease?.cap).toBe(15);

		// Advance to Tier 2 (baseNow + 1_500_000)
		const { result: r2 } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 1_500_000,
				}),
			{ wrapper: createWrapper() }
		);
		expect(r2.current.currentCap).toBe(15);
		expect(r2.current.nextIncrease?.cap).toBe(50);

		// Advance to Tier 3 (baseNow + 2_500_000) - final tier
		const { result: r3 } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 2_500_000,
				}),
			{ wrapper: createWrapper() }
		);
		expect(r3.current.currentCap).toBe(50);
		expect(r3.current.nextIncrease).toBeNull();
	});

	it('exempts creator wallet with no limit and exempt reason', () => {
		const { result } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_CREATOR_123', {
					config: sampleConfig,
					nowMs: baseNow + 100_000,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isExempt).toBe(true);
		expect(result.current.exemptionReason).toBe('creator');
		expect(result.current.remainingAllowance).toBe(Infinity);
	});

	it('exempts allowlisted wallet (case-insensitive) with no limit and exempt reason', () => {
		const { result } = renderHook(
			() =>
				useLaunchCap('key-1', 'gc_allowlist_456', {
					config: sampleConfig,
					nowMs: baseNow + 100_000,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isExempt).toBe(true);
		expect(result.current.exemptionReason).toBe('allowlist');
		expect(result.current.remainingAllowance).toBe(Infinity);
	});

	it('marks window as ended and removes limits when time reaches windowEnd', () => {
		const { result } = renderHook(
			() =>
				useLaunchCap('key-1', 'GC_USER_1', {
					config: sampleConfig,
					nowMs: baseNow + 4_000_000, // past windowEnd
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isWindowEnded).toBe(true);
		expect(result.current.remainingAllowance).toBe(Infinity);
	});
});
