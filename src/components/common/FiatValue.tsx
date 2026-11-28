import { Tooltip } from '@/components/ui/tooltip';
import { useXlmFiatRateContext } from '@/components/common/xlmFiatRateContext';
import { formatXlmAsFiat } from '@/utils/fiatCurrency.utils';
import { cn } from '@/lib/utils';

interface FiatValueProps {
	xlmAmount: number | null | undefined;
	className?: string;
}

export default function FiatValue({ xlmAmount, className }: FiatValueProps) {
	const rateQuery = useXlmFiatRateContext();

	if (xlmAmount == null || !Number.isFinite(xlmAmount) || !rateQuery) {
		return null;
	}

	if (rateQuery.isError) {
		return (
			<span
				className={cn('text-xs font-normal text-white/40', className)}
				data-testid="fiat-rate-unavailable"
			>
				rate unavailable
			</span>
		);
	}

	if (!rateQuery.data) return null;

	const value = formatXlmAsFiat(
		xlmAmount,
		rateQuery.data.rate,
		rateQuery.currency
	);
	if (value == null) return null;

	const lastUpdated = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(rateQuery.data.fetchedAt);

	return (
		<span className="relative z-20 inline-flex">
			<Tooltip
				content={
					<span>Rate source: CoinGecko. Last updated: {lastUpdated}</span>
				}
			>
				<span
					tabIndex={0}
					className={cn(
						'cursor-help text-xs font-medium text-white/50',
						className
					)}
					data-testid="fiat-value"
				>
					{value}
				</span>
			</Tooltip>
		</span>
	);
}
