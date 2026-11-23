import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SameLedgerNoticeProps {
	/** Milliseconds until the next ledger closes (when locked balance unlocks). */
	nextLedgerCloseEstimate?: number;
	/** Amount of balance locked in the current ledger. */
	lockedBalance: number;
	/** Total balance. */
	totalBalance: number;
	/** Custom class name. */
	className?: string;
}

/**
 * Notice explaining that newly bought keys unlock in the next ledger.
 * Shows a countdown to the next ledger close.
 * Only renders when lockedBalance > 0.
 */
export const SameLedgerNotice: React.FC<SameLedgerNoticeProps> = ({
	nextLedgerCloseEstimate,
	lockedBalance,
	totalBalance,
	className,
}) => {
	const [timeRemaining, setTimeRemaining] = useState<number>(0);

	useEffect(() => {
		if (!nextLedgerCloseEstimate) return;

		const update = () => {
			const remaining = Math.max(0, nextLedgerCloseEstimate - Date.now());
			setTimeRemaining(remaining);
		};

		update();
		const interval = window.setInterval(update, 1000);
		return () => window.clearInterval(interval);
	}, [nextLedgerCloseEstimate]);

	if (lockedBalance <= 0) return null;

	const percentage = totalBalance > 0 ? Math.round((lockedBalance / totalBalance) * 100) : 0;
	const seconds = Math.ceil(timeRemaining / 1000);
	const countdownText = seconds > 0 ? `${seconds}s` : 'unlocking...';

	return (
		<div
			className={cn(
				'mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4',
				className
			)}
			role="alert"
			data-testid="same-ledger-notice"
		>
			<div className="flex items-start gap-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
					<AlertCircle className="size-4" aria-hidden="true" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h4 className="font-semibold text-amber-200">Same-Ledger Sell Restriction</h4>
						<Tooltip
							content="Keys purchased in the current ledger cannot be sold until the next ledger closes (~5 seconds). This prevents front-running and ensures fair price discovery."
						>
							<button
								type="button"
								className="text-white/50 hover:text-white/80 focus:outline-hidden"
								aria-label="Learn about same-ledger restriction"
							>
								<Info className="size-3.5" />
							</button>
						</Tooltip>
					</div>
					<p className="mt-1 text-sm text-white/80">
						{lockedBalance} of {totalBalance} keys ({percentage}%) are locked because they were purchased in the
						current ledger. They become sellable when the next ledger closes.
					</p>
					<div className="mt-2 flex items-center gap-2 text-xs text-amber-300">
						<Clock className="size-3.5" aria-hidden="true" />
						<span>Next unlock in: <strong>{countdownText}</strong></span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SameLedgerNotice;