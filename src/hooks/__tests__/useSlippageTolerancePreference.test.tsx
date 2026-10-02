import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	SLIPPAGE_TOLERANCE_PREFERENCE_KEY,
	useSlippageTolerancePreference,
} from '../useSlippageTolerancePreference';

describe('useSlippageTolerancePreference', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('defaults to 1% and persists an updated preference', () => {
		const { result, unmount } = renderHook(() =>
			useSlippageTolerancePreference()
		);
		expect(result.current[0]).toBe(1);

		act(() => result.current[1](2.5));
		expect(result.current[0]).toBe(2.5);
		expect(
			JSON.parse(
				window.localStorage.getItem(SLIPPAGE_TOLERANCE_PREFERENCE_KEY) ??
					'null'
			)
		).toBe(2.5);
		unmount();

		const restored = renderHook(() => useSlippageTolerancePreference());
		expect(restored.result.current[0]).toBe(2.5);
	});

	it('falls back to 1% for invalid persisted preferences', () => {
		window.localStorage.setItem(
			SLIPPAGE_TOLERANCE_PREFERENCE_KEY,
			JSON.stringify(75)
		);
		const { result } = renderHook(() => useSlippageTolerancePreference());
		expect(result.current[0]).toBe(1);
	});
});
