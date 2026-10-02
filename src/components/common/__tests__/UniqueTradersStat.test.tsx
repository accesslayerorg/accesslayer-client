import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UniqueTradersStat, {
	UNIQUE_TRADERS_EXPLANATION,
} from '@/components/common/UniqueTradersStat';

const renderStat = (props: React.ComponentProps<typeof UniqueTradersStat>) =>
	render(
		<dl>
			<UniqueTradersStat {...props} />
		</dl>
	);

describe('UniqueTradersStat', () => {
	it('displays the unique trader count from the API', () => {
		renderStat({ data: { uniqueTraders: 1234, uniqueTraders24hAgo: 1200 } });
		expect(
			screen.getByTestId('key-stat-uniqueTraders-value')
		).toHaveTextContent('1,234');
		expect(screen.getByText('Unique Traders')).toBeInTheDocument();
	});

	it('shows an upward trend vs the previous 24 hours', () => {
		renderStat({ data: { uniqueTraders: 50, uniqueTraders24hAgo: 42 } });
		const trend = screen.getByTestId('key-stat-uniqueTraders-trend');
		expect(trend).toHaveAttribute('data-direction', 'up');
		expect(trend).toHaveTextContent('+8');
		expect(
			screen.getByRole('img', { name: 'Up 8 vs previous 24 hours' })
		).toBeInTheDocument();
	});

	it('shows a downward trend vs the previous 24 hours', () => {
		renderStat({ data: { uniqueTraders: 40, uniqueTraders24hAgo: 42 } });
		const trend = screen.getByTestId('key-stat-uniqueTraders-trend');
		expect(trend).toHaveAttribute('data-direction', 'down');
		expect(trend).toHaveTextContent('−2');
		expect(
			screen.getByRole('img', { name: 'Down 2 vs previous 24 hours' })
		).toBeInTheDocument();
	});

	it('renders zero traders for a new key with a no-change trend', () => {
		renderStat({ data: { uniqueTraders: 0, uniqueTraders24hAgo: 0 } });
		expect(
			screen.getByTestId('key-stat-uniqueTraders-value')
		).toHaveTextContent('0');
		expect(
			screen.getByTestId('key-stat-uniqueTraders-trend')
		).toHaveAttribute('data-direction', 'flat');
		expect(
			screen.getByRole('img', { name: 'No change vs previous 24 hours' })
		).toBeInTheDocument();
	});

	it('hides the trend when the previous 24h value is unavailable', () => {
		renderStat({ data: { uniqueTraders: 5, uniqueTraders24hAgo: null } });
		expect(
			screen.queryByTestId('key-stat-uniqueTraders-trend')
		).not.toBeInTheDocument();
	});

	it('exposes an accessible tooltip explaining the metric', () => {
		renderStat({ data: { uniqueTraders: 5, uniqueTraders24hAgo: 5 } });
		const trigger = screen.getByRole('button', {
			name: 'Explanation for: Unique Traders',
		});
		fireEvent.focus(trigger);
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			UNIQUE_TRADERS_EXPLANATION
		);
		expect(UNIQUE_TRADERS_EXPLANATION).toMatch(/distinct wallets/);
		expect(UNIQUE_TRADERS_EXPLANATION).toMatch(/bought or sold/);
	});

	it('keeps a fixed-height value slot between loading and loaded states', () => {
		const { rerender } = renderStat({ isLoading: true });
		const cell = screen.getByTestId('key-stat-uniqueTraders');
		const loadingClass = cell.querySelector('dd')?.className;
		expect(
			screen.queryByTestId('key-stat-uniqueTraders-value')
		).not.toBeInTheDocument();

		rerender(
			<dl>
				<UniqueTradersStat
					data={{ uniqueTraders: 3, uniqueTraders24hAgo: 1 }}
				/>
			</dl>
		);
		expect(cell.querySelector('dd')?.className).toBe(loadingClass);
		expect(loadingClass).toContain('h-7');
	});

	it('keeps showing the value during a background refresh', () => {
		renderStat({
			data: { uniqueTraders: 7, uniqueTraders24hAgo: 7 },
			isLoading: true,
		});
		expect(
			screen.getByTestId('key-stat-uniqueTraders-value')
		).toHaveTextContent('7');
	});
});
