import { Link } from 'react-router';
import { useTrendingCreators } from '@/hooks/useTrendingCreators';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import Change24hBadge from '@/components/common/Change24hBadge';
import { cn } from '@/lib/utils';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import SectionDivider from '@/components/common/SectionDivider';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function TrendingSkeletonRow() {
	return (
		<div className="flex items-center gap-4 border-b border-white/10 px-4 py-4 last:border-b-0">
			<div className={cn('h-5 w-6 shrink-0', skeletonBlockClass)} />
			<div
				className={cn('size-8 shrink-0 rounded-full', skeletonBlockClass)}
			/>
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className={cn('h-4 w-32', skeletonBlockClass)} />
			</div>
			<div className={cn('h-4 w-24', skeletonBlockClass)} />
			<div className={cn('h-4 w-12', skeletonBlockClass)} />
		</div>
	);
}

function TrendingSkeletonList() {
	return (
		<div
			role="status"
			aria-label="Loading trending creators"
			className="divide-y divide-white/10"
		>
			<span className="sr-only">Loading trending creators</span>
			{Array.from({ length: 5 }).map((_, i) => (
				<TrendingSkeletonRow key={i} />
			))}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Row                                                               */
/* ------------------------------------------------------------------ */

interface TrendingRowProps {
	rank: number;
	name: string;
	thumbnail?: string;
	creatorId: string;
	volume: number;
	change24h: number;
}

function TrendingRow({
	rank,
	name,
	thumbnail,
	creatorId,
	volume,
	change24h,
}: TrendingRowProps) {
	return (
		<Link
			to={`/creator/${creatorId}`}
			className="flex items-center gap-4 border-b border-white/10 px-4 py-4 transition-all hover:bg-white/5 last:border-b-0"
		>
			{/* Rank */}
			<span className="w-6 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-amber-400">
				#{rank}
			</span>

			{/* Avatar */}
			<div className="size-8 shrink-0 overflow-hidden rounded-full bg-white/10">
				<CreatorInitialsAvatar
					name={name}
					creatorId={creatorId}
					imageSrc={thumbnail}
				/>
			</div>

			{/* Name */}
			<span className="min-w-0 flex-1 truncate font-jakarta text-sm font-medium text-white">
				{name}
			</span>

			{/* 24h Volume */}
			<span className="hidden shrink-0 font-mono text-xs tabular-nums text-white/70 sm:block">
				{formatNumber(volume, { style: 'compact' })} XLM
			</span>

			{/* 24h Change Badge */}
			<div className="w-16 shrink-0">
				<Change24hBadge change={change24h} />
			</div>
		</Link>
	);
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function TrendingCreatorsSection() {
	const { creators, isLoading } = useTrendingCreators();

	if (!isLoading && (!creators || creators.length === 0)) {
		return null;
	}

	return (
		<>
			<SectionDivider title="Trending now" spacing="relaxed" />

			<div className="marketplace-section space-y-3">
				<h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400/80">
					24-hour momentum
				</h3>
				<p className="max-w-2xl text-sm leading-relaxed text-white/55">
					Discover creators with the highest buy volume in the last 24
					hours — early signals for momentum and opportunity.
				</p>
			</div>

			<MarketplaceSection spacing="compact">
				{isLoading ? (
					<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
						<TrendingSkeletonList />
					</div>
				) : (
					<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
						{creators?.map((creator, index) => (
							<TrendingRow
								key={creator.id}
								rank={index + 1}
								name={
									normalizeCreatorDisplayName(creator.title) ||
									'Unnamed creator'
								}
								thumbnail={creator.thumbnail}
								creatorId={creator.id}
								volume={creator.totalVolume}
								change24h={creator.change24h}
							/>
						))}
					</div>
				)}
			</MarketplaceSection>
		</>
	);
}
