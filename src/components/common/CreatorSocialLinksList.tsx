import type { ComponentType } from 'react';
import {
	Globe,
	Instagram,
	Link as LinkIcon,
	Twitter,
	Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorSocialLinksListProps {
	handle?: string;
	/** Override the default empty-state placeholder copy. */
	emptyPlaceholder?: string;
	className?: string;
}

const DEFAULT_EMPTY_PLACEHOLDER = 'No social links added yet';

interface SocialLinkItem {
	id: 'x' | 'instagram' | 'youtube' | 'website';
	label: string;
	url: string;
	Icon: ComponentType<{ className?: string }>;
}

const CreatorSocialLinksList: React.FC<CreatorSocialLinksListProps> = ({
	handle,
	emptyPlaceholder = DEFAULT_EMPTY_PLACEHOLDER,
	className,
}) => {
	if (!handle?.trim()) {
		return (
			<div
				role="note"
				aria-label="Creator profile links not provided"
				className={cn(
					'rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-2 text-xs italic text-white/40',
					className
				)}
			>
				{emptyPlaceholder}
			</div>
		);
	}

	const normalized = handle.replace(/^@/, '').trim();
	const links: SocialLinkItem[] = [
		{
			id: 'x',
			label: 'X',
			url: `https://x.com/${normalized}`,
			Icon: Twitter,
		},
		{
			id: 'instagram',
			label: 'Instagram',
			url: `https://instagram.com/${normalized}`,
			Icon: Instagram,
		},
		{
			id: 'youtube',
			label: 'YouTube',
			url: `https://youtube.com/@${normalized}`,
			Icon: Youtube,
		},
		{
			id: 'website',
			label: 'Website',
			url: `https://${normalized}.link`,
			Icon: Globe,
		},
	];

	return (
		<ul className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
			{links.map(({ id, label, url, Icon }) => (
				<li key={id}>
					<a
						href={url}
						target="_blank"
						rel="noreferrer"
						className="link-action-chip group inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] font-semibold text-white/80 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-100"
					>
						<Icon className="size-3.5" />
						<span>{label}</span>
						<LinkIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-80" />
					</a>
				</li>
			))}
		</ul>
	);
};

export default CreatorSocialLinksList;
