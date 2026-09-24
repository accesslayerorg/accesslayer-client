import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCreatorProfileStaleIndicator } from '@/hooks/useCreatorProfileStaleIndicator';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import CreatorProfileStaleIndicator from '@/components/common/CreatorProfileStaleIndicator';
import CreatorProfileStatRow from '@/components/common/CreatorProfileStatRow';
import { BondingCurveChart } from '@/components/common/BondingCurveChart';
import KeySimulationTool from '@/components/common/KeySimulationTool';
import BuyCooldownCountdown from '@/components/common/BuyCooldownCountdown';
import KeyHolderList from '@/components/common/KeyHolderList';
import HolderConcentrationChart from '@/components/common/HolderConcentrationChart';
import StakingRewardsSection from '@/components/common/StakingRewardsSection';
import DeprecationNotice from '@/components/common/DeprecationNotice';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import { Button } from '@/components/ui/button';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import { bpsToPercent, formatNumber } from '@/utils/numberFormat.utils';
import {
	resolveCreatorKeyPriceStroops,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import KeyDetailPageErrorBoundary from '@/components/common/KeyDetailPageErrorBoundary';
import { ApiError } from '@/services/api.service';
import WatchlistButton from '@/components/common/WatchlistButton';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useWalletHoldings } from '@/hooks/useWallet';
import CoCreatorSection from '@/components/creator/CoCreatorSection';
import ShareTwitterButton from '@/components/common/ShareTwitterButton';
import { usePurchaseConfetti } from '@/hooks/usePurchaseConfetti';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyTwap } from '@/hooks/useKeyTwap';
import Skeleton from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function CreatorDetailPageContent() {
	usePurchaseConfetti();

	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const [hasMounted, setHasMounted] = useState(false);
	const {
		data: creator,
		isLoading,
		error,
		isFetching,
		refetch,
	} = useCreatorDetail(id || '');
	useNavigationTiming('creator_profile');
	useDocumentTitle(creator ? `${creator.title} — AccessLayer` : null);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const recordVisit = useRecentlyViewed(state => state.addKey);

	// Record this key as recently viewed once the detail data is available.
	useEffect(() => {
		if (!creator) return;
		recordVisit({
			id: creator.id,
			title: creator.title || creator.name || 'Unnamed creator',
			price: creator.price,
			priceStroops: creator.priceStroops,
			change24h: creator.change24h,
			category: creator.category,
			avatarUri: creator.avatarUri || creator.thumbnail,
			walletAddress: creator.instructorId,
		});
	}, [creator, recordVisit]);

	const { holders, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useKeyHolders(id || '');

	const [selectedTwapWindow, setSelectedTwapWindow] = useState<'1h' | '24h'>(
		'24h'
	);
	const { data: twap1h, isLoading: isTwap1hLoading } = useKeyTwap(
		id || '',
		'1h'
	);
	const { data: twap24h, isLoading: isTwap24hLoading } = useKeyTwap(
		id || '',
		'24h'
	);
	const activeTwap = selectedTwapWindow === '1h' ? twap1h : twap24h;
	const isTwapLoading =
		selectedTwapWindow === '1h' ? isTwap1hLoading : isTwap24hLoading;

	// User holdings for Share to X button
	const profile = useProfileStore(state => state.profile);
	const userAddress = profile?.id;
	const { data: holdings = [] } = useWalletHoldings(userAddress ?? '');
	const userPosition = holdings.find(h => h.creatorId === (id || ''));
	const holdingsCount = userPosition?.quantity ?? 0;
	// Per-user buy cooldown (#873): prefer the user's own position-level
	// value; fall back to a creator-wide cooldown if the backend doesn't yet
	// return a per-user one. Only shown for authenticated users.
	const nextBuyAllowedAt =
		userPosition?.nextBuyAllowedAt ?? creator?.nextBuyAllowedAt ?? null;

	// Track stale data indicator
	const { shouldShowBadge, handleRefetch } = useCreatorProfileStaleIndicator(
		id || '',
		isFetching,
		() => refetch()
	);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-7xl">
					<CreatorDashboardSkeleton />
				</div>
			</main>
		);
	}

	if (error || !creator) {
		const is404 =
			!creator || (error instanceof ApiError && error.status === 404);
		if (is404) {
			return (
				<main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#06111f] px-6 py-16 text-center text-white">
					<h1 className="font-grotesque text-3xl font-black">
						Creator not found
					</h1>
					<p className="text-white/70 font-jakarta">
						We couldn't find a creator with that ID.
					</p>
					<Link to="/creators" className="text-amber-400 hover:underline">
						Back to creators
					</Link>
				</main>
			);
		}
		throw error;
	}

	const feeItems = [
		{
			label: 'Creator fee',
			value: bpsToPercent(creator.creatorFeeBps),
			helperText: 'Fee paid directly to the creator on each trade.',
		},
		{
			label: 'Protocol fee',
			value: bpsToPercent(creator.protocolFeeBps),
			helperText: 'Fee paid to the platform for protocol maintenance.',
		},
	];

	const statItems = [
		{
			label: 'Current Price',
			value: formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator)),
		},
		{
			label: 'Key Supply',
			value: formatNumber(creator.creatorShareSupply ?? 100),
		},
		{
			label: '24h Volume',
			value: formatDisplayKeyPrice(creator.volume24h ?? 0),
		},
		{
			label: 'Total Holders',
			value: formatNumber(
				creator.creatorShareSupply
					? Math.ceil(creator.creatorShareSupply / 2)
					: 10
			),
		},
	];

	const chartData = (
		creator.priceHistory && creator.priceHistory.length > 0
			? creator.priceHistory
			: [1000000, 1200000, 1500000, 1800000, 2000000]
	).map((priceStroops, index) => ({
		supply: (index + 1) * 20,
		priceXLM: priceStroops / 10_000_000,
	}));
	const spotPrice = resolveCreatorKeyPriceStroops(creator);
	const twapPrice = twap?.priceStroops ?? null;
	const twapDelta =
		twapPrice != null && spotPrice != null ? twapPrice - spotPrice : null;

	const hasRealStakingData =
		creator.stakingPoolBalance != null ||
		creator.totalStaked != null ||
		creator.recentFeeInflow != null;
	const stakingStats = hasRealStakingData
		? {
				stakingPoolBalance: creator.stakingPoolBalance,
				totalStaked: creator.totalStaked,
				recentFeeInflow: creator.recentFeeInflow,
			}
		: {
				// Demo values until the key detail API returns staking pool stats.
				stakingPoolBalance: 4820,
				totalStaked: creator.creatorShareSupply
					? Math.floor(creator.creatorShareSupply / 4)
					: 25,
				recentFeeInflow: 62,
			};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-8">
				<CreatorBreadcrumb
					parentLabel="Marketplace"
					parentHref="/"
					currentLabel={`${creator.title} Profile`}
				/>
				<div className="flex items-start gap-3">
					<div className="min-w-0 flex-1">
						<CreatorProfileHeader
							name={creator.title}
							handle={creator.socialHandle || creator.instructorId}
							creatorId={creator.id}
							isVerified={creator.isVerified}
							avatarUrl={creator.thumbnail}
							bio={creator.description}
							priceStroops={resolveCreatorKeyPriceStroops(creator)}
							showBackButton={hasMounted}
							onBack={() => {
								if (
									window.history.length > 1 &&
									location.key !== 'default'
								) {
									navigate(-1);
									return;
								}
								navigate('/creators');
							}}
						/>
					</div>
					<WatchlistButton
						creator={creator}
						labelName={creator.title}
						className="mt-3 shrink-0"
					/>
				</div>
				{/* 4 Stat Cards */}
				<div data-testid="creator-stat-cards">
					<CreatorProfileStatRow items={statItems} />
				</div>
				{/* Deprecation Notice and Buy Action on Key Detail Page */}
				{isKeyDeprecated(creator) && (
					<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
						<DeprecationNotice reason={creator.deprecationReason} />
					</div>
				)}
				<div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-white/55">
							Key Purchase
						</p>
						<p className="mt-0.5 text-sm text-white/80">
							{isKeyDeprecated(creator)
								? 'Key is deprecated. New buys are disabled.'
								: 'Purchase keys for this creator.'}
						</p>
					</div>
					<Button
						disabled={isKeyDeprecated(creator)}
						data-testid="key-detail-buy-button"
						variant={isKeyDeprecated(creator) ? 'outline' : 'default'}
						className="rounded-xl font-bold"
					>
						{isKeyDeprecated(creator)
							? 'Buy Disabled (Deprecated)'
							: 'Buy Key'}
					</Button>
				</div>
				{/* Buy Cooldown Countdown (only meaningful for authenticated users) */}
				{userAddress && (
					<BuyCooldownCountdown nextBuyAllowedAt={nextBuyAllowedAt} />
				)}
				{/* Share to X Button (only visible for authenticated holders) */}
				<div className="flex justify-end">
					<ShareTwitterButton
						creatorId={creator.id}
						creatorName={creator.title}
						priceXlm={formatDisplayKeyPrice(
							resolveCreatorKeyPriceStroops(creator)
						).replace(' XLM', '')}
						userAddress={userAddress}
						userHoldingsCount={holdingsCount}
					/>
				</div>
				{isTwapLoading ? (
					<div
						className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
						data-testid="twap-price"
					>
						<div aria-label="Loading 24 hour TWAP" role="status">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="mt-2 h-6 w-32" />
						</div>
					</div>
				) : twapPrice != null ? (
					<div
						className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
						data-testid="twap-price"
					>
						<div className="flex items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/55">
									<span
										className={
											twapDelta != null
												? twapDelta < 0
													? 'text-emerald-400'
													: 'text-rose-400'
												: ''
										}
									>
										TWAP (24h)
									</span>
									<Tooltip content="Time-weighted average price over the past 24 hours. Less sensitive to short-term manipulation.">
										<button
											type="button"
											aria-label="What is 24 hour TWAP?"
											className="text-white/50"
										>
											ⓘ
										</button>
									</Tooltip>
								</div>
								<div className="mt-1 text-xl font-bold text-white">
									{formatDisplayKeyPrice(twapPrice)}
								</div>
							</div>
							{twapDelta != null && (
								<span
									className={
										twapDelta < 0
											? 'text-sm font-semibold text-emerald-400'
											: 'text-sm font-semibold text-rose-400'
									}
								>
									{twapDelta < 0 ? '▼' : '▲'}{' '}
									{formatDisplayKeyPrice(Math.abs(twapDelta))} vs spot
								</span>
							)}
						</div>
						{isTwapLoading ? (
							<div
								aria-label="Loading TWAP"
								role="status"
								className="mt-2"
							>
								<Skeleton className="h-3 w-24" />
								<Skeleton className="mt-2 h-6 w-32" />
							</div>
						) : twapPrice != null ? (
							<div className="text-right">
								<div className="mt-1 text-xl font-bold text-white">
									{formatDisplayKeyPrice(twapPrice)}
								</div>
								{twapDelta != null && (
									<span
										className={
											twapDelta < 0
												? 'text-sm font-semibold text-emerald-400'
												: 'text-sm font-semibold text-rose-400'
										}
									>
										{twapDelta < 0 ? '▼' : '▲'}{' '}
										{formatDisplayKeyPrice(Math.abs(twapDelta))} vs
										spot
									</span>
								)}
								{twapDeviationPercent != null && (
									<div
										className={
											twapDeviationPercent < 0
												? 'mt-1 text-xs text-emerald-300'
												: 'mt-1 text-xs text-rose-300'
										}
									>
										{twapDeviationPercent >= 0 ? '+' : ''}
										{twapDeviationPercent.toFixed(2)}% from spot
									</div>
								)}
							</div>
						) : (
							<div className="text-right text-sm text-white/45">
								TWAP unavailable
							</div>
						)}
					</div>
				) : null}
				{/* Staking Rewards */}
				<StakingRewardsSection {...stakingStats} isLoading={isLoading} />
				{/* Price Chart */}
				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="creator-chart-container"
				>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Price Curve
					</h2>
					<BondingCurveChart
						data={chartData}
						currentSupply={creator.creatorShareSupply ?? 100}
						twapPriceXLM={twapPriceXLM}
						twapLabel={
							selectedTwapWindow === '1h' ? '1H TWAP' : '24H TWAP'
						}
						height={300}
					/>
				</div>
				{/* Buy Simulation Tool */}
				<KeySimulationTool
					currentSupply={creator.creatorShareSupply ?? 100}
					protocolFeeBps={creator.protocolFeeBps}
					creatorFeeBps={creator.creatorFeeBps}
				/>
				{/* Holder Concentration */}
				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="holder-concentration-container"
				>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Holder Concentration
					</h2>
					<HolderConcentrationChart
						holders={holders}
						totalSupply={creator.creatorShareSupply}
					/>
				</div>
				{/* Fee Structure */}
				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<div className="flex items-center justify-between gap-4 mb-6">
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Fee Structure
						</h2>
						<CreatorProfileStaleIndicator
							visible={shouldShowBadge}
							isRefetching={isFetching}
							onRefresh={handleRefetch}
						/>
					</div>
					<CreatorProfileInfoGrid items={feeItems} />
				</div>
				{/* Co-Creator Section */}{' '}
				<CoCreatorSection
					courseId={creator.id}
					coCreatorAddress={creator.coCreatorAddress}
					coCreatorSplitBps={creator.coCreatorSplitBps}
					totalPaidToCoCreator={creator.totalPaidToCoCreator}
					totalPaidToCreator={creator.totalPaidToCreator}
				/>
				{/* Activity Feed */}
				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Key Holders
					</h2>
					<KeyHolderList
						holders={holders}
						hasNextPage={hasNextPage}
						isFetchingNextPage={isFetchingNextPage}
						fetchNextPage={() => {
							void fetchNextPage();
						}}
					/>
				</div>
				<div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Activity
					</h2>
					<CreatorActivityFeed creatorId={creator.id} />
				</div>
			</div>
		</main>
	);
}

export default function CreatorDetailPage() {
	return (
		<KeyDetailPageErrorBoundary>
			<CreatorDetailPageContent />
		</KeyDetailPageErrorBoundary>
	);
}
