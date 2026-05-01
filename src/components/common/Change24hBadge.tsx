import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/utils/numberFormat.utils';

interface Change24hBadgeProps {
	/** Percentage change over 24h. Positive = up, negative = down, undefined = no data. */
	change?: number;
	className?: string;
}

const Change24hBadge: React.FC<Change24hBadgeProps> = ({ change, className }) => {
	const isPositive = change !== undefined && change > 0;
	const isNegative = change !== undefined && change < 0;
	const formatted = formatPercent(change, { signed: true });

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm',
				isPositive && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
				isNegative && 'border-red-500/30 bg-red-500/10 text-red-400',
				!isPositive && !isNegative && 'border-white/10 bg-white/[0.06] text-white/40',
				className
			)}
			title={change !== undefined ? `${formatted} (24h)` : 'No 24h data'}
		>
			{isPositive && <TrendingUp className="size-3" />}
			{isNegative && <TrendingDown className="size-3" />}
			{!isPositive && !isNegative && <Minus className="size-3" />}
			<span>{formatted}</span>
		</div>
	);
};

export default Change24hBadge;
