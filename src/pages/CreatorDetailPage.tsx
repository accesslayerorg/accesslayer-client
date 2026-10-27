import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatorDetail, usePriceHistory } from '@/hooks/useCreators';
import { useKeyFreeze } from '@/hooks/useKeyFreeze';
import {
	useKeyPriceFloor,
	resolvePriceFloorStroops,
	isPriceFloorActive,
} from '@/hooks/useKeyPriceFloor';
import type { TradeSide } from '@/components/common/TradeDialog';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCreatorProfileStaleIndicator } from '@/hooks/useCreatorProfileStaleIndicator';
import { useOnChainMetadata } from '@/hooks/useOnChainMetadata';
import { resolveIpfsUrl } from '@/utils/ipfs.utils';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorSocialSection from '@/components/common/CreatorSocialSection';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import AnnouncementFeed from '@/components/common/AnnouncementFeed';
import SecondaryMarketSellPanel from '@/components/common/SecondaryMarketSellPanel';
import ActiveAuctionCard from '@/components/common/ActiveAuctionCard';
import RoyaltyEarningsCard from '@/components/creator/RoyaltyEarningsCard';
import TipCreatorPanel from '@/components/common/TipCreatorPanel';
import RecentTipsFeed from '@/components/common/RecentTipsFeed';
import CreatorProfileStaleIndicator from '@/components/common/CreatorProfileStaleIndicator';
import CreatorProfileStatRow from '@/components/common/CreatorProfileStatRow';
import BondingCurveChart from '@/components/common/BondingCurveChart';
import KeySimulationTool from '@/components/common/KeySimulationTool';
import BuyCooldownCountdown from '@/components/common/BuyCooldownCountdown';
import KeyHolderList from '@/components/common/KeyHolderList';
import HolderConcentrationChart from '@/components/common/HolderConcentrationChart';
import HolderConcentrationHeatmap from '@/components/common/HolderConcentrationHeatmap';
import HolderSnapshotHistory from '@/components/common/HolderSnapshotHistory';
import KeyAnalyticsHistoryChart from '@/components/common/KeyAnalyticsHistoryChart';
import ReputationBreakdownPanel from '@/components/common/ReputationBreakdownPanel';
import GraduationCelebration from '@/components/common/GraduationCelebration';
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
import KeyMintProgressSection from '@/components/common/KeyMintProgressSection';
import CoCreatorSection from '@/components/creator/CoCreatorSection';
import ShareTwitterButton from '@/components/common/ShareTwitterButton';
import { PriceHistoryChart } from '@/components/common/PriceHistoryChart';
import { BondingCurvePriceChart } from '@/components/common/BondingCurvePriceChart';
import SecondaryMarketPriceChart from '@/components/common/SecondaryMarketPriceChart';
import { KeyDepthChart } from '@/components/common/KeyDepthChart';
import { RevenueSharePanel } from '@/components/common/RevenueSharePanel';
import EarlyInvestorBonusChip from '@/components/common/EarlyInvestorBonusChip';
import PaymentScheduleTimeline from '@/components/common/PaymentScheduleTimeline';
import { useEarlyIncentive } from '@/hooks/useEarlyIncentive';
import { useSecondaryPrices } from '@/hooks/useSecondaryPrices';
import { usePaymentSchedule } from '@/hooks/usePaymentSchedule';
import type { SecondaryPriceRange } from '@/services/secondaryPrices.service';
import type { PriceHistoryInterval } from '@/services/course.service';
import TradeDialog from '@/components/common/TradeDialog';
import SpreadIndicator from '@/components/common/SpreadIndicator';
import OraclePriceIndicator from '@/components/common/OraclePriceIndicator';
import { useKeyOraclePrice } from '@/hooks/useKeyOraclePrice';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { usePurchaseConfetti } from '@/hooks/usePurchaseConfetti';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyTwap, type TwapWindow } from '@/hooks/useKeyTwap';
import { useKeyStats } from '@/hooks/useKeyStats';
import { useKeyUniqueTraders } from '@/hooks/useKeyUniqueTraders';
import { useKeyReserve } from '@/hooks/useKeyReserve';
import ReserveBalanceChip from '@/components/common/ReserveBalanceChip';
import { getKeyReserveStatus } from '@/utils/keyReserve.utils';
import { useKeyConfig } from '@/hooks/useKeyConfig';
import KeyStatsPanel from '@/components/common/KeyStatsPanel';
import Skeleton from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GraduatedCurveMilestoneChart from '@/components/common/GraduatedCurveMilestoneChart';
import KeyDeprecationBanner from '@/components/common/KeyDeprecationBanner';
import ExitNoticeBanner from '@/components/common/ExitNoticeBanner';
import ReportIssueButton from '@/components/common/ReportIssueButton';
import SocialShareButton from '@/components/common/SocialShareButton';
import KeyTradingPausedBanner from '@/components/common/KeyTradingPausedBanner';
import KeyFreezeStatusBanner from '@/components/common/KeyFreezeStatusBanner';
import KeySplitBanner from '@/components/common/KeySplitBanner';
import AddToBundleButton from '@/components/common/AddToBundleButton';
import AddToBatchButton from '@/components/common/AddToBatchButton';
import MergeProposalBanner from '@/components/common/MergeProposalBanner';
import KeyBuybackModal from '@/components/common/KeyBuybackModal';
import type { KeyBuybackReceipt } from '@/hooks/useKeyBuyback';
import { usePerformanceBond } from '@/hooks/usePerformanceBond';
import PerformanceBondPanel from '@/components/common/PerformanceBondPanel';
import WhitelistStatusBadge from '@/components/common/WhitelistStatusBadge';
import ShareModal from '@/components/common/ShareModal';
import SubscriptionInvestmentPanel from '@/components/common/SubscriptionInvestmentPanel';
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
import {
	useKeyLockup,
	useRemainingUnlockSeconds,
	isKeyLockupActive,
} from '@/hooks/useKeyLockup';
import { formatUnlockCountdown } from '@/utils/lockupCountdown.utils';
import KeyLockupBadge from '@/components/common/KeyLockupBadge';
import { useAccount } from 'wagmi';
import { useKeyMarketMaker } from '@/hooks/useKeyMarketMaker';
import { MarketMakerChip, MMBadge } from '@/components/common/MarketMakerChip';

