import { Link, useParams } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, Coins, ExternalLink } from 'lucide-react';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import CreatorRevenuePanel from '@/components/common/CreatorRevenuePanel';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Creator Revenue Dashboard Page (#1059).
 *
 * Dedicated dashboard surface for creators to view total earnings from royalties,
 * subscription fees, and dividend deposits, with an interactive per-source chart over time,
 * 60-second automatic refresh, and withdrawal flow to claim net proceeds.
 */
export default function CreatorRevenueDashboardPage() {
	const { id = '' } = useParams<{ id: string }>();
	const { address, isConnected } = useAccount();

	const { data: creator, isLoading, isError } = useCreatorDetail(id);

	useDocumentTitle(
		creator
			? `${creator.title} · Creator Revenue — AccessLayer`
			: 'Creator Revenue Dashboard — AccessLayer'
	);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<CreatorDashboardSkeleton />
				</div>
			</main>
		);
	}

	if (isError || !creator) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl space-y-4">
					<Link
						to="/marketplace"
						className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
					>
						<ArrowLeft className="size-3.5" /> Back to creators
					</Link>
					<h1 className="font-grotesque text-3xl font-black text-white">
						Creator Revenue Dashboard
					</h1>
					<div className={CARD_CLASS} data-testid="creator-revenue-error">
						<p className="text-white/60">
							We couldn&apos;t load revenue information for this creator
							key. Please verify the key ID or try again shortly.
						</p>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Top Navigation & Breadcrumb */}
				<div className="flex flex-wrap items-center justify-between gap-4">
					<Link
						to={`/creator/${id}/dashboard`}
						className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
						data-testid="back-to-dashboard-link"
					>
						<ArrowLeft className="size-4" />
						Back to Creator Dashboard
					</Link>

					<Link
						to={`/creator/${id}`}
						className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
					>
						View Public Profile <ExternalLink className="size-3" />
					</Link>
				</div>

				{/* Page Header */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-md">
								<Coins className="size-5" />
							</div>
							<div>
								<h1
									className="font-grotesque text-3xl font-black tracking-tight text-white"
									data-testid="revenue-dashboard-title"
								>
									{creator.title} · Revenue
								</h1>
								<p className="text-xs text-white/50">
									Track royalties, subscriptions, dividend deposits,
									and claim net proceeds
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Wallet Prompt if disconnected */}
				{!isConnected && (
					<section
						className={CARD_CLASS}
						data-testid="revenue-connect-prompt"
					>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h3 className="font-grotesque text-lg font-bold text-white">
									Connect Wallet to Claim
								</h3>
								<p className="mt-1 text-xs text-white/60">
									Connect your wallet to sign claim transactions and
									withdraw your net proceeds.
								</p>
							</div>
							<ConnectWalletButton />
						</div>
					</section>
				)}

				{/* Main Revenue Content Panel */}
				<CreatorRevenuePanel creatorId={id} wallet={address} />
			</div>
		</main>
	);
}
