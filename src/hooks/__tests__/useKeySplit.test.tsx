import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useKeySplit, useActiveKeySplits } from '../useKeySplit';
import { keySplitEventService } from '@/services/keySplitEvents.service';
import { clearSplitDismissal } from '@/utils/keySplit.utils';
import type { SplitExecutedEvent } from '@/types/keySplit';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useKeySplit (#1151)', () => {
	beforeEach(() => {
		clearSplitDismissal();
		keySplitEventService.reset();
		vi.clearAllMocks();
	});

	it('returns active status and calculated balances for split within 48h', () => {
		const split: SplitExecutedEvent = {
			keyId: 'alpha',
			ratio: 2,
			executedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		const { result } = renderHook(
			() =>
				useKeySplit({
					keyId: 'alpha',
					initialSplit: split,
					holdingQuantity: 20,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isActive).toBe(true);
		expect(result.current.isDismissed).toBe(false);
		expect(result.current.ratio).toBe(2);
		expect(result.current.ratioDisplay).toBe('2:1');
		expect(result.current.preSplitBalance).toBe(10);
		expect(result.current.postSplitBalance).toBe(20);
	});

	it('returns inactive for split older than 48h', () => {
		const split: SplitExecutedEvent = {
			keyId: 'beta',
			ratio: 2,
			executedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
			preSplitBalance: 5,
			postSplitBalance: 10,
		};

		const { result } = renderHook(
			() =>
				useKeySplit({
					keyId: 'beta',
					initialSplit: split,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isActive).toBe(false);
	});

	it('dismiss() updates isDismissed to true', () => {
		const split: SplitExecutedEvent = {
			keyId: 'gamma',
			ratio: 3,
			executedAt: new Date().toISOString(),
			preSplitBalance: 4,
			postSplitBalance: 12,
		};

		const { result } = renderHook(
			() =>
				useKeySplit({
					keyId: 'gamma',
					initialSplit: split,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isDismissed).toBe(false);

		act(() => {
			result.current.dismiss();
		});

		expect(result.current.isDismissed).toBe(true);
	});

	it('updates immediately on incoming SplitExecuted realtime event', () => {
		const { result } = renderHook(
			() =>
				useKeySplit({
					keyId: 'live-key',
					userAddress: '0xuser123',
					holdingQuantity: 15,
				}),
			{ wrapper: createWrapper() }
		);

		expect(result.current.isActive).toBe(false);

		const incomingEvent: SplitExecutedEvent = {
			keyId: 'live-key',
			ratio: 2,
			executedAt: new Date().toISOString(),
			preSplitBalance: 15,
			postSplitBalance: 30,
		};

		act(() => {
			keySplitEventService.emitSplitExecuted(incomingEvent);
		});

		expect(result.current.isActive).toBe(true);
		expect(result.current.ratio).toBe(2);
		expect(result.current.preSplitBalance).toBe(15);
		expect(result.current.postSplitBalance).toBe(30);
	});
});

describe('useActiveKeySplits (#1151)', () => {
	beforeEach(() => {
		keySplitEventService.reset();
	});

	it('identifies keys that underwent a split within 48h', () => {
		const activeSplit: SplitExecutedEvent = {
			keyId: 'active-key',
			ratio: 2,
			executedAt: new Date(Date.now() - 1000).toISOString(),
		};
		const expiredSplit: SplitExecutedEvent = {
			keyId: 'expired-key',
			ratio: 2,
			executedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
		};

		keySplitEventService.recordSplit(activeSplit);
		keySplitEventService.recordSplit(expiredSplit);

		const { result } = renderHook(() => useActiveKeySplits(), {
			wrapper: createWrapper(),
		});

		expect(result.current.isKeySplitActive('active-key')).toBe(true);
		expect(result.current.isKeySplitActive('expired-key')).toBe(false);
		expect(result.current.isKeySplitActive('unknown-key')).toBe(false);
	});
});