/** Series shown in the key detail price panel (#1220 adds the depth tab). */
type PriceChartTab = 'primary' | 'secondary' | 'depth' | 'revenue';

const PRICE_CHART_TABS: Array<{ id: PriceChartTab; label: string }> = [
	{ id: 'primary', label: 'Price history' },
	{ id: 'secondary', label: 'Secondary market' },
	{ id: 'depth', label: 'Depth' },
	{ id: 'revenue', label: 'Revenue Share' },
];

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
	const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
	const [tradeSubmitting, setTradeSubmitting] = useState(false);
	const [interval, setInterval] = useState<PriceHistoryInterval>('24h');
	const [priceChartTab, setPriceChartTab] = useState<PriceChartTab>('primary');
	const [secondaryRange, setSecondaryRange] =
		useState<SecondaryPriceRange>('7d');

	const {
		data: creator,
		isLoading,
		error,
		isFetching,
		refetch,
	} = useCreatorDetail(id || '');

	const { data: priceHistory, isLoading: isPriceHistoryLoading } =
		usePriceHistory(id || '', interval);

	// Active admin freeze (#1121): drives the banner and disables trading.
	const keyFreeze = useKeyFreeze(creator);

	// Configured price floor for this key (#1152)
	const { data: priceFloorData } = useKeyPriceFloor(id || '');
	const priceFloorStroops = resolvePriceFloorStroops(priceFloorData);
	const isFloorActive = isPriceFloorActive(
		creator ? resolveCreatorKeyPriceStroops(creator) : null,
		priceFloorStroops
	);

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

	// #1163 — wallet-scoped lock-up status: while active, selling is
	// disabled with a LockupActive reason and a live unlock countdown.
	const { data: keyLockup } = useKeyLockup(id || '', userAddress);
	const lockupRemainingSeconds = useRemainingUnlockSeconds(
		keyLockup?.unlockAt
	);
	const isLockupActive = isKeyLockupActive(keyLockup, lockupRemainingSeconds);

	const nextBuyAllowedAt =
		userPosition?.nextBuyAllowedAt ?? creator?.nextBuyAllowedAt ?? null;

	const [twapWindow, setTwapWindow] = useState<TwapWindow>('24h');
	const { data: twap, isLoading: isTwapLoading } = useKeyTwap(
		id || '',
		twapWindow
	);

	const {
		data: keyStats,
		isLoading: isKeyStatsLoading,
		isError: isKeyStatsError,
	} = useKeyStats(id || '');

	const { data: uniqueTraders, isLoading: isUniqueTradersLoading } =
		useKeyUniqueTraders(id || '');

	const { data: keyReserve } = useKeyReserve(id || '');
	const { data: marketMaker } = useKeyMarketMaker(id || '');

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

	const {
		data: earlyIncentive,
		isLoading: isEarlyIncentiveLoading,
	} = useEarlyIncentive(id || '');

	const {
		data: secondaryPrices,
		isLoading: isSecondaryPricesLoading,
	} = useSecondaryPrices(id || '', secondaryRange);

	const {
		data: paymentSchedule,
		isLoading: isPaymentScheduleLoading,
	} = usePaymentSchedule(id || '');

	const performanceBond =
		performanceBondData ?? creator?.performanceBond ?? null;

	const { phase: auctionPhase } = useAuctionPhase({
		auctionPrice: creator?.auctionPrice ?? null,
		auctionSupply: creator?.auctionSupply ?? null,
		auctionSold: creator?.auctionSold ?? null,
		auctionEndsAt: creator?.auctionEndsAt ?? null,
		auctionSettled: creator?.auctionSettled ?? null,
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
		: auctionPhase === 'active'
			? 'Key is currently in launch auction. Place a bid below to participate.'
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

	const { data: tradeCooldownStatus } = useTradeCooldownStatus(
		id || '',
		userAddress
	);

	const tradeCooldown: ActiveTradeCooldown | null = resolveActiveTradeCooldown(
		tradeCooldownStatus,
		nextBuyAllowedAt
	);

	const isTradeCooldownActive = isActiveCooldown(tradeCooldown);

	const handleConfirmTrade = async (
		amount: number,
		_pricePreview?: unknown,
		slippage?: {
			maxPriceStroops?: number | null;
			minPriceStroops?: number | null;
		} | null
	) => {
		setTradeSubmitting(true);

		if (tradeSide === 'sell') {
			try {
				showToast.loading(
					`Submitting sell for ${amount} key${amount === 1 ? '' : 's'}...`
				);

				await tradeMutation.mutateAsync({
					creatorId: id || '',
					amount: -amount,
					priceStroops: creator
						? resolveCreatorKeyPriceStroops(creator)
						: null,
					price: creator?.price,
					minPriceStroops: slippage?.minPriceStroops ?? null,
				});

				showToast.transactionSuccess(
					'Trade confirmed',
					`Sold ${formatNumber(amount)} key${
						amount === 1 ? '' : 's'
					} from ${creator?.title || 'Creator'}`
				);

				setBuyDialogOpen(false);
			} catch (error) {
				showToast.error(getSignatureErrorMessage(error));
			} finally {
				if (id) {
					invalidateTradeCooldownStatus(queryClient, id);
				}
				setTradeSubmitting(false);
			}
			return;
		}

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
		// Reserve backstop (#1208); hidden until the key has accrued a reserve.
		...(keyReserve && getKeyReserveStatus(keyReserve).visible
			? [
					{
						label: 'Reserve Balance',
						value: <ReserveBalanceChip reserve={keyReserve} />,
					},
				]
			: []),
		// Market maker indicator (#1237); hidden when no maker is registered.
		...(marketMaker?.active
			? [
					{
						label: 'Market Maker',
						value: <MarketMakerChip maker={marketMaker} />,
					},
				]
			: []),
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

				<div className="flex items-center justify-between gap-3">
					<CreatorBreadcrumb
						parentLabel="Marketplace"
						parentHref="/"
						currentLabel={`${creator.title} Profile`}
					/>
					<div className="flex items-center gap-1">
						<SocialShareButton
							share={{
								context: 'key',
								keyName: creator.title || creator.name || 'this key',
								priceXlm: formatDisplayKeyPrice(
									resolveCreatorKeyPriceStroops(creator)
								),
								change24h: creator.change24h,
								url:
									typeof window !== 'undefined'
										? `${window.location.origin}/creator/${creator.id}`
										: `/creator/${creator.id}`,
							}}
							title={`Share ${creator.title || creator.name || 'this key'}`}
						/>
						<ReportIssueButton
							keyId={creator.id}
							keyName={creator.title || creator.name}
						/>
					</div>
				</div>

				{creator.isRetiring ? (
					// Retirement is the stricter, time-bounded terminal state
					// (#1246); its own banner replaces the deprecation one below
					// rather than stacking both for the same key.
					<ExitNoticeBanner
						creator={creator}
						holdingsCount={holdingsCount}
						onSellNow={() =>
							document
								.getElementById('secondary-market-sell-panel')
								?.scrollIntoView({ behavior: 'smooth', block: 'start' })
						}
					/>
				) : (
					isKeyDeprecated(creator) && (
						<KeyDeprecationBanner
							creator={creator}
							userAddress={userAddress}
							holdingsCount={holdingsCount}
							onInitiateBuyback={() => setBuybackModalOpen(true)}
							recentSettlement={recentSettlement}
						/>
					)
				)}

				<KeyTradingPausedBanner tradingPaused={creator.tradingPaused} />

				<KeySplitBanner
					creator={creator}
					keyId={creator.id}
					userAddress={userAddress}
					holdingsCount={holdingsCount}
				/>

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

				{creator && (
					<CreatorSocialSection
						address={creator.instructorId}
						socialLinkSources={[creator]}
					/>
				)}

				{keyFreeze && <KeyFreezeStatusBanner freeze={keyFreeze} />}

				{/* Primary / secondary market price tabs (#1234), depth tab (#1220)
				    and revenue share tab (#1223) */}
				<div
					className="flex w-full max-w-full flex-wrap rounded-lg border border-white/10 bg-black/20 p-1 sm:w-fit"
					role="tablist"
					aria-label="Key detail series"
				>
					{PRICE_CHART_TABS.map(tab => (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={priceChartTab === tab.id}
							data-testid={`price-chart-tab-${tab.id}`}
							className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-colors ${
								priceChartTab === tab.id
									? 'bg-emerald-400 text-slate-950'
									: 'text-white/55 hover:bg-white/10 hover:text-white'
							}`}
							onClick={() => setPriceChartTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>

				{priceChartTab === 'primary' ? (
					<SectionErrorBoundary sectionName="price history">
						<PriceHistoryChart
							data={priceHistory}
							interval={interval}
							isLoading={isPriceHistoryLoading}
							onIntervalChange={setInterval}
						/>
					</SectionErrorBoundary>
				) : priceChartTab === 'secondary' ? (
					<SectionErrorBoundary sectionName="secondary market price">
						<SecondaryMarketPriceChart
							data={secondaryPrices}
							isLoading={isSecondaryPricesLoading}
							onRangeChange={setSecondaryRange}
						/>
					</SectionErrorBoundary>
				) : priceChartTab === 'depth' ? (
					<SectionErrorBoundary sectionName="market depth">
						<KeyDepthChart keyId={id || ''} />
					</SectionErrorBoundary>
				) : (
					<SectionErrorBoundary sectionName="revenue share">
						<RevenueSharePanel
							keyId={id || ''}
							wallet={connectedWalletAddress ?? undefined}
						/>
					</SectionErrorBoundary>
				)}

				{/* Live bonding-curve price chart (#1115) */}
				<SectionErrorBoundary sectionName="bonding curve price chart">
					<BondingCurvePriceChart creatorId={id || ''} />
				</SectionErrorBoundary>

				<div data-testid="creator-stat-cards">
					<CreatorProfileStatRow items={statItems} />
				</div>

				{/* Mint Progress Bar & Supply Cap */}
				<KeyMintProgressSection
					currentSupply={creator.creatorShareSupply}
					maxSupply={creator.maxSupply}
					isLoading={isLoading}
					onBuy={() => {
						setTradeSide('buy');
						setBuyDialogOpen(true);
					}}
					isSubmitting={tradeSubmitting || tradeMutation.isPending}
				/>

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

				<SectionErrorBoundary sectionName="payment schedule">
					<PaymentScheduleTimeline
						schedule={paymentSchedule}
						isLoading={isPaymentScheduleLoading}
					/>
				</SectionErrorBoundary>

				{isKeyDeprecated(creator) && (
					<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
						<DeprecationNotice reason={creator.deprecationReason} />
					</div>
				)}

				<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
					<Tabs defaultValue="buy" className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-white/5 mb-4">
							<TabsTrigger value="buy" data-testid="invest-tab-buy">
								Buy
							</TabsTrigger>
							<TabsTrigger value="subscribe" data-testid="invest-tab-subscribe">
								Subscribe
							</TabsTrigger>
						</TabsList>

						<TabsContent value="buy" className="space-y-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
											: keyFreeze
												? keyFreeze.reason
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

									<EarlyInvestorBonusChip
										incentive={earlyIncentive}
										isLoading={isEarlyIncentiveLoading}
										className="mt-2"
									/>

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

								<div className="flex flex-wrap items-center gap-2">
									<AddToBatchButton
										keyId={creator.id}
										keyName={displayName}
										priceStroops={resolveCreatorKeyPriceStroops(creator) ?? 0}
										currentSupply={creator.creatorShareSupply ?? null}
										thumbnail={displayAvatar ?? undefined}
										disabled={Boolean(keyFreeze)}
										disabledReason={keyFreeze?.reason}
										className="min-h-11 w-full sm:h-10 sm:min-h-0 sm:w-auto"
									/>

									<AddToBundleButton
										keyId={creator.id}
										keyName={displayName}
										priceStroops={resolveCreatorKeyPriceStroops(creator) ?? 0}
										currentSupply={creator.creatorShareSupply ?? null}
										thumbnail={displayAvatar ?? undefined}
										disabled={Boolean(keyFreeze)}
										disabledReason={keyFreeze?.reason}
										className="min-h-11 w-full sm:h-10 sm:min-h-0 sm:w-auto"
									/>

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
									) : keyFreeze ? (
										<UnavailableAction disabled reason={keyFreeze.reason}>
											<Button
												type="button"
												data-testid="key-detail-buy-button"
												className="min-h-11 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300 sm:h-10 sm:min-h-0 sm:w-auto"
											>
												Buy Key
											</Button>
										</UnavailableAction>
									) : creator.tradingPaused ? (
										<UnavailableAction
											disabled
											reason="Trading is currently paused"
										>
											<Button
												type="button"
												data-testid="key-detail-buy-button"
												className="min-h-11 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300 sm:h-10 sm:min-h-0 sm:w-auto"
											>
												Buy Key
											</Button>
										</UnavailableAction>
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
											onClick={() => {
												setTradeSide('buy');
												setBuyDialogOpen(true);
											}}
											buttonProps={{
												'data-testid': 'key-detail-buy-button',
											}}
										/>
									)}

									{holdingsCount > 0 &&
										(isLockupActive ? (
											<UnavailableAction
												disabled
												reason={`LockupActive: Selling is disabled while this position is under lock-up. Unlocks in ${formatUnlockCountdown(lockupRemainingSeconds)}.`}
											>
												<Button
													type="button"
													disabled
													data-testid="key-detail-sell-button"
													variant="outline"
													className="min-h-11 w-full rounded-xl font-bold sm:h-10 sm:min-h-0 sm:w-auto"
												>
													Sell Key (Locked)
												</Button>
											</UnavailableAction>
										) : isFloorActive ? (
											<UnavailableAction
												disabled
												reason="PriceFloorActive: Price floor is active. Selling is disabled while current price is at or below the floor price."
											>
												<Button
													type="button"
													disabled
													data-testid="key-detail-sell-button"
													variant="outline"
													className="min-h-11 w-full rounded-xl font-bold sm:h-10 sm:min-h-0 sm:w-auto"
												>
													Sell Key
												</Button>
											</UnavailableAction>
										) : (
											<Button
												type="button"
												data-testid="key-detail-sell-button"
												variant="outline"
												className="min-h-11 w-full rounded-xl font-bold sm:h-10 sm:min-h-0 sm:w-auto"
												onClick={() => {
													setTradeSide('sell');
													setBuyDialogOpen(true);
												}}
											>
												Sell Key
											</Button>
										))}

									{holdingsCount > 0 && isLockupActive && (
										<KeyLockupBadge
											unlockAt={keyLockup?.unlockAt}
											className="shrink-0"
										/>
									)}
								</div>
							</div>
						</TabsContent>

						<TabsContent value="subscribe" className="space-y-4">
							<SubscriptionInvestmentPanel
								creatorId={creator.id}
								currentPriceStroops={resolveCreatorKeyPriceStroops(creator)}
								disabled={isKeyDeprecated(creator) || Boolean(keyFreeze) || creator.tradingPaused}
								disabledReason={
									isKeyDeprecated(creator)
										? 'Key is deprecated. Subscriptions are disabled.'
										: keyFreeze
										? keyFreeze.reason
										: creator.tradingPaused
										? 'Trading is currently paused.'
										: undefined
								}
							/>
						</TabsContent>
					</Tabs>
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
						auctionClearingPrice={creator.auctionClearingPrice}
						auctionAllocation={creator.auctionAllocation}
						auctionSettled={creator.auctionSettled}
						userAddress={userAddress}
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
						<div
							aria-label={`Loading ${twapWindow === '1h' ? '1 hour' : '24 hour'} TWAP`}
							role="status"
						>
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
										TWAP ({twapWindow})
									</span>

									<Tooltip
										content={`Time-weighted average price over the past ${twapWindow === '1h' ? '1 hour' : '24 hours'}. Less sensitive to short-term manipulation.`}
									>
										<button
											type="button"
											aria-label={`What is ${twapWindow === '1h' ? '1 hour' : '24 hour'} TWAP?`}
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

				<SectionErrorBoundary sectionName="graduation">
					<GraduationCelebration
						keyId={creator.id}
						keyName={creator.title || creator.name || 'This key'}
						currentSupply={creator.creatorShareSupply}
						holderCount={holders.length > 0 ? holders.length : null}
						walletAddress={connectedWalletAddress}
					/>
				</SectionErrorBoundary>

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
								currentPriceStroops={spotPrice ?? undefined}
								spotPriceStroops={spotPrice}
								twapPriceStroops={twapPrice}
								twapWindow={twapWindow}
								onTwapWindowChange={setTwapWindow}
								isTwapLoading={isTwapLoading}
								priceFloorStroops={priceFloorStroops}
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
					data-testid="key-analytics-history-container"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Analytics History
					</h2>

					<SectionErrorBoundary sectionName="key analytics history">
						<KeyAnalyticsHistoryChart keyId={creator.id} />
					</SectionErrorBoundary>
				</div>

				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="reputation-breakdown-container"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Reputation
					</h2>

					<SectionErrorBoundary sectionName="reputation breakdown">
						<ReputationBreakdownPanel keyId={creator.id} />
					</SectionErrorBoundary>
				</div>

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

				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="holder-concentration-heatmap-container"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Holder Concentration Heatmap
					</h2>

					<SectionErrorBoundary sectionName="holder concentration heatmap">
						<HolderConcentrationHeatmap keyId={creator.id} />
					</SectionErrorBoundary>
				</div>

				<div
					className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
					data-testid="holder-snapshot-history-container"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Holder Snapshot History
					</h2>

					<SectionErrorBoundary sectionName="holder snapshot history">
						<HolderSnapshotHistory keyId={creator.id} />
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

				<div
					id="secondary-market-sell-panel"
					className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
				>
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Secondary Market
						{marketMaker?.active && (
							<MMBadge aria-label="Market maker provides liquidity on this market" />
						)}
					</h2>
					<SectionErrorBoundary sectionName="secondary market">
						<div className="space-y-4">
							<SecondaryMarketSellPanel
								availableFractions={holdingsCount}
								onCreateAuction={async () => {
									/* create_auction contract call wired by the parent */
								}}
							/>
							<ActiveAuctionCard
								walletAddress={userAddress}
								auction={{
									auctionId: 'active',
									seller: userAddress ?? '',
									fractionAmount: Math.max(1, holdingsCount),
									reservePriceStroops: resolveCreatorKeyPriceStroops(creator) ?? 0,
									highestBidStroops: Math.round(
										(resolveHighestBid(creator.auctionBids, creator.auctionHighestBid) ?? 0) * 1e7
									),
									highestBidder: null,
									endsAt: new Date(Date.now() + 3_600_000),
									status: 'active',
								}}
							/>
						</div>
					</SectionErrorBoundary>
				</div>

				{/* Creator announcements feed (#1175) */}
				<div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="mb-6 font-grotesque text-xl font-black tracking-tight text-white">
						Announcements
					</h2>
					<SectionErrorBoundary sectionName="announcements">
						<AnnouncementFeed creatorId={creator.id} />
					</SectionErrorBoundary>
				</div>

				{/* Royalty earnings dashboard (#1177) */}
				<div className="mt-8">
					<SectionErrorBoundary sectionName="royalty earnings">
						<RoyaltyEarningsCard keyId={creator.id} />
					</SectionErrorBoundary>
				</div>

				{/* Tipping Panel & Public Tip Feed */}
				<div className="mt-8 space-y-6">
					<SectionErrorBoundary sectionName="creator tipping">
						<TipCreatorPanel
							creatorId={creator.id}
							creatorName={displayName}
							isHolder={holdingsCount > 0}
							userAddress={userAddress}
						/>
						<RecentTipsFeed
							creatorId={creator.id}
							className="mt-6"
						/>
					</SectionErrorBoundary>
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
						side={tradeSide}
						creatorName={creator.title || creator.name || 'Creator'}
						availableHoldings={holdingsCount}
						keyPriceStroops={resolveCreatorKeyPriceStroops(creator)}
						currentSupply={creator.creatorShareSupply}
						maxBuyQuantity={creator.maxBuyQuantity}
						launchPenaltyBps={creator.launchPenaltyBps}
						keyConfig={keyConfig}
						isKeyConfigLoading={isKeyConfigLoading}
						onOpenChange={setBuyDialogOpen}
						onConfirm={handleConfirmTrade}
						isSubmitting={tradeSubmitting}
						requireConfirmation={true}
						tradingPaused={creator.tradingPaused}
						keyFreeze={keyFreeze}
						priceFloorStroops={priceFloorStroops}
						priceFloorActive={isFloorActive}
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
