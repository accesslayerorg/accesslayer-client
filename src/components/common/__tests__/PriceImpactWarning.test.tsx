import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceImpactWarning from '../PriceImpactWarning';

describe('PriceImpactWarning', () => {
	it('renders warning when price impact exceeds 5%', () => {
		render(<PriceImpactWarning impactPercent={5.5} />);

		const alert = screen.getByRole('alert');
		expect(alert).toBeInTheDocument();
		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(screen.getByTestId('price-impact-value')).toHaveTextContent(
			'+5.50%'
		);
		expect(alert).toHaveTextContent(/price impact exceeding 5%/i);
	});

	it('renders warning when price impact is negative and exceeds 5% in magnitude', () => {
		render(<PriceImpactWarning impactPercent={-7.2} />);

		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(screen.getByTestId('price-impact-value')).toHaveTextContent(
			'-7.20%'
		);
	});

	it('does not render when price impact is 5% or less', () => {
		const { container } = render(<PriceImpactWarning impactPercent={4.9} />);
		expect(container.firstChild).toBeNull();
		expect(
			screen.queryByTestId('price-impact-warning')
		).not.toBeInTheDocument();
	});

	it('does not render when impact is null or undefined', () => {
		const { rerender, container } = render(
			<PriceImpactWarning impactPercent={null} />
		);
		expect(container.firstChild).toBeNull();

		rerender(<PriceImpactWarning impactPercent={undefined} />);
		expect(container.firstChild).toBeNull();
	});

	it('respects custom threshold prop', () => {
		render(<PriceImpactWarning impactPercent={3.5} threshold={3} />);
		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(
			screen.getByText(/price impact exceeding 3%/i)
		).toBeInTheDocument();
	});
});
