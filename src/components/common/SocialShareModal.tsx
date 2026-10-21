import { useState } from 'react';
import { Copy, Check, Send, Sparkles } from 'lucide-react';
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
	buildSocialShareText,
	buildTelegramShareUrl,
	buildTwitterShareUrl,
	openShareWindow,
	type SocialShareInput,
} from '@/utils/socialShare.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

export interface SocialShareModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	share: SocialShareInput;
	title?: string;
}

/**
 * Share modal for key positions and badge achievements (#1251): pre-filled
 * Twitter/Telegram intents, plus Copy Link. Shared across the KeyDetail
 * page, portfolio holding rows, and badge cards.
 */
export default function SocialShareModal({
	open,
	onOpenChange,
	share,
	title = 'Share',
}: SocialShareModalProps) {
	const [copied, setCopied] = useState(false);

	const shareText = buildSocialShareText(share);
	const twitterUrl = buildTwitterShareUrl(shareText, share.url);
	const telegramUrl = buildTelegramShareUrl(shareText, share.url);

	const handleCopyLink = async () => {
		try {
			await copyTextToClipboard(share.url);
			setCopied(true);
			showToast.success('Link copied to clipboard!');
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast.error('Failed to copy link.');
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next) setCopied(false);
				onOpenChange(next);
			}}
		>
			<DialogContent
				data-testid="social-share-modal"
				className="border-white/10 bg-[#071322] text-white sm:max-w-md"
			>
				<DialogHeader className="space-y-2 text-left">
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
							<Sparkles className="size-4" />
						</div>
						<DialogTitle
							data-testid="social-share-modal-title"
							className="font-grotesque text-xl font-black text-white"
						>
							{title}
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-white/60">
						Share this on Twitter or Telegram, or copy the link.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div
						data-testid="social-share-preview-text"
						className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs leading-relaxed text-white/90"
					>
						{shareText}
					</div>

					<div className="flex flex-col gap-2 sm:flex-row">
						<Button
							type="button"
							data-testid="social-share-twitter-button"
							onClick={() => openShareWindow(twitterUrl)}
							aria-label="Share on Twitter"
							className="flex-1 gap-2 rounded-xl bg-[#1DA1F2] text-white hover:bg-[#1a94df]"
						>
							<Send className="size-4" aria-hidden="true" />
							Share on Twitter
						</Button>
						<Button
							type="button"
							data-testid="social-share-telegram-button"
							onClick={() => openShareWindow(telegramUrl)}
							aria-label="Share on Telegram"
							className="flex-1 gap-2 rounded-xl bg-[#229ED9] text-white hover:bg-[#1e8dc2]"
						>
							<Send className="size-4" aria-hidden="true" />
							Share on Telegram
						</Button>
					</div>

					<div className="space-y-1.5 pt-1">
						<label className="text-xs font-medium uppercase tracking-wider text-white/50">
							Link
						</label>
						<div className="flex items-center gap-2">
							<input
								type="text"
								readOnly
								data-testid="social-share-link-input"
								value={share.url}
								className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 outline-none select-all"
							/>
							<Button
								type="button"
								variant="outline"
								data-testid="social-share-copy-link-button"
								onClick={handleCopyLink}
								className="shrink-0 gap-1.5 rounded-xl border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.1]"
							>
								{copied ? (
									<>
										<Check className="size-3.5 text-emerald-400" />
										<span data-testid="social-share-copied-feedback" className="text-emerald-400">
											Copied!
										</span>
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
						data-testid="social-share-dismiss-button"
						onClick={() => onOpenChange(false)}
						className="rounded-xl text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
					>
						Dismiss
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
