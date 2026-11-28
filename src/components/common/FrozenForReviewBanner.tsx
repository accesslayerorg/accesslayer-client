import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { formatKeyFlagReviewStatus } from '@/constants/keyFlags';

export interface FrozenForReviewBannerProps {
	/** Whether the key is currently auto-frozen by the flag threshold. */
	autoFrozen?: boolean;
	/** Review lifecycle reported by the contract: 'pending' | 'in_review' | 'resolved'. */
	reviewStatus?: string | null;
	flagCount?: number;
	threshold?: number;
	frozenAt?: string | null;
	className?: string;
}

/**
 * Banner shown on the key detail page once enough stake-weighted flags have
 * frozen trading (#1386). Trading stays disabled until the review resolves;
 * the review status is surfaced so holders know what is happening.
 */
export default function FrozenForReviewBanner({
	autoFrozen = false,
	reviewStatus,
	flagCount,
	threshold,
	frozenAt,
	className,
}: FrozenForReviewBannerProps) {
	if (!autoFrozen) return null;

	const frozenAtLabel = frozenAt
		? formatAbsoluteDateTime(frozenAt) ?? frozenAt
		: null;

	return (
		<div
			role="status"
			className={cn(
				'relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-rose-950/20 to-rose-900/10 p-5 shadow-xl shadow-rose-950/20 backdrop-blur-md md:p-6',
				className
			)}
			data-testid="frozen-for-review-banner"
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-200">
							<Lock className="size-3.5" aria-hidden="true" />
							<span>Trading Frozen</span>
						</span>
						<span
							className="text-xs font-medium text-rose-200/80"
							data-testid="frozen-review-status"
						>
							{formatKeyFlagReviewStatus(reviewStatus)}
						</span>
					</div>

					<h2 className="font-grotesque text-lg font-black tracking-tight text-white">
						Key frozen for review
					</h2>
					<p
						className="max-w-2xl text-sm text-white/80 font-jakarta leading-relaxed"
						data-testid="frozen-trading-explanation"
					>
						Community flags reached the freeze threshold
						{typeof flagCount === 'number' && typeof threshold === 'number'
							? ` (${flagCount} of ${threshold})`
							: ''}
						. Buying and selling are disabled until the review completes. Your
						keys and funds stay in your wallet, and stakes are returned or
						forfeited once the review resolves.
					</p>
				</div>

				<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
						<AlertTriangle className="size-5" aria-hidden="true" />
					</div>
					<div>
						<div className="text-[0.7rem] font-medium uppercase tracking-wider text-white/50">
							Frozen since
						</div>
						<div
							className="text-sm font-semibold text-white/90 tabular-nums"
							data-testid="frozen-since"
						>
							{frozenAtLabel ?? 'Pending timestamp'}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
