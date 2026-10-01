import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PortfolioHoldingRow from '../PortfolioHoldingRow';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

const STROOPS = 10_000_000;

const creator = {
	id: 'creator-1',
	title: 'Alex Rivers',
	description: 'Artist',
	price: 0.5,
	instructorId: 'inst-1',
	category: 'Art',
	level: 'BEGINNER' as const,
};

const basePosition: HeldKeyPosition = {
	creatorId: 'creator-1',
	quantity: 10,
	priceStroops: 1_200_000,
	last_buy_timestamp: null,
};

const renderRow = (position: HeldKeyPosition) =>
	render(<PortfolioHoldingRow position={position} creator={creator} />);

describe('PortfolioHoldingRow — unrealised P&L (#935)', () => {
	it('shows the unrealised P&L for a profitable position', () => {
		// 10 keys bought at 0.05 XLM, now worth 0.12 XLM each.
		// 1.2 XLM current - 0.5 XLM invested = +0.70 XLM (+140.0%).
		renderRow({ ...basePosition, averagePurchasePriceStroops: 500_000 });

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'+0.70 XLM (+140.0%)'
		);
	});

	it('shows the unrealised P&L for a losing position', () => {
		// 10 keys bought at 0.5 XLM, now worth 0.12 XLM each.
		// 1.2 XLM current - 5 XLM invested = -3.80 XLM (-76.0%).
		renderRow({ ...basePosition, averagePurchasePriceStroops: 5_000_000 });

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'-3.80 XLM (-76.0%)'
		);
	});

	it('marks a gain in green and a loss in red', () => {
		const { rerender } = renderRow({
			...basePosition,
			averagePurchasePriceStroops: 500_000,
		});

		expect(screen.getByTestId('holding-pnl-value')).toHaveAttribute(
			'data-pnl-tone',
			'positive'
		);
		expect(screen.getByTestId('holding-pnl-value').className).toContain(
			'emerald'
		);

		rerender(
			<PortfolioHoldingRow
				position={{
					...basePosition,
					averagePurchasePriceStroops: 5_000_000,
				}}
				creator={creator}
			/>
		);

		expect(screen.getByTestId('holding-pnl-value')).toHaveAttribute(
			'data-pnl-tone',
			'negative'
		);
		expect(screen.getByTestId('holding-pnl-value').className).toContain(
			'red'
		);
	});

	it('shows a neutral zero P&L at break-even', () => {
		renderRow({ ...basePosition, averagePurchasePriceStroops: 1_200_000 });

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'0.00 XLM (0%)'
		);
		expect(screen.getByTestId('holding-pnl-value')).toHaveAttribute(
			'data-pnl-tone',
			'neutral'
		);
	});

	it('displays the average purchase price and current value alongside the P&L', () => {
		renderRow({ ...basePosition, averagePurchasePriceStroops: 500_000 });

		const pnl = screen.getByTestId('holding-pnl');

		expect(pnl).toHaveTextContent('Avg buy 0.05 XLM');
		// 10 keys x 0.12 XLM = 1.2 XLM.
		expect(pnl).toHaveTextContent('Current 1.2 XLM');
	});

	it('values the current amount on the live bonding curve sell price', () => {
		// Curve: 1 XLM base growing 1% per key. At supply 100 the sell price is
		// 2 XLM, so 10 keys are worth 20 XLM against a 0.5 XLM basis
		// (10 keys at 0.05 XLM) => +19.50 XLM.
		renderRow({
			...basePosition,
			currentSupply: 100,
			curveBasePriceStroops: STROOPS,
			curveGrowthFactor: 1.01,
			averagePurchasePriceStroops: 500_000,
		});

		expect(screen.getByTestId('holding-pnl')).toHaveTextContent(
			'Current 20 XLM'
		);
		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'+19.50 XLM (+3900.0%)'
		);
	});

	it('withholds the P&L when the position has no cost basis', () => {
		renderRow(basePosition);

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'No cost basis'
		);
		expect(screen.getByTestId('holding-pnl-value')).toHaveAttribute(
			'data-pnl-tone',
			'neutral'
		);
	});

	it('reports a refreshing price while prices load', () => {
		renderRow({
			...basePosition,
			isPriceLoading: true,
			averagePurchasePriceStroops: 500_000,
		});

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'Refreshing price'
		);
	});

	it('reports an unavailable P&L when the position has no price', () => {
		renderRow({
			creatorId: 'creator-1',
			quantity: 10,
			priceStroops: null,
			price: null,
			averagePurchasePriceStroops: 500_000,
		});

		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'Unavailable'
		);
	});
});
