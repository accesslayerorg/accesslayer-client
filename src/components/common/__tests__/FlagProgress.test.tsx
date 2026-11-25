import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FlagProgress from '../FlagProgress';

describe('FlagProgress (#1386)', () => {
	it('shows flags against the auto-freeze threshold', () => {
		render(<FlagProgress flagCount={2} threshold={5} />);

		expect(screen.getByTestId('flag-progress-count')).toHaveTextContent(
			'2 of 5'
		);
		expect(screen.getByTestId('flag-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			'2'
		);
		expect(screen.getByText(/3 more flags freeze trading/i)).toBeInTheDocument();
		expect(
			screen.queryByTestId('flag-progress-frozen-badge')
		).not.toBeInTheDocument();
	});

	it('marks the key frozen once the threshold is reached', () => {
		render(<FlagProgress flagCount={5} threshold={5} autoFrozen />);

		expect(screen.getByTestId('flag-progress-frozen-badge')).toHaveTextContent(
			/trading frozen/i
		);
		expect(
			screen.getByText(/threshold has been reached/i)
		).toBeInTheDocument();
	});

	it('shows a returned stake after resolution', () => {
		render(
			<FlagProgress
				flagCount={5}
				threshold={5}
				autoFrozen
				resolution={{
					status: 'returned',
					resolvedAt: '2026-11-10T00:00:00.000Z',
				}}
			/>
		);

		expect(screen.getByTestId('flag-resolution-status')).toHaveTextContent(
			/stake was returned/i
		);
	});

	it('shows a forfeited stake after resolution', () => {
		render(
			<FlagProgress
				flagCount={5}
				threshold={5}
				autoFrozen
				resolution={{
					status: 'forfeited',
					resolvedAt: '2026-11-10T00:00:00.000Z',
				}}
			/>
		);

		expect(screen.getByTestId('flag-resolution-status')).toHaveTextContent(
			/stake was forfeited/i
		);
	});

	it('renders a loading skeleton while flag status loads', () => {
		render(<FlagProgress flagCount={0} threshold={0} isLoading />);

		expect(screen.getByTestId('flag-progress-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('flag-progress')).not.toBeInTheDocument();
	});
});
