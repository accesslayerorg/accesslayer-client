import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MAX_RETRIES,
	RETRY_INTERVAL_MS,
	WAITING_THRESHOLD_MS,
	useWalletReconnect,
} from '@/hooks/useWalletReconnect';

function makeOptions(overrides: Partial<Parameters<typeof useWalletReconnect>[0]> = {}) {
	return {
		isPending: false,
		isConnected: false,
		hasError: false,
		onRetry: vi.fn(),
		...overrides,
	};
}

describe('useWalletReconnect', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('showWaiting', () => {
		it('is false before the waiting threshold elapses', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS - 1);
			});

			expect(result.current.showWaiting).toBe(false);
		});

		it('becomes true exactly at the waiting threshold', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			expect(result.current.showWaiting).toBe(true);
		});

		it('uses a custom waitingThresholdMs when provided', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, waitingThresholdMs: 500 }))
			);

			act(() => {
				vi.advanceTimersByTime(499);
			});
			expect(result.current.showWaiting).toBe(false);

			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current.showWaiting).toBe(true);
		});

		it('does not show waiting when not pending', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: false }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS * 2);
			});

			expect(result.current.showWaiting).toBe(false);
		});

		it('resets showWaiting when the connection succeeds before the threshold', () => {
			const { result, rerender } = renderHook(
				(props: Parameters<typeof useWalletReconnect>[0]) =>
					useWalletReconnect(props),
				{ initialProps: makeOptions({ isPending: true }) }
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS / 2);
			});

			rerender(makeOptions({ isPending: false, isConnected: true }));

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			expect(result.current.showWaiting).toBe(false);
		});
	});

	describe('retry behaviour', () => {
		it('calls onRetry after waitingThreshold + retryInterval', () => {
			const onRetry = vi.fn();
			renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS);
			});

			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it('calls onRetry again after each retry interval', () => {
			const onRetry = vi.fn();
			renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS * 2);
			});

			expect(onRetry).toHaveBeenCalledTimes(2);
		});

		it('uses a custom retryIntervalMs when provided', () => {
			const onRetry = vi.fn();
			renderHook(() =>
				useWalletReconnect(
					makeOptions({ isPending: true, onRetry, waitingThresholdMs: 100, retryIntervalMs: 500 })
				)
			);

			act(() => {
				vi.advanceTimersByTime(599);
			});
			expect(onRetry).toHaveBeenCalledTimes(0);

			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it('does not retry when connection succeeds before retry fires', () => {
			const onRetry = vi.fn();
			const { rerender } = renderHook(
				(props: Parameters<typeof useWalletReconnect>[0]) =>
					useWalletReconnect(props),
				{ initialProps: makeOptions({ isPending: true, onRetry }) }
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			rerender(makeOptions({ isPending: false, isConnected: true, onRetry }));

			act(() => {
				vi.advanceTimersByTime(RETRY_INTERVAL_MS);
			});

			expect(onRetry).not.toHaveBeenCalled();
		});
	});

	describe('failed state after max retries', () => {
		it('shows the failed state after MAX_RETRIES retries', () => {
			const onRetry = vi.fn();
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(
					WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS * (MAX_RETRIES + 1)
				);
			});

			expect(result.current.showFailed).toBe(true);
			expect(result.current.showWaiting).toBe(false);
		});

		it('calls onRetry exactly MAX_RETRIES times before giving up', () => {
			const onRetry = vi.fn();
			renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(
					WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS * (MAX_RETRIES + 1)
				);
			});

			expect(onRetry).toHaveBeenCalledTimes(MAX_RETRIES);
		});

		it('does not call onRetry again after the failed state is set', () => {
			const onRetry = vi.fn();
			renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(
					WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS * (MAX_RETRIES + 5)
				);
			});

			expect(onRetry).toHaveBeenCalledTimes(MAX_RETRIES);
		});

		it('uses a custom maxRetries when provided', () => {
			const onRetry = vi.fn();
			const { result } = renderHook(() =>
				useWalletReconnect(
					makeOptions({ isPending: true, onRetry, waitingThresholdMs: 100, retryIntervalMs: 200, maxRetries: 1 })
				)
			);

			act(() => {
				vi.advanceTimersByTime(100 + 200 * 2);
			});

			expect(onRetry).toHaveBeenCalledTimes(1);
			expect(result.current.showFailed).toBe(true);
		});
	});

	describe('cancelAndReset', () => {
		it('clears showWaiting immediately', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});
			expect(result.current.showWaiting).toBe(true);

			act(() => {
				result.current.cancelAndReset();
			});

			expect(result.current.showWaiting).toBe(false);
		});

		it('stops the retry timer so onRetry is never called after cancel', () => {
			const onRetry = vi.fn();
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			act(() => {
				result.current.cancelAndReset();
			});

			act(() => {
				vi.advanceTimersByTime(RETRY_INTERVAL_MS * 10);
			});

			expect(onRetry).not.toHaveBeenCalled();
		});

		it('clears showFailed immediately', () => {
			const onRetry = vi.fn();
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true, onRetry }))
			);

			act(() => {
				vi.advanceTimersByTime(
					WAITING_THRESHOLD_MS + RETRY_INTERVAL_MS * (MAX_RETRIES + 1)
				);
			});
			expect(result.current.showFailed).toBe(true);

			act(() => {
				result.current.cancelAndReset();
			});

			expect(result.current.showFailed).toBe(false);
		});

		it('stops the waiting timer so showWaiting never fires after cancel', () => {
			const { result } = renderHook(() =>
				useWalletReconnect(makeOptions({ isPending: true }))
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS / 2);
			});

			act(() => {
				result.current.cancelAndReset();
			});

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			expect(result.current.showWaiting).toBe(false);
		});
	});

	describe('error handling', () => {
		it('clears showWaiting when an error occurs', () => {
			const { result, rerender } = renderHook(
				(props: Parameters<typeof useWalletReconnect>[0]) =>
					useWalletReconnect(props),
				{ initialProps: makeOptions({ isPending: true }) }
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});
			expect(result.current.showWaiting).toBe(true);

			rerender(makeOptions({ isPending: false, hasError: true }));

			expect(result.current.showWaiting).toBe(false);
		});

		it('stops the retry timer on error so onRetry is never called', () => {
			const onRetry = vi.fn();
			const { rerender } = renderHook(
				(props: Parameters<typeof useWalletReconnect>[0]) =>
					useWalletReconnect(props),
				{ initialProps: makeOptions({ isPending: true, onRetry }) }
			);

			act(() => {
				vi.advanceTimersByTime(WAITING_THRESHOLD_MS);
			});

			rerender(makeOptions({ isPending: false, hasError: true, onRetry }));

			act(() => {
				vi.advanceTimersByTime(RETRY_INTERVAL_MS * 5);
			});

			expect(onRetry).not.toHaveBeenCalled();
		});
	});
});
