/**
 * Unit tests for PriceImpactSlider — the interactive bonding-curve price
 * impact preview (#755, reduced scope).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PriceImpactSlider from '@/components/common/PriceImpactSlider';
import {
	computeBuyCostPreview,
	computeSellPayoutPreview,
} from '@/utils/bondingCurve.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

describe('PriceImpactSlider', () => {
	it('renders the buy preview for the initial quantity', () => {
		render(
			<PriceImpactSlider side="buy" currentSupply={100n} feeBps={250n} />
		);

		const expected = computeBuyCostPreview(100n, 1n, 250n);
		expect(screen.getByTestId('price-impact-gross')).toHaveTextContent(
			formatDisplayKeyPrice(Number(expected.grossCost))
		);
		expect(screen.getByTestId('price-impact-net')).toHaveTextContent(
			formatDisplayKeyPrice(Number(expected.netCost))
		);
	});

	it('renders the sell preview for the initial quantity', () => {
		render(
			<PriceImpactSlider side="sell" currentSupply={100n} feeBps={250n} />
		);

		const expected = computeSellPayoutPreview(100n, 1n, 250n);
		expect(screen.getByTestId('price-impact-gross')).toHaveTextContent(
			formatDisplayKeyPrice(Number(expected.grossPayout))
		);
		expect(screen.getByTestId('price-impact-net')).toHaveTextContent(
			formatDisplayKeyPrice(Number(expected.netPayout))
		);
	});

	it('recomputes synchronously when the slider moves', () => {
		render(
			<PriceImpactSlider side="buy" currentSupply={100n} feeBps={250n} />
		);

		const slider = screen.getByTestId('price-impact-quantity-slider');
		fireEvent.change(slider, { target: { value: '50' } });

		const expected = computeBuyCostPreview(100n, 50n, 250n);
		expect(screen.getByTestId('price-impact-gross')).toHaveTextContent(
			formatDisplayKeyPrice(Number(expected.grossCost))
		);
	});

	it('keeps the numeric input and slider in sync', () => {
		render(
			<PriceImpactSlider side="buy" currentSupply={100n} feeBps={250n} />
		);

		const input = screen.getByTestId(
			'price-impact-quantity-input'
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: '25' } });

		const slider = screen.getByTestId(
			'price-impact-quantity-slider'
		) as HTMLInputElement;
		expect(slider.value).toBe('25');
	});

	it('clamps the slider range to at most 500', () => {
		render(
			<PriceImpactSlider side="buy" currentSupply={10_000n} feeBps={250n} />
		);

		const slider = screen.getByTestId(
			'price-impact-quantity-slider'
		) as HTMLInputElement;
		expect(slider.max).toBe('500');
	});

	it('clamps the slider range to the available supply when smaller than 500', () => {
		render(
			<PriceImpactSlider side="sell" currentSupply={20n} feeBps={250n} />
		);

		const slider = screen.getByTestId(
			'price-impact-quantity-slider'
		) as HTMLInputElement;
		expect(slider.max).toBe('20');
	});

	it('colour-codes the slippage badge green under 1%', () => {
		render(
			<PriceImpactSlider side="buy" currentSupply={1_000_000n} feeBps={0n} />
		);

		const badge = screen.getByTestId('price-impact-slippage-badge');
		expect(badge).toHaveAttribute('data-severity', 'low');
	});

	it('colour-codes the slippage badge red over 5%', () => {
		// A supply just above 500 keeps the slider's max at 500 (capped by
		// availableSupply) while still letting a near-max quantity move the
		// price far enough to land in the red >5% band.
		render(<PriceImpactSlider side="buy" currentSupply={600n} feeBps={0n} />);

		const slider = screen.getByTestId('price-impact-quantity-slider');
		fireEvent.change(slider, { target: { value: '500' } });

		const badge = screen.getByTestId('price-impact-slippage-badge');
		expect(badge).toHaveAttribute('data-severity', 'high');
	});

	it('shows the worst-case XLM figure for a buy, including the buffer', () => {
		render(
			<PriceImpactSlider
				side="buy"
				currentSupply={100n}
				feeBps={250n}
				worstCaseBufferBps={50n}
			/>
		);

		expect(screen.getByTestId('price-impact-worst-case')).toHaveTextContent(
			'0.5%'
		);
	});

	it('does not show a worst-case figure for a sell', () => {
		render(
			<PriceImpactSlider side="sell" currentSupply={100n} feeBps={250n} />
		);

		expect(
			screen.queryByTestId('price-impact-worst-case')
		).not.toBeInTheDocument();
	});

	it('calls onQuantityChange when the slider moves', () => {
		let lastQuantity: number | null = null;
		render(
			<PriceImpactSlider
				side="buy"
				currentSupply={100n}
				feeBps={250n}
				onQuantityChange={q => {
					lastQuantity = q;
				}}
			/>
		);

		const slider = screen.getByTestId('price-impact-quantity-slider');
		fireEvent.change(slider, { target: { value: '42' } });

		expect(lastQuantity).toBe(42);
	});
});
