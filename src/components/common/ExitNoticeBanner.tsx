import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Coins, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	resolveExitNotice,
	hasFullyExitedPosition,
	type ExitNoticeFields,
} from '@/utils/exitNotice.utils';
import {
	computeRemainingCooldownSeconds,
	formatCooldownDuration,
} from '@/utils/buyCooldown.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

export interface ExitNoticeBannerProps {
	creator: ExitNoticeFields;
	holdingsCount?: number;
	onSellNow?: () => void;
	className?: string;
}

const ACTION_LABELS = {
	deprecation: 'Deprecation',
	retirement: 'Retirement',
} as const;

/**
 * Urgent exit-notice banner for a key entering deprecation or retirement
 * notice (#1246). Shown on the key detail page and on each portfolio
 * holding row. Dismisses itself once the holder's position reaches zero
 * (`hasFullyExitedPosition`) — there is nothing left to act on.
 */
export const ExitNoticeBanner: React.FC<ExitNoticeBannerProps> = ({
	creator,
	holdingsCount = 0,
	onSellNow,
	className,
}) => {
	const notice = resolveExitNotice(creator);

	const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
		computeRemainingCooldownSeconds(notice?.noticeExpiresAt)
	);

	useEffect(() => {
		if (!notice?.noticeExpiresAt) {
			setRemainingSeconds(0);
			return;
		}

		setRemainingSeconds(computeRemainingCooldownSeconds(notice.noticeExpiresAt));
		const intervalId = setInterval(() => {
			setRemainingSeconds(computeRemainingCooldownSeconds(notice.noticeExpiresAt));
		}, 1000);

		return () => clearInterval(intervalId);
	}, [notice?.noticeExpiresAt]);

	if (!notice || hasFullyExitedPosition(holdingsCount)) {
		return null;
	}

	const isRetirement = notice.actionType === 'retirement';
	const hasDeadline = Boolean(notice.noticeExpiresAt);
	const expired = hasDeadline && remainingSeconds <= 0;

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md shadow-xl md:p-6',
				isRetirement
					? 'border-red-500/30 bg-gradient-to-r from-red-500/15 via-rose-950/20 to-red-900/10 shadow-red-950/20'
					: 'border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-950/20 to-amber-900/10 shadow-amber-950/20',
				className
			)}
			data-testid="exit-notice-banner"
			data-action-type={notice.actionType}
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="max-w-2xl space-y-2">
					<div className="flex flex-wrap items-center gap-2.5">
						<span
							className={cn(
								'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
								isRetirement
									? 'border-red-500/40 bg-red-500/20 text-red-300'
									: 'border-amber-500/40 bg-amber-500/20 text-amber-300'
							)}
							data-testid="exit-notice-action-type"
						>
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>{ACTION_LABELS[notice.actionType]}</span>
						</span>
						{isRetirement && (
							<span className="text-xs font-medium text-red-200/70">
								Guaranteed Contract Buyback Active
							</span>
						)}
					</div>

					<p className="text-sm leading-relaxed text-white/80">
						{isRetirement
							? 'This key is being retired. Trading has ceased permanently. Sell your position now at the guaranteed buyback price before the notice window closes.'
							: creator.deprecationReason ??
								'This creator key has been deprecated. Trading on the open market has ceased.'}
					</p>

					{hasDeadline && (
						<div
							className={cn(
								'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
								expired
									? 'bg-white/5 text-white/40'
									: 'bg-red-500/10 text-red-300'
							)}
							data-testid="exit-notice-countdown"
							role="status"
							aria-live="polite"
						>
							<Clock className="size-3.5 shrink-0" />
							<span>
								{expired
									? 'Notice window closed'
									: `Notice closes in ${formatCooldownDuration(remainingSeconds)}`}
							</span>
						</div>
					)}
				</div>

				<div className="flex flex-wrap items-stretch gap-3">
					{isRetirement && notice.buybackPriceStroops != null && (
						<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 min-w-[140px]">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
								<Coins className="size-5" />
							</div>
							<div>
								<div className="text-[0.7rem] font-medium uppercase tracking-wider text-white/50">
									Buyback Price
								</div>
								<div
									className="text-base font-bold tabular-nums text-red-300"
									data-testid="exit-notice-buyback-price"
								>
									{formatDisplayKeyPrice(notice.buybackPriceStroops)}
								</div>
							</div>
						</div>
					)}

					<Button
						type="button"
						onClick={onSellNow}
						disabled={expired}
						className={cn(
							'flex items-center gap-2 self-start rounded-xl px-5 py-2.5 font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]',
							isRetirement
								? 'bg-red-500 text-slate-950 shadow-red-500/10 hover:bg-red-400'
								: 'bg-amber-500 text-slate-950 shadow-amber-500/10 hover:bg-amber-400',
							expired && 'cursor-not-allowed opacity-50 hover:scale-100'
						)}
						data-testid="exit-notice-sell-now-button"
					>
						<span>Sell Now</span>
						<ArrowRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ExitNoticeBanner;
