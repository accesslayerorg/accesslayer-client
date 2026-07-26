import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormatXlm } from '@/hooks/formatting';

describe('useFormatXlm', () => {
	it('defaults to 2 decimal places', () => {
		const { result } = renderHook(() => useFormatXlm(12.5));
		expect(result.current).toBe('12.50');
	});

	it('applies locale-aware thousands separators', () => {
		const { result } = renderHook(() => useFormatXlm(1234567.891));
		expect(result.current).toBe('1,234,567.89');
	});

	it('honours a configurable decimal override', () => {
		const { result } = renderHook(() => useFormatXlm(0.25, 4));
		expect(result.current).toBe('0.2500');
	});

	it('converts a bigint stroop amount to XLM using STROOPS_PER_XLM', () => {
		// 25_000_000 stroops = 2.5 XLM (1 XLM = 10^7 stroops).
		const { result } = renderHook(() => useFormatXlm(25_000_000n));
		expect(result.current).toBe('2.50');
	});

	it('preserves fractional precision for large bigint stroop amounts', () => {
		// 12_345_678_912_345 stroops = 1,234,567.8912345 XLM.
		const { result } = renderHook(() =>
			useFormatXlm(12_345_678_912_345n, 4)
		);
		expect(result.current).toBe('1,234,567.8912');
	});

	it('renders a placeholder for non-finite input', () => {
		const { result } = renderHook(() => useFormatXlm(Number.NaN));
		expect(result.current).toBe('—');
	});
});
