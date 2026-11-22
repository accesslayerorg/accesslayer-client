/**
 * Creator social profile section for the creator key detail page (#1103):
 * published social links and a link to the creator's full public profile
 * page, below the existing key header (which already shows the avatar,
 * display name, and bio — not duplicated here).
 */
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import CreatorProfileSocialLinks from '@/components/common/CreatorProfileSocialLinks';
import { cn } from '@/lib/utils';
import type {
	CreatorSocialLink,
	CreatorSocialLinkSource,
} from '@/types/creatorProfile';
import { resolveCreatorSocialLinks } from '@/utils/creatorProfile.utils';

export interface CreatorSocialSectionProps {
	/** Creator wallet address; used to build the full-profile link. */
	address: string;
	/** Sources to resolve published Twitter/website/Discord links from. */
	socialLinkSources: CreatorSocialLinkSource[];
	className?: string;
}

/**
 * Renders the creator's published social links and a link to their full
 * public profile page. Social links render only when published (delegated
 * to `CreatorProfileSocialLinks`, which returns null when empty); the
 * section still renders the profile link either way.
 */
export default function CreatorSocialSection({
	address,
	socialLinkSources,
	className,
}: CreatorSocialSectionProps) {
	const socialLinks: CreatorSocialLink[] =
		resolveCreatorSocialLinks(socialLinkSources);
	const profileUrl = `/creator/${encodeURIComponent(address)}/profile`;

	return (
		<section
			data-testid="creator-social-section"
			className={cn(
				'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4',
				className
			)}
			aria-label="Creator social links"
		>
			<CreatorProfileSocialLinks links={socialLinks} />

			<Link
				to={profileUrl}
				data-testid="creator-social-profile-link"
				className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
			>
				View full profile
				<ArrowUpRight className="size-3.5" aria-hidden="true" />
			</Link>
		</section>
	);
}
