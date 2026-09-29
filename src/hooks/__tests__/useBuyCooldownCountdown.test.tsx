import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBuyCooldownCountdown } from '@/hooks/useBuyCooldownCountdown';

const NOW_SEC = 1_700_000_000;

describe('useBuyCooldownCountdown (#915)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW_SEC * 1000);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('is inactive with no cooldown data and starts no timer', () => {
		const { result } = renderHook(() => useBuyCooldownCountdown(null));

		expect(result.current.isActive).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('is inactive when the cooldown has already expired and starts no timer', () => {
		const { result } = renderHook(() =>
			useBuyCooldownCountdown(NOW_SEC - 10)
		);

		expect(result.current.isActive).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('reports the remaining time formatted for display', () => {
		const { result } = renderHook(() => useBuyCooldownCountdown(NOW_SEC + 272));

		expect(result.current.isActive).toBe(true);
		expect(result.current.remainingSeconds).toBe(272);
		expect(result.current.formattedRemaining).toBe('4m 32s');
	});

	it('accepts a millisecond epoch expiry', () => {
		const { result } = renderHook(() =>
			useBuyCooldownCountdown((NOW_SEC + 65) * 1000)
		);

		expect(result.current.remainingSeconds).toBe(65);
		expect(result.current.formattedRemaining).toBe('1m 05s');
	});

	it('deactivates on the tick that crosses zero so the buy action re-enables', () => {
		const { result } = renderHook(() => useBuyCooldownCountdown(NOW_SEC + 2));

		expect(result.current.isActive).toBe(true);
		expect(result.current.formattedRemaining).toBe('2s');

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current.isActive).toBe(true);
		expect(result.current.formattedRemaining).toBe('1s');

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current.isActive).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
	});

	it('calls onExpire exactly once and stops ticking', () => {
		const onExpire = vi.fn();
		renderHook(() => useBuyCooldownCountdown(NOW_SEC + 1, onExpire));

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('does not call onExpire when the cooldown is already over on mount', () => {
		const onExpire = vi.fn();
		renderHook(() => useBuyCooldownCountdown(NOW_SEC - 1, onExpire));

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(onExpire).not.toHaveBeenCalled();
	});

	it('does not restart the interval when an inline onExpire callback changes identity', () => {
		renderHook(() => useBuyCooldownCountdown(NOW_SEC + 10, () => {}));

		const timerCountAfterMount = vi.getTimerCount();
		act(() => {
			vi.advanceTimersByTime(3000);
		});

		expect(vi.getTimerCount()).toBe(timerCountAfterMount);
	});

	it('recomputes against a new expiry when the cooldown value changes', () => {
		const { result, rerender } = renderHook(
			({ nextBuyAllowedAt }: { nextBuyAllowedAt: number | null }) =>
				useBuyCooldownCountdown(nextBuyAllowedAt),
			{ wrapper: undefined, initialProps: { nextBuyAllowedAt: NOW_SEC + 10 } }
		);

		expect(result.current.remainingSeconds).toBe(10);

		rerender({ nextBuyAllowedAt: NOW_SEC + 120 });

		expect(result.current.remainingSeconds).toBe(120);
		expect(result.current.formattedRemaining).toBe('2m 00s');

		rerender({ nextBuyAllowedAt: null });

		expect(result.current.isActive).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});
});
