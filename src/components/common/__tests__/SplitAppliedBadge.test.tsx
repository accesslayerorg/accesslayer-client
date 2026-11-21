import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SplitAppliedBadge from '../SplitAppliedBadge';

describe('SplitAppliedBadge', () => {
	it('renders Split Applied text and has data-testid="split-applied-badge"', () => {
		render(<SplitAppliedBadge />);

		const badge = screen.getByTestId('split-applied-badge');
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveTextContent('Split Applied');
	});

	it('applies custom className and title', () => {
		render(
			<SplitAppliedBadge
				className="custom-class"
				title="Custom title tooltip"
			/>
		);

		const badge = screen.getByTestId('split-applied-badge');
		expect(badge).toHaveClass('custom-class');
		expect(badge).toHaveAttribute('title', 'Custom title tooltip');
	});
});
