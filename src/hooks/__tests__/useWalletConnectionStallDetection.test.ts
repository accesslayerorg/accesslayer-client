import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	WALLET_CONNECTION_STALL_TIMEOUT_MS,
	useWalletConnectionStallDetection,
} from '@/hooks/useWalletConnectionStallDetection';

describe('useWalletConnectionStallDetection', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports a stalled wallet connection after the named timeout elapses', () => {
		const { result } = renderHook(() =>
			useWalletConnectionStallDetection({
				isAwaitingWalletResponse: true,
			})
		);

		expect(result.current).toBe(false);

		act(() => {
			vi.advanceTimersByTime(WALLET_CONNECTION_STALL_TIMEOUT_MS - 1);
		});

		expect(result.current).toBe(false);

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(result.current).toBe(true);
	});

	it('does not report a stall when the connection succeeds before the timeout', () => {
		const { result, rerender } = renderHook(
			({ hasWalletResponse, isAwaitingWalletResponse }) =>
				useWalletConnectionStallDetection({
					hasWalletResponse,
					isAwaitingWalletResponse,
				}),
			{
				initialProps: {
					hasWalletResponse: false,
					isAwaitingWalletResponse: true,
				},
			}
		);

		act(() => {
			vi.advanceTimersByTime(WALLET_CONNECTION_STALL_TIMEOUT_MS / 2);
		});

		rerender({ hasWalletResponse: true, isAwaitingWalletResponse: false });

		act(() => {
			vi.advanceTimersByTime(WALLET_CONNECTION_STALL_TIMEOUT_MS);
		});

		expect(result.current).toBe(false);
	});

	it('does not report a stall when the connection fails before the timeout', () => {
		const { result, rerender } = renderHook(
			({ hasWalletResponse, isAwaitingWalletResponse }) =>
				useWalletConnectionStallDetection({
					hasWalletResponse,
					isAwaitingWalletResponse,
				}),
			{
				initialProps: {
					hasWalletResponse: false,
					isAwaitingWalletResponse: true,
				},
			}
		);

		rerender({ hasWalletResponse: true, isAwaitingWalletResponse: true });

		act(() => {
			vi.advanceTimersByTime(WALLET_CONNECTION_STALL_TIMEOUT_MS);
		});

		expect(result.current).toBe(false);
	});
});
