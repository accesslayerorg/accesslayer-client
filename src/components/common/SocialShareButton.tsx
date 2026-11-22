import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SocialShareModal from '@/components/common/SocialShareModal';
import type { SocialShareInput } from '@/utils/socialShare.utils';

export interface SocialShareButtonProps {
	share: SocialShareInput;
	title?: string;
	className?: string;
	'data-testid'?: string;
}

/**
 * "Share" trigger for the social sharing flow (#1251), shown on the
 * KeyDetail page, portfolio holding rows, and badge cards.
 */
export default function SocialShareButton({
	share,
	title,
	className,
	'data-testid': testId = 'social-share-button',
}: SocialShareButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				aria-label="Share"
				data-testid={testId}
				className={cn('gap-1.5 text-white/50 hover:text-white/80', className)}
			>
				<Share2 className="size-3.5" aria-hidden="true" />
				<span>Share</span>
			</Button>

			<SocialShareModal
				open={open}
				onOpenChange={setOpen}
				share={share}
				title={title}
			/>
		</>
	);
}
