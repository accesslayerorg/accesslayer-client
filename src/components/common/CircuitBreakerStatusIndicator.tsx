import React, { useId, useState, useCallback } from 'react';
import { AlertTriangle, AlertOctagon, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPriceImpact } from '@/utils/priceImpact.utils';
import {
	evaluateCircuitBreakerStatus,
	CIRCUIT_BREAKER_TOOLTIP_EXPLANATION,
	type CircuitBreakerStatus,
} from '@/utils/circuitBreaker.utils';

export interface CircuitBreakerStatusIndicatorProps {
	/** Price impact percentage for the current buy quantity (e.g. 2.5 for +2.50%). */
	impactPercent: number | null | undefined;
	/** Configured circuit breaker limit in percent (e.g. 15 for 15%). */
	thresholdPercent?: number | null;
	/** Configured circuit breaker limit in basis points (e.g. 1500 for 15%). */
	thresholdBps?: number | null;
	/** Proximity ratio for entering the approaching warning state (default 0.8 = 80%). */
	proximityRatio?: number;
	/** Whether the quantity input is valid (greater than zero and whole number). */
	isValid?: boolean;
	className?: string;
}

/**
 * Real-time price impact indicator and circuit breaker status banner on buy forms (#1034).
 *
 * Displays:
 * 1. Live price impact percentage below the amount input.
 * 2. An accessible tooltip explaining circuit breaker protection.
 * 3. An approaching warning banner when price impact reaches proximity threshold (default 80%).
 * 4. A breach banner when price impact equals or exceeds the circuit breaker limit.
 */
export const CircuitBreakerStatusIndicator: React.FC<
	CircuitBreakerStatusIndicatorProps
> = ({
	impactPercent,
	thresholdPercent,
	thresholdBps,
	proximityRatio,
	isValid = true,
	className,
}) => {
	const tooltipId = useId();
	const [tooltipOpen, setTooltipOpen] = useState(false);

	const showTooltip = useCallback(() => setTooltipOpen(true), []);
	const hideTooltip = useCallback(() => setTooltipOpen(false), []);
	const toggleTooltip = useCallback(() => setTooltipOpen(prev => !prev), []);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === 'Escape' && tooltipOpen) {
			event.stopPropagation();
			hideTooltip();
		}
	};

	if (!isValid || impactPercent == null || !Number.isFinite(impactPercent)) {
		return null;
	}

	const status: CircuitBreakerStatus = evaluateCircuitBreakerStatus({
		impactPercent,
		thresholdPercent,
		thresholdBps,
		proximityRatio,
	});

	const formattedImpact = formatPriceImpact(status.impactPercent);

	// Tone styling based on status level
	const impactToneClass =
		status.level === 'breached'
			? 'text-rose-400 font-bold'
			: status.level === 'approaching'
				? 'text-amber-300 font-semibold'
				: 'text-emerald-400 font-medium';

	return (
		<div
			className={cn('space-y-2 pt-1 text-xs', className)}
			data-testid="circuit-breaker-status-indicator"
			data-level={status.level}
		>
			{/* Price Impact Header Row */}
			<div
				className="flex items-center justify-between text-xs"
				data-testid="circuit-breaker-impact-row"
			>
				<div className="flex items-center gap-1.5 text-white/60">
					<span>Price impact</span>
					{/* Circuit Breaker Protection Info Tooltip */}
					<span className="relative inline-flex items-center">
						<button
							type="button"
							aria-label="Explain circuit breaker protection"
							aria-describedby={tooltipOpen ? tooltipId : undefined}
							aria-expanded={tooltipOpen}
							onMouseEnter={showTooltip}
							onMouseLeave={hideTooltip}
							onFocus={showTooltip}
							onBlur={hideTooltip}
							onClick={toggleTooltip}
							onKeyDown={handleKeyDown}
							data-testid="circuit-breaker-tooltip-trigger"
							className="inline-flex size-4 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
						>
							<Info className="size-3" aria-hidden="true" />
						</button>
						{tooltipOpen && (
							<span
								id={tooltipId}
								role="tooltip"
								data-testid="circuit-breaker-tooltip-content"
								className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-[0.7rem] font-normal leading-relaxed text-white/90 shadow-xl backdrop-blur-md"
							>
								{CIRCUIT_BREAKER_TOOLTIP_EXPLANATION}
							</span>
						)}
					</span>
				</div>

				<div className="flex items-center gap-1 font-mono">
					{status.level === 'normal' && (
						<ShieldCheck className="size-3 text-emerald-400/80" aria-hidden="true" />
					)}
					<span
						className={cn('tabular-nums', impactToneClass)}
						data-testid="circuit-breaker-impact-value"
					>
						{formattedImpact}
					</span>
				</div>
			</div>

			{/* Warning Banner: Approaching Circuit Breaker Threshold */}
			{status.level === 'approaching' && (
				<div
					role="alert"
					data-testid="circuit-breaker-warning-banner"
					className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200"
				>
					<AlertTriangle
						className="size-4 shrink-0 text-amber-400 mt-0.5"
						aria-hidden="true"
					/>
					<div className="space-y-0.5">
						<p className="font-semibold text-amber-300">
							Approaching Circuit Breaker Limit ({status.thresholdPercent}%)
						</p>
						<p className="text-white/70 leading-relaxed">
							This trade has an estimated price impact of{' '}
							<strong className="text-amber-200">{formattedImpact}</strong>. Orders
							reaching or exceeding {status.thresholdPercent}% will be halted to
							protect against excessive price slippage.
						</p>
					</div>
				</div>
			)}

			{/* Breach Banner: Circuit Breaker Tripped */}
			{status.level === 'breached' && (
				<div
					role="alert"
					data-testid="circuit-breaker-breach-banner"
					className="flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 p-2.5 text-xs text-rose-200"
				>
					<AlertOctagon
						className="size-4 shrink-0 text-rose-400 mt-0.5"
						aria-hidden="true"
					/>
					<div className="space-y-0.5">
						<p className="font-bold text-rose-300">
							Circuit Breaker Triggered ({status.thresholdPercent}%)
						</p>
						<p className="text-white/75 leading-relaxed">
							The current order causes a price impact of{' '}
							<strong className="text-rose-200">{formattedImpact}</strong>, which
							exceeds the key&apos;s configured threshold of{' '}
							{status.thresholdPercent}%. Purchases are blocked to protect buyers
							from extreme slippage.
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default CircuitBreakerStatusIndicator;
