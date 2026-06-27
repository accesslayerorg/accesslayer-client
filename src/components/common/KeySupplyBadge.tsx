import * as React from 'react';
import { Key, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import {
        formatTimestampTooltip,
        type TooltipContent,
} from '@/utils/keyPrice.utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

interface KeySupplyBadgeProps {
        /** Total key supply. Undefined or null renders a graceful placeholder. */
        supply?: number | null;
        className?: string;
        tooltipContent?: TooltipContent;
}

const SUPPLY_EXPLANATION =
        'Key supply is the total number of keys minted for this creator. ' +
        'As more keys are bought, the price rises along a bonding curve — earlier buyers pay less. ' +
        'A higher supply means more keys have been purchased and the current price is higher.';

function KeyPriceTooltipContent({ lastUpdated, quoteSource }: TooltipContent) {
        const timestamp = formatTimestampTooltip(lastUpdated);
        const sourceLabel = quoteSource?.trim()
                ? `Source: ${quoteSource}`
                : 'Source: N/A';
        return (
                <div>
                        <div title={timestamp.title ?? undefined}>{timestamp.display}</div>
                        <div>{sourceLabel}</div>
                </div>
        );
}

const KeySupplyBadge: React.FC<KeySupplyBadgeProps> = ({
        supply,
        className,
        tooltipContent,
}) => {
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
                        title={
                                hasData
                                        ? `${formatNumber(supply)} keys available`
                                        : 'Supply not available'
                        }
                >
                        <Key className="size-3" aria-hidden="true" />
                        <span>{hasData ? formatCompactNumber(supply!) : '—'}</span>
                        <Tooltip content={SUPPLY_EXPLANATION}>
                                <button
                                        type="button"
                                        aria-label="What is key supply?"
                                        className="inline-flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded-full"
                                        onClick={(e) => e.stopPropagation()}
                                >
                                        <Info className="size-3 opacity-60 hover:opacity-100 transition-opacity" aria-hidden="true" />
                                </button>
                        </Tooltip>
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
