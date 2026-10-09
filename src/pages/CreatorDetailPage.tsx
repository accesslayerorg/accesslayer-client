import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatorDetail, usePriceHistory } from '@/hooks/useCreators';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCreatorProfileStaleIndicator } from '@/hooks/useCreatorProfileStaleIndicator';
import { useOnChainMetadata } from '@/hooks/useOnChainMetadata';
import { resolveIpfsUrl } from '@/utils/ipfs.utils';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import CreatorProfileStaleIndicator from '@/components/common/CreatorProfileStaleIndicator';
import CreatorProfileStatRow from '@/components/common/CreatorProfileStatRow';
import BondingCurveChart from '@/components/common/BondingCurveChart';
import KeySimulationTool from '@/components/common/KeySimulationTool';
import BuyCooldownCountdown from '@/components/common/BuyCooldownCountdown';
import KeyHolderList from '@/components/common/KeyHolderList';
import HolderConcentrationChart from '@/components/common/HolderConcentrationChart';
import StakingRewardsSection from '@/components/common/StakingRewardsSection';
import StakingVaultPanel from '@/components/common/StakingVaultPanel';
import DeprecationNotice from '@/components/common/DeprecationNotice';
import DeprecationBanner from '@/components/common/DeprecationBanner';
import SubscriptionAccessGate from '@/components/common/SubscriptionAccessGate';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import { Button } from '@/components/ui/button';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import { bpsToPercent, formatNumber } from '@/utils/numberFormat.utils';
import {
	resolveCreatorKeyPriceStroops,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import {
	resolveHighestBid,
	formatAuctionBidAmount,
} from '@/utils/auctionBid.utils';
import KeyDetailPageErrorBoundary from '@/components/common/KeyDetailPageErrorBoundary';
import { ApiError } from '@/services/api.service';
import WatchlistButton from '@/components/common/WatchlistButton';
import AuctionPhaseSection from '@/components/common/AuctionPhaseSection';
import { useAuctionPhase } from '@/hooks/useAuctionPhase';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useWalletHoldings, useTradeMutation } from '@/hooks/useWallet';
import CoCreatorSection from '@/components/creator/CoCreatorSection';
import ShareTwitterButton from '@/components/common/ShareTwitterButton';
import { PriceHistoryChart } from '@/components/common/PriceHistoryChart';
import type { PriceHistoryInterval } from '@/services/course.service';
import TradeDialog from '@/components/common/TradeDialog';
import SpreadIndicator from '@/components/common/SpreadIndicator';
import OraclePriceIndicator from '@/components/common/OraclePriceIndicator';
import { useKeyOraclePrice } from '@/hooks/useKeyOraclePrice';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { usePurchaseConfetti } from '@/hooks/usePurchaseConfetti';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyTwap } from '@/hooks/useKeyTwap';
import { useKeyStats } from '@/hooks/useKeyStats';
import { useKeyUniqueTraders } from '@/hooks/useKeyUniqueTraders';
import { useKeyConfig } from '@/hooks/useKeyConfig';
import KeyStatsPanel from '@/components/common/KeyStatsPanel';
import Skeleton from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import GraduatedCurveMilestoneChart from '@/components/common/GraduatedCurveMilestoneChart';
import KeyDeprecationBanner from '@/components/common/KeyDeprecationBanner';
import MergeProposalBanner from '@/components/common/MergeProposalBanner';
import KeyBuybackModal from '@/components/common/KeyBuybackModal';
import type { KeyBuybackReceipt } from '@/hooks/useKeyBuyback';
import { usePerformanceBond } from '@/hooks/usePerformanceBond';
import PerformanceBondPanel from '@/components/common/PerformanceBondPanel';
import WhitelistStatusBadge from '@/components/common/WhitelistStatusBadge';
import ShareModal from '@/components/common/ShareModal';
import PriceAlertButton from '@/components/common/PriceAlertButton';
import {
	useTradeCooldownStatus,
	invalidateTradeCooldownStatus,
	resolveActiveTradeCooldown,
} from '@/hooks/useTradeCooldownStatus';
import {
	isActiveCooldown,
	type ActiveTradeCooldown,
} from '@/utils/tradeCooldown.utils';
import TradeCooldownButton from '@/components/common/TradeCooldownButton';
import { useAccount } from 'wagmi';

