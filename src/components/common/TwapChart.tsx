import { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

interface TwapChartProps {
  spotPrice: number | null;
  twapPrice: number | null;
  historicalPrices?: number[];
  isLoading?: boolean;
}

type TwapPeriod = '1h' | '4h' | '24h';

const PERIOD_OPTIONS: { value: TwapPeriod; label: string; hours: number }[] = [
  { value: '1h', label: '1H', hours: 1 },
  { value: '4h', label: '4H', hours: 4 },
  { value: '24h', label: '24H', hours: 24 },
];

export default function TwapChart({
  spotPrice,
  twapPrice,
  historicalPrices = [],
  isLoading = false,
}: TwapChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TwapPeriod>('24h');

  const twapDelta =
    twapPrice != null && spotPrice != null ? twapPrice - spotPrice : null;

  const twapDeltaPercent =
    twapDelta != null && spotPrice != null && spotPrice > 0
      ? (twapDelta / spotPrice) * 100
      : null;

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-white/10" />
          <div className="h-48 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="font-grotesque text-xl font-black tracking-tight text-white">
            TWAP Price Oracle
          </h2>
          <Tooltip content="Time-Weighted Average Price smooths out short-term volatility, providing a manipulation-resistant price reference.">
            <button
              type="button"
              aria-label="What is TWAP?"
              className="text-white/50 hover:text-white/70"
            >
              ⓘ
            </button>
          </Tooltip>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedPeriod(value)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                selectedPeriod === value
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-48 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
        {historicalPrices.length > 0 ? (
          <svg
            viewBox="0 0 400 150"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Spot price line */}
            <polyline
              fill="none"
              stroke="rgb(251, 191, 36)"
              strokeWidth="2"
              points={historicalPrices.map((price, i) => {
                const x = (i / (historicalPrices.length - 1)) * 400;
                const min = Math.min(...historicalPrices);
                const max = Math.max(...historicalPrices);
                const range = max - min || 1;
                const y = 140 - ((price - min) / range) * 120;
                return `${x},${y}`;
              }).join(' ')}
            />
            {/* TWAP line (simplified as a horizontal line at twapPrice) */}
            {twapPrice && (
              <line
                x1="0"
                y1={(() => {
                  const min = Math.min(...historicalPrices);
                  const max = Math.max(...historicalPrices);
                  const range = max - min || 1;
                  return 140 - ((twapPrice - min) / range) * 120;
                })()}
                x2="400"
                y2={(() => {
                  const min = Math.min(...historicalPrices);
                  const max = Math.max(...historicalPrices);
                  const range = max - min || 1;
                  return 140 - ((twapPrice - min) / range) * 120;
                })()}
                stroke="rgb(34, 197, 94)"
                strokeWidth="2"
                strokeDasharray="8,4"
              />
            )}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            No price data available
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-amber-400 rounded" />
          <span className="text-white/50">Spot Price</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-emerald-400 rounded border-dashed" style={{ borderBottom: '2px dashed rgb(34, 197, 94)' }} />
          <span className="text-white/50">TWAP ({selectedPeriod})</span>
        </div>
      </div>

      {/* Numeric Display */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">Spot Price</p>
          <p className="mt-1 text-lg font-bold text-white">
            {spotPrice ? formatDisplayKeyPrice(spotPrice) : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">TWAP ({selectedPeriod})</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">
            {twapPrice ? formatDisplayKeyPrice(twapPrice) : '—'}
          </p>
          {twapDeltaPercent != null && (
            <p className={cn(
              'text-xs font-semibold mt-1',
              twapDeltaPercent < 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {twapDeltaPercent < 0 ? '▼' : '▲'} {Math.abs(twapDeltaPercent).toFixed(2)}% vs spot
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
