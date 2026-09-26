import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraduatedCurveMilestoneChart } from '../GraduatedCurveMilestoneChart';
import type { GraduatedCurveConfig } from '@/services/course.service';
import * as recharts from 'recharts';

// Mock Recharts library to inspect chart parameters and test data shape
vi.mock('recharts', async (importOriginal) => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(
			({ children }: { children?: ReactNode }) => (
				<div data-testid="responsive-container">{children}</div>
			)
		),
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
		XAxis: vi.fn(
			({ dataKey }: { dataKey?: string }) => (
				<div data-testid="x-axis" data-datakey={dataKey} />
			)
		),
		YAxis: vi.fn(
			({ dataKey }: { dataKey?: string }) => (
				<div data-testid="y-axis" data-datakey={dataKey} />
			)
		),
		Tooltip: vi.fn(() => <div data-testid="tooltip" />),
		CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
		Line: vi.fn(
			({ type, dataKey }: { type?: string; dataKey?: string }) => (
				<div data-testid="line" data-type={type} data-datakey={dataKey} />
			)
		),
		ReferenceLine: vi.fn(
			({
				x,
				label,
				'data-testid': testId,
			}: {
				x?: number;
				label?: { value?: string } | string;
				'data-testid'?: string;
			}) => {
				const labelVal = typeof label === 'object' ? label?.value : label;
				return (
					<div
						data-testid={testId || `reference-line-${x}`}
						data-x={x}
						data-label={labelVal}
					>
						{labelVal}
					</div>
				);
			}
		),
	};
});

// Mock react query hook for fetching curve config
vi.mock('@/hooks/useGraduatedCurveConfig', () => ({
	useGraduatedCurveConfig: vi.fn(() => ({
		data: undefined,
		isLoading: false,
	})),
}));

describe('GraduatedCurveMilestoneChart', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows loading skeleton while fetching', () => {
		render(
			<GraduatedCurveMilestoneChart
				keyId="test-key-1"
				overrideLoading={true}
			/>
		);

		expect(screen.getByTestId('graduated-curve-skeleton')).toBeInTheDocument();
		expect(screen.getByText('Loading graduated curve chart')).toBeInTheDocument();
	});

	it('shows empty state "No graduated curve configured — using default exponent" when no milestones exist', () => {
		const emptyConfig: GraduatedCurveConfig = {
			keyId: 'test-key-1',
			hasGraduatedCurve: false,
			milestones: [],
		};

		render(
			<GraduatedCurveMilestoneChart
				keyId="test-key-1"
				overrideConfig={emptyConfig}
			/>
		);

		expect(screen.getByTestId('no-graduated-curve')).toBeInTheDocument();
		expect(
			screen.getByTestId('no-graduated-curve-message')
		).toHaveTextContent('No graduated curve configured — using default exponent');
	});

	it('renders a step chart with correct price values at each milestone', () => {
		const sampleConfig: GraduatedCurveConfig = {
			keyId: 'test-key-1',
			hasGraduatedCurve: true,
			defaultExponent: 1.0,
			milestones: [
				{ supplyThreshold: 10, exponent: 1.2, simulatedPrice: 2.5, exponentChange: '+0.2' },
				{ supplyThreshold: 50, exponent: 1.5, simulatedPrice: 5.0, exponentChange: '+0.3' },
				{ supplyThreshold: 100, exponent: 2.0, simulatedPrice: 10.0, exponentChange: '+0.5' },
			],
		};

		render(
			<GraduatedCurveMilestoneChart
				keyId="test-key-1"
				overrideConfig={sampleConfig}
				currentSupply={45}
			/>
		);

		expect(screen.getByTestId('graduated-curve-chart-container')).toBeInTheDocument();

		// Assert step chart Line component has type="stepAfter" and dataKey="simulatedPrice"
		const lineElement = screen.getByTestId('line');
		expect(lineElement).toHaveAttribute('data-type', 'stepAfter');
		expect(lineElement).toHaveAttribute('data-datakey', 'simulatedPrice');

		// Assert LineChart received correct milestone chart data
		const lineChartMock = vi.mocked(recharts.LineChart);
		expect(lineChartMock).toHaveBeenCalled();
		const chartProps = lineChartMock.mock.calls[0][0];
		expect(chartProps.data).toHaveLength(3);
		expect(chartProps.data).toEqual([
			{ supplyThreshold: 10, exponent: 1.2, simulatedPrice: 2.5, exponentChange: '+0.2' },
			{ supplyThreshold: 50, exponent: 1.5, simulatedPrice: 5.0, exponentChange: '+0.3' },
			{ supplyThreshold: 100, exponent: 2.0, simulatedPrice: 10.0, exponentChange: '+0.5' },
		]);
	});

	it('marks each milestone threshold with vertical dashed lines and labels showing exponent change', () => {
		const sampleConfig: GraduatedCurveConfig = {
			keyId: 'test-key-1',
			hasGraduatedCurve: true,
			milestones: [
				{ supplyThreshold: 10, exponent: 1.2, simulatedPrice: 2.5, exponentChange: '+0.2' },
				{ supplyThreshold: 50, exponent: 1.5, simulatedPrice: 5.0, exponentChange: '+0.3' },
			],
		};

		render(
			<GraduatedCurveMilestoneChart
				keyId="test-key-1"
				overrideConfig={sampleConfig}
			/>
		);

		const milestone10 = screen.getByTestId('milestone-line-10');
		expect(milestone10).toBeInTheDocument();
		expect(milestone10).toHaveAttribute('data-x', '10');
		expect(milestone10).toHaveAttribute('data-label', '+0.2');

		const milestone50 = screen.getByTestId('milestone-line-50');
		expect(milestone50).toBeInTheDocument();
		expect(milestone50).toHaveAttribute('data-x', '50');
		expect(milestone50).toHaveAttribute('data-label', '+0.3');
	});

	it('positions current supply marker correctly', () => {
		const sampleConfig: GraduatedCurveConfig = {
			keyId: 'test-key-1',
			hasGraduatedCurve: true,
			milestones: [
				{ supplyThreshold: 10, exponent: 1.2, simulatedPrice: 2.5 },
				{ supplyThreshold: 50, exponent: 1.5, simulatedPrice: 5.0 },
			],
		};

		render(
			<GraduatedCurveMilestoneChart
				keyId="test-key-1"
				overrideConfig={sampleConfig}
				currentSupply={25}
			/>
		);

		const currentMarker = screen.getByTestId('current-supply-marker');
		expect(currentMarker).toBeInTheDocument();
		expect(currentMarker).toHaveAttribute('data-x', '25');
		expect(currentMarker).toHaveAttribute('data-label', 'Current (25)');
	});
});
