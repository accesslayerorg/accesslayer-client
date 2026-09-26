import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpreadIndicator, { SPREAD_TOOLTIP } from '../SpreadIndicator';

describe('SpreadIndicator (#951)', () => {
	it('displays the spread amount and percentage', () => {
		render(
			<SpreadIndicator
				buyPriceStroops={1_000_000}
				sellPriceStroops={950_000}
			/>
		);

		expect(screen.getByTestId('key-spread')).toBeInTheDocument();
		expect(screen.getByTestId('key-spread-amount')).toHaveTextContent(
			'0.005 XLM'
		);
		expect(screen.getByTestId('key-spread-percent')).toHaveTextContent('5%');
	});

	it('renders an explanatory tooltip for the spread', () => {
		render(
			<SpreadIndicator
				buyPriceStroops={1_000_000}
				sellPriceStroops={950_000}
			/>
		);

		expect(
			screen.getByRole('button', { name: /what is the spread/i })
		).toBeInTheDocument();
		expect(screen.getByRole('tooltip')).toHaveTextContent(SPREAD_TOOLTIP);
	});

	it('reflects the configured buy and sell prices', () => {
		render(
			<SpreadIndicator
				buyPriceStroops={2_000_000}
				sellPriceStroops={1_800_000}
				spreadBps={1000}
			/>
		);

		expect(screen.getByTestId('key-spread-buy-price')).toHaveTextContent(
			'0.2 XLM'
		);
		expect(screen.getByTestId('key-spread-sell-price')).toHaveTextContent(
			'0.18 XLM'
		);
		expect(screen.getByTestId('key-spread-percent')).toHaveTextContent('10%');
	});

	it('shows buy and sell prices as equal and omits the spread row at zero spread', () => {
		render(
			<SpreadIndicator
				buyPriceStroops={1_000_000}
				sellPriceStroops={1_000_000}
			/>
		);

		expect(screen.getByTestId('key-spread-prices')).toBeInTheDocument();
		expect(screen.getByTestId('key-spread-buy-price')).toHaveTextContent(
			'0.1 XLM'
		);
		expect(screen.getByTestId('key-spread-sell-price')).toHaveTextContent(
			'0.1 XLM'
		);
		expect(screen.queryByTestId('key-spread-row')).not.toBeInTheDocument();
	});

	it('renders nothing before the key config is available', () => {
		const { container } = render(<SpreadIndicator />);

		expect(container).toBeEmptyDOMElement();
	});

	it('renders a loading placeholder while the config loads', () => {
		render(<SpreadIndicator isLoading />);

		expect(screen.getByTestId('key-spread-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('key-spread')).not.toBeInTheDocument();
	});
});
