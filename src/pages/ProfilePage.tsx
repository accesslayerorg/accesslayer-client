import {
	useMemo,
	useState,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAccount } from 'wagmi';
import {
	BarChart2,
	Clock,
	Coins,
	Activity,
	ArrowLeftRight,
	Droplets,
} from 'lucide-react';
import ReferralLinkPanel from '@/components/common/ReferralLinkPanel';
import PortfolioSummaryHeader from '@/components/common/PortfolioSummaryHeader';
import HeldKeysGrid from '@/components/common/HeldKeysGrid';
import StakingPositionsList from '@/components/common/StakingPositionsList';
import LiquidityPositionsSection from '@/components/common/LiquidityPositionsSection';
import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import AtomicSwapHistory from '@/components/common/AtomicSwapHistory';
import ProtocolRevenueClaim from '@/components/common/ProtocolRevenueClaim';
import ProtocolRevenueDistributionTable from '@/components/common/ProtocolRevenueDistributionTable';
import WalletActivityFeed from '@/components/common/WalletActivityFeed';
import TruncatedAddress from '@/components/common/TruncatedAddress';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { useStakingPositions } from '@/hooks/useStakingPositions';
import { isOwnWallet } from '@/utils/isOwnWallet';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import {
	calculatePnLSummary,
	calculatePortfolioValue,
	sortHoldingsByTotalValue,
} from '@/utils/portfolioValue.utils';
import { computeStakingPortfolioValueStroops } from '@/utils/stakingPositions.utils';
import { cn } from '@/lib/utils';

const TABS = [
	{ label: 'Holdings', value: 'holdings', icon: <BarChart2 /> },
	{ label: 'Staking', value: 'staking', icon: <Coins /> },
	{ label: 'Liquidity', value: 'liquidity', icon: <Droplets /> },
	{ label: 'Trade History', value: 'trade-history', icon: <Clock /> },
	{ label: 'Atomic Swaps', value: 'atomic-swaps', icon: <ArrowLeftRight /> },
	{ label: 'Activity', value: 'activity', icon: <Activity /> },
];

const STAKING_SUBTABS = [
	{ label: 'Positions', value: 'positions' },
	{ label: 'Claim', value: 'claim' },
	{ label: 'Protocol Revenue', value: 'protocol-revenue' },
];

const VALID_STAKING_SUBTABS = STAKING_SUBTABS.map(subtab => subtab.value);

// Mock wallet address – in a real app this would come from the wallet provider.
const DEMO_WALLET =
	'GDEMOWALLET0000000000000000000000000000000000000000000000001';

const SHARE_COPIED_MS = 2000;

// For demo purposes, generate some mock keys. In a real app these would
// come from the backend (the user's keys / most traded key etc.).
const keys = [
	{ id: 'alpha', label: 'Alpha Key' },
	{ id: 'beta', label: 'Beta Key' },
	{ id: 'gamma', label: 'Gamma Key' },
];

const VALID_TABS = TABS.map(t => t.value);

function resolveCurrentPriceStroops(priceFields?: {
	priceStroops?: number | null;
	price?: number | null;
}): number | null {
	if (!priceFields) return null;
	const priceStroops = resolveCreatorKeyPriceStroops(priceFields);
	return priceStroops != null && priceStroops > 0 ? priceStroops : null;
}

/**
 * User profile page (#921).
 *
 * Serves as both the owner's personal portfolio dashboard (`/profile`) and a
 * shareable public portfolio (`/profile/:wallet`). Shows a portfolio summary
 * (held keys + staking positions), a grid of held creator keys valued at
 * current bond-curve prices, active staking positions with lock status and
 * claimable rewards, and a cursor-paginated trade history with infinite
 * scroll. Wallet-specific actions (buy/sell/redeem/claim/share) are only
 * rendered when the viewer owns the profile.
 */
