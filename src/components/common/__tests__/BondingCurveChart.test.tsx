import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BondingCurveChart, type BondingCurveDataPoint } from '../BondingCurveChart';
import * as recharts from 'recharts';

// Mock Recharts library to inspect parameters and test data shapes
vi.mock('recharts', async (importOriginal) => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(
			({
				children,
				width,
				height,
			}: {
				children?: ReactNode;
				width?: string | number;
				height?: string | number;
			}) => (
				<div data-testid="responsive-container" data-width={width} data-height={height}>
					{children}
				</div>
			)
		),
		LineChart: vi.fn(
			({
				children,
				data,
				'data-testid': testId,
			}: {
				children?: ReactNode;
				data?: unknown;
				'data-testid'?: string;
			}) => (
				<div data-testid={testId || 'line-chart'} data-data-shape={JSON.stringify(data)}>
					{children}
				</div>
			)
		),
		XAxis: vi.fn(
			({
				dataKey,
				domain,
				'data-testid': testId,
			}: {
				dataKey?: string;
				domain?: unknown;
				'data-testid'?: string;
			}) => (
				<div
					data-testid={testId || 'x-axis'}
					data-datakey={dataKey}
					data-domain={JSON.stringify(domain)}
				/>
			)
		),
		YAxis: vi.fn(
			({ dataKey, 'data-testid': testId }: { dataKey?: string; 'data-testid'?: string }) => (
				<div data-testid={testId || 'y-axis'} data-datakey={dataKey} />
			)
		),
		Tooltip: vi.fn(() => <div data-testid="tooltip" />),
		CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
		Line: vi.fn(({ dataKey }: { dataKey?: string }) => (
			<div data-testid="line" data-datakey={dataKey} />
		)),
		ReferenceDot: vi.fn(
			({
				x,
				y,
				className,
				'data-testid': testId,
			}: {
				x?: number;
				y?: number;
				className?: string;
				'data-testid'?: string;
			}) => (
				<div
					data-testid={testId || 'reference-dot'}
					className={className}
					data-x={x}
					data-y={y}
				/>
			)
		),
	};
});

describe('BondingCurveChart', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders a message "No data" when given an empty data array', () => {
		render(<BondingCurveChart data={[]} />);

		expect(screen.getByText('No data')).toBeInTheDocument();
		expect(screen.getByTestId('no-data-message')).toBeInTheDocument();
	});

	it('renders a message "No data" when data prop is undefined', () => {
		render(<BondingCurveChart data={undefined} />);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});

	it('renders the chart container with exactly N data points when given N data points for supply N', () => {
		const sampleData: BondingCurveDataPoint[] = [
			{ supply: 1, priceXLM: 1.01 },
			{ supply: 2, priceXLM: 1.02 },
			{ supply: 3, priceXLM: 1.03 },
			{ supply: 4, priceXLM: 1.04 },
			{ supply: 5, priceXLM: 1.05 },
		];

		render(<BondingCurveChart data={sampleData} currentSupply={5} />);

		const chartElement = screen.getByTestId('bonding-curve-chart');
		expect(chartElement).toBeInTheDocument();
		expect(chartElement).toHaveAttribute('data-datapoints-count', '5');

		// Assert LineChart mock received all 5 data points
		const lineChartMock = vi.mocked(recharts.LineChart);
		expect(lineChartMock).toHaveBeenCalled();
		const lineChartProps = lineChartMock.mock.calls[0][0];
		expect(lineChartProps.data).toHaveLength(5);
		expect(lineChartProps.data).toEqual(sampleData);
	});

	it('sets the x-axis maximum to equal the current supply value', () => {
		const sampleData: BondingCurveDataPoint[] = [
			{ supply: 1, priceXLM: 1.1 },
			{ supply: 2, priceXLM: 1.2 },
			{ supply: 3, priceXLM: 1.3 },
		];
		const currentSupply = 25;

		render(<BondingCurveChart data={sampleData} currentSupply={currentSupply} />);

		const chartElement = screen.getByTestId('bonding-curve-chart');
		expect(chartElement).toHaveAttribute('data-xaxis-max', '25');

		const xAxisMock = vi.mocked(recharts.XAxis);
		expect(xAxisMock).toHaveBeenCalled();
		const xAxisProps = xAxisMock.mock.calls[0][0];
		expect(xAxisProps.domain).toEqual([0, 25]);
	});

	it('marks the current price point with a distinct highlight class', () => {
		const sampleData: BondingCurveDataPoint[] = [
			{ supply: 1, priceXLM: 1.0 },
			{ supply: 2, priceXLM: 1.1, isCurrent: true },
			{ supply: 3, priceXLM: 1.2 },
		];

		render(<BondingCurveChart data={sampleData} currentSupply={2} />);

		// Check reference dot rendered for current point has highlight class
		const referenceDot = screen.getByTestId('reference-current-dot');
		expect(referenceDot).toBeInTheDocument();
		expect(referenceDot).toHaveClass('current-price-highlight');
		expect(referenceDot).toHaveClass('highlight');
		expect(referenceDot).toHaveAttribute('data-x', '2');
		expect(referenceDot).toHaveAttribute('data-y', '1.1');
	});

	it('mocks the chart library and asserts it is called with the correct data shape', () => {
		const sampleData: BondingCurveDataPoint[] = [
			{ supply: 10, priceXLM: 1.5 },
			{ supply: 20, priceXLM: 2.0, isCurrent: true },
		];

		render(<BondingCurveChart data={sampleData} currentSupply={20} />);

		// Verify ResponsiveContainer was invoked
		expect(recharts.ResponsiveContainer).toHaveBeenCalled();

		// Verify LineChart was invoked with correct data shape { supply: number, priceXLM: number }
		const lineChartMock = vi.mocked(recharts.LineChart);
		expect(lineChartMock).toHaveBeenCalled();
		const firstCallProps = lineChartMock.mock.calls[0][0];
		expect(firstCallProps.data).toEqual([
			{ supply: 10, priceXLM: 1.5 },
			{ supply: 20, priceXLM: 2.0, isCurrent: true },
		]);
	});
});
