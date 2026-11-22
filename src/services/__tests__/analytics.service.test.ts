import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService, AnalyticsService } from '../analytics.service';

describe('AnalyticsService (#966)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns mock key analytics when API fails or in local dev', async () => {
		const data = await analyticsService.getKeyAnalytics('creator-1');
		expect(data).toBeDefined();
		expect(data.uniqueTraderCount).toBeGreaterThan(0);
		expect(data.totalTradeCount).toBeGreaterThanOrEqual(data.uniqueTraderCount);
		expect(data.cumulativeVolumeXlm).toBeGreaterThan(0);
		expect(data.cumulativeVolumeUsd).toBeGreaterThan(0);
		expect(data.lastUpdated).toBeDefined();
	});

	it('generates consistent deterministic metrics for a given creator', () => {
		const service = new AnalyticsService();
		const result1 = service.getMockKeyAnalytics('alex-rivers');
		const result2 = service.getMockKeyAnalytics('alex-rivers');

		expect(result1.uniqueTraderCount).toBe(result2.uniqueTraderCount);
		expect(result1.cumulativeVolumeXlm).toBe(result2.cumulativeVolumeXlm);
	});
});
