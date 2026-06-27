import { cn } from '@/lib/utils';
import { CREATOR_CARD_MEDIA_RADIUS_CLASS } from '@/utils/creatorCardTokens';

interface CreatorSkeletonProps {
	className?: string;
	disableShimmer?: boolean;
}

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';
const skeletonStaticBlockClass =
	'rounded-md bg-white/16 ring-1 ring-white/15';

const CreatorSkeleton: React.FC<CreatorSkeletonProps> = ({
	className,
	disableShimmer = false,
}) => {
	const blockClass = disableShimmer ? skeletonStaticBlockClass : skeletonBlockClass;

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/5 p-4',
				className
			)}
		>
			<div
				className={cn(
					'mb-4 aspect-square w-full',
					CREATOR_CARD_MEDIA_RADIUS_CLASS,
					blockClass
				)}
			/>

			<div className="mb-4 space-y-2">
				<div className={cn('h-6 w-3/4', blockClass)} />
				<div className={cn('h-4 w-1/2', blockClass)} />
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<div className={cn('h-3 w-12', blockClass)} />
					<div className={cn('h-6 w-16', blockClass)} />
				</div>
				<div className={cn('h-9 w-24 rounded-xl', blockClass)} />
			</div>
		</div>
	);
};

export const CreatorGridSkeleton: React.FC<{
	count?: number;
	disableShimmer?: boolean;
}> = ({
	count = 6,
	disableShimmer = false,
}) => {
	return (
		<div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<CreatorSkeleton key={i} disableShimmer={disableShimmer} />
			))}
		</div>
	);
};

/**
 * Loading skeleton for the creator profile header (#273) — avatar, name, and
 * handle. Block dimensions match `CreatorProfileHeader`'s populated layout
 * (size-24 / md:size-32 rounded-2xl avatar, h-9 md:h-12 name, h-6 handle) so
 * there is no visible layout shift when real data lands.
 *
 * Respects `prefers-reduced-motion`: the shared `skeletonBlockClass` falls
 * back to a static ring + a slightly brighter fill (`motion-reduce:`) so the
 * shimmer animation is suppressed for users who opt out. `disableShimmer` is
 * available for callers that already disable shimmer at a higher level.
 *
 * Includes `role="status"` and an `sr-only` label so screen-reader users
 * know the header is loading rather than missing.
 */
export const CreatorProfileHeaderSkeleton: React.FC<{
	className?: string;
	disableShimmer?: boolean;
}> = ({
	className,
	disableShimmer = false,
}) => {
	const blockClass = disableShimmer ? skeletonStaticBlockClass : skeletonBlockClass;
	return (
		<div
			role="status"
			aria-label="Loading creator profile"
			className={cn(
				'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
				className
			)}
		>
			<span className="sr-only">Loading creator profile</span>
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
				{/*
					Match the live header's avatar: size-24 on mobile,
					size-32 on md and up, with 4px border + rounded-2xl.
				*/}
				<div
					className={cn(
						'size-24 shrink-0 rounded-2xl border-4 border-white/10 md:size-32',
						blockClass
					)}
				/>
				<div className="min-w-0 flex-1 space-y-2">
					{/* Name placeholder — 3xl on mobile, 4xl on md+ */}
					<div className={cn('h-9 w-3/4 max-w-md md:h-12', blockClass)} />
					{/* Handle placeholder — lg text */}
					<div className={cn('h-6 w-1/2 max-w-xs', blockClass)} />
				</div>
			</div>

			{/* Share button placeholder at the right end on md+ */}
			<div className={cn('hidden h-11 w-44 rounded-xl md:block', blockClass)} />
		</div>
	);
};

/**
 * Loading skeleton for a single creator holding card (#304). Matches the
 * structure in `LandingPage` (rounded-2xl, border, p-4) with placeholders for
 * the creator title and holdings/price metadata.
 */
export const CreatorHoldingsSkeleton: React.FC<{
	className?: string;
	disableShimmer?: boolean;
}> = ({ className, disableShimmer = false }) => {
	const blockClass = disableShimmer
		? skeletonStaticBlockClass
		: skeletonBlockClass;

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.03] p-4',
				className
			)}
		>
			<div className={cn('h-5 w-2/3', blockClass)} />
			<div className={cn('mt-1 h-4 w-1/2', blockClass)} />
		</div>
	);
};

/**
 * A grid of creator holdings skeletons to be shown while the portfolio is
 * loading. Matches the 3-column responsive grid used for the live list.
 */
export const CreatorHoldingsListSkeleton: React.FC<{
	count?: number;
	disableShimmer?: boolean;
	className?: string;
}> = ({ count = 3, disableShimmer = false, className }) => {
	return (
		<div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
			{Array.from({ length: count }).map((_, i) => (
				<CreatorHoldingsSkeleton key={i} disableShimmer={disableShimmer} />
			))}
		</div>
	);
};

export default CreatorSkeleton;
