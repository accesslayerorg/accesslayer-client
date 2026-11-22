import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { playPurchaseConfetti, shouldTriggerConfetti } from '@/utils/confetti.utils';

/**
 * Observes all active trade mutations across the React Query cache.
 * When a buy trade (amount > 0) settles successfully and this is the
 * user's first key purchase (`has_bought` absent from localStorage),
 * plays a confetti animation for 2.5 seconds and records the purchase
 * flag.
 *
 * Mount this hook once on the key detail page. It has no return value.
 */
export function usePurchaseConfetti(): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		const unsubscribe = queryClient.getMutationCache().subscribe(event => {
			if (event.type !== 'updated') return;
			const { mutation } = event;

			// Only react to successful trade mutations.
			if (mutation.state.status !== 'success') return;

			const vars = mutation.state.variables as
				| { creatorId?: string; amount?: number }
				| undefined;

			if (!vars || typeof vars.amount !== 'number') return;

			if (shouldTriggerConfetti(vars.amount)) {
				playPurchaseConfetti();
			}
		});

		return unsubscribe;
	}, [queryClient]);
}
