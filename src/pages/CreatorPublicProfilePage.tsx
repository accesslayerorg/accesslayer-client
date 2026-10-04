import { Link, useParams } from 'react-router';
import { ArrowLeft, SearchX } from 'lucide-react';
import CreatorPublicProfileHeader from '@/components/common/CreatorPublicProfileHeader';
import CreatorProfileStatRow from '@/components/common/CreatorProfileStatRow';
import DeployedCreatorKeyCard from '@/components/common/DeployedCreatorKeyCard';
import FollowButton from '@/components/common/FollowButton';
import {
	CreatorGridSkeleton,
	CreatorProfileHeaderSkeleton,
} from '@/components/common/CreatorSkeleton';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { useCreatorFollows } from '@/hooks/useCreatorFollows';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/services/api.service';
import { cn } from '@/lib/utils';
import type { CreatorPublicProfile } from '@/types/creatorProfile';
import { formatMemberSince } from '@/utils/creatorProfile.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

/**
 * Reader-facing stats rendered above the deployed keys grid (#1054).
 */
function buildStatItems(profile: CreatorPublicProfile) {
	return [
		{
			label: 'Total Volume Traded',
			value: formatDisplayKeyPrice(profile.stats.totalVolumeStroops),
		},
		{
			label: 'Total Holders',
			value: formatCompactNumber(profile.stats.totalHolders),
		},
		{
			label: 'Avg Key Rating',
			value:
				profile.stats.averageRating != null
					? `${profile.stats.averageRating.toFixed(1)} ★`
					: 'Unrated',
		},
		{
			label: 'Keys Deployed',
			value: formatCompactNumber(profile.stats.keyCount),
		},
	];
}

/** 404 state for an address that has deployed no keys. */
function CreatorProfileNotFound({ address }: { address: string }) {
	return (
		<main
			data-testid="creator-profile-not-found"
			className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#06111f] px-6 py-16 text-center text-white"
		>
			<div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-400">
				<SearchX className="size-7" aria-hidden="true" />
			</div>
			<h1 className="font-grotesque text-3xl font-black tracking-tight">
				Creator not found
			</h1>
			<p className="max-w-md font-jakarta text-sm text-white/65">
				We couldn&apos;t find a creator profile for{' '}
				<span className="font-mono text-white/80">
					{address || 'that address'}
				</span>
				. The address may be incorrect or the creator may not have deployed
				any keys yet.
			</p>
			<Link
				to="/creators"
				className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
				Browse creators
			</Link>
		</main>
	);
}

function CreatorPublicProfilePageContent() {
	const { address = '' } = useParams<{ address: string }>();
	const { data: profile, isLoading, error } = useCreatorPublicProfile(address);

	useDocumentTitle(profile ? `${profile.displayName} — AccessLayer` : null);

	const isFollowing = useCreatorFollows(state => state.isFollowing(address));
	const follow = useCreatorFollows(state => state.follow);
	const unfollow = useCreatorFollows(state => state.unfollow);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-7xl space-y-8">
					<CreatorProfileHeaderSkeleton />
					<CreatorGridSkeleton count={3} />
				</div>
			</main>
		);
	}

	if (error || !profile) {
		const isNotFound =
			!profile || (error instanceof ApiError && error.status === 404);
		if (isNotFound) return <CreatorProfileNotFound address={address} />;
		throw error;
	}

	const statItems = buildStatItems(profile);
	const memberSince = formatMemberSince(profile.joinedAt);

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-8">
				<nav aria-label="Breadcrumb" className="text-xs text-white/50">
					<Link to="/creators" className="hover:text-amber-300">
						Creators
					</Link>
					<span className="mx-2 text-white/25" aria-hidden="true">
						/
					</span>
					<span className="text-white/70">{profile.displayName}</span>
				</nav>

				<CreatorPublicProfileHeader
					displayName={profile.displayName}
					handle={profile.keys[0]?.handle ?? address}
					creatorId={address}
					avatarUrl={profile.avatarUrl}
					isVerified={profile.isVerified}
					memberSince={memberSince}
					keyCount={profile.stats.keyCount}
					socialLinks={profile.socialLinks}
					actions={
						<FollowButton
							creatorAddress={address}
							isFollowing={isFollowing}
							onFollow={async target => {
								follow(target);
							}}
							onUnfollow={async target => {
								unfollow(target);
							}}
							className={cn(
								'h-11 rounded-xl border px-5 font-bold',
								!isFollowing &&
									'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300'
							)}
						/>
					}
				/>

				{/* Platform stats aggregated across every key the creator deployed. */}
				<section aria-label="Creator stats">
					<CreatorProfileStatRow items={statItems} />
				</section>

				{/* Deployed keys grid: status, price and invest CTA per key. */}
				<section
					aria-labelledby="creator-deployed-keys-heading"
					className="space-y-4"
				>
					<div>
						<h2
							id="creator-deployed-keys-heading"
							className="font-grotesque text-xl font-black tracking-tight text-white"
						>
							Deployed Keys
						</h2>
						<p className="mt-1 text-sm text-white/60">
							Every key this creator has deployed, with its current
							status and price.
						</p>
					</div>

					{profile.keys.length === 0 ? (
						<p
							data-testid="creator-deployed-keys-empty"
							className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/50"
						>
							This creator has not deployed any keys yet.
						</p>
					) : (
						<div
							data-testid="creator-deployed-keys-grid"
							className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
						>
							{profile.keys.map(keySummary => (
								<DeployedCreatorKeyCard
									key={keySummary.id}
									keySummary={keySummary}
								/>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

/**
 * Public creator profile (#1054).
 *
 * Shows a creator's header, aggregated platform stats, every key they have
 * deployed with a status + invest CTA, their published social links and a
 * follow button whose preference persists in localStorage. Unknown creator
 * addresses render a dedicated 404 state.
 */
export default function CreatorPublicProfilePage() {
	return <CreatorPublicProfilePageContent />;
}