export default function ProfilePage() {
	const { wallet: publicWallet } = useParams<{ wallet: string }>();
	const { address: connectedAddress } = useAccount();
	const profile = useProfileStore(state => state.profile);
	const [searchParams, setSearchParams] = useSearchParams();
	const requestedTab = searchParams.get('tab');
	const requestedSubTab = searchParams.get('subtab');

	const [activeTabState, setActiveTabState] = useState(
		VALID_TABS.includes(requestedTab ?? '')
			? (requestedTab as string)
			: 'holdings'
	);
	const [stakingSubTabState, setStakingSubTabState] = useState(
		VALID_STAKING_SUBTABS.includes(requestedSubTab as string)
			? (requestedSubTab as string)
			: 'positions'
	);
	const [isShareCopied, setIsShareCopied] = useState(false);

	const profileWallet = publicWallet?.trim() || connectedAddress || DEMO_WALLET;
	const isOwnProfile = !publicWallet
		? true
		: isOwnWallet(connectedAddress ?? null, publicWallet);

	useDocumentTitle(
		isOwnProfile ? 'My Portfolio — AccessLayer' : 'Portfolio — AccessLayer'
	);

	const activeTab = VALID_TABS.includes(requestedTab ?? '')
		? (requestedTab as string)
		: activeTabState;

	const activeStakingSubTab = VALID_STAKING_SUBTABS.includes(
		requestedSubTab as string
	)
		? (requestedSubTab as string)
		: stakingSubTabState;

	const holdingsQuery = useWalletHoldings(profileWallet);
	const { data: creators = [], isLoading: areCreatorsLoading } =
		useCreatorPrices();
	const stakingQuery = useStakingPositions(profileWallet);

	const heldPositions = useMemo(
		() =>
			sortHoldingsByTotalValue(
				(holdingsQuery.data ?? [])
					.map(holding => {
						const creator = creators.find(
							candidate => candidate.id === holding.creatorId
						);
						const currentPriceStroops =
							resolveCurrentPriceStroops(creator) ??
							resolveCurrentPriceStroops(holding);
						return {
							...holding,
							priceStroops: currentPriceStroops,
							price: null,
						};
					})
					.filter(holding => (holding.quantity ?? 0) > 0)
			),
		[holdingsQuery.data, creators]
	);

	const stakingPositions = useMemo(
		() =>
			(stakingQuery.data?.positions ?? []).map(position => {
				const creator = creators.find(
					candidate => candidate.id === position.keyId
				);
				const currentPriceStroops =
					resolveCurrentPriceStroops(creator) ??
					resolveCurrentPriceStroops(position);
				return currentPriceStroops == null
					? position
					: {
							...position,
							priceStroops: currentPriceStroops,
							price: null,
						};
			}),
		[stakingQuery.data?.positions, creators]
	);

	const activeStakingPositionCount = stakingPositions.filter(
		position => (position.stakedQuantity ?? 0) > 0
	).length;

	const portfolioValue = useMemo(
		() => calculatePortfolioValue(heldPositions),
		[heldPositions]
	);
	const pnlSummary = useMemo(
		() => calculatePnLSummary(heldPositions),
		[heldPositions]
	);
	const stakedValueStroops = useMemo(
		() => computeStakingPortfolioValueStroops(stakingPositions),
		[stakingPositions]
	);

	const isPriceLoading =
		holdingsQuery.isLoading ||
		areCreatorsLoading ||
		stakingQuery.isLoading ||
		portfolioValue.status === 'loading';

	const handleTabChange = (value: string) => {
		setActiveTabState(value);
		setSearchParams(
			previous => {
				const next = new URLSearchParams(previous);
				next.set('tab', value);
				return next;
			},
			{ replace: true }
		);
	};

	const handleStakingSubTabChange = (value: string) => {
		setStakingSubTabState(value);
		setSearchParams(
			previous => {
				const next = new URLSearchParams(previous);
				next.set('tab', 'staking');
				next.set('subtab', value);
				return next;
			},
			{ replace: true }
		);
	};

	const handleShareProfile = async () => {
		const url = `${window.location.origin}/profile/${encodeURIComponent(profileWallet)}`;

		try {
			await copyTextToClipboard(url);
			setIsShareCopied(true);
			window.setTimeout(() => setIsShareCopied(false), SHARE_COPIED_MS);
		} catch {
			if (typeof window.prompt === 'function') {
				window.prompt(url);
			}
		}
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-6">
				<div>
					<h1 className="text-2xl font-black">
						{isOwnProfile ? 'My Portfolio' : 'Portfolio'}
					</h1>
					{isOwnProfile ? (
						<p className="text-sm text-white/60">
							{profile?.firstName} {profile?.lastName}
						</p>
					) : (
						<div className="mt-1">
							<TruncatedAddress address={profileWallet} />
						</div>
					)}
				</div>

				<PortfolioSummaryHeader
					heldValueStroops={portfolioValue.totalStroops}
					stakedValueStroops={stakedValueStroops}
					heldPositionCount={portfolioValue.heldPositionCount}
					stakedPositionCount={activeStakingPositionCount}
					pnl={pnlSummary}
					isPriceLoading={isPriceLoading}
					isOwnProfile={isOwnProfile}
					onShareProfile={handleShareProfile}
					isShareCopied={isShareCopied}
				/>

				{/* Tab navigation */}
				<ProfileTabPillGroup
					tabs={TABS}
					activeTab={activeTab}
					onTabChange={handleTabChange}
					enableHashRouting
				/>

				{/* Holdings panel */}
				{activeTab === 'holdings' && (
					<section
						id="profile-panel-holdings"
						role="tabpanel"
						aria-labelledby="profile-tab-holdings"
						data-testid="portfolio-holdings-panel"
						className="space-y-6"
					>
						<div>
							<h2 className="font-grotesque text-xl font-bold text-white">
								Held Keys
							</h2>
							<p className="mt-1 text-sm text-white/60">
								Every creator key this wallet holds, valued at the
								current bonding-curve price.
							</p>
						</div>

						<HeldKeysGrid
							positions={heldPositions}
							creators={creators}
							isOwnProfile={isOwnProfile}
							isLoading={
								holdingsQuery.isLoading || areCreatorsLoading
							}
							emptyBrowseHref="/creators"
						/>

						{isOwnProfile && (
							<div className="max-w-md">
								<ReferralLinkPanel
									initialKeyId={keys[0].id}
									keys={keys}
								/>
							</div>
						)}

						{/* Full referral programme dashboard (#963) */}
						<Link
							to="/referrals"
							className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-amber-400/30 hover:bg-amber-400/10"
							data-testid="portfolio-referral-dashboard-link"
						>
							Open referral programme
						</Link>
					</section>
				)}

				{/* Staking panel */}
				{activeTab === 'staking' && (
					<section
						id="profile-panel-staking"
						role="tabpanel"
						aria-labelledby="profile-tab-staking"
						data-testid="portfolio-staking-panel"
						className="space-y-6"
					>
						<div>
							<h2 className="font-grotesque text-xl font-bold text-white">
								Staking
							</h2>
							<p className="mt-1 text-sm text-white/60">
								Keys currently locked in the staking contract with
								their unlock timers and accrued rewards.
							</p>
						</div>

					{!isOwnProfile ? (
						<StakingPositionsList
							walletAddress={profileWallet}
							isOwnProfile={false}
							positions={stakingPositions}
							isLoading={stakingQuery.isLoading}
							isError={stakingQuery.isError}
						/>
					) : (
							<>
								{/* Sub-tab navigation within Staking section */}
								<div
									className="flex items-center gap-2 border-b border-white/10 pb-4"
									role="tablist"
									aria-label="Staking section sub-tabs"
								>
									{STAKING_SUBTABS.map(subtab => (
										<button
											key={subtab.value}
											type="button"
											role="tab"
											id={`staking-subtab-${subtab.value}`}
											aria-selected={
												activeStakingSubTab === subtab.value
											}
											aria-controls={`staking-subpanel-${subtab.value}`}
											data-testid={`staking-subtab-${subtab.value}`}
											onClick={() =>
												handleStakingSubTabChange(subtab.value)
											}
											className={cn(
												'rounded-full px-4 py-1.5 text-xs font-semibold font-jakarta transition-all duration-200 outline-none',
												activeStakingSubTab === subtab.value
													? 'border border-amber-400/30 bg-amber-400/15 text-white'
													: 'border border-white/10 bg-white/[0.06] text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80'
											)}
										>
											{subtab.label}
										</button>
									))}
								</div>

								{/* Sub-tab panels */}
								{activeStakingSubTab === 'positions' ? (
									<div
										id="staking-subpanel-positions"
										role="tabpanel"
										aria-labelledby="staking-subtab-positions"
										data-testid="staking-subpanel-positions"
									>
									<StakingPositionsList
										walletAddress={profileWallet}
										positions={stakingPositions}
										isLoading={stakingQuery.isLoading}
										isError={stakingQuery.isError}
									/>
									</div>
								) : activeStakingSubTab === 'claim' ? (
									<div
										id="staking-subpanel-claim"
										role="tabpanel"
										aria-labelledby="staking-subtab-claim"
										data-testid="staking-subpanel-claim"
									>
										<ProtocolRevenueClaim
											walletAddress={profileWallet}
										/>
									</div>
								) : (
									<div
										id="staking-subpanel-protocol-revenue"
										role="tabpanel"
										aria-labelledby="staking-subtab-protocol-revenue"
										data-testid="staking-subpanel-protocol-revenue"
									>
										<ProtocolRevenueDistributionTable
											walletAddress={profileWallet}
										/>
									</div>
								)}
							</>
						)}
					</section>
				)}

				{/* Liquidity provider panel (#1030) */}
				{activeTab === 'liquidity' && (
					<div
						id="profile-panel-liquidity"
						role="tabpanel"
						aria-labelledby="profile-tab-liquidity"
						data-testid="portfolio-liquidity-panel"
					>
						<LiquidityPositionsSection
							publicWallet={publicWallet?.trim() || undefined}
						/>
					</div>
				)}

				{/* Trade history panel */}
				{activeTab === 'trade-history' && (
					<section
						id="profile-panel-trade-history"
						role="tabpanel"
						aria-labelledby="profile-tab-trade-history"
						data-testid="portfolio-trade-history-panel"
					>
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
							<div className="mb-6">
								<h2 className="font-grotesque text-2xl font-bold text-white">
									Trade History
								</h2>
								<p className="mt-1 text-sm text-white/65">
									A full audit trail of past buys and sells
								</p>
							</div>						<TradeHistoryTable
							walletAddress={profileWallet}
							infiniteScroll
						/>
					</div>
				</section>
			)}

				{/* Atomic swap history panel (#979) */}
				{activeTab === 'atomic-swaps' && (
					<section
						id="profile-panel-atomic-swaps"
						role="tabpanel"
						aria-labelledby="profile-tab-atomic-swaps"
						data-testid="portfolio-atomic-swaps-panel"
					>
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
							<div className="mb-6">
								<h2 className="font-grotesque text-2xl font-bold text-white">
									Atomic Swap History
								</h2>
								<p className="mt-1 text-sm text-white/65">
									Completed direct key exchanges with counterparties
								</p>
							</div>

							<AtomicSwapHistory walletAddress={profileWallet} />
						</div>
					</section>
				)}

				{/* Activity feed panel */}
				{activeTab === 'activity' && (
					<section
						id="profile-panel-activity"
						role="tabpanel"
						aria-labelledby="profile-tab-activity"
						data-testid="portfolio-activity-panel"
					>
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
							<div className="mb-6">
								<h2 className="font-grotesque text-2xl font-bold text-white">
									Wallet Activity
								</h2>
								<p className="mt-1 text-sm text-white/65">
									All trading, staking, and governance events for your wallet
								</p>
							</div>

							<WalletActivityFeed address={profileWallet} />
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
