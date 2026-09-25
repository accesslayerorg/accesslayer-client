import { describe, it, expect } from 'vitest';
import {
	formatNumber,
	formatCompactNumber,
	formatFollowerCount,
	formatHolderCount,
	formatPercent,
	bpsToPercent,
} from '../numberFormat.utils';

// ---------------------------------------------------------------------------
// Feature: Compact number formatting for supply values
// Validates: Acceptance Criteria 1, 2, 3
// ---------------------------------------------------------------------------
describe('formatCompactNumber: Supply Value Formatting', () => {
	describe('Large supply values are abbreviated', () => {
		it('formats 1,200 as "1.2K"', () => {
			expect(formatCompactNumber(1200)).toBe('1.2K');
		});

		it('formats 4,500 as "4.5K"', () => {
			expect(formatCompactNumber(4500)).toBe('4.5K');
		});

		it('formats 1,000,000 as "1M"', () => {
			expect(formatCompactNumber(1000000)).toBe('1M');
		});

		it('formats 4,500,000 as "4.5M"', () => {
			expect(formatCompactNumber(4500000)).toBe('4.5M');
		});

		it('formats 1,200,000,000 as "1.2B"', () => {
			expect(formatCompactNumber(1200000000)).toBe('1.2B');
		});
	});

	describe('Small supply values display as-is', () => {
		it('formats 0 as "0"', () => {
			expect(formatCompactNumber(0)).toBe('0');
		});

		it('formats 1 as "1"', () => {
			expect(formatCompactNumber(1)).toBe('1');
		});

		it('formats 999 as "999"', () => {
			expect(formatCompactNumber(999)).toBe('999');
		});

		it('formats 500 as "500"', () => {
			expect(formatCompactNumber(500)).toBe('500');
		});
	});

	describe('Edge cases and missing data', () => {
		it('returns "—" for null', () => {
			expect(formatCompactNumber(null)).toBe('—');
		});

		it('returns "—" for undefined', () => {
			expect(formatCompactNumber(undefined)).toBe('—');
		});

		it('returns "—" for NaN', () => {
			expect(formatCompactNumber(NaN)).toBe('—');
		});

		it('returns "—" for Infinity', () => {
			expect(formatCompactNumber(Infinity)).toBe('—');
		});

		it('returns "—" for negative Infinity', () => {
			expect(formatCompactNumber(-Infinity)).toBe('—');
		});
	});
});

// ---------------------------------------------------------------------------
// Feature: Full number formatting with tooltip values
// Validates: Acceptance Criteria 2 (full value accessible via tooltip)
// ---------------------------------------------------------------------------
describe('formatNumber: Full Value Display for Tooltips', () => {
	it('formats 1,200 as "1,200" in full style', () => {
		expect(formatNumber(1200, { style: 'full' })).toBe('1,200');
	});

	it('formats 4,500,000 as "4,500,000" in full style', () => {
		expect(formatNumber(4500000, { style: 'full' })).toBe('4,500,000');
	});

	it('default style is full, returns "1,200"', () => {
		expect(formatNumber(1200)).toBe('1,200');
	});

	it('returns "—" for null', () => {
		expect(formatNumber(null)).toBe('—');
	});

	it('returns "—" for undefined', () => {
		expect(formatNumber(undefined)).toBe('—');
	});

	it('handles negative numbers: -1200 → "-1,200"', () => {
		expect(formatNumber(-1200)).toBe('-1,200');
	});
});

// ---------------------------------------------------------------------------
// Feature: Configurable fraction digits
// Validates: Precision control for different use cases
// ---------------------------------------------------------------------------
describe('formatCompactNumber: Configurable precision', () => {
	it('respects maximumFractionDigits option', () => {
		expect(formatCompactNumber(1234, { maximumFractionDigits: 0 })).toBe(
			'1K'
		);
		expect(formatCompactNumber(1234, { maximumFractionDigits: 2 })).toBe(
			'1.23K'
		);
	});

	it('respects minimumFractionDigits option', () => {
		expect(formatCompactNumber(1000000, { minimumFractionDigits: 2 })).toBe(
			'1.00M'
		);
	});
});

// ---------------------------------------------------------------------------
// Feature: Follower count formatting (legacy helper)
// Validates: Backward compatibility
// ---------------------------------------------------------------------------
describe('formatFollowerCount: Legacy follower abbreviation', () => {
	it('formats 1,200 as "1.2K"', () => {
		expect(formatFollowerCount(1200)).toBe('1.2K');
	});

	it('formats 1,000,000 as "1M"', () => {
		expect(formatFollowerCount(1000000)).toBe('1M');
	});

	it('formats 999 as "999"', () => {
		expect(formatFollowerCount(999)).toBe('999');
	});

	it('formats 0 as "0"', () => {
		expect(formatFollowerCount(0)).toBe('0');
	});

	it('removes ".0" suffix: 1,000 → "1K" not "1.0K"', () => {
		expect(formatFollowerCount(1000)).toBe('1K');
	});
});

