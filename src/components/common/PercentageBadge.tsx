import { cn } from '@/lib/utils';
import { formatPercent, type FormatPercentOptions } from '@/utils/numberFormat.utils';

export type PercentageBadgeTone =
	| 'neutral'
	| 'positive'
	| 'negative'
	| 'muted';

interface PercentageBadgeProps extends FormatPercentOptions {
	/** Percentage value (already in percentage units — `12.5` renders `12.5%`). */
	value: number | null | undefined;
	/**
	 * Visual tone. `neutral` (default) renders a quiet white chip suitable for
	 * informational badges; the other tones map to the color system used by
	 * `Change24hBadge`.
	 */
	tone?: PercentageBadgeTone;
	/** Optional label rendered next to the value, e.g. `Funded`. */
	label?: string;
	className?: string;
}

const toneClasses: Record<PercentageBadgeTone, string> = {
	neutral: 'border-white/10 bg-white/[0.06] text-white/70',
	positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
	negative: 'border-red-500/30 bg-red-500/10 text-red-400',
	muted: 'border-white/10 bg-white/[0.04] text-white/40',
};

/**
 * Standardized chip for percentage values. Uses the shared `formatPercent`
 * helper so precision and edge-case behavior (null / NaN / Infinity) stay
 * consistent across every percentage badge in the app.
 */
const PercentageBadge: React.FC<PercentageBadgeProps> = ({
	value,
	tone = 'neutral',
	label,
	className,
	...formatOptions
}) => {
	const formatted = formatPercent(value, formatOptions);

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm',
				toneClasses[tone],
				className
			)}
			title={label ? `${label}: ${formatted}` : formatted}
		>
			{label && <span className="text-white/50">{label}</span>}
			<span>{formatted}</span>
		</span>
	);
};

export default PercentageBadge;
