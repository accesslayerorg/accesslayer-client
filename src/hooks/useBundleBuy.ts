import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';
import {
	buildBundleBuyPayload,
	type BundleBuyPayload,
} from '@/utils/bundleCart.utils';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Bundle buy submission (#1118).
 *
 * Submits every queued cart item as one atomic `bundle_buy` contract call.
 * The on-chain wiring is not in the client yet, so this follows the
 * repo-wide convention of delegating to `submitCreatorContractCall`, which
 * simulates the signing latency and resolves.
 */

/** Exposed for test spying, mirroring `fetchReferredWalletsPage`. */
export async function submitBundleBuy(payload: BundleBuyPayload) {
	return submitCreatorContractCall('bundle_buy', payload);
}

/**
 * Submits the whole bundle cart as a single `bundle_buy` transaction.
 *
 * On success the cart is cleared and every creator detail cache is
 * invalidated so key pages reflect the freshly moved supply and price.
 */
export function useBundleBuyMutation() {
	const queryClient = useQueryClient();
	const clearCart = useBundleCartStore(state => state.clearCart);

	return useMutation({
		mutationKey: ['contract', 'bundle_buy'],
		mutationFn: () => {
			const { items } = useBundleCartStore.getState();
			return submitBundleBuy(buildBundleBuyPayload(items));
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			clearCart();
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.all,
			});
			showToast.success('Bundle purchased');
		},
	});
}
