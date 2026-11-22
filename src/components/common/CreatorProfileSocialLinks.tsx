import type { ComponentType } from 'react';
import { Globe, MessageCircle, Twitter } from 'lucide-react';
import type {
	CreatorSocialLink,
	CreatorSocialPlatform,
} from '@/types/creatorProfile';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<
	CreatorSocialPlatform,
	ComponentType<{ className?: string }>
> = {
	twitter: Twitter,
	website: Globe,
	discord: MessageCircle,
};

interface CreatorProfileSocialLinksProps {
	links: CreatorSocialLink[];
	className?: string;
}

/**
 * Creator-published social links (#1054).
 *
 * Renders nothing when the creator has not set any link, so the profile only
 * ever shows links the creator actually published.
 */
const CreatorProfileSocialLinks: React.FC<CreatorProfileSocialLinksProps> = ({
	links,
	className,
}) => {
	if (links.length === 0) {
		return null;
	}

	return (
		<ul
			data-testid="creator-social-links"
			className={cn('flex flex-wrap items-center gap-2', className)}
		>
			{links.map(({ platform, label, url }) => {
				const Icon = PLATFORM_ICONS[platform];

				return (
					<li key={platform}>
						<a
							href={url}
							target="_blank"
							rel="noreferrer noopener"
							data-testid={`creator-social-link-${platform}`}
							className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-100 focus-visible:border-amber-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]"
						>
							<Icon className="size-3.5" aria-hidden="true" />
							<span>{label}</span>
						</a>
					</li>
				);
			})}
		</ul>
	);
};

export default CreatorProfileSocialLinks;
