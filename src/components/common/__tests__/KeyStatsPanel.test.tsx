import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import KeyStatsPanel from '@/components/common/KeyStatsPanel';
import { KEY_STAT_DEFINITIONS } from '@/components/common/keyStatDefinitions';
import type { KeyStats } from '@/services/course.service';

const stats: KeyStats = {
	supply: 1250,
	holderCount: 48,
	volume24h: 350_000_000,
	totalVolume: 9_870_000_000,
	twap1h: 21_000_000,
	twap24h: 19_500_000,
};

const LABELS = [
	'Supply',
	'Holders',
	'24h Volume',
	'Total Volume',
	'TWAP (1h)',
	'TWAP (24h)',
];

describe('KeyStatsPanel', () => {
	it('renders all six stats with values from the API', () => {
		render(<KeyStatsPanel stats={stats} />);

		expect(screen.getByTestId('key-stat-supply-value')).toHaveTextContent(
			'1,250'
		);
		expect(
			screen.getByTestId('key-stat-holderCount-value')
		).toHaveTextContent('48');
		expect(screen.getByTestId('key-stat-volume24h-value')).toHaveTextContent(
			'35 XLM'
		);
		expect(
			screen.getByTestId('key-stat-totalVolume-value')
		).toHaveTextContent('987 XLM');
		expect(screen.getByTestId('key-stat-twap1h-value')).toHaveTextContent(
			'2.1 XLM'
		);
		expect(screen.getByTestId('key-stat-twap24h-value')).toHaveTextContent(
			'1.95 XLM'
		);
		for (const label of LABELS) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it('shows a placeholder for stats the API returns as null', () => {
		render(<KeyStatsPanel stats={{ ...stats, twap1h: null }} />);
		expect(screen.getByTestId('key-stat-twap1h-value')).toHaveTextContent(
			'—'
		);
	});

	it('provides a tooltip for every stat label', () => {
		render(<KeyStatsPanel stats={stats} />);

		expect(KEY_STAT_DEFINITIONS).toHaveLength(6);
		for (const def of KEY_STAT_DEFINITIONS) {
			const trigger = screen.getByRole('button', {
				name: `Explanation for: ${def.label}`,
			});
			fireEvent.focus(trigger);
			expect(screen.getByRole('tooltip')).toHaveTextContent(def.explanation);
			fireEvent.blur(trigger);
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
		}
	});

	it('shows a loading skeleton during the initial fetch', () => {
		render(<KeyStatsPanel isLoading />);

		expect(screen.getByRole('status')).toHaveTextContent('Loading key stats');
		expect(screen.getByTestId('key-stats-panel')).toHaveAttribute(
			'aria-busy',
			'true'
		);
		for (const def of KEY_STAT_DEFINITIONS) {
			expect(
				screen.queryByTestId(`key-stat-${def.key}-value`)
			).not.toBeInTheDocument();
		}
		// Labels and tooltips stay in place while loading.
		for (const label of LABELS) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it('keeps the same cell structure between loading and loaded states (no layout shift)', () => {
		const { rerender } = render(<KeyStatsPanel isLoading />);
		const loadingCells = KEY_STAT_DEFINITIONS.map(def => {
			const cell = screen.getByTestId(`key-stat-${def.key}`);
			return {
				cell: cell.className,
				dd: cell.querySelector('dd')?.className,
			};
		});

		rerender(<KeyStatsPanel stats={stats} />);
		const loadedCells = KEY_STAT_DEFINITIONS.map(def => {
			const cell = screen.getByTestId(`key-stat-${def.key}`);
			return {
				cell: cell.className,
				dd: cell.querySelector('dd')?.className,
			};
		});

		expect(loadedCells).toEqual(loadingCells);
		for (const cell of loadedCells) {
			expect(cell.dd).toContain('h-7');
		}
	});

	it('updates values on refresh without showing the skeleton again', () => {
		const { rerender } = render(<KeyStatsPanel stats={stats} />);

		// A background refetch in flight must not replace values with a skeleton.
		rerender(<KeyStatsPanel stats={stats} isLoading />);
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(
			screen.getByTestId('key-stat-holderCount-value')
		).toHaveTextContent('48');

		rerender(<KeyStatsPanel stats={{ ...stats, holderCount: 49 }} />);
		expect(
			screen.getByTestId('key-stat-holderCount-value')
		).toHaveTextContent('49');
	});

	it('uses a responsive grid that stacks two columns on mobile', () => {
		render(<KeyStatsPanel stats={stats} />);
		const grid = screen.getByTestId('key-stats-panel').querySelector('dl');

		expect(grid).toHaveClass(
			'grid',
			'grid-cols-2',
			'sm:grid-cols-3',
			'lg:grid-cols-6'
		);
		expect(within(grid as HTMLElement).getAllByRole('term')).toHaveLength(6);
	});

	it('shows an error message when the initial fetch fails', () => {
		render(<KeyStatsPanel isError />);
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Key stats are temporarily unavailable.'
		);
	});

	it('keeps showing stale values if a refresh fails', () => {
		render(<KeyStatsPanel stats={stats} isError />);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(screen.getByTestId('key-stat-supply-value')).toHaveTextContent(
			'1,250'
		);
	});
});
