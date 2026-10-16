import { ArrowLeft, ArrowRight, GitCompareArrows, X } from 'lucide-react';
import { Link } from 'react-router';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { Button } from '@/components/ui/button';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	MAX_COMPARE_KEYS,
	useCompareStore,
	type CompareKey,
} from '@/hooks/useCompareStore';
import {
	useKeyComparisonMetrics,
	type FetchKeyMetrics,
	type KeyMetricsEntry,
} from '@/hooks/useKeyComparisonMetrics';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import type { KeyMetrics } from '@/services/keyMetrics.service';
import { formatNumber } from '@/utils/numberFormat.utils';

const EMPTY = '—';

function formatXlm(value: number | null | undefined) {
	return value == null
		? EMPTY
		: `${formatNumber(value, { maximumFractionDigits: 2 })} XLM`;
}

function snapshotPrice(key: CompareKey) {
	return key.priceStroops != null
		? key.priceStroops / STROOPS_PER_XLM
		: key.price;
}

interface MetricRow {
	id: string;
	label: string;
	render: (key: CompareKey, metrics: KeyMetrics | null) => React.ReactNode;
	/** Rows that can fall back to the card snapshot while metrics load/fail. */
	usesSnapshot?: boolean;
}

const METRIC_ROWS: MetricRow[] = [
	{
		id: 'price',
		label: 'Key price',
		usesSnapshot: true,
		render: (key, metrics) => formatXlm(metrics?.price ?? snapshotPrice(key)),
	},
	{
		id: 'volume',
		label: '24h volume',
		usesSnapshot: true,
		render: (key, metrics) => formatXlm(metrics?.volume24h ?? key.volume24h),
	},
	{
		id: 'holders',
		label: 'Holders',
		render: (_, metrics) => formatNumber(metrics?.holders),
	},
	{
		id: 'traders',
		label: 'Unique traders (30d)',
		render: (_, metrics) => formatNumber(metrics?.uniqueTraders),
	},
	{
		id: 'rating',
		label: 'Rating',
		render: (_, metrics) =>
			!metrics
				? EMPTY
				: metrics.rating == null
					? 'Unrated'
					: `${formatNumber(metrics.rating, { maximumFractionDigits: 1 })} / 5`,
	},
	{
		id: 'milestone',
		label: 'Curve milestone',
		render: (_, metrics) => {
			const milestone = metrics?.curveMilestone;
			if (!milestone) return EMPTY;
			const progress = Math.min(100, Math.max(0, milestone.progressPercent));
			return (
				<div className="space-y-1.5">
					<span>{milestone.label}</span>
					<div
						role="progressbar"
						aria-label={`${milestone.label} progress`}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(progress)}
						className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-primary"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<span className="block text-xs text-muted-foreground">
						{Math.round(progress)}% to next milestone
					</span>
				</div>
			);
		},
	},
	{
		id: 'yield',
		label: 'Yield',
		render: (_, metrics) =>
			metrics?.yieldPercent == null
				? EMPTY
				: `${formatNumber(metrics.yieldPercent, { maximumFractionDigits: 2 })}%`,
	},
];

function MetricCell({
	row,
	compareKey,
	entry,
}: {
	row: MetricRow;
	compareKey: CompareKey;
	entry: KeyMetricsEntry | undefined;
}) {
	const metrics = entry?.status === 'ready' ? entry.metrics : null;
	const isLoading = !entry || entry.status === 'loading';

	if (isLoading && !row.usesSnapshot) {
		return (
			<span
				aria-label="Loading"
				className="block h-4 w-16 animate-pulse rounded bg-muted"
			/>
		);
	}

	return <>{row.render(compareKey, metrics)}</>;
}

interface ComparePageProps {
	/** Injectable for tests; defaults to the API service. */
	fetchMetrics?: FetchKeyMetrics;
}

