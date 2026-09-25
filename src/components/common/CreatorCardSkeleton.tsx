import { cn } from '@/lib/utils';
import { CREATOR_CARD_MEDIA_RADIUS_CLASS } from '@/utils/creatorCardTokens';

interface CreatorCardSkeletonProps {
	className?: string;
	/**
	 * Disable the shimmer animation and render a static block instead.
	 * Mirrors `CreatorSkeleton`'s API so callers that already suppress
	 * shimmer at a higher level can opt out per-instance.
	 */
	disableShimmer?: boolean;
}

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';
const skeletonStaticBlockClass =
	'rounded-md bg-white/16 ring-1 ring-white/15';
const dividerClass = 'h-px w-full bg-white/10';

/**
 * Loading skeleton for a single creator card (#421).
 *
 * Block dimensions mirror `CreatorCard`'s populated layout so replacing
 * skeletons with real cards does not produce visible layout shift:
 *   - Avatar: aspect-square (matches CreatorCard avatar block)
 *   - Title row + badges: h-6 name with inline badge placeholders
 *     (verified, change, supply, recent-activity)
 *   - Handle: h-4 (matches CreatorCard's `.marketplace-label-muted`
 *     handle line)
 *   - Bio: two-line placeholder (matches CreatorCard's `CreatorBio`
 *     block under the handle)
 *   - Sparkline: h-10 w-full rounded-lg (matches CreatorCard's price
 *     chart sparkline placeholder)
 *   - Mini stat chips: 3 placeholders (Price / Category / Level)
 *   - Meta rows: 3 label+value rows (Join Date / Handle / Key Price)
 *     separated by `CreatorListRowDivider` equivalents
 *   - Social links: row of icon placeholders matching
 *     `CreatorSocialLinksList` height
 *   - Action row: NetworkFeeHint placeholder + h-9 w-24 rounded-xl
 *     Buy Key button placeholder
 *   - Helper text bar (matches `BuyActionHelperText` height)
 *
 * The top-right dropdown-menu trigger is preserved as a circular block
 * so the card has the same absolute-pos landmark in loading state.
 *
 * Respects `prefers-reduced-motion` via the shared `.skeleton-shimmer`
 * CSS rule which falls back to a static block + ring when motion is
 * reduced. Callers can pass `disableShimmer` to suppress the animation
 * outright.
 */
const CreatorCardSkeleton: React.FC<CreatorCardSkeletonProps> = ({
	className,
	disableShimmer = false,
}) => {
	const blockClass = disableShimmer ? skeletonStaticBlockClass : skeletonBlockClass;

	return (
		<div
			role="status"
			aria-label="Loading creator card"
			data-testid="creator-card-skeleton"
			className={cn(
				'marketplace-card-surface marketplace-card-surface-hover group relative overflow-hidden rounded-2xl border p-4',
				className
			)}
		>
			<span className="sr-only">Loading creator card</span>

			{/*
			 * Top-right dropdown trigger placeholder. CreatorCard
			 * absolutely-positions a size-8 trigger at right-3 top-3,
			 * so the skeleton matches that footprint to avoid the
			 * sibling controls shifting when real cards render.
			 */}
			<div className="absolute right-3 top-3 z-20">
				<div className={cn('size-8 rounded-full', blockClass)} />
			</div>

			{/* Avatar block */}
			<div
				className={cn(
					'relative mb-4 aspect-square overflow-hidden',
					CREATOR_CARD_MEDIA_RADIUS_CLASS,
					blockClass
				)}
			/>

			<div className="mb-4">
				{/* Title row: name + verified + change + supply badges */}
				<div className="flex items-center gap-2 flex-wrap">
					<div className={cn('h-6 w-3/5', blockClass)} />
					<div className={cn('size-4 shrink-0 rounded-full', blockClass)} />
					<div className={cn('h-4 w-12 shrink-0 rounded-full', blockClass)} />
					<div className={cn('h-4 w-14 shrink-0 rounded-full', blockClass)} />
				</div>

				{/* Handle line (marketplace-label-muted) */}
				<div className={cn('mt-2 h-4 w-2/5', blockClass)} />

				{/* Bio — two short lines */}
				<div className="mt-2 space-y-1">
					<div className={cn('h-3 w-full', blockClass)} />
					<div className={cn('h-3 w-4/5', blockClass)} />
				</div>

				{/* Sparkline placeholder (matches CreatorCard's price chart placeholder) */}
				<div className="mt-3">
					<div
						aria-hidden="true"
						className={cn('h-10 w-full rounded-lg', blockClass)}
					/>
				</div>

				{/* Mini stat chips (Price / Category / Level) */}
				<div className="mt-3 flex flex-wrap gap-2">
					<div className={cn('h-6 w-20 rounded-full', blockClass)} />
					<div className={cn('h-6 w-20 rounded-full', blockClass)} />
					<div className={cn('h-6 w-16 rounded-full', blockClass)} />
				</div>
			</div>

			{/* Divider (CreatorListRowDivider equivalent) */}
			<div className={cn('my-4', dividerClass)} />

			{/* Meta rows: Join Date / Handle / Key Price */}
			<div className="mt-3 space-y-2">
				<div className="flex items-center justify-between gap-3">
					<div className={cn('h-3 w-20', blockClass)} />
					<div className={cn('h-3 w-32', blockClass)} />
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className={cn('h-3 w-16', blockClass)} />
					<div className={cn('h-3 w-28', blockClass)} />
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className={cn('h-3 w-16', blockClass)} />
					<div className={cn('h-6 w-24', blockClass)} />
				</div>
			</div>

			{/* Divider */}
			<div className={cn('my-4', dividerClass)} />

			{/* Social links row */}
			<div className="flex items-center gap-2">
				<div className={cn('size-4 rounded-full', blockClass)} />
				<div className={cn('size-4 rounded-full', blockClass)} />
				<div className={cn('size-4 rounded-full', blockClass)} />
				<div className={cn('size-4 rounded-full', blockClass)} />
			</div>

			{/*
			 * Action row: NetworkFeeHint + Buy Key button placeholders.
			 * Widths (w-24) mirror `CreatorSkeleton`'s convention so the
			 * skeleton matches CreatorCard's h-9 "Buy Key" button plus
			 * the compact `.font-mono text-[9px]` NetworkFeeHint chip.
			 */}
			<div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className={cn('h-4 w-24 shrink-0', blockClass)} />
				<div className={cn('h-9 w-24 rounded-xl', blockClass)} />
			</div>

			{/* Helper text bar (matches BuyActionHelperText height) */}
			<div className="mt-4">
				<div className={cn('h-3 w-2/3', blockClass)} />
			</div>
		</div>
	);
};

/**
 * Grid of creator card skeletons shown while the creator list is
 * loading (#421). Defaults to `count = 6` so the placeholder grid
 * matches the live first-page footprint on `LandingPage`.
 */
export const CreatorCardGridSkeleton: React.FC<{
	count?: number;
	disableShimmer?: boolean;
	className?: string;
}> = ({ count = 6, disableShimmer = false, className }) => {
	return (
		<div
			data-testid="creator-card-grid-skeleton"
			className={cn(
				'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3',
				className
			)}
		>
			{Array.from({ length: count }).map((_, i) => (
				<CreatorCardSkeleton key={i} disableShimmer={disableShimmer} />
			))}
		</div>
	);
};

export default CreatorCardSkeleton;
