import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import ReferralLinkGenerator from '@/components/common/ReferralLinkGenerator';
import ReferralEarningsPanel from '@/components/common/ReferralEarningsPanel';
import ReferredWalletsTable from '@/components/common/ReferredWalletsTable';
import ReferralProgrammeTerms from '@/components/common/ReferralProgrammeTerms';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import {
	useClaimReferralRewardsMutation,
	useReferredWallets,
	useReferralSummary,
} from '@/hooks/useReferrals';
import { sumReferralRewards } from '@/utils/referral.utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Referral programme dashboard (#963).
 *
 * Where a wallet generates its referral link, tracks the wallets it has
 * referred, and monitors the referral fees earned from their first trades.
 */
export default function ReferralDashboardPage() {
	useDocumentTitle('Referral Programme — AccessLayer');

	const { address, isConnected } = useAccount();
	const wallet = address ?? undefined;

	const {
		earnings,
		referralLink,
		isLoading: isSummaryLoading,
	} = useReferralSummary(wallet);
	const {
		data: pages,
		isLoading: isWalletsLoading,
		isError: isWalletsError,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useReferredWallets(wallet);
	const claimRewards = useClaimReferralRewardsMutation(wallet ?? '');

	const referredWallets = useMemo(
		() => (pages?.pages ?? []).flatMap(page => page.wallets),
		[pages]
	);

	// Per-wallet rewards are the source of truth for the rows; the API
	// aggregate is shown as the headline figure. Surfacing both makes any
	// disagreement between them visible rather than silently hidden.
	const listedRewards = sumReferralRewards(referredWallets);

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<div>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						Referral programme
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Share your link, track the wallets you referred, and withdraw
						the fees their first trades earned you.
					</p>
				</div>

				{!isConnected && (
					<section className={CARD_CLASS} data-testid="referral-connect-prompt">
						<p className="text-sm text-white/60">
							Connect your wallet to generate your referral link and see
							your earnings.
						</p>
						<div className="mt-4">
							<ConnectWalletButton />
						</div>
					</section>
				)}

				<section className={CARD_CLASS} data-testid="referral-link-section">
					<ReferralLinkGenerator link={referralLink} />
				</section>

				<section className={CARD_CLASS} data-testid="referral-earnings-section">
					<ReferralEarningsPanel
						earnings={earnings}
						isLoading={isSummaryLoading}
						isClaiming={claimRewards.isPending}
						onClaim={amountXlm => claimRewards.mutate(amountXlm)}
					/>
					{isSummaryLoading === false && referredWallets.length > 0 && (
						<p
							className="mt-3 text-xs text-white/45"
							data-testid="referral-rewards-from-rows"
						>
							{listedRewards.toFixed(4)} XLM across {referredWallets.length}{' '}
							referred wallet{referredWallets.length === 1 ? '' : 's'}.
						</p>
					)}
				</section>

				<section className={CARD_CLASS} data-testid="referred-wallets-section">
					<ReferredWalletsTable
						wallets={referredWallets}
						isLoading={isWalletsLoading}
						isError={isWalletsError}
						isFetchingNextPage={isFetchingNextPage}
						hasNextPage={hasNextPage}
						onLoadMore={() => {
							void fetchNextPage();
						}}
					/>
				</section>

				<section className={CARD_CLASS} data-testid="referral-terms-section">
					<ReferralProgrammeTerms rewardBps={earnings.rewardBps} />
				</section>

				<p className="text-sm text-white/50">
					Looking for your key holdings?{' '}
					<Link
						to="/profile"
						className="font-semibold text-amber-300 hover:text-amber-200"
					>
						Open your portfolio
					</Link>
					.
				</p>
			</div>
		</main>
	);
}
