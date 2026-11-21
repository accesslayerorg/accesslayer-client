/**
 * React Query hook that estimates the Soroban network fee for a buy/sell
 * transaction. Re-estimates are debounced by 400ms when quantity changes.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { estimateNetworkFee, type NetworkFeeEstimate } from '@/services/stellar';
import type { rpc } from '@stellar/stellar-sdk';

export const NETWORK_FEE_DEBOUNCE_MS = 400;

export interface UseNetworkFeeEstimateParams {
	/** Built (unsigned) transaction XDR for the current quantity. Null disables estimation. */
	txXdr: string | null;
	/** Current quantity; changes are debounced before re-estimating. */
	quantity: number;
	/** Soroban RPC server used for simulation. */
	server: rpc.Server | null;
	/** Optional toggle to disable the query. */
	enabled?: boolean;
}

export interface UseNetworkFeeEstimateResult {
	estimate: NetworkFeeEstimate | null;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

/**
 * Returns a network fee estimate for the given transaction XDR. The XDR is
 * debounced by 400ms so that rapid quantity changes produce a single
 * simulation request.
 */
export function useNetworkFeeEstimate(
	params: UseNetworkFeeEstimateParams
): UseNetworkFeeEstimateResult {
	const { txXdr, quantity, server, enabled = true } = params;

	const [debouncedXdr, setDebouncedXdr] = useState<string | null>(txXdr);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedXdr(txXdr);
		}, NETWORK_FEE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [txXdr, quantity]);

	const query = useQuery<NetworkFeeEstimate, Error>({
		queryKey: ['networkFeeEstimate', debouncedXdr],
		queryFn: () => {
			if (!debouncedXdr || !server) {
				throw new Error('Missing transaction or RPC server');
			}
			return estimateNetworkFee(debouncedXdr, { server });
		},
		enabled: enabled && !!debouncedXdr && !!server,
		retry: false,
		staleTime: 30_000,
	});

	return {
		estimate: query.data ?? null,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		error: query.error ?? null,
		refetch: () => {
			void query.refetch();
		},
	};
}
