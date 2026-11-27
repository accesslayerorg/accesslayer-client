import Chart from '@/components/charts/PriceChart';
import type { PriceChartProps } from '@/components/charts/PriceChart';

interface LegacyPriceChartProps {
	keyAddress: string;
	walletAddress?: string;
}

export type CommonPriceChartProps = Partial<PriceChartProps> &
	Partial<LegacyPriceChartProps>;

/**
 * Compatibility wrapper for `@/components/common/PriceChart` forwarding to
 * `@/components/charts/PriceChart`.
 */
export function PriceChart({
	data,
	title,
	symbol,
	chartKey,
	height,
	className,
	keyAddress,
}: CommonPriceChartProps) {
	return (
		<Chart
			data={data ?? []}
			title={title}
			symbol={symbol ?? keyAddress}
			chartKey={chartKey ?? keyAddress}
			height={height}
			className={className}
		/>
	);
}

export default PriceChart;
export type { PriceChartProps };
