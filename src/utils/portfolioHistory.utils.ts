/**
 * Portfolio performance history helpers (#1052).
 *
 * The portfolio page plots the total value of every held creator key over
 * time. The backend returns the raw series; everything the chart needs on top
 * of it — range windows, the percentage return between the first and last
 * point, and the benchmark line rebased onto the portfolio's starting value —
 * lives here as pure functions so it can be unit tested without a DOM or a
 * network call.
 */

export type PortfolioHistoryRange = '7d' | '30d' | '90d' | 'all';

export interface PortfolioHistoryRangeOption {
	value: PortfolioHistoryRange;
	label: string;
	/** Window length in milliseconds, or `null` for the full history. */
	windowMs: number | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Range selector options, in the order they are rendered. The windows are
 * measured back from "now" when a range is applied; `all` never trims.
 */
export const PORTFOLIO_HISTORY_RANGES: readonly PortfolioHistoryRangeOption[] =
	[
		{ value: '7d', label: '7D', windowMs: 7 * DAY_MS },
		{ value: '30d', label: '30D', windowMs: 30 * DAY_MS },
		{ value: '90d', label: '90D', windowMs: 90 * DAY_MS },
		{ value: 'all', label: 'ALL', windowMs: null },
	];

/**
 * A single sample of the portfolio's total value.
 *
 * `value` is the summed value of every held key position, in XLM, so the chart
 * can plot it directly. `benchmark` is the optional market-index level at the
 * same timestamp, used for the comparison toggle.
 */
export interface PortfolioHistoryPoint {
	/** ISO-8601 timestamp of the sample. */
	timestamp: string;
	/** Total portfolio value in XLM at this sample. */
	value: number;
	/** Optional benchmark index level at the same timestamp. */
	benchmark?: number | null;
}

/** One row of the rebased series handed to the chart. */
export interface PortfolioChartRow {
	timestamp: string;
	/** Portfolio total value in XLM. */
	portfolio: number;
	/** Benchmark rebased onto the portfolio's first value, or `null`. */
	benchmark: number | null;
}

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Drops malformed samples (unparseable timestamps, non-finite/negative values)
 * and returns the series in ascending time order, so downstream range maths and
 * "first to last" returns cannot silently pick a bad endpoint.
 */
export function normalizeHistory(
	points: readonly PortfolioHistoryPoint[]
): PortfolioHistoryPoint[] {
	return points
		.filter(point => isFiniteNumber(point.value) && point.value >= 0)
		.filter(point => Number.isFinite(Date.parse(point.timestamp)))
		.slice()
		.sort(
			(a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
		);
}

/**
 * Applies a range selector to a history series. Points older than the range
 * window (relative to `now`) are removed; `all` returns the whole series.
 */
export function filterHistoryByRange(
	points: readonly PortfolioHistoryPoint[],
	range: PortfolioHistoryRange,
	now: number = Date.now()
): PortfolioHistoryPoint[] {
	const normalized = normalizeHistory(points);
	const option = PORTFOLIO_HISTORY_RANGES.find(item => item.value === range);

	if (!option || option.windowMs == null) {
		return normalized;
	}

	const cutoff = now - option.windowMs;

	return normalized.filter(
		point => Date.parse(point.timestamp) >= cutoff
	);
}

/**
 * Percentage return between the first and last data point of a series.
 *
 * Returns `null` when there are fewer than two points or the opening value is
 * zero (a zero base has no meaningful percentage change).
 */
export function computePortfolioReturnPercent(
	points: readonly PortfolioHistoryPoint[]
): number | null {
	const normalized = normalizeHistory(points);

	if (normalized.length < 2) {
		return null;
	}

	const first = normalized[0].value;
	const last = normalized[normalized.length - 1].value;

	if (!(first > 0)) {
		return null;
	}

	return ((last - first) / first) * 100;
}

/**
 * Percentage return of the benchmark across the samples that actually carry a
 * benchmark level. Samples without one are ignored rather than treated as
 * zero, so a partial benchmark series still reports a usable return.
 */
export function computeBenchmarkReturnPercent(
	points: readonly PortfolioHistoryPoint[]
): number | null {
	const levels = normalizeHistory(points)
		.map(point => point.benchmark)
		.filter(isFiniteNumber);

	if (levels.length < 2) {
		return null;
	}

	const first = levels[0];
	const last = levels[levels.length - 1];

	if (!(first > 0)) {
		return null;
	}

	return ((last - first) / first) * 100;
}

/**
 * Builds the rows the line chart renders.
 *
 * The benchmark is an index level, not a portfolio value, so plotting it as-is
 * would put the two lines on incomparable scales. Instead it is rebased so its
 * first level equals the portfolio's first value: both lines then start at the
 * same point and their slopes are directly comparable, while the portfolio
 * line keeps its real XLM values.
 */
export function buildPortfolioChartSeries(
	points: readonly PortfolioHistoryPoint[],
	options: { showBenchmark: boolean }
): PortfolioChartRow[] {
	const normalized = normalizeHistory(points);
	const firstValue = normalized.find(point => point.value > 0)?.value ?? null;

	const firstBenchmark = options.showBenchmark
		? normalized
				.map(point => point.benchmark)
				.find(isFiniteNumber) ?? null
		: null;

	let rebase: ((level: number) => number) | null = null;

	if (
		firstValue != null &&
		firstBenchmark != null &&
		firstValue > 0 &&
		firstBenchmark > 0
	) {
		rebase = level => (level / firstBenchmark) * firstValue;
	}

	return normalized.map(point => ({
		timestamp: point.timestamp,
		portfolio: point.value,
		benchmark:
			rebase != null && isFiniteNumber(point.benchmark)
				? rebase(point.benchmark)
				: null,
	}));
}

/** Formatter used by the chart tooltip and Y axis for XLM values. */
export function formatPortfolioValueXlm(value: number): string {
	if (!isFiniteNumber(value)) {
		return '—';
	}

	return `${value.toFixed(2)} XLM`;
}

/** Formatter used by the chart tooltip and X axis for sample timestamps. */
export function formatPortfolioHistoryDate(timestamp: string): string {
	const date = new Date(timestamp);

	if (Number.isNaN(date.getTime())) {
		return '—';
	}

	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}

/** Signed percentage label for the return figure, e.g. `+12.4%`. */
export function formatPortfolioReturnPercent(percentage: number | null): string {
	if (percentage == null || !Number.isFinite(percentage)) {
		return '—';
	}

	if (percentage === 0) {
		return '0%';
	}

	const sign = percentage > 0 ? '+' : '';
	return `${sign}${percentage.toFixed(1)}%`;
}
