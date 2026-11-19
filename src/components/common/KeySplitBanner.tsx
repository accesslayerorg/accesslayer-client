import React, { useState } from 'react';
import { Scissors, X, CheckCircle2 } from 'lucide-react';
import type { Course } from '@/services/course.service';
import type { SplitExecutedEvent } from '@/types/keySplit';
import { useKeySplit } from '@/hooks/useKeySplit';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface KeySplitBannerProps {
	/** Creator key identifier. */
	keyId?: string;
	/** Creator course object carrying key details and optional recentSplit. */
	creator?: Course | null;
	/** Connected wallet address. */
	userAddress?: string;
	/** Direct split event instance. */
	split?: SplitExecutedEvent | null;
	/** Explicit override for pre-split balance. */
	preSplitBalance?: number | null;
	/** Explicit override for post-split balance. */
	postSplitBalance?: number | null;
	/** Explicit override for split ratio. */
	ratio?: number | null;
	/** Number of keys held by the connected user. */
	holdingsCount?: number | null;
	/** Callback when the banner is dismissed. */
	onDismiss?: () => void;
	className?: string;
}

/**
 * Key split event notification banner (#1151).
 *
 * Appears for 48 hours after a SplitExecuted event on key detail and portfolio pages.
 * Informs holders of their adjusted balance and the split ratio applied.
 * Includes a Dismiss button that clears the banner for the session.
 */
export const KeySplitBanner: React.FC<KeySplitBannerProps> = ({
	keyId: explicitKeyId,
	creator,
	userAddress,
	split: explicitSplit,
	preSplitBalance: overridePreSplitBalance,
	postSplitBalance: overridePostSplitBalance,
	ratio: overrideRatio,
	holdingsCount,
	onDismiss,
	className,
}) => {
	const effectiveKeyId = explicitKeyId ?? creator?.id ?? explicitSplit?.keyId ?? '';
	const initialSplit = explicitSplit ?? creator?.recentSplit ?? creator?.splitExecuted ?? null;

	const {
		split,
		isActive,
		isDismissed: hookDismissed,
		ratioDisplay,
		ratio: hookRatio,
		preSplitBalance: hookPreSplitBalance,
		postSplitBalance: hookPostSplitBalance,
		dismiss: hookDismiss,
	} = useKeySplit({
		keyId: effectiveKeyId,
		userAddress,
		initialSplit,
		holdingQuantity: holdingsCount,
	});

	const [localDismissed, setLocalDismissed] = useState(false);

	const isDismissed = localDismissed || hookDismissed;

	if (!isActive || isDismissed) {
		return null;
	}

	const displayRatio = overrideRatio != null ? `${overrideRatio}:1` : ratioDisplay;
	const numericRatio = overrideRatio ?? split?.ratio ?? hookRatio;

	const finalPreSplitBalance = overridePreSplitBalance ?? hookPreSplitBalance;
	const finalPostSplitBalance =
		overridePostSplitBalance ??
		(overridePreSplitBalance != null && numericRatio > 0
			? overridePreSplitBalance * numericRatio
			: hookPostSplitBalance);

	const handleDismiss = () => {
		setLocalDismissed(true);
		hookDismiss();
		onDismiss?.();
	};

	const keyTitle = creator?.title ? ` for ${creator.title}` : '';

	return (
		<aside
			role="alert"
			aria-label="Key split notification"
			data-testid="key-split-banner"
			className={cn(
				'relative overflow-hidden rounded-2xl border border-purple-500/35 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-slate-900/60 p-5 backdrop-blur-md shadow-xl shadow-purple-950/25 md:p-6',
				className
			)}
		>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				{/* Left: Info & Description */}
				<div className="space-y-2 max-w-2xl">
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-0.5 text-xs font-semibold text-purple-300">
							<Scissors className="size-3.5" aria-hidden="true" />
							<span>Key Split Executed</span>
						</span>
						<span
							className="inline-flex items-center gap-1 text-xs font-semibold text-purple-200/90"
							data-testid="split-ratio"
						>
							Ratio: {displayRatio} ({numericRatio}x)
						</span>
					</div>

					<p className="text-sm text-white/85 leading-relaxed font-jakarta">
						A key split{keyTitle} has been executed. Holders have had their balances
						adjusted according to the {displayRatio} split ratio.
					</p>

					<div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg w-fit">
						<CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
						<span>Balances updated and live</span>
					</div>
				</div>

				{/* Middle: Pre-split and Post-split balances */}
				<div className="flex flex-wrap items-center gap-3">
					{/* Pre-split balance */}
					<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 min-w-[130px]">
						<div>
							<div className="text-[0.68rem] uppercase tracking-wider text-white/50 font-medium">
								Pre-Split Balance
							</div>
							<div
								className="text-base font-bold text-white/80 tabular-nums"
								data-testid="pre-split-balance"
							>
								{formatNumber(finalPreSplitBalance)} keys
							</div>
						</div>
					</div>

					{/* Arrow separator */}
					<div className="text-purple-400 font-bold text-lg hidden sm:block" aria-hidden="true">
						→
					</div>

					{/* Post-split balance */}
					<div className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 min-w-[130px]">
						<div>
							<div className="text-[0.68rem] uppercase tracking-wider text-purple-300 font-medium">
								Post-Split Balance
							</div>
							<div
								className="text-base font-bold text-purple-200 tabular-nums"
								data-testid="post-split-balance"
							>
								{formatNumber(finalPostSplitBalance)} keys
							</div>
						</div>
					</div>
				</div>

				{/* Right: Dismiss button */}
				<div className="flex items-center justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={handleDismiss}
						data-testid="split-banner-dismiss"
						aria-label="Dismiss key split notification for session"
						className="gap-1.5 rounded-xl border-white/15 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
					>
						<X className="size-3.5" aria-hidden="true" />
						<span>Dismiss</span>
					</Button>
				</div>
			</div>
		</aside>
	);
};

export const SplitNotificationBanner = KeySplitBanner;
export default KeySplitBanner;
