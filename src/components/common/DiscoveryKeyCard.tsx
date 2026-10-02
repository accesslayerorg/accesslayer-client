import React from 'react';
import { Link } from 'react-router';
import type { Course } from '@/services/course.service';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import Change24hBadge from '@/components/common/Change24hBadge';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import { formatCreatorKeyPriceDisplay } from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

export interface DiscoveryKeyCardProps {
	creator: Course;
	rank?: number;
	badgeLabel?: string;
	className?: string;
}

export const DiscoveryKeyCard: React.FC<DiscoveryKeyCardProps> = ({
	creator,
	rank,
	badgeLabel,
	className,
}) => {
	const displayName =
		normalizeCreatorDisplayName(creator.title || creator.name) || 'Unnamed creator';
	const handle = formatCreatorHandle(creator.socialHandle || creator.instructorId);
	const priceFormatted = formatCreatorKeyPriceDisplay(creator);
	const avatarSrc = creator.thumbnail || creator.avatarUri;

	return (
		<article
			aria-label={`Key for ${displayName}`}
			className={cn(
				'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-amber-500/5',
				className
			)}
		>
			<Link
				to={`/creator/${creator.id}`}
				className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				aria-label={`View ${displayName}'s key details`}
			>
				<span className="sr-only">View {displayName}&apos;s key</span>
			</Link>

			{/* Top Bar: Avatar & Badges */}
			<div>
				<div className="flex items-start justify-between gap-3">
					<div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-slate-800 shadow-md transition-transform duration-300 group-hover:scale-105">
						<CreatorInitialsAvatar
							name={displayName}
							creatorId={creator.id}
							imageSrc={avatarSrc}
							className="size-full text-base font-bold"
						/>
					</div>

					<div className="flex flex-col items-end gap-1.5">
						{rank !== undefined && (
							<span
								data-testid="discovery-card-rank"
								className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[0.68rem] font-bold text-amber-300"
							>
								#{rank}
							</span>
						)}
						{badgeLabel && (
							<span
								data-testid="discovery-card-badge"
								className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-emerald-300"
							>
								{badgeLabel}
							</span>
						)}
						<Change24hBadge
							change={creator.change24h}
							data-testid="discovery-card-change"
						/>
					</div>
				</div>

				{/* Creator Name & Handle */}
				<div className="mt-4 min-w-0">
					<h3
						data-testid="discovery-card-name"
						className="truncate font-jakarta text-base font-bold text-white transition-colors group-hover:text-amber-300"
					>
						{displayName}
					</h3>
					{handle && (
						<p
							data-testid="discovery-card-handle"
							className="truncate font-mono text-xs text-white/50"
						>
							{handle}
						</p>
					)}
				</div>
			</div>

			{/* Bottom Bar: Price */}
			<div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
				<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-white/45">
					Price
				</span>
				<div className="flex items-center gap-1.5">
					<img
						src="/icons/key.svg"
						alt=""
						className="size-3.5 opacity-60 invert"
						aria-hidden="true"
					/>
					<span
						data-testid="discovery-card-price"
						className="font-jakarta text-sm font-extrabold text-white"
					>
						{priceFormatted}
					</span>
				</div>
			</div>
		</article>
	);
};

export default DiscoveryKeyCard;
