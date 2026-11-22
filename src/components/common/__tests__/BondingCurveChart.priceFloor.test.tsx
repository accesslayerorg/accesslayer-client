import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BondingCurveChart, { CustomTooltip } from '../BondingCurveChart';

vi.mock('recharts', async importOriginal => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(({ children }: { children?: ReactNode }) => (
			<div data-testid="responsive-container">{children}</div>
		)),
		LineChart: vi.fn(
			({
				children,
				data,
			}: {
				children?: ReactNode;
				data?: unknown;
			}) => (
				<div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
					{children}
				</div>
			)
		),
		ReferenceLine: vi.fn(
			({
				y,
				label,
				'data-testid': testId,
				stroke,
				strokeDasharray,
			}: {
				y?: number;
				label?: { value?: string } | string;
				'data-testid'?: string;
				stroke?: string;
				strokeDasharray?: string;
			}) => {
				const labelVal = typeof label === 'object' ? label?.value : label;
				return (
					<div
						data-testid={testId || `reference-line-${y}`}
						data-y={y}
						data-label={labelVal}
						data-stroke={stroke}
						data-stroke-dasharray={strokeDasharray}
					>
						{labelVal}
					</div>
				);
			}
		),
	};
});

describe('BondingCurveChart Price Floor Indicator (#1152)', () => {
	const mockData = [
		{ supply: 20, priceXLM: 0.1 },
		{ supply: 40, priceXLM: 0.12 },
		{ supply: 60, priceXLM: 0.15 },
		{ supply: 80, priceXLM: 0.2 },
	];

	it('renders horizontal dashed price floor line and legend indicator when priceFloorStroops is provided', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				priceFloorStroops={1_200_000}
			/>
		);

		// Reference line for price floor
		const floorLine = screen.getByTestId('price-floor-line');
		expect(floorLine).toBeInTheDocument();
		expect(floorLine).toHaveAttribute('data-stroke', '#f43f5e');
		expect(floorLine).toHaveAttribute('data-stroke-dasharray', '4 4');

		// Legend indicator
		expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
		const floorLegend = screen.getByTestId('price-floor-legend-indicator');
		expect(floorLegend).toBeInTheDocument();
		expect(screen.getByTestId('price-floor-label')).toHaveTextContent(/0\.12 XLM/i);
	});

	it('hides price floor line and legend indicator when no price floor is set (null or undefined)', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				priceFloorStroops={null}
			/>
		);

		expect(screen.queryByTestId('price-floor-line')).not.toBeInTheDocument();
		expect(screen.queryByTestId('price-floor-legend-indicator')).not.toBeInTheDocument();
	});

	it('hides price floor line when priceFloorStroops is 0', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				priceFloorStroops={0}
			/>
		);

		expect(screen.queryByTestId('price-floor-line')).not.toBeInTheDocument();
		expect(screen.queryByTestId('price-floor-legend-indicator')).not.toBeInTheDocument();
	});

	it('renders price floor inside custom tooltip when priceFloorStroops is present', () => {
		render(
			<CustomTooltip
				active={true}
				payload={[
					{
						payload: {
							supply: 60,
							priceStroops: 1_500_000,
						},
					},
				]}
				spotPriceStroops={1_500_000}
				priceFloorStroops={1_200_000}
			/>
		);

		expect(screen.getByTestId('bonding-curve-tooltip')).toBeInTheDocument();
		const tooltipFloor = screen.getByTestId('tooltip-price-floor');
		expect(tooltipFloor).toBeInTheDocument();
		expect(tooltipFloor).toHaveTextContent(/0\.12 XLM/i);
	});
});
