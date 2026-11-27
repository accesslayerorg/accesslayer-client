import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { useOracleStatus, type UseOracleStatusResult } from '@/hooks/useOracleStatus';
import { cn } from '@/lib/utils';

export interface OracleHealthBadgeProps {
	/** Asset identifier (e.g. 'XLM'). If not provided, badge is hidden. */
	asset?: string;
	/** Explicit toggle to hide badge for features that do not use the oracle. */
	hidden?: boolean;
	/** Optional class name override. */
	className?: string;
	/** Pre-resolved oracle status (useful for tests or parent-provided state). */
	statusOverride?: UseOracleStatusResult;
}

export const OracleHealthBadge: React.FC<OracleHealthBadgeProps> = ({
	asset = 'XLM',
	hidden = false,
	className,
	statusOverride,
}) => {
	const hookStatus = useOracleStatus(asset, {
		enabled: !statusOverride && !hidden && Boolean(asset),
	});

	// If explicitly hidden or no asset supplied, do not render badge (#acceptance criteria)
	if (hidden || !asset) {
		return null;
	}

	const {
		status,
		source,
		sourceName,
		priceXlm,
		relativeTime,
		deviationPercent,
		isLoading,
	} = statusOverride ?? hookStatus;

	if (isLoading) {
		return (
			<span
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 animate-pulse',
					className
				)}
				data-testid="oracle-health-badge-loading"
			>
				Oracle: Checking…
			</span>
		);
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#06111f]',
						status === 'healthy' &&
							'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 focus:ring-emerald-400',
						status === 'fallback' &&
							'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 focus:ring-amber-400',
						status === 'stale' &&
							'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-400',
						className
					)}
					data-testid="oracle-health-badge"
					data-status={status}
					aria-label={`Oracle Status: ${status}`}
				>
					{status === 'healthy' && (
						<>
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							<span data-testid="oracle-status-label">Oracle: Healthy</span>
						</>
					)}

					{status === 'fallback' && (
						<>
							<AlertCircle className="size-3.5 text-amber-400" />
							<span data-testid="oracle-status-label">Oracle: Fallback</span>
						</>
					)}

					{status === 'stale' && (
						<>
							<AlertTriangle className="size-3.5 text-red-400" />
							<span data-testid="oracle-status-label">Oracle: Stale</span>
						</>
					)}
				</button>
			</PopoverTrigger>

			<PopoverContent
				align="start"
				sideOffset={6}
				className="w-80 rounded-xl border border-white/10 bg-[#0d1b2e] p-4 text-white shadow-2xl backdrop-blur-md"
				data-testid="oracle-health-popover"
			>
				<div className="space-y-3">
					<div className="flex items-center justify-between border-b border-white/10 pb-2.5">
						<div className="flex items-center gap-1.5 font-jakarta font-bold text-sm">
							<Info className="size-4 text-cyan-400" />
							Oracle Status: {asset}
						</div>
						<span
							className={cn(
								'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
								status === 'healthy' && 'bg-emerald-500/20 text-emerald-400',
								status === 'fallback' && 'bg-amber-500/20 text-amber-400',
								status === 'stale' && 'bg-red-500/20 text-red-400'
							)}
							data-testid="popover-status-badge"
						>
							{status}
						</span>
					</div>

					<div className="space-y-2 text-xs">
						<div className="flex items-center justify-between">
							<span className="text-white/60">Feed Source</span>
							<span
								className="font-medium text-white/90"
								data-testid="popover-source-name"
							>
								{sourceName} ({source})
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-white/60">Reported Price</span>
							<span
								className="font-mono text-white/90 font-semibold"
								data-testid="popover-price"
							>
								{priceXlm.toFixed(4)} XLM
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-white/60">Last Update Age</span>
							<span
								className="font-mono text-cyan-300 font-medium"
								data-testid="popover-relative-age"
							>
								{relativeTime}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-white/60">Contract Deviation</span>
							<span
								className="font-mono text-white/90"
								data-testid="popover-deviation"
							>
								{deviationPercent.toFixed(2)}%
							</span>
						</div>
					</div>

					<div
						className={cn(
							'rounded-lg p-2.5 text-xs leading-relaxed border',
							status === 'healthy' &&
								'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
							status === 'fallback' &&
								'border-amber-500/20 bg-amber-500/10 text-amber-200',
							status === 'stale' &&
								'border-red-500/20 bg-red-500/10 text-red-200'
						)}
						data-testid="popover-explanation"
					>
						{status === 'healthy' && (
							<div className="flex items-start gap-1.5">
								<CheckCircle2 className="size-3.5 shrink-0 mt-0.5 text-emerald-400" />
								<span>
									The price oracle is operating normally on its primary feed with live
									contract-verified prices.
								</span>
							</div>
						)}
						{status === 'fallback' && (
							<div className="flex items-start gap-1.5">
								<AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
								<span>
									Notice: The oracle is running on its fallback source. Swaps and
									borrow actions continue, but may experience higher deviation.
								</span>
							</div>
						)}
						{status === 'stale' && (
							<div className="flex items-start gap-1.5">
								<AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-red-400" />
								<span>
									Warning: The oracle price is stale. Price-dependent operations
									are disabled to protect against inaccurate valuations.
								</span>
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};

export default OracleHealthBadge;
