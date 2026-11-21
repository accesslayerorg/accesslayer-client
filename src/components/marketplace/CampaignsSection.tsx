import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowRight, Trophy } from 'lucide-react';
import CampaignCard from '@/components/marketplace/CampaignCard';
import { useActiveCampaigns } from '@/hooks/useCampaigns';
import { useNowMs } from '@/hooks/useNowMs';
import { filterActiveCampaigns } from '@/utils/campaign.utils';

/** Campaigns previewed on the discovery page; the rest live on /campaigns. */
export const DISCOVERY_CAMPAIGN_LIMIT = 3;

/**
 * Seasonal campaign eligibility tracker for the discovery page (#1226).
 *
 * Lists active campaigns with their criteria, reward pool, a live countdown
 * and the connected wallet's progress. Renders nothing while loading, on
 * error, or when no campaign is still running.
 */
export default function CampaignsSection() {
	const { address } = useAccount();
	const { data } = useActiveCampaigns(address);
	const nowMs = useNowMs();

	const campaigns = filterActiveCampaigns(data ?? [], nowMs);
	if (campaigns.length === 0) return null;

	return (
		<section
			aria-labelledby="campaigns-section-title"
			data-testid="campaigns-section"
			className="mt-8 mb-16"
		>
			<div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<div className="flex items-center gap-2 text-violet-300">
						<Trophy className="size-5" aria-hidden="true" />
						<span className="font-mono text-xs font-bold uppercase tracking-wider">
							Seasonal Rewards
						</span>
					</div>
					<h2
						id="campaigns-section-title"
						className="mt-1 font-grotesque text-2xl font-bold tracking-tight text-white sm:text-3xl"
					>
						Campaigns
					</h2>
					<p className="mt-1 font-jakarta text-xs text-white/50">
						Meet a campaign's criteria before it ends to share its reward pool
					</p>
				</div>

				<Link
					to="/campaigns"
					data-testid="view-all-campaigns"
					className="inline-flex items-center gap-1.5 font-jakarta text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
				>
					View All Campaigns
					<ArrowRight className="size-3.5" aria-hidden="true" />
				</Link>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{campaigns.slice(0, DISCOVERY_CAMPAIGN_LIMIT).map(campaign => (
					<CampaignCard
						key={campaign.id}
						campaign={campaign}
						nowMs={nowMs}
						showProgress={Boolean(address)}
					/>
				))}
			</div>
		</section>
	);
}
