import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PriceHistoryChart } from '../PriceHistoryChart';

describe('PriceHistoryChart', () => {
	it('shows a loading skeleton', () => {
		render(
			<PriceHistoryChart
				interval="24h"
				isLoading
				onIntervalChange={vi.fn()}
			/>
		);

		expect(screen.getByTestId('price-history-skeleton')).toBeInTheDocument();
		expect(
			screen.queryByTestId('price-history-empty')
		).not.toBeInTheDocument();
	});

	it('shows the empty state when there is no history', () => {
		render(
			<PriceHistoryChart
				data={[]}
				interval="24h"
				isLoading={false}
				onIntervalChange={vi.fn()}
			/>
		);

		expect(screen.getByText('No price history yet')).toBeInTheDocument();
	});

	it('renders the series and changes interval', () => {
		const onIntervalChange = vi.fn();
		render(
			<PriceHistoryChart
				data={[
					{ timestamp: '2026-08-25T10:00:00Z', price: 1 },
					{ timestamp: '2026-08-25T11:00:00Z', price: 2 },
				]}
				interval="24h"
				isLoading={false}
				onIntervalChange={onIntervalChange}
			/>
		);

		expect(screen.getByTestId('price-history-series')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('price-history-interval-7d'));
		expect(onIntervalChange).toHaveBeenCalledWith('7d');
	});
});
