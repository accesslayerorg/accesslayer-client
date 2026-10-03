import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

export interface SupplyCapProgressProps {
    current?: number | null;
    cap?: number | null;
    isLoading?: boolean;
    isError?: boolean;
    className?: string;
}

function ratioFor(current: number, cap: number): number {
    if (cap <= 0) return 0;
    return Math.min(1, Math.max(0, current / cap));
}

const SupplyCapProgress: React.FC<SupplyCapProgressProps> = ({
    current,
    cap,
    isLoading = false,
    isError = false,
    className,
}) => {
    const hasCap = cap != null && cap > 0;
    if (!hasCap) return null;

    if (isLoading) {
        return (
            <div
                data-testid="supply-cap-progress-loading"
                className={cn(
                    'rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4',
                    className
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                </div>
                <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-white/10" />
            </div>
        );
    }

    if (isError || current == null) {
        return (
            <div
                data-testid="supply-cap-progress-error"
                className={cn(
                    'rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-xs text-rose-200/80',
                    className
                )}
            >
                Supply cap information is temporarily unavailable.
            </div>
        );
    }

    const safeCurrent = Math.max(0, current);
    const ratio = ratioFor(safeCurrent, cap);
    const percent = Math.round(ratio * 100);
    const remaining = Math.max(0, cap - safeCurrent);
    const soldOut = safeCurrent >= cap;

    return (
        <div
            data-testid="supply-cap-progress"
            className={cn(
                'rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4',
                className
            )}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                        Supply Cap
                    </p>
                    {soldOut && (
                        <span
                            data-testid="supply-cap-progress-sold-out-badge"
                            className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-rose-300"
                        >
                            Sold out
                        </span>
                    )}
                </div>
                <p
                    data-testid="supply-cap-progress-percent"
                    className="text-xs font-semibold tabular-nums text-white/70"
                >
                    {percent}%
                </p>
            </div>

            <div
                role="progressbar"
                aria-valuenow={safeCurrent}
                aria-valuemin={0}
                aria-valuemax={cap}
                aria-label={`${safeCurrent} of ${cap} keys sold`}
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]"
            >
                <div
                    data-testid="supply-cap-progress-fill"
                    className={cn(
                        'h-full rounded-full transition-[width] duration-500 ease-out',
                        soldOut ? 'bg-rose-400' : 'bg-amber-400'
                    )}
                    style={{ width: `${ratio * 100}%` }}
                />
            </div>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-white/60">
                <span data-testid="supply-cap-progress-current">
                    <strong className="font-bold text-white">
                        {formatNumber(safeCurrent)}
                    </strong>{' '}
                    of{' '}
                    <strong className="font-bold text-white">
                        {formatNumber(cap)}
                    </strong>{' '}
                    keys sold
                </span>
                <span data-testid="supply-cap-progress-remaining">
                    {remaining > 0
                        ? `${formatCompactNumber(remaining)} remaining`
                        : 'No keys remaining'}
                </span>
            </div>
        </div>
    );
};

export default SupplyCapProgress;