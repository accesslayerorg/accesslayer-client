import React from 'react';
import { Send, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildReferralShareText, buildTelegramShareUrl } from '@/utils/referral.utils';
import { buildTwitterIntentUrl } from '@/utils/shareTwitter.utils';
import { cn } from '@/lib/utils';

export interface ReferralShareButtonsProps {
	/** The referrer's shareable link. Empty when no wallet is connected. */
	link: string;
	className?: string;
}

/**
 * Twitter/X and Telegram share actions for the referral dashboard (#1119).
 *
 * Each button opens the platform's pre-filled share URL in a new tab. Both
 * buttons are disabled until a wallet has generated a referral link.
 */
export const ReferralShareButtons: React.FC<ReferralShareButtonsProps> = ({
	link,
	className,
}) => {
	const shareText = buildReferralShareText(link);
	const disabled = !link;

	const openShareUrl = (url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	return (
		<div
			className={cn('flex items-center gap-2', className)}
			data-testid="referral-share-buttons"
		>
			<Button
				type="button"
				variant="outline"
				className="rounded-xl"
				disabled={disabled}
				onClick={() => openShareUrl(buildTwitterIntentUrl(shareText))}
				aria-label="Share referral link on X (Twitter)"
				data-testid="referral-share-twitter"
			>
				<Twitter className="mr-2 size-4" aria-hidden="true" />
				Share on X
			</Button>
			<Button
				type="button"
				variant="outline"
				className="rounded-xl"
				disabled={disabled}
				onClick={() => openShareUrl(buildTelegramShareUrl(link, shareText))}
				aria-label="Share referral link on Telegram"
				data-testid="referral-share-telegram"
			>
				<Send className="mr-2 size-4" aria-hidden="true" />
				Telegram
			</Button>
		</div>
	);
};

export default ReferralShareButtons;