export default function ComparePage({ fetchMetrics }: ComparePageProps = {}) {
	useNavigationTiming('key_compare');

	const keys = useCompareStore(state => state.keys);
	const remove = useCompareStore(state => state.remove);
	const clear = useCompareStore(state => state.clear);
	const metricsById = useKeyComparisonMetrics(
		keys.map(key => key.id),
		fetchMetrics
	);

	const hasMetricsError = keys.some(
		key => metricsById[key.id]?.status === 'error'
	);

	return (
		<main className="mx-auto max-w-5xl px-6 py-16">
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
				Back to marketplace
			</Link>

			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<GitCompareArrows
						className="size-6 text-foreground"
						aria-hidden="true"
					/>
					<div>
						<h1 className="font-jakarta text-2xl font-semibold">
							Compare creator keys
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Side-by-side metrics for up to {MAX_COMPARE_KEYS} keys.
						</p>
					</div>
				</div>
				{keys.length > 0 && (
					<Button variant="outline" size="sm" onClick={clear}>
						Clear all
					</Button>
				)}
			</div>

			{keys.length === 0 ? (
				<div
					data-testid="compare-empty"
					className="flex flex-col items-center gap-4 rounded-2xl border border-border py-16 text-center"
				>
					<p className="text-sm text-muted-foreground">
						No keys selected. Use “Compare” on any creator card to add
						one.
					</p>
					<Button asChild variant="outline" size="sm">
						<Link to="/">Browse creators</Link>
					</Button>
				</div>
			) : (
				<>
					{keys.length === 1 && (
						<p className="mb-4 text-sm text-muted-foreground">
							Add at least one more key to see a side-by-side comparison.
						</p>
					)}
					{hasMetricsError && (
						<p
							role="status"
							className="mb-4 text-sm text-muted-foreground"
						>
							Some live metrics are unavailable right now. Missing values
							are shown as {EMPTY}.
						</p>
					)}

					<div className="overflow-x-auto rounded-xl border border-border">
						<table className="w-full min-w-[36rem] text-left text-sm">
							<caption className="sr-only">
								Comparison of {keys.map(key => key.title).join(', ')}
							</caption>
							<thead>
								<tr className="border-b border-border">
									<td className="w-44 px-4 py-4" />
									{keys.map(key => (
										<th
											key={key.id}
											scope="col"
											className="px-4 py-4 align-top font-normal"
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex min-w-0 items-center gap-3">
													<span className="size-10 shrink-0 overflow-hidden rounded-full">
														<CreatorInitialsAvatar
															name={key.title}
															creatorId={key.id}
															imageSrc={key.thumbnail}
															className="text-sm"
														/>
													</span>
													<div className="min-w-0">
														<p className="truncate font-medium text-foreground">
															{key.title}
														</p>
														{key.instructorId && (
															<p className="truncate text-xs text-muted-foreground">
																@{key.instructorId}
															</p>
														)}
													</div>
												</div>
												<button
													type="button"
													onClick={() => remove(key.id)}
													aria-label={`Remove ${key.title} from compare`}
													className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
												>
													<X
														className="size-4"
														aria-hidden="true"
													/>
												</button>
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{METRIC_ROWS.map(row => (
									<tr
										key={row.id}
										data-testid={`compare-row-${row.id}`}
									>
										<th
											scope="row"
											className="px-4 py-3 font-normal text-muted-foreground"
										>
											{row.label}
										</th>
										{keys.map(key => (
											<td
												key={key.id}
												data-testid={`compare-cell-${row.id}-${key.id}`}
												className="px-4 py-3 font-medium text-foreground"
											>
												<MetricCell
													row={row}
													compareKey={key}
													entry={metricsById[key.id]}
												/>
											</td>
										))}
									</tr>
								))}
								<tr>
									<td className="px-4 py-4" />
									{keys.map(key => (
										<td key={key.id} className="px-4 py-4">
											<Button asChild size="sm" className="w-full">
												<Link
													to={`/creator/${key.id}`}
													aria-label={`Invest in ${key.title}`}
												>
													Invest
													<ArrowRight aria-hidden="true" />
												</Link>
											</Button>
										</td>
									))}
								</tr>
							</tbody>
						</table>
					</div>
				</>
			)}
		</main>
	);
}
