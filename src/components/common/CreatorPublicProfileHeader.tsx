import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import CreatorProfileSocialLinks from '@/components/common/CreatorProfileSocialLinks';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import type { CreatorSocialLink } from '@/types/creatorProfile';

interface CreatorPublicProfileHeaderProps {
	displayName: string;
	/** Raw handle; normalised for display inside the header. */
	handle: string;
	creatorId?: string | null;
	avatarUrl?: string | null;
	isVerified?: boolean;
	/** Pre-formatted membership date, e.g. `Mar 2024`. */
	memberSince?: string | null;
	/** Total keys the creator has deployed. */
	keyCount: number;
	socialLinks: CreatorSocialLink[];
	/** Rendered on the right of the header (e.g. the follow button). */
	actions?: ReactNode;
	className?: string;
}

/**
 * Header for the public creator profile (#1054): avatar, display name,
 * verification badge, membership date and deployed key count.
 */
const CreatorPublicProfileHeader: React.FC<CreatorPublicProfileHeaderProps> = ({
	displayName,
	handle,
	creatorId,
	avatarUrl,
	isVerified = false,
	memberSince,
	keyCount,
	socialLinks,
	actions,
	className,
}) => {
	const displayHandle = formatCreatorHandle(handle);
	const metaItems = [
		memberSince ? `Member since ${memberSince}` : null,
		`${keyCount} key${keyCount === 1 ? '' : 's'} deployed`,
	].filter((item): item is string => Boolean(item));

	return (
		<header
			data-testid="creator-public-profile-header"
			className={cn(
				'relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
		>
			<div
				className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-amber-400/10 blur-3xl"
				aria-hidden="true"
			/>

			<div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-center gap-5">
					<div className="size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl md:size-24">
						<CreatorInitialsAvatar
							name={displayName}
							creatorId={creatorId}
							imageSrc={avatarUrl ?? undefined}
						/>
					</div>

					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h1
								data-testid="creator-public-profile-name"
								className="truncate font-grotesque text-2xl font-black tracking-tight text-white md:text-3xl"
							>
								{displayName}
							</h1>
							{isVerified && <VerifiedBadge verified={true} />}
						</div>

						{displayHandle && (
							<p className="font-mono text-sm text-white/50">
								{displayHandle}
							</p>
						)}

						{metaItems.length > 0 && (
							<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
								{metaItems.map((item, index) => (
									<span
										key={item}
										className="inline-flex items-center gap-2"
									>
										{index > 0 && (
											<span
												className="text-white/20"
												aria-hidden="true"
											>
												•
											</span>
										)}
										{item}
									</span>
								))}
							</p>
						)}

						{/* Only renders when the creator has published links. */}
						<CreatorProfileSocialLinks
							links={socialLinks}
							className="pt-1"
						/>
					</div>
				</div>

				{actions && (
					<div className="flex shrink-0 items-center gap-3">{actions}</div>
				)}
			</div>
		</header>
	);
};

export default CreatorPublicProfileHeader;
