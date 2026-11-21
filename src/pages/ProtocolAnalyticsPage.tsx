import { useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics';
import type { ProtocolTimeRange } from '@/services/analytics.service';
import ProtocolAnalyticsCards from '@/components/common/ProtocolAnalyticsCards';
import ProtocolAnalyticsChart from '@/components/common/ProtocolAnalyticsChart';
import TopKeysVolumeTable from '@/components/common/TopKeysVolumeTable';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Protocol Analytics Dashboard Page (#1167).
 *
 * Public dashboard surface showing protocol-wide metrics — total TVL,
 * cumulative volume, active keys, and unique traders — with TVL and volume
 * charts over 7d/30d/90d ranges, a top-10 keys-by-volume table, and
 * 60-second automatic refresh. Accessible without a wallet connection.
 */
export default function ProtocolAnalyticsPage() {
	const [range, setRange] = useState<ProtocolTimeRange>('30d');

	const {
		data: analytics,
		isLoading,
		isFetching,
		isError,
		refetch,
	} = useProtocolAnalytics(range);

	useDocumentTitle('Protocol Analytics — AccessLayer');

	const isRefreshing = isFetching && !isLoading;

	if (isError) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-6xl space-y-4">
					<Link
						to="/marketplace"
						className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
					>
						Back to marketplace
					</Link>
					<h1 className="font-grotesque text-3xl font-black text-white">
						Protocol Analytics
					</h1>
					<div className={CARD_CLASS} data-testid="protocol-analytics-error">
						<p className="text-white/60">
							We couldn&apos;t load protocol analytics right now. Please try
							again shortly.
						</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20"
						>
							Retry
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Page Header */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-md">
							<BarChart3 className="size-5" />
						</div>
						<div>
							<h1
								className="font-grotesque text-3xl font-black tracking-tight text-white"
								data-testid="protocol-analytics-title"
							>
								Protocol Analytics
							</h1>
							<p className="text-xs text-white/50">
								Protocol-wide TVL, volume, and trading activity from the
								on-chain analytics registry
							</p>
						</div>
					</div>

					<span
						role="status"
						aria-live="polite"
						aria-busy={isRefreshing || undefined}
						data-testid="protocol-analytics-refresh-status"
						className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50"
					>
						{isRefreshing ? (
							<RefreshCw
								className="size-3 animate-spin motion-reduce:animate-none"
								aria-hidden="true"
							/>
						) : (
							<span
								className="size-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
								aria-hidden="true"
							/>
						)}
						{isRefreshing ? 'Refreshing…' : 'Updates every 60s'}
					</span>
				</div>

				{/* Summary Stat Cards */}
				<ProtocolAnalyticsCards
					summary={analytics?.summary}
					isLoading={isLoading}
				/>

				{/* TVL & Volume Charts */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ProtocolAnalyticsChart
						title="Total Value Locked"
						description="TVL across all creator keys over time"
						data={analytics?.tvlHistory}
						dataKey="tvl"
						color="#34d399"
						gradientId="colorProtocolTvl"
						interval={range}
						onIntervalChange={setRange}
						isLoading={isLoading}
						testId="protocol-tvl-chart"
					/>
					<ProtocolAnalyticsChart
						title="Trading Volume"
						description="Key trading volume over time"
						data={analytics?.volumeHistory}
						dataKey="volume"
						color="#38bdf8"
						gradientId="colorProtocolVolume"
						interval={range}
						onIntervalChange={setRange}
						isLoading={isLoading}
						testId="protocol-volume-chart"
					/>
				</div>

				{/* Top 10 Keys by Volume */}
				<TopKeysVolumeTable
					keys={analytics?.topKeys}
					isLoading={isLoading}
				/>
			</div>
		</main>
	);
}
