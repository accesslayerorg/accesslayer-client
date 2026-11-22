import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	buildKeyPurchaseTweetText,
	buildTwitterIntentUrl,
} from '@/utils/shareTwitter.utils';
import { buildCreatorKeyReferralLink } from '@/utils/referral.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';
import { Copy, Check, Sparkles, Share2 } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface ShareModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	creatorId: string;
	creatorName: string;
	amount?: number | string | null;
	priceXlm?: string | number | null;
	userAddress?: string | null;
	onDismiss?: () => void;
}

export function ShareModal({
	open,
	onOpenChange,
	creatorId,
	creatorName,
	amount,
	priceXlm,
	userAddress,
	onDismiss,
}: ShareModalProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!open) {
			setCopied(false);
		}
	}, [open]);

	const referralUrl = buildCreatorKeyReferralLink({
		creatorId,
		wallet: userAddress,
	});

	const tweetText = buildKeyPurchaseTweetText({
		creatorName,
		amount,
		referralLink: referralUrl,
		priceXlm,
	});

	const intentUrl = buildTwitterIntentUrl(tweetText);

	const handleShareToTwitter = () => {
		if (typeof window !== 'undefined') {
			window.open(intentUrl, '_blank', 'noopener,noreferrer');
		}
	};

	const handleCopyLink = async () => {
		try {
			await copyTextToClipboard(referralUrl);
			setCopied(true);
			showToast.success('Referral link copied to clipboard!');
			setTimeout(() => {
				setCopied(false);
			}, 2500);
		} catch {
			showToast.error('Failed to copy link.');
		}
	};

	const handleDismiss = () => {
		onOpenChange(false);
		onDismiss?.();
	};

	const numericAmount =
		amount != null && String(amount).trim() !== ''
			? Number(amount)
			: null;
	const hasQuantity = numericAmount != null && !Number.isNaN(numericAmount) && numericAmount > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-testid="share-modal"
				className="border-white/10 bg-[#071322] text-white shadow-2xl backdrop-blur-xl sm:max-w-md"
				aria-modal="true"
			>
				<DialogHeader className="space-y-2 text-left">
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
							<Sparkles className="size-4" />
						</div>
						<DialogTitle
							data-testid="share-modal-title"
							className="font-grotesque text-xl font-black text-white"
						>
							Share Your Purchase
						</DialogTitle>
					</div>
					<DialogDescription
						data-testid="share-modal-description"
						className="text-xs text-white/60 font-jakarta"
					>
						Share your creator key purchase on X and invite others to trade with your referral link to earn rewards.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Key purchase summary badge */}
					<div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-white font-jakarta">
								{creatorName}
							</span>
							{hasQuantity && (
								<span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
									{formatNumber(numericAmount)} {numericAmount === 1 ? 'Key' : 'Keys'}
								</span>
							)}
						</div>
						{priceXlm && (
							<span className="text-xs text-white/60">
								{priceXlm} XLM
							</span>
						)}
					</div>

					{/* Tweet preview container */}
					<div className="space-y-1.5">
						<label className="text-xs font-medium uppercase tracking-wider text-white/50">
							Pre-filled Post
						</label>
						<div
							data-testid="prefilled-tweet-text"
							className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-white/90 leading-relaxed font-jakarta"
						>
							{tweetText}
						</div>
					</div>

					{/* Share to X button */}
					<Button
						type="button"
						data-testid="share-twitter-intent-button"
						onClick={handleShareToTwitter}
						aria-label="Share purchase on X"
						className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1DA1F2] hover:bg-[#1a94df] text-white py-2.5 font-semibold font-jakarta shadow-lg transition-all"
					>
						<Share2 className="size-4" />
						<span>Share on X</span>
					</Button>

					{/* Referral link section */}
					<div className="space-y-1.5 pt-1">
						<label className="text-xs font-medium uppercase tracking-wider text-white/50">
							Referral Link
						</label>
						<div className="flex items-center gap-2">
							<input
								type="text"
								readOnly
								data-testid="share-modal-referral-input"
								value={referralUrl}
								className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 outline-none select-all"
							/>
							<Button
								type="button"
								variant="outline"
								data-testid="copy-referral-link-button"
								onClick={handleCopyLink}
								className="shrink-0 gap-1.5 rounded-xl border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white px-3 py-2"
							>
								{copied ? (
									<>
										<Check className="size-3.5 text-emerald-400" />
										<span data-testid="copied-feedback" className="text-emerald-400">Copied!</span>
									</>
								) : (
									<>
										<Copy className="size-3.5 text-white/70" />
										<span>Copy Link</span>
									</>
								)}
							</Button>
						</div>
					</div>
				</div>

				<DialogFooter className="pt-2 sm:justify-end">
					<Button
						type="button"
						variant="ghost"
						data-testid="share-modal-dismiss-button"
						onClick={handleDismiss}
						className="text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium"
					>
						Dismiss
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default ShareModal;
