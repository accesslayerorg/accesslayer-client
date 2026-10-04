import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';
import { buildReferralShareText } from '@/utils/referral.utils';

export interface ReferralLinkGeneratorProps {
	/** The referrer's shareable link. Empty when no wallet is connected. */
	link: string;
	className?: string;
}

const COPIED_RESET_MS = 2000;

/**
 * Referral link generator for the referral dashboard (#963).
 *
 * Renders the wallet's referral link with copy and share actions. A native
 * share sheet is used when the browser exposes one (mobile), otherwise the
 * link is copied and the user is told where to paste it.
 */
export const ReferralLinkGenerator: React.FC<ReferralLinkGeneratorProps> = ({
	link,
	className,
}) => {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Clear the "Copied" reset timer on unmount so it cannot set state on an
	// unmounted component.
	useEffect(
		() => () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		},
		[]
	);

	/** Returns whether the link reached the clipboard. */
	const handleCopy = async (): Promise<boolean> => {
		if (!link) return false;
		try {
			await copyTextToClipboard(link);
			setCopied(true);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(() => {
				setCopied(false);
				timeoutRef.current = null;
			}, COPIED_RESET_MS);
			return true;
		} catch {
			setCopied(false);
			showToast.error('Could not copy the referral link. Please copy it manually.');
			return false;
		}
	};

	const handleShare = async () => {
		if (!link) return;
		const shareText = buildReferralShareText(link);
		const navigatorWithShare = navigator as Navigator & {
			share?: (data: { title: string; text: string; url: string }) => Promise<void>;
		};

		if (typeof navigatorWithShare.share === 'function') {
			try {
				await navigatorWithShare.share({
					title: 'Join me on AccessLayer',
					text: shareText,
					url: link,
				});
				return;
			} catch {
				// The user dismissed the share sheet — fall through to copying.
			}
		}

		// No native share sheet, or it was dismissed: copy instead so the link
		// is always one tap away. Only confirm when the copy actually landed.
		if (await handleCopy()) {
			showToast.success('Referral link copied — paste it wherever you share.');
		}
	};

	return (
		<div className={cn('space-y-3', className)} data-testid="referral-link-generator">
			<div>
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Your referral link
				</h2>
				<p className="mt-1 text-sm text-white/60">
					Share this link to earn a share of the trading fee on every
					wallet&apos;s first trade.
				</p>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<input
					type="text"
					readOnly
					value={link}
					aria-label="Your referral link"
					title={link}
					placeholder="Connect a wallet to generate your referral link"
					data-testid="referral-link-value"
					className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white/75 outline-none transition-colors focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20"
				/>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="rounded-xl"
						disabled={!link}
						onClick={handleCopy}
						data-testid="referral-link-copy"
					>
						{copied ? (
							<>
								<Check
									className="mr-2 size-4 text-emerald-400"
									aria-hidden="true"
								/>
								Copied
							</>
						) : (
							<>
								<Copy className="mr-2 size-4" aria-hidden="true" />
								Copy
							</>
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						className="rounded-xl"
						disabled={!link}
						onClick={handleShare}
						data-testid="referral-link-share"
					>
						<Share2 className="mr-2 size-4" aria-hidden="true" />
						Share
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ReferralLinkGenerator;
