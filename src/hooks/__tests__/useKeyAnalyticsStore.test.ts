import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyAnalyticsStore } from '../useKeyAnalyticsStore';
import { analyticsService } from '@/services/analytics.service';

describe('useKeyAnalyticsStore (#966)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllTimers();
		vi.restoreAllMocks();
		useKeyAnalyticsStore.getState().reset();
	});

	afterEach(() => {
		useKeyAnalyticsStore.getState().stopPolling();
		vi.useRealTimers();
	});

	it('initializes with default state', () => {
		const state = useKeyAnalyticsStore.getState();
		expect(state.data).toBeNull();
		expect(state.currency).toBe('XLM');
		expect(state.isLoading).toBe(false);
		expect(state.isRefreshing).toBe(false);
		expect(state.error).toBeNull();
	});

	it('toggles currency between XLM and USD', () => {
		expect(useKeyAnalyticsStore.getState().currency).toBe('XLM');

		useKeyAnalyticsStore.getState().toggleCurrency();
		expect(useKeyAnalyticsStore.getState().currency).toBe('USD');

		useKeyAnalyticsStore.getState().toggleCurrency();
		expect(useKeyAnalyticsStore.getState().currency).toBe('XLM');
	});

	it('fetches analytics data successfully', async () => {
		const mockData = {
			uniqueTraderCount: 1500,
			totalTradeCount: 6000,
			cumulativeVolumeXlm: 200000,
			cumulativeVolumeUsd: 24000,
			xlmPriceUsd: 0.12,
			lastUpdated: new Date().toISOString(),
		};
		vi.spyOn(analyticsService, 'getKeyAnalytics').mockResolvedValueOnce(mockData);

		const fetchPromise = useKeyAnalyticsStore.getState().fetchAnalytics('creator-1');
		expect(useKeyAnalyticsStore.getState().isLoading).toBe(true);

		await fetchPromise;

		const state = useKeyAnalyticsStore.getState();
		expect(state.isLoading).toBe(false);
		expect(state.data).toEqual(mockData);
		expect(state.error).toBeNull();
	});

	it('polls every 60 seconds without clearing existing data (no layout shift)', async () => {
		const mockData1 = {
			uniqueTraderCount: 100,
			totalTradeCount: 400,
			cumulativeVolumeXlm: 10000,
			cumulativeVolumeUsd: 1200,
			xlmPriceUsd: 0.12,
			lastUpdated: new Date().toISOString(),
		};
		const mockData2 = {
			uniqueTraderCount: 105,
			totalTradeCount: 420,
			cumulativeVolumeXlm: 10500,
			cumulativeVolumeUsd: 1260,
			xlmPriceUsd: 0.12,
			lastUpdated: new Date().toISOString(),
		};

		const spy = vi
			.spyOn(analyticsService, 'getKeyAnalytics')
			.mockResolvedValueOnce(mockData1)
			.mockResolvedValueOnce(mockData2);

		useKeyAnalyticsStore.getState().startPolling('creator-1');
		await Promise.resolve();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(useKeyAnalyticsStore.getState().data?.uniqueTraderCount).toBe(100);

		// Advance 60 seconds for the next poll
		vi.advanceTimersByTime(60_000);
		await Promise.resolve();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(useKeyAnalyticsStore.getState().data?.uniqueTraderCount).toBe(105);
	});
});
