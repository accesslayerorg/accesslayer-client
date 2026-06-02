import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useNetworkAwareBalance } from '@/hooks/useNetworkAwareBalance';

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(promiseResolve => {
		resolve = promiseResolve;
	});

	return { promise, resolve };
}

describe('useNetworkAwareBalance', () => {
	it('enters loading immediately during a network switch and clears it after the new balance loads', async () => {
		const firstBalance = createDeferred<number>();
		const secondBalance = createDeferred<number>();
		const fetchFirstBalance = vi.fn(() => firstBalance.promise);
		const fetchSecondBalance = vi.fn(() => secondBalance.promise);

		const { result, rerender } = renderHook(
			({
				balanceKey,
				fetchBalance,
			}: {
				balanceKey: string;
				fetchBalance: () => Promise<number>;
			}) =>
				useNetworkAwareBalance({
					balanceKey,
					fetchBalance,
				}),
			{
				initialProps: {
					balanceKey: 'wallet:1',
					fetchBalance: fetchFirstBalance,
				},
			}
		);

		expect(result.current.isLoading).toBe(true);

		await act(async () => {
			firstBalance.resolve(10);
			await firstBalance.promise;
		});

		await waitFor(() => expect(result.current.balance).toBe(10));
		expect(result.current.isLoading).toBe(false);

		rerender({
			balanceKey: 'wallet:2',
			fetchBalance: fetchSecondBalance,
		});

		expect(result.current.balance).toBeNull();
		expect(result.current.isLoading).toBe(true);

		await act(async () => {
			secondBalance.resolve(25);
			await secondBalance.promise;
		});

		await waitFor(() => expect(result.current.balance).toBe(25));
		expect(result.current.isLoading).toBe(false);
	});

	it('does not expose a stale balance when an older request resolves after a network switch', async () => {
		const staleBalance = createDeferred<number>();
		const currentBalance = createDeferred<number>();
		const fetchStaleBalance = vi.fn(() => staleBalance.promise);
		const fetchCurrentBalance = vi.fn(() => currentBalance.promise);

		const { result, rerender } = renderHook(
			({
				balanceKey,
				fetchBalance,
			}: {
				balanceKey: string;
				fetchBalance: () => Promise<number>;
			}) =>
				useNetworkAwareBalance({
					balanceKey,
					fetchBalance,
				}),
			{
				initialProps: {
					balanceKey: 'wallet:1',
					fetchBalance: fetchStaleBalance,
				},
			}
		);

		rerender({
			balanceKey: 'wallet:2',
			fetchBalance: fetchCurrentBalance,
		});

		await act(async () => {
			staleBalance.resolve(10);
			await staleBalance.promise;
		});

		expect(result.current.balance).toBeNull();
		expect(result.current.isLoading).toBe(true);

		await act(async () => {
			currentBalance.resolve(30);
			await currentBalance.promise;
		});

		await waitFor(() => expect(result.current.balance).toBe(30));
		expect(result.current.isLoading).toBe(false);
	});
});
