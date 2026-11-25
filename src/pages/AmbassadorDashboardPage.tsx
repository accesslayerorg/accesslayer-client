import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useAmbassadorStats } from '@/hooks/useAmbassadorStats';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AmbassadorTimeRange } from '@/types/ambassador.types';
import { AMBASSADOR_TIERS, buildTrackedReferralUrl } from '@/utils/ambassador.utils';
import AmbassadorFunnelChart from '@/components/ambassador/AmbassadorFunnelChart';
import PayoutsTable from '@/components/ambassador/PayoutsTable';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	Users,
	TrendingUp,
	DollarSign,
	Award,
	Link2,
	Copy,
	Check,
	Sparkles,
	Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CARD_CLASS = 'rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6';

export default function AmbassadorDashboardPage() {
	useDocumentTitle('Ambassador & Affiliate Dashboard — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

	const [range, setRange] = useState<AmbassadorTimeRange>('30d');
	const { data: stats, isLoading } = useAmbassadorStats(range, wallet);

	// Link builder state (#1478)
	const [utmSource, setUtmSource] = useState('twitter');
	const [utmMedium, setUtmMedium] = useState('social');
	const [utmCampaign, setUtmCampaign] = useState('creator_launch');
	const [campaignLabel, setCampaignLabel] = useState('q1_promo');
	const [copiedLink, setCopiedLink] = useState(false);

	const trackedUrl = useMemo(
		() =>
			buildTrackedReferralUrl('https://accesslayer.io', wallet, {
				utmSource,
				utmMedium,
				utmCampaign,
				campaignLabel,
			}),
		[wallet, utmSource, utmMedium, utmCampaign, campaignLabel]
	);

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(trackedUrl);
			setCopiedLink(true);
			toast.success('Tracked ambassador link copied!');
			setTimeout(() => setCopiedLink(false), 2000);
		} catch {
			toast.error('Failed to copy link');
		}
	};

	const hasNoReferrals = !isLoading && stats && stats.summary.referredUsers === 0;

	return (
		<div className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12" data-testid="ambassador-dashboard-page">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Header & Range Selector */}
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span className="rounded-md bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/20">
							Affiliate Program
						</span>
						<h1 className="mt-2 font-grotesque text-3xl font-black tracking-tight">
							Ambassador Dashboard
						</h1>
						<p className="mt-1 text-sm text-white/60">
							Track conversion funnels, climb reward tiers, build UTM links, and monitor XLM payouts.
						</p>
					</div>

					<div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1" data-testid="ambassador-range-selector">
						{(['7d', '30d', '90d', 'all'] as AmbassadorTimeRange[]).map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => setRange(r)}
								className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
									range === r
										? 'bg-amber-400 text-slate-950 font-bold'
										: 'text-white/60 hover:text-white'
								}`}
								data-testid={`range-btn-${r}`}
							>
								{r}
							</button>
						))}
					</div>
				</header>

				{isLoading || !stats ? (
					<div className={`${CARD_CLASS} text-center py-12 text-white/50`}>
						Loading ambassador analytics…
					</div>
				) : (
					<>
						{/* Empty State (#1478) */}
						{hasNoReferrals && (
							<section className={`${CARD_CLASS} border-amber-400/30 bg-amber-500/[0.03]`} data-testid="ambassador-empty-state">
								<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
									<div className="space-y-2 max-w-xl">
										<h2 className="text-xl font-bold text-white flex items-center gap-2">
											<Sparkles className="h-5 w-5 text-amber-400" />
											Start Earning Affiliate Rewards
										</h2>
										<p className="text-sm text-white/60">
											You haven&apos;t referred any traders yet. Follow these steps to activate your referral funnel and unlock higher rev-share tiers:
										</p>
										<ol className="list-decimal list-inside space-y-1 text-xs text-white/80 pt-2">
											<li>Customize your UTM campaign parameters in the Link Builder below.</li>
											<li>Share your tracked referral URL on X, YouTube, or Discord.</li>
											<li>Earn 10%–25% of protocol trading fees on every referred trader&apos;s volume.</li>
										</ol>
									</div>
									<button
										type="button"
										onClick={handleCopyLink}
										className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300"
									>
										<Copy className="h-4 w-4" /> Copy Starter Link
									</button>
								</div>
							</section>
						)}

						{/* Summary Cards (#1478) */}
						<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="ambassador-summary-cards">
							<div className={CARD_CLASS}>
								<div className="flex items-center justify-between text-xs text-white/50">
									<span>Referred Users</span>
									<Users className="h-4 w-4 text-amber-400" />
								</div>
								<div className="mt-2 font-mono text-2xl font-black text-white" data-testid="summary-referred-users">
									{formatNumber(stats.summary.referredUsers)}
								</div>
								<span className="text-[11px] text-white/40">Sign-ups attributed</span>
							</div>

							<div className={CARD_CLASS}>
								<div className="flex items-center justify-between text-xs text-white/50">
									<span>Active Traders</span>
									<Activity className="h-4 w-4 text-emerald-400" />
								</div>
								<div className="mt-2 font-mono text-2xl font-black text-white" data-testid="summary-active-traders">
									{formatNumber(stats.summary.activeTraders)}
								</div>
								<span className="text-[11px] text-white/40">Completed first trade</span>
							</div>

							<div className={CARD_CLASS}>
								<div className="flex items-center justify-between text-xs text-white/50">
									<span>Referred Volume</span>
									<TrendingUp className="h-4 w-4 text-sky-400" />
								</div>
								<div className="mt-2 font-mono text-2xl font-black text-white" data-testid="summary-volume">
									{formatNumber(stats.summary.volumeXlm)} XLM
								</div>
								<span className="text-[11px] text-white/40">Cumulative trading volume</span>
							</div>

							<div className={CARD_CLASS}>
								<div className="flex items-center justify-between text-xs text-white/50">
									<span>Total Earnings</span>
									<DollarSign className="h-4 w-4 text-amber-400" />
								</div>
								<div className="mt-2 font-mono text-2xl font-black text-amber-300" data-testid="summary-earnings">
									{stats.summary.totalEarningsXlm.toFixed(2)} XLM
								</div>
								<span className="text-[11px] text-white/40">
									Paid: {stats.summary.paidXlm} • Pending: {stats.summary.pendingXlm}
								</span>
							</div>
						</section>

						{/* Funnel & Tier Progress */}
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Conversion Funnel Chart */}
							<section className={`lg:col-span-6 ${CARD_CLASS} space-y-4`}>
								<div>
									<h2 className="text-lg font-bold text-white">Conversion Funnel</h2>
									<p className="text-xs text-white/50">
										User progression from link click to repeat key trading.
									</p>
								</div>
								<AmbassadorFunnelChart funnel={stats.funnel} />
							</section>

							{/* Tier & Thresholds (#1478) */}
							<section className={`lg:col-span-6 ${CARD_CLASS} space-y-4`} data-testid="ambassador-tier-card">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg font-bold text-white flex items-center gap-2">
											<Award className="h-5 w-5 text-amber-400" />
											Current Tier: {stats.tierProgress.currentTier.name}
										</h2>
										<p className="text-xs text-white/50">
											{stats.tierProgress.currentTier.revSharePercent}% fee share unlocked
										</p>
									</div>
									<span className="rounded-lg bg-amber-400/20 px-3 py-1 font-mono text-xs font-bold text-amber-300 border border-amber-400/30">
										{stats.tierProgress.currentTier.revSharePercent}% Share
									</span>
								</div>

								{stats.tierProgress.nextTier ? (
									<div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3.5 text-xs">
										<div className="flex justify-between">
											<span className="text-white/70">
												Progress to <strong>{stats.tierProgress.nextTier.name}</strong> ({stats.tierProgress.nextTier.revSharePercent}% share)
											</span>
											<span className="font-mono font-bold text-amber-300">
												{stats.tierProgress.overallProgressPercent}%
											</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
											<div
												className="h-full bg-amber-400 transition-all"
												style={{ width: `${stats.tierProgress.overallProgressPercent}%` }}
											/>
										</div>
										<div className="flex justify-between text-[11px] text-white/50 pt-1">
											<span>Need {stats.tierProgress.referralsRemaining} more referrals</span>
											<span>Need {formatNumber(stats.tierProgress.volumeRemainingXlm)} more XLM vol</span>
										</div>
									</div>
								) : (
									<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
										Maximum Platinum Ambassador tier achieved!
									</div>
								)}

								{/* All Tiers Benefits Overview */}
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
									{AMBASSADOR_TIERS.map((tier) => {
										const isCurrent = tier.id === stats.tierProgress.currentTier.id;
										return (
											<div
												key={tier.id}
												className={`rounded-xl border p-2.5 text-[11px] ${
													isCurrent
														? 'border-amber-400/50 bg-amber-400/10'
														: 'border-white/5 bg-white/[0.01] text-white/60'
												}`}
											>
												<div className="font-bold text-white">{tier.name}</div>
												<div className="font-mono text-amber-300 font-semibold">{tier.revSharePercent}%</div>
												<div className="text-[10px] text-white/40 mt-1">
													{tier.minReferrals}+ refs • {formatNumber(tier.minVolumeXlm)} XLM
												</div>
											</div>
										);
									})}
								</div>
							</section>
						</div>

						{/* Link Builder (#1478) */}
						<section className={`${CARD_CLASS} space-y-4`} data-testid="ambassador-link-builder">
							<div>
								<h2 className="text-lg font-bold text-white flex items-center gap-2">
									<Link2 className="h-5 w-5 text-amber-400" />
									Campaign Link Builder
								</h2>
								<p className="text-xs text-white/50">
									Generate UTM-tracked affiliate links for social channels and newsletters.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-white/60">UTM Source</label>
									<input
										type="text"
										value={utmSource}
										onChange={(e) => setUtmSource(e.target.value)}
										placeholder="twitter"
										className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
										data-testid="utm-source-input"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-white/60">UTM Medium</label>
									<input
										type="text"
										value={utmMedium}
										onChange={(e) => setUtmMedium(e.target.value)}
										placeholder="social"
										className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
										data-testid="utm-medium-input"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-white/60">UTM Campaign</label>
									<input
										type="text"
										value={utmCampaign}
										onChange={(e) => setUtmCampaign(e.target.value)}
										placeholder="creator_launch"
										className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
										data-testid="utm-campaign-input"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-white/60">Campaign Label</label>
									<input
										type="text"
										value={campaignLabel}
										onChange={(e) => setCampaignLabel(e.target.value)}
										placeholder="q1_promo"
										className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
										data-testid="campaign-label-input"
									/>
								</div>
							</div>

							<div className="flex flex-col sm:flex-row gap-2 pt-1">
								<input
									type="text"
									readOnly
									value={trackedUrl}
									className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-amber-200 focus:outline-none"
									data-testid="generated-tracked-url"
								/>
								<button
									type="button"
									onClick={handleCopyLink}
									className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
									data-testid="copy-tracked-url-btn"
								>
									{copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
									{copiedLink ? 'Copied!' : 'Copy Tracked URL'}
								</button>
							</div>
						</section>

						{/* Payouts Table (#1478) */}
						<section className={`${CARD_CLASS} space-y-4`}>
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-lg font-bold text-white">Payout Tracking</h2>
									<p className="text-xs text-white/50">
										Earned, pending, and paid affiliate fee distributions on Stellar.
									</p>
								</div>
								<div className="flex gap-3 text-xs font-mono">
									<span className="text-amber-300">Earned: {stats.summary.earnedUnclaimedXlm} XLM</span>
									<span className="text-sky-300">Pending: {stats.summary.pendingXlm} XLM</span>
									<span className="text-emerald-300">Paid: {stats.summary.paidXlm} XLM</span>
								</div>
							</div>

							<PayoutsTable payouts={stats.payouts} />
						</section>
					</>
				)}
			</div>
		</div>
	);
}
