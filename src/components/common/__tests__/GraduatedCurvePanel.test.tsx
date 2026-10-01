import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GraduatedCurvePanel, { type GraduatedCurveMilestone } from '../GraduatedCurvePanel';

vi.mock('@/components/common/BondingCurveChart', () => ({
	BondingCurveChart: ({ data }: { data: unknown[] }) => (
		<div data-testid="mock-graduated-chart" data-points={JSON.stringify(data)} />
	),
}));

describe('GraduatedCurvePanel', () => {
	it('limits the configuration to five milestone rows', async () => {
		const user = userEvent.setup();
		render(<GraduatedCurvePanel onSubmit={vi.fn()} />);

		const addButton = screen.getByTestId('graduated-add-milestone');
		for (let index = 0; index < 4; index += 1) await user.click(addButton);

		expect(screen.getAllByLabelText(/supply threshold/)).toHaveLength(5);
		expect(addButton).toBeDisabled();
	});

	it('blocks out-of-order thresholds and disables submit', async () => {
		const user = userEvent.setup();
		render(<GraduatedCurvePanel onSubmit={vi.fn()} />);

		await user.type(screen.getByTestId('graduated-supply-0'), '100');
		await user.click(screen.getByTestId('graduated-add-milestone'));
		await user.type(screen.getByTestId('graduated-supply-1'), '50');

		expect(screen.getByTestId('graduated-curve-submit')).toBeDisabled();
		expect(screen.getByTestId('graduated-curve-error')).toHaveTextContent(
			'Supply thresholds must be in ascending order'
		);
	});

	it('updates the preview and submits valid milestones', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(milestones: GraduatedCurveMilestone[]) => void>();
		render(<GraduatedCurvePanel onSubmit={onSubmit} />);

		await user.type(screen.getByTestId('graduated-supply-0'), '100');
		const initialPreview = screen.getByTestId('mock-graduated-chart').getAttribute('data-points');
		await user.clear(screen.getByTestId('graduated-exponent-0'));
		await user.type(screen.getByTestId('graduated-exponent-0'), '3');
		const updatedPreview = screen.getByTestId('mock-graduated-chart').getAttribute('data-points');

		expect(initialPreview).not.toBe(updatedPreview);
		expect(screen.getByTestId('graduated-curve-submit')).not.toBeDisabled();
		await user.click(screen.getByTestId('graduated-curve-submit'));
		expect(onSubmit).toHaveBeenCalledWith([{ supply: 100, exponent: 3 }]);
	});
});