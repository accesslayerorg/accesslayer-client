import { useState } from 'react';
import { useParams } from 'react-router';
import { useCreatorDetail } from '@/hooks/useCreators';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import { CreatorProfileHeaderSkeleton } from '@/components/common/CreatorSkeleton';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import VestingPositionsSection from '@/components/common/VestingPositionsSection';
import ProposalCard from '@/components/common/ProposalCard';
import { CreateProposalDialog } from '@/components/common/CreateProposalDialog';
import { Button } from '@/components/ui/button';
import LpPositionsPage from '@/pages/LpPositionsPage';
import { useGovernanceProposals } from '@/hooks/useGovernanceProposals';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import CreatorPageErrorBoundary from '@/components/common/CreatorPageErrorBoundary';
import { ApiError } from '@/services/api.service';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';

function CreatorGovernancePanel({ creatorId }: { creatorId: string }) {
	const { data: proposals = [], isLoading, isError } =
		useGovernanceProposals(creatorId);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="font-grotesque text-lg font-bold text-white">
						Proposals
					</h3>
					<p className="mt-1 text-sm text-white/50">
						Create and vote on changes for this key.
					</p>
				</div>
				<CreateProposalDialog
					creatorId={creatorId}
					trigger={
						<Button type="button" size="xs">
							Create Proposal
						</Button>
					}
				/>
			</div>
			{isLoading && (
				<p className="text-sm text-white/40" role="status">
					Loading proposals…
				</p>
			)}
			{isError && (
				<p className="text-sm text-red-300" role="alert">
					Could not load governance proposals.
				</p>
			)}
			{!isLoading && !isError && proposals.length === 0 && (
				<p className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/45">
					No proposals yet. Create the first one for this key.
				</p>
			)}
			{!isLoading && proposals.length > 0 && (
				<div className="grid gap-4">
					{proposals.map(proposal => (
						<ProposalCard key={proposal.id} proposal={proposal} />
					))}
				</div>
			)}
		</div>
	);
}

function CreatorVestingPanel({
	creatorId,
	creatorName,
}: {
	creatorId: string;
	creatorName: string;
}) {
	const { address } = useStellarWallet();

	return (
		<VestingPositionsSection
			wallet={address ?? ''}
			keyIds={[creatorId]}
			keyNames={{ [creatorId]: creatorName }}
		/>
	);
}

function CreatorLiquidityPanel({ creatorId }: { creatorId: string }) {
	const { address } = useStellarWallet();

	return <LpPositionsPage keyId={creatorId} wallet={address} />;
}

function CreatorDetailPageContent() {
	const { id } = useParams<{ id: string }>();
	const { data: creator, isLoading, error } = useCreatorDetail(id || '');
	const [activeTab, setActiveTab] = useState('overview');
	useNavigationTiming('creator_profile');

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-7xl space-y-6">
					<CreatorProfileHeaderSkeleton />
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
				<ProfileTabPillGroup
					tabs={[
						{ label: 'Overview', value: 'overview' },
						{ label: 'Vesting', value: 'vesting' },
						{ label: 'Liquidity', value: 'liquidity' },
						{ label: 'Governance', value: 'governance' },
					]}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					enableHashRouting
				/>
				<div
					id={`profile-panel-${activeTab}`}
					role="tabpanel"
					aria-labelledby={`profile-tab-${activeTab}`}
					tabIndex={0}
					className="space-y-8"
				>
					{activeTab === 'overview' && (
						<>
							<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
								<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
									Fee Structure
								</h2>
								<CreatorProfileInfoGrid items={feeItems} />
							</div>
							<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
								<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
									Activity
								</h2>
								<CreatorActivityFeed creatorId={creator.id} />
							</div>
						</>
					)}
					{activeTab === 'vesting' && (
						<CreatorVestingPanel
							creatorId={creator.id}
							creatorName={creator.title}
						/>
					)}
					{activeTab === 'liquidity' && (
						<CreatorLiquidityPanel creatorId={creator.id} />
					)}
					{activeTab === 'governance' && (
						<CreatorGovernancePanel creatorId={creator.id} />
					)}
				</div>
			</div>
		</main>
	);
}

export default function CreatorDetailPage() {
	return (
		<CreatorPageErrorBoundary>
			<CreatorDetailPageContent />
		</CreatorPageErrorBoundary>
	);
}
