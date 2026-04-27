import * as React from 'react';
import { Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { formatRelativeTime, type TooltipContent } from '@/utils/keyPrice.utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

interface KeySupplyBadgeProps {
	/** Total key supply. Undefined or null renders a graceful placeholder. */
	supply?: number | null;
	className?: string;
	tooltipContent?: TooltipContent;
}

function KeyPriceTooltipContent({ lastUpdated, quoteSource }: TooltipContent) {
	const timeLabel = formatRelativeTime(lastUpdated);
	const sourceLabel = quoteSource?.trim() ? `Source: ${quoteSource}` : 'Source: N/A';

	return (
		<div>
			<div>{timeLabel}</div>
			<div>{sourceLabel}</div>
		</div>
	);
}

const KeySupplyBadge: React.FC<KeySupplyBadgeProps> = ({ supply, className, tooltipContent }) => {
	const hasData = supply != null && supply >= 0;

	const badge = (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm',
				hasData
					? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
					: 'border-white/10 bg-white/[0.06] text-white/40',
				className
			)}
			title={hasData ? `${formatNumber(supply)} keys available` : 'Supply not available'}
		>
			<Key className="size-3" aria-hidden="true" />
			<span>{hasData ? formatCompactNumber(supply!) : '—'}</span>
		</span>
	);

	if (tooltipContent) {
		return (
			<Tooltip content={<KeyPriceTooltipContent {...tooltipContent} />}>
				{badge}
			</Tooltip>
		);
	}

	return badge;
};

export default KeySupplyBadge;
