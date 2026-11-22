import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CurveSimulator from '@/components/learn/CurveSimulator';
import { DEFAULT_BONDING_CURVE_PARAMS } from '@/utils/bondingCurve.utils';

const props = {
	params: DEFAULT_BONDING_CURVE_PARAMS,
	currentSupply: 10,
	protocolFeeBps: 100,
	creatorFeeBps: 200,
};

describe('CurveSimulator (#1411)', () => {
	it('moves the marker with the supply slider and updates the live price', () => {
		render(<CurveSimulator {...props} />);
		expect(screen.getByTestId('curve-marker-values')).toHaveTextContent('10');

		fireEvent.change(screen.getByTestId('curve-supply-slider'), {
			target: { value: '50' },
		});

		expect(screen.getByTestId('curve-marker-values')).toHaveTextContent('50');
		expect(screen.getByTestId('curve-live-price')).toHaveTextContent('1.5 XLM');
		expect(screen.getByTestId('curve-price-line')).toBeInTheDocument();
	});

	it('updates the quote when quantity and trade side change', () => {
		render(<CurveSimulator {...props} />);
		const one = screen.getByTestId('curve-quote-total').textContent;

		fireEvent.change(screen.getByTestId('curve-quantity'), {
			target: { value: '5' },
		});
		const five = screen.getByTestId('curve-quote-total').textContent;
		expect(five).not.toBe(one);
		expect(screen.getByTestId('curve-quote-impact')).toHaveTextContent('%');

		fireEvent.click(screen.getByTestId('curve-side-sell'));
		expect(screen.getByTestId('curve-quote')).toHaveTextContent('Total payout');
	});

	it('compares a single trade with several smaller trades', () => {
		render(<CurveSimulator {...props} />);
		fireEvent.change(screen.getByTestId('curve-quantity'), {
			target: { value: '5' },
		});
		fireEvent.change(screen.getByTestId('curve-chunk-count'), {
			target: { value: '5' },
		});
		expect(screen.getByTestId('curve-split-comparison')).toHaveTextContent(
			'5 smaller trades cost'
		);
	});
});
