import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type BalanceStatus = 'idle' | 'loading' | 'success' | 'error';

interface BalanceState<TBalance> {
	balance: TBalance | null;
	balanceKey: string | null;
	error: unknown;
	status: BalanceStatus;
}

export interface UseNetworkAwareBalanceOptions<TBalance> {
	/**
	 * Stable identity for the balance being fetched, usually account + chain +
	 * asset. Changing this key immediately hides the previous balance.
	 */
	balanceKey: string | null | undefined;
	enabled?: boolean;
	fetchBalance: () => Promise<TBalance>;
}

export interface UseNetworkAwareBalanceResult<TBalance> {
	balance: TBalance | null;
	error: unknown;
	isError: boolean;
	isLoading: boolean;
	refresh: () => void;
}

export function useNetworkAwareBalance<TBalance>({
	balanceKey,
	enabled = true,
	fetchBalance,
}: UseNetworkAwareBalanceOptions<TBalance>): UseNetworkAwareBalanceResult<TBalance> {
	const requestIdRef = useRef(0);
	const [refreshNonce, setRefreshNonce] = useState(0);
	const [state, setState] = useState<BalanceState<TBalance>>({
		balance: null,
		balanceKey: null,
		error: null,
		status: 'idle',
	});

	const activeBalanceKey = enabled ? (balanceKey ?? null) : null;
	const hasCurrentBalance =
		state.status === 'success' && state.balanceKey === activeBalanceKey;
	const isAwaitingCurrentBalance =
		activeBalanceKey != null &&
		(state.balanceKey !== activeBalanceKey || state.status !== 'success');

	useEffect(() => {
		if (activeBalanceKey == null) {
			requestIdRef.current += 1;
			setState({
				balance: null,
				balanceKey: null,
				error: null,
				status: 'idle',
			});
			return;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		let isActive = true;
		setState({
			balance: null,
			balanceKey: activeBalanceKey,
			error: null,
			status: 'loading',
		});

		fetchBalance()
			.then(balance => {
				if (!isActive || requestIdRef.current !== requestId) return;
				setState({
					balance,
					balanceKey: activeBalanceKey,
					error: null,
					status: 'success',
				});
			})
			.catch(error => {
				if (!isActive || requestIdRef.current !== requestId) return;
				setState({
					balance: null,
					balanceKey: activeBalanceKey,
					error,
					status: 'error',
				});
			});

		return () => {
			isActive = false;
		};
	}, [activeBalanceKey, fetchBalance, refreshNonce]);

	const refresh = useCallback(() => {
		setRefreshNonce(nonce => nonce + 1);
	}, []);

	return useMemo(
		() => ({
			balance: hasCurrentBalance ? state.balance : null,
			error: state.balanceKey === activeBalanceKey ? state.error : null,
			isError:
				state.balanceKey === activeBalanceKey && state.status === 'error',
			isLoading: enabled && isAwaitingCurrentBalance,
			refresh,
		}),
		[
			activeBalanceKey,
			enabled,
			hasCurrentBalance,
			isAwaitingCurrentBalance,
			refresh,
			state.balance,
			state.balanceKey,
			state.error,
			state.status,
		]
	);
}
