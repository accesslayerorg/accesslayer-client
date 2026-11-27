import { describe, expect, it } from 'vitest';
import { aggregateRescuedTokens, formatRescuedTokenTotal } from '../rescuedToken.utils';

describe('rescued token totals', () => {
	it('aggregates per-token totals and ignores invalid records', () => {
		const totals = aggregateRescuedTokens([
			{ token: 'USDC', amount: 2, rescuedAt: '2025-01-01' },
			{ token: 'USDC', amount: 3, rescuedAt: '2025-01-02' },
			{ token: 'XLM', amount: 10, rescuedAt: '2025-01-02' },
			{ token: '', amount: 100, rescuedAt: '2025-01-02' },
		]);
		expect(totals).toEqual([
			{ token: 'XLM', total: 10, count: 1 },
			{ token: 'USDC', total: 5, count: 2 },
		]);
		expect(formatRescuedTokenTotal(totals[0])).toBe('10 XLM');
	});
});
