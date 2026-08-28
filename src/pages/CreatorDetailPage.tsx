import { useParams } from 'react-router';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useCreatorProfileStaleIndicator } from '@/hooks/useCreatorProfileStaleIndicator';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import CreatorProfileStaleIndicator from '@/components/common/CreatorProfileStaleIndicator';
import CreatorProfileStatRow from '@/components/common/CreatorProfileStatRow';
import { BondingCurveChart } from '@/components/common/BondingCurveChart';
import KeyHolderList from '@/components/common/KeyHolderList';
import StakingRewardsSection from '@/components/common/StakingRewardsSection';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import { bpsToPercent, formatNumber } from '@/utils/numberFormat.utils';
import { resolveCreatorKeyPriceStroops, formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import KeyDetailPageErrorBoundary from '@/components/common/KeyDetailPageErrorBoundary';
import { ApiError } from '@/services/api.service';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyTwap } from '@/hooks/useKeyTwap';
import Skeleton from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';

function CreatorDetailPageContent() {
	const { id } = useParams<{ id: string }>();
	const {
		data: creator,
		isLoading,
		error,
		isFetching,
		refetch,
	} = useCreatorDetail(id || '');
	useNavigationTiming('creator_profile');

	const {
		holders,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useKeyHolders(id || '');
	const { data: twap, isLoading: isTwapLoading } = useKeyTwap(id || '');

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

	if (error) {
		throw error;
	}

	if (!creator) {
		throw new ApiError('Creator not found', 404);
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
			value: formatNumber(creator.creatorShareSupply ? Math.ceil(creator.creatorShareSupply / 2) : 10),
		},
	];

	const chartData = (creator.priceHistory && creator.priceHistory.length > 0
		? creator.priceHistory
		: [1000000, 1200000, 1500000, 1800000, 2000000]
	).map((priceStroops, index) => ({
		supply: (index + 1) * 20,
		priceXLM: priceStroops / 10_000_000,
	}));
	const spotPrice = resolveCreatorKeyPriceStroops(creator);
	const twapPrice = twap?.priceStroops ?? null;
	const twapDelta = twapPrice != null && spotPrice != null ? twapPrice - spotPrice : null;

	const defaultHolders = [
		{ id: 'h1', displayName: 'Early Adopter', keyCount: 25, stakedQuantity: 18 },
		{ id: 'h2', displayName: 'Alpha Collector', keyCount: 15, stakedQuantity: 5 },
		{ id: 'h3', displayName: 'Key Holder 3', keyCount: 10, stakedQuantity: 0 },
		{ id: 'h4', displayName: 'Key Holder 4', keyCount: 8, stakedQuantity: 0 },
		{ id: 'h5', displayName: 'Key Holder 5', keyCount: 5, stakedQuantity: 2 },
	];

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

				<CreatorProfileHeader
					name={creator.title}
					handle={creator.socialHandle || creator.instructorId}
					creatorId={creator.id}
					isVerified={creator.isVerified}
					avatarUrl={creator.thumbnail}
					bio={creator.description}
					priceStroops={resolveCreatorKeyPriceStroops(creator)}
				/>

				{/* 4 Stat Cards */}
				<div data-testid="creator-stat-cards">
					<CreatorProfileStatRow items={statItems} />
				</div>

				<div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4" data-testid="twap-price">
					{isTwapLoading ? (
						<div aria-label="Loading 24 hour TWAP" role="status"><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-6 w-32" /></div>
					) : twapPrice != null ? (
						<div className="flex items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/55">
									<span>TWAP (24h)</span>
									<Tooltip content="Time-weighted average key price over the last 24 hours.">
										<button type="button" aria-label="What is 24 hour TWAP?" className="text-white/50">ⓘ</button>
									</Tooltip>
								</div>
								<div className="mt-1 text-xl font-bold text-white">{formatDisplayKeyPrice(twapPrice)}</div>
							</div>
							{twapDelta != null && <span className={twapDelta >= 0 ? 'text-sm font-semibold text-emerald-400' : 'text-sm font-semibold text-rose-400'}>{twapDelta >= 0 ? '▲' : '▼'} {formatDisplayKeyPrice(Math.abs(twapDelta))} vs spot</span>}
						</div>
					) : null}
				</div>

				{/* Staking Rewards */}
				<StakingRewardsSection
					{...stakingStats}
					isLoading={isLoading}
				/>

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
						height={300}
					/>
				</div>

				{/* Key Holders Table */}
				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="creator-holders-container"
				>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Top Key Holders
					</h2>
					<KeyHolderList holders={defaultHolders} />
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

				{/* Activity Feed */}
				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Key Holders
					</h2>
					<KeyHolderList
						holders={holders}
						hasNextPage={hasNextPage}
						isFetchingNextPage={isFetchingNextPage}
						fetchNextPage={() => { void fetchNextPage(); }}
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
