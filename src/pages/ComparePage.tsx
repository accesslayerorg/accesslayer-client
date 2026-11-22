import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, X } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type PriceHistoryInterval,
} from '@/services/course.service';
import { useKeyComparisonStore } from '@/hooks/useKeyComparison';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import {
	formatCreatorKeyPriceDisplay,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import {
	COMPARISON_LINE_COLORS,
	buildComparisonChartData,
	parseComparisonKeyIds,
} from '@/utils/keyComparison.utils';

const RANGES: PriceHistoryInterval[] = ['1h', '4h', '24h', '7d'];
const EMPTY = '\u2014';

const formatCount = (value: number | null | undefined) =>
	value == null || !Number.isFinite(value) ? EMPTY : value.toLocaleString('en-US');

/**
 * Side-by-side key performance comparison (#1247): metrics table plus an
 * overlaid price chart for up to 3 keys, with remove and clear controls.
 * Keys come from the `keys` query param, falling back to the shared selection.
 */
export default function ComparePage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const storedKeys = useKeyComparisonStore(s => s.selectedKeys);
	const removeStored = useKeyComparisonStore(s => s.removeKey);
	const clearStored = useKeyComparisonStore(s => s.clearKeys);
	const [range, setRange] = useState<PriceHistoryInterval>('24h');

	const paramRaw = searchParams.get('keys');
	const keyIds = useMemo(() => {
		const fromUrl = parseComparisonKeyIds(paramRaw);
		return fromUrl.length > 0 || paramRaw !== null
			? fromUrl
			: storedKeys.map(k => k.id).slice(0, 3);
	}, [paramRaw, storedKeys]);

	const detailQueries = useQueries({
		queries: keyIds.map(id => ({
			queryKey: queryKeys.creators.detail(id),
			queryFn: () => courseService.getCourse(id),
			retry: false,
		})),
	});
	const statsQueries = useQueries({
		queries: keyIds.map(id => ({
			queryKey: queryKeys.creators.stats(id),
			queryFn: () => courseService.getKeyStats(id),
			retry: false,
		})),
	});
	const historyQueries = useQueries({
		queries: keyIds.map(id => ({
			queryKey: queryKeys.creators.priceHistory(id, range),
			queryFn: () => courseService.getPriceHistory(id, range),
			retry: false,
		})),
	});

	const names = keyIds.map((id, i) => {
		const detail = detailQueries[i]?.data;
		const stored = storedKeys.find(k => k.id === id)?.name;
		return (
			normalizeCreatorDisplayName(detail?.title || detail?.name) ||
			stored ||
			id
		);
	});

	const chartData = useMemo(
		() =>
			buildComparisonChartData(
				keyIds.map((keyId, i) => ({
					keyId,
					points: historyQueries[i]?.data,
				}))
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[keyIds, historyQueries.map(q => q.dataUpdatedAt).join(',')]
	);

	const updateUrl = (ids: string[]) => {
		if (ids.length === 0) setSearchParams({}, { replace: true });
		else setSearchParams({ keys: ids.join(',') }, { replace: true });
	};

	const handleRemove = (id: string) => {
		removeStored(id);
		updateUrl(keyIds.filter(k => k !== id));
	};

	const handleClear = () => {
		clearStored();
		setSearchParams({}, { replace: true });
	};

	const back = (
		<Link
			to="/"
			className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
		>
			<ArrowLeft className="size-4" />
			Back to Marketplace
		</Link>
	);

	if (keyIds.length === 0) {
		return (
			<div className="min-h-screen bg-black text-white">
				<div className="mx-auto max-w-5xl px-6 py-12">
					{back}
					<h1 className="font-grotesque text-3xl font-black">Compare Keys</h1>
					<p className="mt-4 text-white/60" data-testid="compare-empty">
						No keys selected for comparison. Go back to the marketplace and add keys to compare.
					</p>
				</div>
			</div>
		);
	}

	const rows: {
		label: string;
		render: (i: number) => React.ReactNode;
	}[] = [
		{
			label: 'Price',
			render: i => {
				const d = detailQueries[i]?.data;
				return d ? formatCreatorKeyPriceDisplay(d) : EMPTY;
			},
		},
		{
			label: '24h Change',
			render: i => {
				const change = detailQueries[i]?.data?.change24h;
				if (change == null) return EMPTY;
				return (
					<span
						className={
							change > 0
								? 'text-emerald-400'
								: change < 0
									? 'text-red-400'
									: ''
						}
					>
						{formatPercent(change, { signed: true })}
					</span>
				);
			},
		},
		{
			label: '24h Volume',
			render: i => {
				const v =
					statsQueries[i]?.data?.volume24h ??
					detailQueries[i]?.data?.volume24h;
				return v == null ? EMPTY : formatDisplayKeyPrice(v);
			},
		},
		{
			label: 'Holders',
			render: i => {
				const d = detailQueries[i]?.data;
				return formatCount(
					statsQueries[i]?.data?.holderCount ??
						d?.holderCount ??
						d?.holdersCount ??
						d?.holders
				);
			},
		},
		{
			label: 'Supply',
			render: i =>
				formatCount(
					statsQueries[i]?.data?.supply ??
						detailQueries[i]?.data?.creatorShareSupply
				),
		},
	];

	return (
		<div className="min-h-screen bg-black text-white">
			<div className="mx-auto max-w-5xl px-6 py-12">
				{back}
				<div className="flex items-center justify-between gap-4">
					<div>
						<h1 className="font-grotesque text-3xl font-black">Compare Keys</h1>
						<p className="mt-2 text-white/60">
							Comparing {keyIds.length} creator{' '}
							{keyIds.length === 1 ? 'key' : 'keys'}
						</p>
					</div>
					<button
						type="button"
						onClick={handleClear}
						data-testid="compare-clear-all"
						className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:text-white"
					>
						Clear all
					</button>
				</div>

				<div className="mt-8 overflow-x-auto">
					<table className="w-full border-collapse" data-testid="compare-table">
						<thead>
							<tr>
								<th className="border-b border-white/10 py-4 pr-8 text-left text-sm font-medium text-white/50">
									Stat
								</th>
								{keyIds.map((id, i) => (
									<th
										key={id}
										className="border-b border-white/10 px-4 py-4 text-left text-sm font-medium text-white"
									>
										<span className="inline-flex items-center gap-2">
											<span
												className="size-2 rounded-full"
												style={{ backgroundColor: COMPARISON_LINE_COLORS[i] }}
												aria-hidden="true"
											/>
											{names[i]}
											<button
												type="button"
												onClick={() => handleRemove(id)}
												aria-label={`Remove ${names[i]} from comparison`}
												className="text-white/40 hover:text-white/90"
											>
												<X className="size-3.5" />
											</button>
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map(row => (
								<tr key={row.label} className="border-b border-white/5">
									<td className="py-4 pr-8 text-sm text-white/50">{row.label}</td>
									{keyIds.map((id, i) => (
										<td
											key={id}
											className="px-4 py-4 text-sm"
											data-testid={`compare-${row.label.toLowerCase().replace(/\s+/g, '-')}-${id}`}
										>
											{row.render(i)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<section className="mt-10" aria-labelledby="compare-chart-heading">
					<div className="mb-4 flex items-center justify-between">
						<h2 id="compare-chart-heading" className="text-xl font-bold">
							Price history
						</h2>
						<div className="flex gap-1" role="group" aria-label="Chart range">
							{RANGES.map(r => (
								<button
									key={r}
									type="button"
									aria-pressed={range === r}
									onClick={() => setRange(r)}
									className={`rounded-md px-2.5 py-1 text-xs ${
										range === r
											? 'bg-amber-400/20 text-amber-300'
											: 'text-white/50 hover:text-white'
									}`}
								>
									{r}
								</button>
							))}
						</div>
					</div>
					{chartData.length === 0 ? (
						<p className="text-sm text-white/50" data-testid="compare-chart-empty">
							No price history available for the selected keys.
						</p>
					) : (
						<div className="h-72 w-full" data-testid="compare-chart">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={chartData}>
									<CartesianGrid stroke="rgba(255,255,255,0.08)" />
									<XAxis
										dataKey="timestamp"
										type="number"
										domain={['dataMin', 'dataMax']}
										tickFormatter={(t: number) =>
											new Date(t).toLocaleString(undefined, {
												month: 'short',
												day: 'numeric',
												hour: 'numeric',
											})
										}
										stroke="rgba(255,255,255,0.4)"
										fontSize={11}
									/>
									<YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
									<Tooltip
										labelFormatter={t => new Date(Number(t)).toLocaleString()}
										formatter={v => `${Number(v).toFixed(4)} XLM`}
										contentStyle={{
											background: '#0f172a',
											border: '1px solid rgba(255,255,255,0.1)',
										}}
									/>
									<Legend />
									{keyIds.map((id, i) => (
										<Line
											key={id}
											type="monotone"
											dataKey={id}
											name={names[i]}
											stroke={COMPARISON_LINE_COLORS[i]}
											dot={false}
											connectNulls
											strokeWidth={2}
										/>
									))}
								</LineChart>
							</ResponsiveContainer>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
