import { Link, useParams } from 'react-router';
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
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useWalletHoldings } from '@/hooks/useWallet';
import CoCreatorSection from '@/components/creator/CoCreatorSection';
import ShareTwitterButton from '@/components/common/ShareTwitterButton';

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

	// User holdings for Share to X button
	const profile = useProfileStore(state => state.profile);
	const userAddress = profile?.id;
	const { data: holdings = [] } = useWalletHoldings(userAddress ?? '');
	const userPosition = holdings.find(h => h.creatorId === (id || ''));
	const holdingsCount = userPosition?.quantity ?? 0;

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
					<h1 className="font-grotesque text-3xl font-black">Creator not found</h1>
					<p className="text-white/70 font-jakarta">We couldn't find a creator with that ID.</p>
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

				{/* Co-Creator Section */}
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
