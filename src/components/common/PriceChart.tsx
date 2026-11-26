import Chart from '@/components/charts/PriceChart';
import type { PriceChartProps } from '@/components/charts/PriceChart';

interface LegacyPriceChartProps {
  keyAddress: string;
  walletAddress?: string;
}

export type CommonPriceChartProps = Partial<PriceChartProps> &
  Partial<LegacyPriceChartProps>;

/**
 * Compatibility shim for `@/components/common/PriceChart`.
 *
 * The chart implementation lives in `@/components/charts/PriceChart`. Older
 * callers pass `keyAddress`/`walletAddress` instead of OHLC `data`, so accept
 * both shapes and forward the shared props to the same implementation.
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
