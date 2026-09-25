import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart2, Clock, Coins, Activity } from 'lucide-react';
import ReferralLinkPanel from '@/components/common/ReferralLinkPanel';
import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import ProtocolRevenueClaim from '@/components/common/ProtocolRevenueClaim';
import ProtocolRevenueDistributionTable from '@/components/common/ProtocolRevenueDistributionTable';
import WalletActivityFeed from '@/components/common/WalletActivityFeed';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

const TABS = [
	{ label: 'Holdings', value: 'holdings', icon: <BarChart2 /> },
	{ label: 'Staking', value: 'staking', icon: <Coins /> },
	{ label: 'Trade History', value: 'trade-history', icon: <Clock /> },
	{ label: 'Activity', value: 'activity', icon: <Activity /> },
];

const STAKING_SUBTABS = [
	{ label: 'Claim', value: 'claim' },
	{ label: 'Protocol Revenue', value: 'protocol-revenue' },
];

// Mock wallet address – in a real app this would come from the wallet provider.
const DEMO_WALLET =
	'GDEMOWALLET0000000000000000000000000000000000000000000000001';

// For demo purposes, generate some mock keys. In a real app these would
// come from the backend (the user's keys / most traded key etc.).
const keys = [
	{ id: 'alpha', label: 'Alpha Key' },
	{ id: 'beta', label: 'Beta Key' },
	{ id: 'gamma', label: 'Gamma Key' },
];

const VALID_TABS = TABS.map(t => t.value);

export default function ProfilePage() {
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
		requestedSubTab === 'protocol-revenue' ? 'protocol-revenue' : 'claim'
	);

	const activeTab = VALID_TABS.includes(requestedTab ?? '')
		? (requestedTab as string)
		: activeTabState;

	const activeStakingSubTab =
		requestedSubTab === 'protocol-revenue' || requestedSubTab === 'claim'
			? requestedSubTab
			: stakingSubTabState;

	useDocumentTitle('My Portfolio — AccessLayer');

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

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-6">
				<div>
					<h1 className="text-2xl font-black">My Portfolio</h1>
					<p className="text-sm text-white/60">
						{profile?.firstName} {profile?.lastName}
					</p>
				</div>

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
					>
						<ReferralLinkPanel initialKeyId={keys[0].id} keys={keys} />
					</section>
				)}

				{/* Staking / protocol revenue panel */}
				{activeTab === 'staking' && (
					<section
						id="profile-panel-staking"
						role="tabpanel"
						aria-labelledby="profile-tab-staking"
						data-testid="portfolio-staking-panel"
						className="space-y-6"
					>
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
									aria-selected={activeStakingSubTab === subtab.value}
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
						{activeStakingSubTab === 'claim' ? (
							<div
								id="staking-subpanel-claim"
								role="tabpanel"
								aria-labelledby="staking-subtab-claim"
								data-testid="staking-subpanel-claim"
							>
								<ProtocolRevenueClaim walletAddress={DEMO_WALLET} />
							</div>
						) : (
							<div
								id="staking-subpanel-protocol-revenue"
								role="tabpanel"
								aria-labelledby="staking-subtab-protocol-revenue"
								data-testid="staking-subpanel-protocol-revenue"
							>
								<ProtocolRevenueDistributionTable
									walletAddress={DEMO_WALLET}
								/>
							</div>
						)}
					</section>
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
									A full audit trail of your past buys and sells
								</p>
							</div>

							<TradeHistoryTable walletAddress={DEMO_WALLET} />
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

							<WalletActivityFeed address={DEMO_WALLET} />
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
