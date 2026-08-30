import { useParams, useSearchParams } from 'react-router';
import { useCreatorDetail } from '@/hooks/useCreators';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import CreatorMetadataForm from '@/components/common/CreatorMetadataForm';
import AuctionSetupPanel from '@/components/common/AuctionSetupPanel';
import LaunchPenaltyPanel from '@/components/common/LaunchPenaltyPanel';
import {
	useCancelAuctionMutation,
	useConfigureAuctionMutation,
	useUpdateMetadataMutation,
	useSetLaunchPenaltyMutation,
} from '@/hooks/useCreatorContractActions';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

const TABS = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Settings', value: 'settings' },
];

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

export default function CreatorDashboardPage() {
	const { id = '' } = useParams<{ id: string }>();
	const [searchParams, setSearchParams] = useSearchParams();

	const { data: creator, isLoading, isError } = useCreatorDetail(id);

	const requestedTab = searchParams.get('tab');
	const activeTab = TABS.some(t => t.value === requestedTab)
		? (requestedTab as string)
		: 'overview';

	const metadataMutation = useUpdateMetadataMutation(id);
	const configureAuction = useConfigureAuctionMutation(id);
	const cancelAuction = useCancelAuctionMutation(id);
	const setLaunchPenalty = useSetLaunchPenaltyMutation(id);

	const setTab = (value: string) => {
		setSearchParams(
			prev => {
				const next = new URLSearchParams(prev);
				next.set('tab', value);
				return next;
			},
			{ replace: true }
		);
	};

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<CreatorDashboardSkeleton />
				</div>
			</main>
		);
	}

	if (isError || !creator) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<h1 className="font-grotesque text-3xl font-black">Creator dashboard</h1>
					<p className="mt-4 text-white/60" data-testid="creator-dashboard-error">
						We couldn&apos;t load this creator&apos;s dashboard. Try again shortly.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<div>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						{creator.title} · Creator dashboard
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Manage your key profile and auction configuration.
					</p>
				</div>

				<ProfileTabPillGroup tabs={TABS} activeTab={activeTab} onTabChange={setTab} />

				{activeTab === 'overview' && (
					<section
						className={CARD_CLASS}
						id="profile-panel-overview"
						role="tabpanel"
						aria-labelledby="profile-tab-overview"
						data-testid="dashboard-overview-panel"
					>
						<h2 className="mb-4 font-grotesque text-xl font-black tracking-tight">
							Overview
						</h2>
						<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div>
								<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
									Current price
								</dt>
								<dd className="mt-1 font-jakarta font-bold">
									{formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator))}
								</dd>
							</div>
							<div>
								<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
									Key supply
								</dt>
								<dd className="mt-1 font-jakarta font-bold">
									{formatNumber(creator.creatorShareSupply ?? 100)}
								</dd>
							</div>
							<div>
								<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
									Category
								</dt>
								<dd className="mt-1 font-jakarta font-bold">{creator.category}</dd>
							</div>
						</dl>
					</section>
				)}

				{activeTab === 'settings' && (
					<div
						className="space-y-8"
						id="profile-panel-settings"
						role="tabpanel"
						aria-labelledby="profile-tab-settings"
						data-testid="dashboard-settings-panel"
					>
						<section className={CARD_CLASS} data-testid="edit-profile-section">
							<h2 className="mb-1 font-grotesque text-xl font-black tracking-tight">
								Edit Profile
							</h2>
							<p className="mb-6 text-sm text-white/50">
								Update the display name, bio and avatar stored with your key.
							</p>
							<CreatorMetadataForm
								initialName={creator.name ?? creator.title ?? ''}
								initialBio={creator.bio ?? creator.description ?? ''}
								initialAvatarUri={creator.avatarUri ?? creator.thumbnail ?? ''}
								isSubmitting={metadataMutation.isPending}
								onSubmit={change => metadataMutation.mutate(change)}
							/>
						</section>

						<section className={CARD_CLASS} data-testid="auction-setup-section">
							<h2 className="mb-1 font-grotesque text-xl font-black tracking-tight">
								Auction Setup
							</h2>
							<p className="mb-6 text-sm text-white/50">
								Set a fixed auction price and supply allocation before your key
								goes live.
							</p>
							<AuctionSetupPanel
								auctionPrice={creator.auctionPrice}
								auctionSupply={creator.auctionSupply}
								auctionSold={creator.auctionSold}
								isSubmitting={configureAuction.isPending || cancelAuction.isPending}
								onConfigure={input => configureAuction.mutate(input)}
								onCancel={() => cancelAuction.mutate()}
							/>
						</section>

						<section className={CARD_CLASS} data-testid="launch-penalty-section">
							<h2 className="mb-1 font-grotesque text-xl font-black tracking-tight">
								Launch Penalty
							</h2>
							<p className="mb-6 text-sm text-white/50">
								Charge early sellers a percentage fee during the first 7 days
								after key creation.
							</p>
							<LaunchPenaltyPanel
								launchPenaltyBps={creator.launchPenaltyBps}
								isSubmitting={setLaunchPenalty.isPending}
								onSubmit={penaltyBps => setLaunchPenalty.mutate(penaltyBps)}
							/>
						</section>
					</div>
				)}
			</div>
		</main>
	);
}