function CreatorDetailPageContent() {
	usePurchaseConfetti();

	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [hasMounted, setHasMounted] = useState(false);
	const [buybackModalOpen, setBuybackModalOpen] = useState(false);
	const [recentSettlement, setRecentSettlement] =
		useState<KeyBuybackReceipt | null>(null);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [lastPurchasedAmount, setLastPurchasedAmount] = useState<
		number | null
	>(null);
	const [deprecationDismissed, setDeprecationDismissed] = useState(false);
	const [buyDialogOpen, setBuyDialogOpen] = useState(false);
	const [tradeSubmitting, setTradeSubmitting] = useState(false);
	const [interval, setInterval] = useState<PriceHistoryInterval>('24h');

	const {
		data: creator,
		isLoading,
		error,
		isFetching,
		refetch,
	} = useCreatorDetail(id || '');

	const { data: priceHistory, isLoading: isPriceHistoryLoading } =
		usePriceHistory(id || '', interval);

	useNavigationTiming('creator_profile');
	useDocumentTitle(creator ? `${creator.title} — AccessLayer` : null);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const recordVisit = useRecentlyViewed(state => state.addKey);

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

	const profile = useProfileStore(state => state.profile);
	const { address: connectedWalletAddress } = useAccount();
	const userAddress = connectedWalletAddress ?? profile?.id;

	const { data: holdings = [] } = useWalletHoldings(userAddress ?? '');

	const userPosition = holdings.find(h => h.creatorId === (id || ''));
	const holdingsCount = userPosition?.quantity ?? 0;

	const nextBuyAllowedAt =
		userPosition?.nextBuyAllowedAt ?? creator?.nextBuyAllowedAt ?? null;

	const { data: twap, isLoading: isTwapLoading } = useKeyTwap(id || '');

	const {
		data: keyStats,
		isLoading: isKeyStatsLoading,
		isError: isKeyStatsError,
	} = useKeyStats(id || '');

	const { data: uniqueTraders, isLoading: isUniqueTradersLoading } =
		useKeyUniqueTraders(id || '');

	const { data: keyConfig, isLoading: isKeyConfigLoading } = useKeyConfig(
		id || ''
	);

	const spotPriceStroops = creator
		? resolveCreatorKeyPriceStroops(creator)
		: null;

	const {
		comparison: oracleComparison,
		freshness: oracleFreshness,
		source: oracleSource,
		isLoading: isOracleLoading,
	} = useKeyOraclePrice(id || '', { spotPriceStroops });

	const {
		data: performanceBondData,
		isLoading: isPerformanceBondLoading,
		isError: isPerformanceBondError,
	} = usePerformanceBond(id || '');

	const performanceBond =
		performanceBondData ?? creator?.performanceBond ?? null;

	const { phase: auctionPhase } = useAuctionPhase({
		auctionPrice: creator?.auctionPrice ?? null,
		auctionSupply: creator?.auctionSupply ?? null,
		auctionSold: creator?.auctionSold ?? null,
		auctionEndsAt: creator?.auctionEndsAt ?? null,
	});

	const isWhitelistGateActive = Boolean(
		creator?.isWhitelistEnabled ??
		creator?.whitelistEnabled ??
		creator?.earlyAccessEnabled ??
		false
	);

	const whitelistEntries = creator?.whitelist ?? [];

	const isUserWhitelisted = Boolean(
		userAddress &&
		(whitelistEntries.some(
			entry =>
				entry.walletAddress?.toUpperCase() === userAddress.toUpperCase()
		) ||
			(creator?.earlyAccessWhitelist ?? []).some(
				address => address.toLowerCase() === userAddress.toLowerCase()
			) ||
			(creator?.instructorId &&
				creator.instructorId.toUpperCase() === userAddress.toUpperCase()))
	);

	const publicLaunchTimestamp = creator?.publicLaunchDate
		? Date.parse(creator.publicLaunchDate)
		: null;

	const hasValidPublicLaunchDate =
		publicLaunchTimestamp != null && Number.isFinite(publicLaunchTimestamp);

	const isPublicLaunchPending =
		hasValidPublicLaunchDate && publicLaunchTimestamp > Date.now();

	const isEarlyAccessRestricted =
		creator?.earlyAccessEnabled === true &&
		(!hasValidPublicLaunchDate || isPublicLaunchPending);

	const isLockedOut =
		isWhitelistGateActive &&
		!isUserWhitelisted &&
		(isEarlyAccessRestricted || !creator?.publicLaunchDate);

	const buyDisabledReason = !userAddress
		? 'Connect your wallet to buy this key.'
		: isLockedOut
			? 'Early access is restricted to approved whitelisted wallets.'
			: undefined;

	const {
		data: onChainMetadata,
		isLoading: isOnChainLoading,
		isError: isOnChainError,
		refetch: refetchOnChainMetadata,
	} = useOnChainMetadata(id || '');

	const isFallbackActive = isOnChainError || !onChainMetadata;
	const metadata = onChainMetadata ?? {};

	const displayName =
		metadata.name || creator?.title || creator?.name || 'Unnamed creator';

	const displaySymbol = metadata.symbol;

	const displayDescription =
		metadata.description || creator?.description || creator?.bio;

	const rawAvatar =
		metadata.image ||
		metadata.imageCid ||
		metadata.image_cid ||
		metadata.ipfsCid ||
		metadata.ipfs_cid ||
		metadata.avatarUri ||
		metadata.avatar_uri ||
		metadata.cid;

	const displayAvatar =
		resolveIpfsUrl(rawAvatar) || creator?.avatarUri || creator?.thumbnail;

	const { shouldShowBadge, handleRefetch } = useCreatorProfileStaleIndicator(
		id || '',
		isFetching || isOnChainLoading,
		() => {
			void refetch();
			void refetchOnChainMetadata();
		}
	);

	const tradeMutation = useTradeMutation(connectedWalletAddress ?? '');

	const { data: tradeCooldownStatus } = useTradeCooldownStatus(id || '');

	const tradeCooldown: ActiveTradeCooldown | null = resolveActiveTradeCooldown(
		tradeCooldownStatus,
		nextBuyAllowedAt
	);

	const isTradeCooldownActive = isActiveCooldown(tradeCooldown);

	const handleConfirmBuy = async (
		amount: number,
		_pricePreview?: unknown,
		slippage?: { maxPriceStroops: number | null } | null
	) => {
		setTradeSubmitting(true);

		try {
			showToast.loading(
				`Submitting buy for ${amount} key${amount === 1 ? '' : 's'}...`
			);

			await tradeMutation.mutateAsync({
				creatorId: id || '',
				amount,
				priceStroops: creator
					? resolveCreatorKeyPriceStroops(creator)
					: null,
				price: creator?.price,
				maxPriceStroops: slippage?.maxPriceStroops ?? null,
			});

			showToast.transactionSuccess(
				'Trade confirmed',
				`Bought ${formatNumber(amount)} key${
					amount === 1 ? '' : 's'
				} from ${creator?.title || 'Creator'}`
			);

			setBuyDialogOpen(false);
			setLastPurchasedAmount(amount);
			setShareModalOpen(true);
		} catch (error) {
			showToast.error(getSignatureErrorMessage(error));
		} finally {
			if (id) {
				invalidateTradeCooldownStatus(queryClient, id);
			}
			setTradeSubmitting(false);
		}
	};

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

					<p className="font-jakarta text-white/70">
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

	const auctionLeadBid =
		auctionPhase === 'active'
			? resolveHighestBid(creator.auctionBids, creator.auctionHighestBid)
			: null;

	const auctionStatValue =
		auctionLeadBid != null
			? formatAuctionBidAmount(auctionLeadBid)
			: creator.auctionPrice != null && creator.auctionPrice > 0
				? formatAuctionBidAmount(creator.auctionPrice)
				: '—';

	const statItems = [
		{
			label:
				auctionPhase === 'active' ? 'Current Highest Bid' : 'Current Price',
			value:
				auctionPhase === 'active'
					? auctionStatValue
					: formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator)),
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
	const twapDeviationPercent =
		twapPrice != null && spotPrice != null && spotPrice > 0
			? ((twapPrice - spotPrice) / spotPrice) * 100
			: null;

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
				stakingPoolBalance: 4820,
				totalStaked: creator.creatorShareSupply
					? Math.floor(creator.creatorShareSupply / 4)
					: 25,
				recentFeeInflow: 62,
			};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-8">
				{creator.deprecation && !deprecationDismissed && (
					<DeprecationBanner
						deprecation={creator.deprecation}
						onDismiss={() => setDeprecationDismissed(true)}
					/>
				)}

				<CreatorBreadcrumb
					parentLabel="Marketplace"
					parentHref="/"
					currentLabel={`${creator.title} Profile`}
				/>

				{isKeyDeprecated(creator) && (
					<KeyDeprecationBanner
						creator={creator}
						userAddress={userAddress}
						holdingsCount={holdingsCount}
						onInitiateBuyback={() => setBuybackModalOpen(true)}
						recentSettlement={recentSettlement}
					/>
				)}

				<MergeProposalBanner
					sourceKeyId={id || ''}
					holdingsCount={holdingsCount}
					isConnected={Boolean(userAddress)}
				/>

				<div className="flex items-start gap-3">
					<div className="min-w-0 flex-1 space-y-2">
						<CreatorProfileStaleIndicator
							visible={shouldShowBadge || isFallbackActive}
							isRefetching={isFetching || isOnChainLoading}
							onRefresh={() => {
								void refetch();
								void refetchOnChainMetadata();
							}}
						/>

						<CreatorProfileHeader
							name={displayName}
							symbol={displaySymbol}
							handle={creator.socialHandle || creator.instructorId}
							creatorId={creator.id}
							isVerified={creator.isVerified}
							avatarUrl={displayAvatar}
							bio={displayDescription}
							priceStroops={resolveCreatorKeyPriceStroops(creator)}
							showBackButton={hasMounted}
							isOnChainLoading={isOnChainLoading}
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
						labelName={displayName}
						className="mt-3 size-11 shrink-0 sm:size-9"
					/>
				</div>

				<SectionErrorBoundary sectionName="price history">
					<PriceHistoryChart
						data={priceHistory}
						interval={interval}
						isLoading={isPriceHistoryLoading}
						onIntervalChange={setInterval}
					/>
				</SectionErrorBoundary>

				<div data-testid="creator-stat-cards">
					<CreatorProfileStatRow items={statItems} />
				</div>

				<SectionErrorBoundary sectionName="key statistics">
					<KeyStatsPanel
						stats={keyStats}
						isLoading={isKeyStatsLoading}
						isError={isKeyStatsError}
						uniqueTraders={uniqueTraders}
						isUniqueTradersLoading={isUniqueTradersLoading}
					/>
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="performance bond">
					<PerformanceBondPanel
						bond={performanceBond}
						isLoading={isPerformanceBondLoading}
						isError={isPerformanceBondError}
					/>
				</SectionErrorBoundary>

				{isKeyDeprecated(creator) && (
					<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
						<DeprecationNotice reason={creator.deprecationReason} />
					</div>
				)}

				<div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<p className="text-xs font-semibold uppercase tracking-wider text-white/55">
								Key Purchase
							</p>

							{isLockedOut && <WhitelistStatusBadge />}
						</div>

						<p className="mt-0.5 text-sm text-white/80">
							{isKeyDeprecated(creator)
								? 'Key is deprecated. New buys are disabled.'
								: buyDisabledReason
									? buyDisabledReason
									: 'Purchase keys for this creator.'}
						</p>

						<SpreadIndicator
							className="mt-2"
							buyPriceStroops={keyConfig?.buyPriceStroops}
							sellPriceStroops={keyConfig?.sellPriceStroops}
							spreadStroops={keyConfig?.spreadStroops}
							spreadBps={keyConfig?.spreadBps}
							isLoading={isKeyConfigLoading}
						/>

						<OraclePriceIndicator
							className="mt-2"
							comparison={oracleComparison}
							freshness={oracleFreshness}
							source={oracleSource}
							isLoading={isOracleLoading}
						/>

						{creator.earlyAccessEnabled && (
							<span className="mt-2 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-200">
								Early access
							</span>
						)}

						{creator.publicLaunchDate && hasValidPublicLaunchDate && (
							<p className="mt-2 text-sm text-white/70">
								{isPublicLaunchPending
									? 'Public launch: '
									: 'Public trading is open. '}

								{isPublicLaunchPending && (
									<time dateTime={creator.publicLaunchDate}>
										{new Date(
											creator.publicLaunchDate
										).toLocaleString()}
									</time>
								)}
							</p>
						)}
					</div>

					<div className="flex items-center gap-2">
						<PriceAlertButton
							userId={userAddress}
							keyId={creator.id}
							keyName={creator.title || creator.name || 'Creator Key'}
							currentPrice={resolveCreatorKeyPriceStroops(creator) ?? 0}
						/>

						{isKeyDeprecated(creator) ? (
							<Button
								disabled
								data-testid="key-detail-buy-button"
								variant="outline"
								className="min-h-11 w-full rounded-xl font-bold sm:h-10 sm:min-h-0 sm:w-auto"
							>
								Buy Disabled (Deprecated)
							</Button>
						) : buyDisabledReason ? (
							<Tooltip content={buyDisabledReason}>
								<span
									className="inline-flex w-full sm:w-auto"
									tabIndex={0}
								>
									<Button
										type="button"
										disabled
										data-testid="key-detail-buy-button"
										className="min-h-11 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300 sm:h-10 sm:min-h-0 sm:w-auto"
									>
										Buy Key
									</Button>
								</span>
							</Tooltip>
						) : (
							<TradeCooldownButton
								cooldown={tradeCooldown}
								label="Buy Key"
								className="min-h-11 w-full rounded-xl font-bold sm:h-10 sm:min-h-0 sm:w-auto"
								onClick={() => setBuyDialogOpen(true)}
								buttonProps={{
									'data-testid': 'key-detail-buy-button',
								}}
							/>
						)}
					</div>
				</div>

				{auctionPhase !== 'inactive' && (
					<AuctionPhaseSection
						creatorId={creator.id}
						auctionPrice={creator.auctionPrice}
						auctionSupply={creator.auctionSupply}
						auctionSold={creator.auctionSold}
						auctionEndsAt={creator.auctionEndsAt}
						auctionMinIncrement={creator.auctionMinIncrement}
						auctionHighestBid={creator.auctionHighestBid}
						auctionBids={creator.auctionBids}
					/>
				)}

				{userAddress && !isTradeCooldownActive && (
					<BuyCooldownCountdown nextBuyAllowedAt={nextBuyAllowedAt} />
				)}

				<div className="flex justify-end">
					<ShareTwitterButton
						creatorId={creator.id}
						creatorName={creator.title}
						priceXlm={formatDisplayKeyPrice(
							resolveCreatorKeyPriceStroops(creator)
						).replace(' XLM', '')}
						userAddress={userAddress}
						userHoldingsCount={holdingsCount}
						onClick={() => {
							setLastPurchasedAmount(holdingsCount);
							setShareModalOpen(true);
						}}
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
						<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
											className="-m-1 p-1 text-white/50"
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
											? 'text-sm font-semibold tabular-nums text-emerald-400'
											: 'text-sm font-semibold tabular-nums text-rose-400'
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

				<StakingRewardsSection {...stakingStats} isLoading={isLoading} />

				{/* Staking Vault — stake keys, track locks, claim rewards (#1017) */}
				<StakingVaultPanel
					keyId={id ?? ''}
					userAddress={userAddress}
					availableBalance={holdingsCount}
					rewardPoolBalance={stakingStats.stakingPoolBalance ?? 0}
					isLoading={isLoading}
				/>

				{auctionPhase !== 'active' && (
					<>
						<div
							className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
							data-testid="creator-chart-container"
						>
							<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
								Price Curve
							</h2>

							<BondingCurveChart
								data={chartData}
								currentSupply={creator.creatorShareSupply ?? 100}
								height={300}
							/>
						</div>

						<SectionErrorBoundary sectionName="curve milestones">
							<GraduatedCurveMilestoneChart
								keyId={creator.id}
								currentSupply={creator.creatorShareSupply ?? 0}
							/>
						</SectionErrorBoundary>

						<KeySimulationTool
							currentSupply={creator.creatorShareSupply ?? 100}
							protocolFeeBps={creator.protocolFeeBps}
							creatorFeeBps={creator.creatorFeeBps}
						/>
					</>
				)}
				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="holder-concentration-container"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Holder Concentration
					</h2>

					<SectionErrorBoundary sectionName="holder concentration">
						<HolderConcentrationChart
							holders={holders}
							totalSupply={creator.creatorShareSupply}
						/>
					</SectionErrorBoundary>
				</div>

				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<div className="mb-6 flex items-center justify-between gap-4">
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Fee Structure
						</h2>

						<CreatorProfileStaleIndicator
							visible={shouldShowBadge}
							isRefetching={isFetching || isOnChainLoading}
							onRefresh={handleRefetch}
						/>
					</div>

					<CreatorProfileInfoGrid items={feeItems} />
				</div>

				<SectionErrorBoundary sectionName="co-creator information">
					<CoCreatorSection
						courseId={creator.id}
						coCreatorAddress={creator.coCreatorAddress}
						coCreatorSplitBps={creator.coCreatorSplitBps}
						totalPaidToCoCreator={creator.totalPaidToCoCreator}
						totalPaidToCreator={creator.totalPaidToCreator}
					/>
				</SectionErrorBoundary>

				<div
					data-testid="creator-holders-container"
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Key Holders
					</h2>

					<SectionErrorBoundary sectionName="key holders">
						<KeyHolderList
							holders={holders}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							fetchNextPage={() => {
								void fetchNextPage();
							}}
						/>
					</SectionErrorBoundary>
				</div>

				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Exclusive Content
					</h2>

					<SubscriptionAccessGate
						creatorId={creator.id}
						minimumHolding={1}
						onBuyClick={() => setBuyDialogOpen(true)}
					>
						<div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
							<p className="text-white/80">
								🎉 Welcome to the exclusive content section! Here you
								can access premium videos, articles, and perks from{' '}
								{creator.title || creator.name || 'this creator'}.
							</p>
						</div>
					</SubscriptionAccessGate>
				</div>

				<div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Activity
					</h2>

					<SectionErrorBoundary sectionName="creator activity">
						<CreatorActivityFeed creatorId={creator.id} />
					</SectionErrorBoundary>
				</div>

				{isKeyDeprecated(creator) && (
					<KeyBuybackModal
						open={buybackModalOpen}
						onOpenChange={setBuybackModalOpen}
						creatorId={creator.id}
						creatorTitle={creator.title || creator.name || 'Creator Key'}
						holdingsCount={holdingsCount}
						buybackPriceStroops={
							resolveCreatorKeyPriceStroops(creator) ?? 0
						}
						userAddress={userAddress}
						onSettled={receipt => {
							setRecentSettlement(receipt);
						}}
					/>
				)}

				{creator && (
					<TradeDialog
						open={buyDialogOpen}
						side="buy"
						creatorName={creator.title || creator.name || 'Creator'}
						availableHoldings={holdingsCount}
						keyPriceStroops={resolveCreatorKeyPriceStroops(creator)}
						currentSupply={creator.creatorShareSupply}
						maxBuyQuantity={creator.maxBuyQuantity}
						launchPenaltyBps={creator.launchPenaltyBps}
						keyConfig={keyConfig}
						isKeyConfigLoading={isKeyConfigLoading}
						onOpenChange={setBuyDialogOpen}
						onConfirm={handleConfirmBuy}
						isSubmitting={tradeSubmitting}
						requireConfirmation={true}
					/>
				)}

				{creator && (
					<ShareModal
						open={shareModalOpen}
						onOpenChange={setShareModalOpen}
						creatorId={creator.id}
						creatorName={creator.title || creator.name || 'Creator'}
						amount={
							lastPurchasedAmount ??
							(holdingsCount > 0 ? holdingsCount : null)
						}
						priceXlm={formatDisplayKeyPrice(
							resolveCreatorKeyPriceStroops(creator)
						).replace(' XLM', '')}
						userAddress={userAddress}
						onDismiss={() => setShareModalOpen(false)}
					/>
				)}
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