// ---------------------------------------------------------------------------
// Feature: Holder count formatting
// Validates: Issue #438 acceptance criteria
// ---------------------------------------------------------------------------
describe('formatHolderCount: Holder count abbreviation', () => {
	it('returns values under 1000 as a plain string', () => {
		expect(formatHolderCount(0)).toBe('0');
		expect(formatHolderCount(42)).toBe('42');
		expect(formatHolderCount(999)).toBe('999');
	});

	it('formats values in the K range with one decimal place', () => {
		expect(formatHolderCount(1200)).toBe('1.2K');
		expect(formatHolderCount(1500)).toBe('1.5K');
		expect(formatHolderCount(999_999)).toBe('1000K');
	});

	it('formats values in the M range with one decimal place', () => {
		expect(formatHolderCount(2_400_000)).toBe('2.4M');
		expect(formatHolderCount(1_250_000)).toBe('1.3M');
	});

	it('handles boundary values at 1000 and 1000000', () => {
		expect(formatHolderCount(1000)).toBe('1K');
		expect(formatHolderCount(1_000_000)).toBe('1M');
	});
});

// ---------------------------------------------------------------------------
// Feature: Percentage formatting
// Validates: Acceptance Criteria for badge display
// ---------------------------------------------------------------------------
describe('formatPercent: Percentage badge formatting', () => {
	it('formats 12.5 as "12.5%"', () => {
		expect(formatPercent(12.5)).toBe('12.5%');
	});

	it('formats positive value with sign option: +12.5%', () => {
		expect(formatPercent(12.5, { signed: true })).toBe('+12.5%');
	});

	it('formats negative value with sign option: -12.5%', () => {
		expect(formatPercent(-12.5, { signed: true })).toBe('-12.5%');
	});

	it('returns "—" for null', () => {
		expect(formatPercent(null)).toBe('—');
	});

	it('returns "—" for undefined', () => {
		expect(formatPercent(undefined)).toBe('—');
	});

	it('returns custom placeholder when provided', () => {
		expect(formatPercent(null, { emptyPlaceholder: 'N/A' })).toBe('N/A');
	});

	it('respects precision options', () => {
		expect(formatPercent(12.567, { maximumFractionDigits: 1 })).toBe('12.6%');
	});
});

// ---------------------------------------------------------------------------
// Integration: Verify compact display + full tooltip pattern
// Validates: Complete acceptance criteria
// ---------------------------------------------------------------------------
describe('Integration: Compact display with full tooltip pattern', () => {
	it('compact format (1.2K) + full format (1,200) enables tooltip workflow', () => {
		const supply = 1200;
		const displayValue = formatCompactNumber(supply);
		const tooltipValue = formatNumber(supply);

		expect(displayValue).toBe('1.2K');
		expect(tooltipValue).toBe('1,200');
		// Both are present and different — enables title attribute pattern
		expect(displayValue).not.toBe(tooltipValue);
	});

	it('large supply (4.5M compact, 4,500,000 full)', () => {
		const supply = 4500000;
		const displayValue = formatCompactNumber(supply);
		const tooltipValue = formatNumber(supply);

		expect(displayValue).toBe('4.5M');
		expect(tooltipValue).toBe('4,500,000');
	});

	it('small supply stays the same for both (reduces noise)', () => {
		const supply = 42;
		const displayValue = formatCompactNumber(supply);
		const tooltipValue = formatNumber(supply);

		expect(displayValue).toBe('42');
		expect(tooltipValue).toBe('42');
	});
});

// ---------------------------------------------------------------------------
// Feature: Bps to Percent formatting
// ---------------------------------------------------------------------------
describe('bpsToPercent: Basis points to percentage formatting', () => {
	it('converts 500 bps to "5%"', () => {
		expect(bpsToPercent(500)).toBe('5%');
	});

	it('converts 250 bps to "2.5%"', () => {
		expect(bpsToPercent(250)).toBe('2.5%');
	});

	it('converts 0 bps to "0%"', () => {
		expect(bpsToPercent(0)).toBe('0%');
	});

	it('returns placeholder "—" for null or undefined', () => {
		expect(bpsToPercent(null)).toBe('—');
		expect(bpsToPercent(undefined)).toBe('—');
	});

	it('returns custom placeholder when provided', () => {
		expect(bpsToPercent(null, { emptyPlaceholder: 'N/A' })).toBe('N/A');
	});
});
