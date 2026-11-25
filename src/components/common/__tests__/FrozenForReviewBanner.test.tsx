import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FrozenForReviewBanner from '../FrozenForReviewBanner';

describe('FrozenForReviewBanner (#1386)', () => {
	it('renders nothing while the key is not frozen', () => {
		const { container } = render(
			<FrozenForReviewBanner autoFrozen={false} flagCount={1} threshold={5} />
		);

		expect(container.firstChild).toBeNull();
		expect(
			screen.queryByTestId('frozen-for-review-banner')
		).not.toBeInTheDocument();
	});

	it('shows the freeze state with the review status and flag counts', () => {
		render(
			<FrozenForReviewBanner
				autoFrozen
				reviewStatus="in_review"
				flagCount={5}
				threshold={5}
				frozenAt="2026-11-18T09:00:00.000Z"
			/>
		);

		expect(screen.getByTestId('frozen-for-review-banner')).toBeInTheDocument();
		expect(screen.getByTestId('frozen-review-status')).toHaveTextContent(
			/Review in progress/i
		);
		expect(
			screen.getByTestId('frozen-trading-explanation')
		).toHaveTextContent(/Buying and selling are disabled/i);
		expect(
			screen.getByTestId('frozen-trading-explanation')
		).toHaveTextContent('(5 of 5)');
		expect(screen.getByTestId('frozen-since')).not.toBeEmptyDOMElement();
	});

	it('falls back to a pending review label when no status is reported', () => {
		render(<FrozenForReviewBanner autoFrozen />);

		expect(screen.getByTestId('frozen-review-status')).toHaveTextContent(
			/Awaiting reviewer assignment/i
		);
		expect(screen.getByTestId('frozen-since')).toHaveTextContent(
			/Pending timestamp/i
		);
	});
});
