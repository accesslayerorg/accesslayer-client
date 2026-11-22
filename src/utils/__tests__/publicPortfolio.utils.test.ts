import { describe, expect, it } from 'vitest';
import {
	applyPortfolioVisibility,
	DEFAULT_PUBLIC_PORTFOLIO_SETTINGS,
	toValueRange,
	validateHandle,
	type PublicPortfolio,
} from '@/utils/publicPortfolio.utils';

const portfolio: PublicPortfolio = {
	handle: 'alice',
	holdings: [{ keyId: 'k1', keyName: 'Alpha Key', valueXlm: 2_500 }],
	keyCount: 4,
	pnlPercent: 12.5,
	joinedAt: '2026-01-02T00:00:00Z',
};
const allOn = { ...DEFAULT_PUBLIC_PORTFOLIO_SETTINGS, enabled: true, showHoldings: true, showKeyCount: true, showPnl: true, showJoinDate: true };

describe('validateHandle', () => {
	it('accepts a well-formed, free handle after normalizing', () => {
		expect(validateHandle('  Alice_01 ')).toBeNull();
	});
	it.each(['ab', 'a'.repeat(21), '_alice', 'alice_', 'al-ice', 'al ice'])('rejects bad format %s', (h) => {
		expect(validateHandle(h)).toBe('format');
	});
	it('rejects reserved handles regardless of case', () => {
		expect(validateHandle('Admin')).toBe('reserved');
		expect(validateHandle('settings')).toBe('reserved');
	});
	it('rejects taken handles', () => {
		expect(validateHandle('alice', true)).toBe('taken');
	});
});

describe('toValueRange', () => {
	it.each([
		[5, '<10 XLM'],
		[10, '10–100 XLM'],
		[2_500, '1K–10K XLM'],
		[250_000, '100K+ XLM'],
	])('%d → %s', (value, label) => expect(toValueRange(value)).toBe(label));
});

describe('applyPortfolioVisibility', () => {
	it('hides the page entirely when the master toggle is off', () => {
		expect(applyPortfolioVisibility(portfolio, { ...allOn, enabled: false })).toBeNull();
	});
	it('includes only the fields that are switched on', () => {
		const view = applyPortfolioVisibility(portfolio, { ...DEFAULT_PUBLIC_PORTFOLIO_SETTINGS, enabled: true, showPnl: true });
		expect(view).toEqual({ handle: 'alice', pnlPercent: 12.5 });
	});
	it('replaces exact values with ranges when ranges are on', () => {
		const view = applyPortfolioVisibility(portfolio, allOn);
		expect(view?.holdings).toEqual([{ keyId: 'k1', keyName: 'Alpha Key', valueRange: '1K–10K XLM' }]);
		expect(JSON.stringify(view)).not.toContain('2500');
	});
	it('shows exact values only when ranges are off', () => {
		const view = applyPortfolioVisibility(portfolio, { ...allOn, useRanges: false });
		expect(view?.holdings?.[0].valueXlm).toBe(2_500);
	});
});
