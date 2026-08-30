import { useState } from 'react';
import { BarChart2, Clock } from 'lucide-react';
import ReferralLinkPanel from '@/components/common/ReferralLinkPanel';
import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import { useProfileStore } from '@/hooks/useProfileStore';

const TABS = [
	{ label: 'Holdings', value: 'holdings', icon: <BarChart2 /> },
	{ label: 'Trade History', value: 'trade-history', icon: <Clock /> },
];

// Mock wallet address – in a real app this would come from the wallet provider.
const DEMO_WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

// For demo purposes, generate some mock keys. In a real app these would
// come from the backend (the user's keys / most traded key etc.).
const keys = [
	{ id: 'alpha', label: 'Alpha Key' },
	{ id: 'beta', label: 'Beta Key' },
	{ id: 'gamma', label: 'Gamma Key' },
];

export default function ProfilePage() {
	const profile = useProfileStore(state => state.profile);
	const [activeTab, setActiveTab] = useState('holdings');

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
					onTabChange={setActiveTab}
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
			</div>
		</main>
	);
}
