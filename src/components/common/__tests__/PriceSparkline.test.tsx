import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceSparkline } from '../PriceSparkline';

describe('PriceSparkline', () => {
	describe('rendering', () => {
		it('renders an SVG path for 7 data points', () => {
			const { container } = render(
				<PriceSparkline
					dataPoints={[10, 20, 15, 25, 30, 22, 35]}
				/>
			);

			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();

			const path = container.querySelector('path');
			expect(path).toBeInTheDocument();
			expect(path).toHaveAttribute('d');
		});

		it('renders without error for 1 data point and does not produce a line path', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[42]} />
			);

			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();

			const path = container.querySelector('path');
			expect(path).not.toBeInTheDocument();
		});

		it('renders nothing for 0 data points', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[]} />
			);

			expect(container.innerHTML).toBe('');
		});
	});

	describe('line colour', () => {
		it('returns green for a rising history (last > first)', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[10, 20, 30]} />
			);

			const path = container.querySelector('path');
			expect(path).toHaveAttribute('stroke', '#34d399');
		});

		it('returns red for a falling history (last < first)', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[30, 20, 10]} />
			);

			const path = container.querySelector('path');
			expect(path).toHaveAttribute('stroke', '#ef4444');
		});

		it('returns neutral for a flat history (last === first)', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[15, 25, 15]} />
			);

			const path = container.querySelector('path');
			expect(path).toHaveAttribute('stroke', 'currentColor');
		});

		it('returns neutral for a single-element history', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[42]} />
			);

			const circle = container.querySelector('circle');
			expect(circle).toHaveAttribute('fill', 'currentColor');
		});

		it('returns neutral for an empty history (renders nothing)', () => {
			const { container } = render(
				<PriceSparkline dataPoints={[]} />
			);

			expect(container.innerHTML).toBe('');
		});
	});
});
