import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConvictionMeter from '../ConvictionMeter';

describe('ConvictionMeter', () => {
	it('shows conviction relative to the threshold', () => {
		render(
			<ConvictionMeter
				conviction={750}
				threshold={1000}
				totalStake={100}
			/>
		);

		expect(screen.getByTestId('conviction-meter')).toBeInTheDocument();
		expect(screen.getByTestId('conviction-values')).toHaveTextContent('750 / 1,000');
		expect(screen.getByTestId('conviction-percentage')).toHaveTextContent('75.0%');
	});

	it('displays projected crossing time when reachable', () => {
		render(
			<ConvictionMeter
				conviction={200}
				threshold={1000}
				totalStake={150}
				alpha={0.9}
			/>
		);

		const projection = screen.getByTestId('conviction-projection');
		expect(projection).toHaveTextContent(/Estimated crossing/);
	});

	it('indicates when threshold is crossed', () => {
		render(
			<ConvictionMeter
				conviction={1200}
				threshold={1000}
				totalStake={100}
			/>
		);

		expect(screen.getByTestId('conviction-percentage')).toHaveTextContent('100.0%');
		expect(screen.getByTestId('conviction-projection')).toHaveTextContent(
			'Threshold reached - ready to execute'
		);
	});
});
