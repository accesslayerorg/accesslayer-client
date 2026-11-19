import React from 'react';
import { Link } from 'react-router';
import type { Course } from '@/services/course.service';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import Change24hBadge from '@/components/common/Change24hBadge';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import {
	formatCreatorKeyPriceDisplay,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import AddToBatchButton from '@/components/common/AddToBatchButton';
import IssuerVerificationBadge from '@/components/common/IssuerVerificationBadge';
import { cn } from '@/lib/utils';

export interface KeyCardProps {
	creator: Course;
	className?: string;
}

/**
 * Compact creator-key card for the discovery feed grid (#1113).
 *
 * Shows the essentials — avatar, name, current key price and 24h change —
 * and links through to the key detail page. Category and 24h volume are
 * surfaced as secondary meta so the grid stays scannable.
 */
export const KeyCard: React.FC<KeyCardProps> = ({ creator, className }) => {
	const displayName =
		normalizeCreatorDisplayName(creator.title || creator.name) ||
		'Unnamed creator';
	const handle = formatCreatorHandle(
		creator.socialHandle || creator.instructorId
	);
	const priceFormatted = formatCreatorKeyPriceDisplay(creator);
	const avatarSrc = creator.thumbnail || creator.avatarUri;

	return (
		<article
			aria-label={`Key for ${displayName}`}
			data-testid="key-card"
			data-key-id={creator.id}
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

					<Change24hBadge
						change={creator.change24h}
						data-testid="key-card-change"
					/>
				</div>

				<div className="mt-4 min-w-0">
					<h3
						data-testid="key-card-name"
						className="truncate font-jakarta text-base font-bold text-white transition-colors group-hover:text-amber-300"
					>
						{displayName}
					</h3>
					{handle && (
						<p
							data-testid="key-card-handle"
							className="truncate font-mono text-xs text-white/50"
						>
							{handle}
						</p>
					)}
					<IssuerVerificationBadge
						wallet={creator.instructorId}
						className="mt-1.5"
					/>
				</div>
			</div>

			<div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
				<div className="min-w-0">
					<span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-white/45">
						Price
					</span>
					<span
						data-testid="key-card-price"
						className="font-jakarta text-sm font-extrabold text-white"
					>
						{priceFormatted}
					</span>
				</div>
				{creator.category && (
					<span
						data-testid="key-card-category"
						className="truncate rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.65rem] font-semibold text-white/70"
					>
						{creator.category}
					</span>
				)}
			</div>

			<div className="relative z-20 mt-3 pt-3 border-t border-white/10">
				<AddToBatchButton
					keyId={creator.id}
					keyName={displayName}
					priceStroops={resolveCreatorKeyPriceStroops(creator) ?? 0}
					currentSupply={creator.creatorShareSupply ?? null}
					thumbnail={avatarSrc}
					className="w-full justify-between"
				/>
			</div>
		</article>
	);
};

export default KeyCard;
