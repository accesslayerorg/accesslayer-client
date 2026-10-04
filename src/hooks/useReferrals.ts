import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchReferredWalletsPage,
	referralService,
} from '@/services/referral.service';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import {
	aggregateReferralEarnings,
	buildReferralLink,
	type ReferralEarnings,
} from '@/utils/referral.utils';

/**
 * Referral programme summary for a wallet (#963).
 *
 * Also returns the derived earnings figures the dashboard renders and the
 * wallet's shareable referral link. Disabled until a wallet is connected.
 */
export function useReferralSummary(wallet: string | undefined) {
	const query = useQuery({
		queryKey: queryKeys.referrals.summary(wallet ?? ''),
		queryFn: () => referralService.getReferralSummary(wallet!),
		enabled: Boolean(wallet),
		staleTime: 15_000,
		retry: false,
	});

	const earnings: ReferralEarnings = aggregateReferralEarnings(query.data);

	return {
		...query,
		earnings,
		/** Shareable referral link, empty until a wallet is connected. */
		referralLink: buildReferralLink({ wallet: wallet ?? '' }),
	};
}

/**
 * Cursor-paginated list of wallets referred by a given wallet (#963).
 *
 * Each entry carries the join date and first-trade status, so the dashboard
 * can show which referrals have actually converted into an earning reward.
 */
export function useReferredWallets(wallet: string | undefined) {
	return useInfiniteQuery({
		queryKey: queryKeys.referrals.wallets(wallet ?? ''),
		queryFn: ({ pageParam }) =>
			fetchReferredWalletsPage(
				wallet!,
				pageParam as string | null | undefined
			),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: Boolean(wallet),
	});
}

const CLAIM_LATENCY_MS = 900;

async function submitReferralClaim(wallet: string, amountXlm: number) {
	// In production this signs and submits the referral reward `claim` call
	// with the wallet and amount. No contract wiring exists yet, so simulate
	// the signing latency and resolve.
	void wallet;
	void amountXlm;
	await new Promise<void>(resolve => window.setTimeout(resolve, CLAIM_LATENCY_MS));
	return { success: true as const };
}

/**
 * Claims the wallet's pending referral rewards (#963).
 *
 * Invalidates the whole `referrals` family on success so the earnings tracker
 * and the referred-wallets list both reflect the withdrawal.
 */
export function useClaimReferralRewardsMutation(wallet: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['referral', 'claim_rewards', wallet],
		mutationFn: (amountXlm: number) =>
			submitReferralClaim(wallet, amountXlm),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			referralService.invalidateReferralSummary(wallet);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.referrals.all(),
			});
			showToast.success('Referral rewards claimed');
		},
	});
}
