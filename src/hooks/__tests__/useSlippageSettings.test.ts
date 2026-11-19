import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
	useSlippageSettings,
	SLIPPAGE_STORAGE_KEY,
} from '../useSlippageSettings';

describe('useSlippageSettings', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('defaults to 1% when no preference is in localStorage', () => {
		const { result } = renderHook(() => useSlippageSettings());
		expect(result.current.tolerance).toBe(1);
		expect(result.current.slippage).toBe(1);
		expect(result.current[0]).toBe(1);
		expect(result.current.error).toBeNull();
		expect(result.current.isValid).toBe(true);
	});

	it('persists the chosen tolerance in localStorage under al:slippage', () => {
		const { result } = renderHook(() => useSlippageSettings());

		act(() => {
			result.current.setTolerance(3);
		});

		expect(result.current.tolerance).toBe(3);
		expect(result.current.slippageBps).toBe(300);
		expect(localStorage.getItem(SLIPPAGE_STORAGE_KEY)).toBe('3');
	});

	it('persists tolerance across page reloads / remounts', () => {
		localStorage.setItem(SLIPPAGE_STORAGE_KEY, '0.5');

		const { result: firstMount } = renderHook(() => useSlippageSettings());
		expect(firstMount.current.tolerance).toBe(0.5);

		// Change to 2.5%
		act(() => {
			firstMount.current.setTolerance(2.5);
		});
		expect(localStorage.getItem(SLIPPAGE_STORAGE_KEY)).toBe('2.5');

		// Simulate page reload by mounting a new hook instance
		const { result: secondMount } = renderHook(() => useSlippageSettings());
		expect(secondMount.current.tolerance).toBe(2.5);
	});

	it('rejects invalid input (negative, NaN, above 50%) with inline validation and does not save to localStorage', () => {
		const { result } = renderHook(() => useSlippageSettings());

		// Test negative
		act(() => {
			result.current.setTolerance(-1);
		});
		expect(result.current.error).toMatch(/cannot be negative/i);
		expect(result.current.isValid).toBe(false);
		expect(result.current.tolerance).toBe(1); // unchanged
		expect(localStorage.getItem(SLIPPAGE_STORAGE_KEY)).toBeNull();

		// Test above 50%
		act(() => {
			result.current.setTolerance(51);
		});
		expect(result.current.error).toMatch(/cannot exceed 50%/i);
		expect(result.current.isValid).toBe(false);
		expect(result.current.tolerance).toBe(1);

		// Test NaN
		act(() => {
			result.current.setTolerance(NaN);
		});
		expect(result.current.error).toMatch(/valid/i);
		expect(result.current.isValid).toBe(false);
	});

	it('updates when a custom string percentage is passed', () => {
		const { result } = renderHook(() => useSlippageSettings());

		act(() => {
			result.current.setTolerance('2.75');
		});

		expect(result.current.tolerance).toBe(2.75);
		expect(result.current.error).toBeNull();
		expect(localStorage.getItem(SLIPPAGE_STORAGE_KEY)).toBe('2.75');
	});

	it('provides high-tolerance warning for values above 5%', () => {
		const { result } = renderHook(() => useSlippageSettings());

		act(() => {
			result.current.setTolerance(6);
		});

		expect(result.current.tolerance).toBe(6);
		expect(result.current.warning).toMatch(/high slippage/i);
	});
});
