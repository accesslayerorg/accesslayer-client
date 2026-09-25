import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	buildShareTweetText,
	buildTwitterIntentUrl,
} from '@/utils/shareTwitter.utils';

export interface ShareTwitterButtonProps {
	creatorId: string;
	creatorName: string;
	priceXlm: string | number;
	userAddress?: string | null;
	userHoldingsCount?: number;
	className?: string;
}



export function ShareTwitterButton({
	creatorId,
	creatorName,
	priceXlm,
	userAddress,
	userHoldingsCount = 0,
	className = '',
}: ShareTwitterButtonProps) {
	// Show Share button only when user is authenticated and holds at least 1 key
	const isAuthenticated = Boolean(userAddress && userAddress.trim() !== '');
	const isHolder = userHoldingsCount > 0;

	if (!isAuthenticated || !isHolder) {
		return null;
	}

	const origin =
		typeof window !== 'undefined' && window.location?.origin
			? window.location.origin
			: 'https://accesslayer.app';

	const plainUrl = `${origin}/creator/${creatorId}`;
	const referralUrl = userAddress ? `${plainUrl}?ref=${userAddress}` : plainUrl;

	const tweetText = buildShareTweetText(creatorName, priceXlm, referralUrl);
	const intentUrl = buildTwitterIntentUrl(tweetText);

	const handleShareClick = () => {
		if (typeof window !== 'undefined') {
			window.open(intentUrl, '_blank', 'noopener,noreferrer');
		}
	};

	return (
		<Button
			type="button"
			data-testid="share-twitter-button"
			onClick={handleShareClick}
			aria-label="Share key purchase to X"
			className={`inline-flex items-center gap-2 rounded-xl bg-[#1DA1F2]/15 border border-[#1DA1F2]/30 px-4 py-2.5 text-sm font-semibold font-jakarta text-[#1DA1F2] transition-all hover:bg-[#1DA1F2]/25 hover:text-white ${className}`}
		>
			<Share2 className="size-4" aria-hidden="true" />
			<span>Share to X</span>
		</Button>
	);
}

export default ShareTwitterButton;
