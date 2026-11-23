import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, Coins } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useClaimEarningsStreamMutation,
	useCreatorEarnings,
} from '@/hooks/useCreatorEarnings';
import { aggregateDailyEarnings } from '@/utils/creatorEarnings.utils';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import CreatorEarningsCards from '@/components/creator/CreatorEarningsCards';
import CreatorEarningsChart from '@/components/creator/CreatorEarningsChart';
import CreatorEarningsTable from '@/components/creator/CreatorEarningsTable';
import type { EarningsStream } from '@/types/creatorEarnings';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Creator earnings dashboard (#1258).
 *
 * Surfaces the four revenue streams (royalties, tips, subscriptions, spotlight)
 * with their unclaimed balances, a combined 30-day earnings chart, a
 * per-stream breakdown table, and a per-stream claim action that submits the
 * matching contract call.
 */
export default function CreatorEarningsPage() {
	const { id = '' } = useParams<{ id: string }>();
	const { address } = useAccount();

	const creatorId = id || address || '';
	const { data: summary, isLoading } = useCreatorEarnings(
		creatorId || undefined
	);
	const claimMutation = useClaimEarningsStreamMutation(creatorId, address);

	useDocumentTitle('Creator Earnings — AccessLayer');

	const dailyPoints = useMemo(
		() => aggregateDailyEarnings(summary?.records ?? []),
		[summary?.records]
	);

	const handleClaim = (stream: EarningsStream) => {
		const unclaimed = summary?.streams[stream]?.unclaimedXlm ?? 0;
		if (unclaimed <= 0) return;
		claimMutation.mutate({ stream, amountXlm: unclaimed });
	};

	const pendingStream = claimMutation.isPending
		? (claimMutation.variables?.stream ?? null)
		: null;

	return (
		<main
			className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
			data-testid="creator-earnings-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<Link
						to={id ? `/creator/${id}/dashboard` : '/marketplace'}
						className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
						data-testid="back-from-earnings-link"
					>
						<ArrowLeft className="size-4" />
						{id ? 'Back to Creator Dashboard' : 'Back to marketplace'}
					</Link>
				</div>

				<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-md">
							<Coins className="size-5" aria-hidden="true" />
						</div>
						<div>
							<h1
								className="font-grotesque text-3xl font-black tracking-tight text-white"
								data-testid="creator-earnings-title"
							>
								Creator Earnings
							</h1>
							<p className="text-xs text-white/50">
								Royalties, tips, subscriptions, and spotlight revenue in
								one place
							</p>
						</div>
					</div>
					{!address && (
						<div data-testid="earnings-connect-prompt">
							<ConnectWalletButton />
						</div>
					)}
				</header>

				{!creatorId ? (
					<section
						className={CARD_CLASS}
						data-testid="earnings-no-creator"
					>
						<h2 className="font-grotesque text-lg font-bold text-white">
							Connect a wallet to view earnings
						</h2>
						<p className="mt-1 text-xs text-white/60">
							Connect your wallet, or open this page from a creator key,
							to load its earnings breakdown.
						</p>
					</section>
				) : (
					<>
						<CreatorEarningsCards
							summary={summary}
							isLoading={isLoading}
							canClaim={Boolean(address)}
							pendingStream={pendingStream}
							onClaim={handleClaim}
						/>
						<CreatorEarningsChart
							points={dailyPoints}
							isLoading={isLoading}
						/>
						<CreatorEarningsTable
							records={summary?.records ?? []}
							isLoading={isLoading}
						/>
					</>
				)}
			</div>
		</main>
	);
}
