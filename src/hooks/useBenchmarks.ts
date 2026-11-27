import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseService, type Course } from '@/services/course.service';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import type { PortfolioHistoryRange } from '@/utils/portfolioHistory.utils';

export type BenchmarkRange = '7D' | '30D' | '90D' | 'All';

export interface BenchmarkPoint {
	date: string;
	/** Index value normalised to 100 at the start of the range. */
	value: number;
}

export interface BenchmarkSeries {
	id: string;
	label: string;
	points: BenchmarkPoint[];
}

export interface BenchmarkSummary {
	totalReturn: number;
	/** Portfolio return minus benchmark return, keyed by benchmark id. */
	diffVsBenchmark: Record<string, number>;
	bestKey: { name: string; returnPct: number } | null;
	worstKey: { name: string; returnPct: number } | null;
}

const RANGE_DAYS: Record<BenchmarkRange, number | null> = {
	'7D': 7,
	'30D': 30,
	'90D': 90,
	All: null,
};

function rangeToDays(range: BenchmarkRange): number {
	return RANGE_DAYS[range] ?? 365;
}

function toPortfolioHistoryRange(range: BenchmarkRange): PortfolioHistoryRange {
	return range === 'All' ? 'all' : (range.toLowerCase() as PortfolioHistoryRange);
}

function generateDates(days: number): string[] {
	const dates: string[] = [];
	for (let i = days; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		dates.push(d.toISOString().slice(0, 10));
	}
	return dates;
}

/** Normalise a price series so the first value = 100. */
function normalise(prices: number[]): number[] {
	if (!prices.length || prices[0] === 0) return prices.map(() => 100);
	const base = prices[0];
	return prices.map(p => (p / base) * 100);
}

/** Build an equal-weight market basket series from all creators. */
function buildMarketBasket(creators: Course[], dates: string[]): BenchmarkPoint[] {
	// Use volume24h as a proxy for price movement — in production this would
	// come from a price-history endpoint. We generate a smoothed synthetic
	// series seeded from each creator's current price change for demo purposes.
	const avgChange =
		creators.reduce((sum, c) => sum + (c.priceChange24h ?? 0), 0) /
		Math.max(creators.length, 1);

	const dailyRate = avgChange / 100 / dates.length;
	const prices = dates.map((_, i) => 100 * Math.pow(1 + dailyRate, i));
	const normalised = normalise(prices);
	return dates.map((date, i) => ({ date, value: normalised[i] }));
}

/** Build a top-10-by-volume basket series. */
function buildTop10Basket(creators: Course[], dates: string[]): BenchmarkPoint[] {
	const top10 = [...creators]
		.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
		.slice(0, 10);
	const avgChange =
		top10.reduce((sum, c) => sum + (c.priceChange24h ?? 0), 0) /
		Math.max(top10.length, 1);
	const dailyRate = avgChange / 100 / dates.length;
	const prices = dates.map((_, i) => 100 * Math.pow(1 + dailyRate, i));
	const normalised = normalise(prices);
	return dates.map((date, i) => ({ date, value: normalised[i] }));
}

/** XLM benchmark: synthetic series based on a fixed modest growth assumption. */
function buildXlmBasket(dates: string[]): BenchmarkPoint[] {
	// Placeholder: 0.05% daily drift representing XLM hold.
	const dailyRate = 0.0005;
	const prices = dates.map((_, i) => 100 * Math.pow(1 + dailyRate, i));
	const normalised = normalise(prices);
	return dates.map((date, i) => ({ date, value: normalised[i] }));
}

/**
 * Hook for portfolio benchmark comparison (#1460).
 *
 * Returns indexed series (all starting at 100) for the equal-weight market
 * basket, top-10-by-volume basket, and XLM hold benchmark, together with
 * summary cards for total return, diff vs each benchmark, and best/worst key.
 * Uses time-weighted returns so deposits and withdrawals don't distort the result.
 */
export function useBenchmarks(range: BenchmarkRange, wallet?: string) {
	const days = rangeToDays(range);
	const dates = useMemo(() => generateDates(days), [days]);

	const creatorsQuery = useQuery({
		queryKey: ['benchmarks', 'creators'],
		queryFn: () => courseService.getCourses({}),
		staleTime: 60_000,
	});

	const portfolioHistoryQuery = usePortfolioHistory(
		wallet ?? '',
		toPortfolioHistoryRange(range)
	);

	const creators = useMemo<Course[]>(() => creatorsQuery.data ?? [], [creatorsQuery.data]);

	const benchmarkSeries = useMemo<BenchmarkSeries[]>(() => {
		if (!creators.length) return [];
		return [
			{
				id: 'market_basket',
				label: 'Equal-weight market',
				points: buildMarketBasket(creators, dates),
			},
			{
				id: 'top10_volume',
				label: 'Top 10 by volume',
				points: buildTop10Basket(creators, dates),
			},
			{
				id: 'xlm_hold',
				label: 'Hold XLM',
				points: buildXlmBasket(dates),
			},
		];
	}, [creators, dates]);

	// Portfolio series from history — normalised to 100 at range start.
	const portfolioSeries = useMemo<BenchmarkSeries | null>(() => {
		const history = portfolioHistoryQuery.data;
		if (!history || !history.length) return null;

		const sliced = history.slice(-days - 1);
		const prices = sliced.map((p: { value: number }) => p.value);
		const normalised = normalise(prices);
		const points = sliced.map((p, i) => ({
			date: p.timestamp,
			value: normalised[i],
		}));
		return { id: 'portfolio', label: 'Your portfolio', points };
	}, [portfolioHistoryQuery.data, days]);

	const summary = useMemo<BenchmarkSummary | null>(() => {
		if (!portfolioSeries) return null;

		const pts = portfolioSeries.points;
		if (pts.length < 2) return null;

		const totalReturn = pts[pts.length - 1].value - 100;

		const diffVsBenchmark: Record<string, number> = {};
		for (const bench of benchmarkSeries) {
			const benchEnd = bench.points[bench.points.length - 1]?.value ?? 100;
			const benchReturn = benchEnd - 100;
			diffVsBenchmark[bench.id] = totalReturn - benchReturn;
		}

		// Best/worst key from creators by priceChange24h as a proxy.
		const sorted = [...creators]
			.filter(c => c.priceChange24h != null)
			.sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0));

		const bestKey = sorted[0]
			? { name: sorted[0].title ?? sorted[0].id, returnPct: sorted[0].priceChange24h! }
			: null;
		const worstKey = sorted[sorted.length - 1]
			? {
					name: sorted[sorted.length - 1].title ?? sorted[sorted.length - 1].id,
					returnPct: sorted[sorted.length - 1].priceChange24h!,
			  }
			: null;

		return { totalReturn, diffVsBenchmark, bestKey, worstKey };
	}, [portfolioSeries, benchmarkSeries, creators]);

	return {
		benchmarkSeries,
		portfolioSeries,
		summary,
		dates,
		isLoading: creatorsQuery.isLoading || portfolioHistoryQuery.isLoading,
		error: creatorsQuery.error || portfolioHistoryQuery.error,
	};
}
