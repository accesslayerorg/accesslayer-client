import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
	ACTOR_ROLE_BADGE_CLASSES,
	type ActionAttribution,
} from '@/utils/actionAttribution.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { truncateWalletAddress } from '@/utils/referral.utils';
import showToast from '@/utils/toast.util';

interface ActionAttributionLabelProps {
	attribution: ActionAttribution;
	/** Lead-in copy, e.g. "Posted by" for announcements or "by" for activity. */
	prefix?: string;
	className?: string;
}

/**
 * Shows who performed a creator-key action (#1224). Primary-creator actions
 * get a "Creator" label; co-creator actions get their role badge. The wallet
 * opens a popover with the full address and a copy button — a click-driven
 * popover rather than a hover tooltip so it works on touch and keyboard too.
 */
export default function ActionAttributionLabel({
	attribution,
	prefix,
	className,
}: ActionAttributionLabelProps) {
	const [copied, setCopied] = useState(false);
	const { wallet, role } = attribution;
	const isCreator = role === 'creator';

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(wallet);
		} catch {
			showToast.error('Could not copy address');
			return;
		}
		setCopied(true);
		showToast.success('Address copied');
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<span
			data-testid="action-attribution"
			data-role={role}
			className={cn(
				'inline-flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-white/50',
				className
			)}
		>
			{prefix && <span>{prefix}</span>}
			<Popover onOpenChange={open => !open && setCopied(false)}>
				<PopoverTrigger asChild>
					<button
						type="button"
						data-testid="action-attribution-wallet"
						aria-label={`Show full address for ${truncateWalletAddress(wallet)}`}
						className="rounded font-mono text-white/80 underline decoration-dotted underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
					>
						{truncateWalletAddress(wallet)}
					</button>
				</PopoverTrigger>
				<PopoverContent
					data-testid="action-attribution-popover"
					className="w-auto max-w-[min(22rem,calc(100vw-2rem))] border-white/10 bg-slate-950 p-3 text-white"
				>
					<p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
						{isCreator ? 'Creator wallet' : `${role} co-creator wallet`}
					</p>
					<div className="flex items-start gap-2">
						<code
							data-testid="action-attribution-full-address"
							className="min-w-0 flex-1 break-all font-mono text-xs text-white/90"
						>
							{wallet}
						</code>
						<button
							type="button"
							onClick={() => void handleCopy()}
							data-testid="action-attribution-copy"
							aria-label={copied ? 'Address copied' : 'Copy address'}
							className="shrink-0 rounded-md border border-white/15 p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
						>
							{copied ? (
								<Check className="size-3.5 text-emerald-400" aria-hidden="true" />
							) : (
								<Copy className="size-3.5" aria-hidden="true" />
							)}
						</button>
					</div>
				</PopoverContent>
			</Popover>
			<span
				data-testid="action-attribution-role"
				className={cn(
					'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
					isCreator
						? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
						: ACTOR_ROLE_BADGE_CLASSES[role]
				)}
			>
				{isCreator ? 'Creator' : role}
			</span>
		</span>
	);
}
