/**
 * LaunchCapMeter (#1385).
 *
 * Displays the launch window purchase cap status on the buy panel:
 * - Shows remaining allowance based on cumulative purchases.
 * - Shows the next cap increase time and value.
 * - Visualizes the cap ramp schedule with the current point marked.
 * - Shows exempt status notice for creators and allowlisted wallets.
 * - Disappears when the launch window ends or when no cap exists.
 */

import React from 'react';
import { useLaunchCap } from '@/hooks/useLaunchCap';
import { LaunchCapRampChart } from '@/components/common/LaunchCapRampChart';
import { ShieldCheck, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LaunchCapConfig, LaunchCapData } from '@/types/launchCap';

export interface LaunchCapMeterProps {
	/** Creator key ID */
	keyId?: string;
	/** Connected wallet address */
	wallet?: string | null;
	/** Precomputed launch cap data (optional override for testing/props) */
	data?: LaunchCapData;
	/** Custom config (optional override) */
	config?: LaunchCapConfig;
	className?: string;
}

function formatTimeDelta(ms: number): string {
	if (ms <= 0) return '0s';
	const totalSec = Math.floor(ms / 1000);
	const hours = Math.floor(totalSec / 3600);
	const minutes = Math.floor((totalSec % 3600) / 60);
	const seconds = totalSec % 60;

	if (hours > 0) {
		return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`.trim();
	}
	return `${seconds}s`;
}

export const LaunchCapMeter: React.FC<LaunchCapMeterProps> = ({
	keyId,
	wallet,
	data: overrideData,
	config,
	className,
}) => {
	const hookData = useLaunchCap(
		overrideData ? undefined : keyId,
		overrideData ? undefined : wallet,
		config ? { config } : undefined
	);

	const data = overrideData ?? hookData;

	// Hide the meter when the window has ended or no cap exists (#1385)
	if (!data.hasCap || data.isWindowEnded) {
		return null;
	}

	// Exempt wallets see an exempt notice and no limit (#1385)
	if (data.isExempt) {
		return (
			<div
				className={cn(
					'rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200',
					className
				)}
				data-testid="launch-cap-exempt-notice"
				role="status"
			>
				<div className="flex items-start gap-2.5">
					<ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
					<div className="space-y-0.5">
						<p className="font-semibold text-emerald-300">
							Launch Purchase Cap: Exempt
						</p>
						<p className="text-[11px] leading-relaxed text-emerald-200/80">
							{data.exemptionReason === 'creator'
								? 'You are the creator of this key. No launch window purchase limit applies.'
								: 'Your wallet is allowlisted. No launch window purchase limit applies.'}
						</p>
					</div>
				</div>
			</div>
		);
	}

	const currentCap = data.currentCap ?? 0;
	const purchased = data.purchasedAmount;
	const remaining = data.remainingAllowance;
	const usedPercent = currentCap > 0 ? Math.min(100, Math.round((purchased / currentCap) * 100)) : 0;
	const isAtCap = remaining === 0;

	const now = Date.now();
	const nextIncrease = data.nextIncrease;
	const timeToNext = nextIncrease ? Math.max(0, nextIncrease.timestamp - now) : null;

	return (
		<div
			className={cn(
				'space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 text-white',
				className
			)}
			data-testid="launch-cap-meter"
		>
			{/* Header row */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-1.5 font-semibold text-amber-300">
					<TrendingUp className="size-3.5" />
					<span>Launch Purchase Cap</span>
				</div>
				<span className="text-[11px] text-white/50">
					Current Cap: <strong className="text-white/80">{currentCap}</strong> keys
				</span>
			</div>

			{/* Allowance & purchased summary */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span
						className={cn(
							'font-bold',
							isAtCap ? 'text-red-400' : 'text-white'
						)}
						data-testid="launch-cap-remaining-allowance"
					>
						{isAtCap ? (
							'Cap reached (0 keys remaining)'
						) : (
							<>
								Remaining allowance:{' '}
								<span className="text-amber-400 font-extrabold tabular-nums">
									{remaining}
								</span>{' '}
								key{remaining === 1 ? '' : 's'}
							</>
						)}
					</span>
					<span
						className="text-[11px] text-white/50 tabular-nums"
						data-testid="launch-cap-purchased-amount"
					>
						Purchased: {purchased} / {currentCap}
					</span>
				</div>

				{/* Progress bar */}
				<div
					role="progressbar"
					aria-valuenow={purchased}
					aria-valuemin={0}
					aria-valuemax={currentCap}
					aria-label={`Purchase allowance: ${remaining} keys remaining`}
					className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
				>
					<div
						className={cn(
							'h-full rounded-full transition-all duration-300',
							isAtCap
								? 'bg-red-500'
								: usedPercent >= 80
									? 'bg-amber-400'
									: 'bg-emerald-400'
						)}
						style={{ width: `${usedPercent}%` }}
					/>
				</div>
			</div>

			{/* Next cap increase callout */}
			<div
				className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/5 px-2.5 py-1.5 text-[11px]"
				data-testid="launch-cap-next-increase"
			>
				{nextIncrease && timeToNext !== null ? (
					<>
						<div className="flex items-center gap-1.5 text-white/70">
							<Clock className="size-3 text-amber-400/80" />
							<span>Next increase to <strong className="text-amber-300 font-bold">{nextIncrease.cap} keys</strong></span>
						</div>
						<span className="text-white/45 tabular-nums">
							in {formatTimeDelta(timeToNext)}
						</span>
					</>
				) : (
					<div className="flex items-center gap-1.5 text-white/50">
						<AlertCircle className="size-3 text-white/40" />
						<span>Final tier. Cap active until launch window ends.</span>
					</div>
				)}
			</div>

			{/* Ramp schedule chart marking current point */}
			<LaunchCapRampChart
				steps={data.rampSteps}
				currentCap={data.currentCap}
				currentTimestamp={now}
				windowEnd={data.windowEnd ?? undefined}
			/>
		</div>
	);
};

export default LaunchCapMeter;
