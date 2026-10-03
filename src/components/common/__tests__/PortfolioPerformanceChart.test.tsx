import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioPerformanceChart } from '@/components/common/PortfolioPerformanceChart';
import {
	DAY_MS,
	type PortfolioHistoryPoint,
} from '@/utils/portfolioHistory.utils';

const NOW = Date.now();

const at = (
	daysAgo: number,
	value: number,
	benchmark?: number
): PortfolioHistoryPoint => ({
	timestamp: new Date(NOW - daysAgo * DAY_MS).toISOString(),
	value,
	benchmark: benchmark ?? null,
});

const history: PortfolioHistoryPoint[] = [
	at(80, 100, 200),
	at(20, 120, 220),
	at(3, 150, 260),
];

const noBenchmarkHistory: PortfolioHistoryPoint[] = [
	at(20, 120),
	at(3, 150),
];

describe('PortfolioPerformanceChart (#1052)', () => {
	it('shows a loading skeleton while the history is fetched', () => {
		render(<PortfolioPerformanceChart data={history} isLoading />);

		expect(
			screen.getByTestId('portfolio-performance-skeleton')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('portfolio-performance-series')
		).not.toBeInTheDocument();
	});

	it('shows an empty state when there is no history', () => {
		render(<PortfolioPerformanceChart data={[]} />);

		expect(
			screen.getByTestId('portfolio-performance-empty')
		).toHaveTextContent('No portfolio history yet');
	});

	it('renders the series and the return from the first to the last visible point', () => {
		render(<PortfolioPerformanceChart data={history} />);

		// Default range is 30d, so the visible series is 120 -> 150 (+25%).
		expect(
			screen.getByTestId('portfolio-performance-series')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('portfolio-performance-return')
		).toHaveTextContent('+25.0% return');
		expect(screen.getByTestId('portfolio-range-30d')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('switches the data for all four range selectors', () => {
		render(<PortfolioPerformanceChart data={history} />);

		fireEvent.click(screen.getByTestId('portfolio-range-7d'));
		expect(screen.getByTestId('portfolio-range-7d')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		// A single visible point has no return to compute.
		expect(
			screen.queryByTestId('portfolio-performance-return')
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByTestId('portfolio-range-90d'));
		expect(
			screen.getByTestId('portfolio-performance-return')
		).toHaveTextContent('+50.0% return');

		fireEvent.click(screen.getByTestId('portfolio-range-all'));
		expect(screen.getByTestId('portfolio-range-all')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(
			screen.getByTestId('portfolio-performance-return')
		).toHaveTextContent('+50.0% return');
	});

	it('toggles the benchmark comparison line and its return', () => {
		render(<PortfolioPerformanceChart data={history} />);

		const toggle = screen.getByTestId('portfolio-benchmark-toggle');
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(
			screen.queryByTestId('portfolio-performance-benchmark-return')
		).not.toBeInTheDocument();

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		// 30d window benchmark: 220 -> 260 = +18.2%.
		expect(
			screen.getByTestId('portfolio-performance-benchmark-return')
		).toHaveTextContent('vs +18.2% benchmark');

		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(
			screen.queryByTestId('portfolio-performance-benchmark-return')
		).not.toBeInTheDocument();
	});

	it('disables the benchmark toggle when no sample carries a benchmark', () => {
		render(<PortfolioPerformanceChart data={noBenchmarkHistory} />);

		expect(screen.getByTestId('portfolio-benchmark-toggle')).toBeDisabled();
	});

	it('surfaces a fetch error with a retry action', () => {
		const onRetry = vi.fn();
		render(
			<PortfolioPerformanceChart
				data={[]}
				error="Unable to load portfolio history."
				onRetry={onRetry}
			/>
		);

		expect(screen.getByTestId('portfolio-performance-error')).toHaveTextContent(
			'Unable to load portfolio history.'
		);
		fireEvent.click(screen.getByTestId('portfolio-performance-retry'));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('applies a custom className to the section', () => {
		const { container } = render(
			<PortfolioPerformanceChart data={history} className="custom-class" />
		);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});
