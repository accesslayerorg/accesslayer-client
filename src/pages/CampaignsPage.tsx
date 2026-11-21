import { Networks } from '@stellar/stellar-sdk';
import { useAccount } from 'wagmi';
import CampaignCard from '@/components/marketplace/CampaignCard';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import {
	useCampaigns,
	useClaimCampaignRewardMutation,
} from '@/hooks/useCampaigns';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNowMs } from '@/hooks/useNowMs';
import { useSigner } from '@/hooks/useSigner';
import {
	groupCampaignsByStatus,
	type Campaign,
	type CampaignStatus,
} from '@/utils/campaign.utils';
import { env } from '@/utils/env.utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

const SECTIONS: ReadonlyArray<{ status: CampaignStatus; title: string }> = [
	{ status: 'active', title: 'Active' },
	{ status: 'upcoming', title: 'Upcoming' },
	{ status: 'ended', title: 'Ended' },
];

/** Seasonal campaigns grouped into active, upcoming and ended, with reward claims (#1226, #1204). */
export default function CampaignsPage() {
	useDocumentTitle('Campaigns — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? '';
	const { data, isLoading, isError, refetch } = useCampaigns(address);
	const { activeSigner } = useSigner(networkPassphrase);
	const claimMutation = useClaimCampaignRewardMutation(wallet, activeSigner);
	const nowMs = useNowMs();

	const groups = groupCampaignsByStatus(data ?? [], nowMs);
	const hasCampaigns =
		groups.active.length + groups.upcoming.length + groups.ended.length > 0;
	const claimingId = claimMutation.isPending
		? claimMutation.variables
		: undefined;

	const renderGrid = (status: CampaignStatus, campaigns: Campaign[]) => (
		<div
			data-testid={`campaigns-${status}-grid`}
			className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
		>
			{campaigns.map(campaign => (
				<CampaignCard
					key={campaign.id}
					campaign={campaign}
					nowMs={nowMs}
					status={status}
					showProgress={Boolean(address)}
					onClaim={campaignId => claimMutation.mutate(campaignId)}
					isClaiming={claimingId === campaign.id}
				/>
			))}
		</div>
	);

	return (
		<main className="min-h-screen bg-slate-950 px-6 pt-12 pb-28 md:px-12 md:pb-16">
			<div className="mx-auto max-w-7xl">
				<header className="mb-8">
					<h1 className="font-grotesque text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
						Campaigns
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						Seasonal reward campaigns for creator keys. Track how close your
						wallet is to qualifying, and claim your reward once a campaign
						ends.
					</p>
				</header>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }, (_, index) => (
							<Skeleton key={index} className="h-56 w-full rounded-2xl" />
						))}
					</div>
				) : isError ? (
					<EmptyState
						title="Couldn't load campaigns"
						description="We couldn't load campaigns right now. Check your connection and try again."
						cta={{ label: 'Try again', onClick: () => void refetch() }}
						className="mx-auto w-full max-w-xl"
					/>
				) : !hasCampaigns ? (
					<EmptyState
						title="No campaigns yet"
						description="There are no seasonal campaigns right now. Check back soon."
						className="mx-auto w-full max-w-xl"
					/>
				) : (
					<div className="space-y-10">
						{SECTIONS.filter(({ status }) => groups[status].length > 0).map(
							({ status, title }) => (
								<section
									key={status}
									aria-labelledby={`campaigns-${status}-heading`}
								>
									<h2
										id={`campaigns-${status}-heading`}
										className="mb-4 font-grotesque text-xl font-bold text-white"
									>
										{title}
									</h2>
									{renderGrid(status, groups[status])}
								</section>
							)
						)}
					</div>
				)}
			</div>
		</main>
	);
}
