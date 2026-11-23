import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { LaunchCapData } from '@/hooks/useLaunchCap';

interface LaunchCapMeterProps {
	data: LaunchCapData;
	className?: string;
}

const LaunchCapMeter: React.FC<LaunchCapMeterProps> = ({ data, className }) => {
	if (data.windowEnd != null && Date.now() >= data.windowEnd) return null;

	if (data.isExempt) {
		return (
			<div
				data-testid="launch-cap-exempt"
				className={`flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 ${className ?? ''}`}
			>
				<ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
				<span>
					Exempt wallet —{' '}
					{data.exemptionReason === 'creator' ? 'creator' : 'allowlisted'}{' '}
					wallets have no launch purchase limit.
				</span>
			</div>
		);
	}

	const now = Date.now();
	const start = data.windowStart ?? now;
	const end = data.windowEnd ?? start;
	const progress =
		end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
	const range = Math.max(1, data.finalCap - data.initialCap);
	const consumed = Math.min(
		1,
		data.purchasedAmount / Math.max(1, data.currentCap)
	);

	return (
		<div
			data-testid="launch-cap-meter"
			className={`rounded-xl border border-white/10 bg-white/3 p-3 ${className ?? ''}`}
		>
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium text-white/80">
					Launch purchase allowance
				</span>
				<span
					data-testid="launch-cap-remaining"
					className="font-mono text-amber-300"
				>
					{formatNumber(data.remainingAllowance)} remaining
				</span>
			</div>

			<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full bg-amber-400"
					style={{ width: `${consumed * 100}%` }}
					aria-label={`${formatNumber(data.purchasedAmount)} purchased of ${formatNumber(data.currentCap)} keys`}
				/>
			</div>

			<div className="relative mt-3 h-12" data-testid="launch-cap-chart">
				<svg
					viewBox="0 0 100 40"
					preserveAspectRatio="none"
					className="h-full w-full"
					aria-label="Launch cap ramp chart"
				>
					<line
						x1="0"
						y1="38"
						x2="100"
						y2="38"
						stroke="rgba(255,255,255,.12)"
					/>
					<line
						x1="0"
						y1="38"
						x2="100"
						y2="4"
						stroke="rgba(251,191,36,.8)"
						strokeWidth="2"
					/>
				</svg>
				<span
					data-testid="launch-cap-current-point"
					className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-200 bg-amber-500"
					style={{
						left: `${progress * 100}%`,
						top: `${38 - progress * 34}%`,
					}}
				/>
			</div>
			<p className="mt-1 text-[11px] text-white/50">
				Current cap {formatNumber(data.currentCap)} · increases to{' '}
				{formatNumber(data.finalCap)} at window close
				{data.currentCap < data.finalCap && data.windowEnd != null
					? ` · ${formatNumber(range)} key ramp`
					: ''}
			</p>
		</div>
	);
};

export default LaunchCapMeter;
