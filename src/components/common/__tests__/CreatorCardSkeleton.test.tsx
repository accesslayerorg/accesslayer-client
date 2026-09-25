import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorCardSkeleton, {
	CreatorCardGridSkeleton,
} from '../CreatorCardSkeleton';

describe('CreatorCardSkeleton', () => {
	it('renders shimmer blocks for the loading affordance', () => {
		const { container, getByRole, getAllByTestId } = render(
			<CreatorCardSkeleton />
		);

		// role="status" announces loading to assistive tech.
		expect(
			getByRole('status', { name: 'Loading creator card' })
		).toBeInTheDocument();

		// Sanity-check that the card test id is exposed so other
		// components / tests can target a single placeholder card.
		expect(getAllByTestId('creator-card-skeleton')).toHaveLength(1);

		// Animated shimmer is present by default — many blocks are
		// expected because CreatorCardSkeleton mirrors the full card
		// (avatar, title, badges, handle, bio, sparkline, chips, meta
		// rows, social links, action row, helper text).
		const shimmerBlocks = container.querySelectorAll('.skeleton-shimmer');
		expect(shimmerBlocks.length).toBeGreaterThanOrEqual(10);
	});

	it('disables the shimmer with `disableShimmer` and falls back to the static block', () => {
		const { container } = render(<CreatorCardSkeleton disableShimmer />);

		expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(0);
		expect(
			container.querySelectorAll('.ring-white\\/15').length
		).toBeGreaterThanOrEqual(10);
	});

	it('merges additional className onto the card surface', () => {
		const { container } = render(
			<CreatorCardSkeleton className="custom-class" />
		);

		const card = container.querySelector('[data-testid="creator-card-skeleton"]');
		expect(card).not.toBeNull();
		expect(card).toHaveClass('custom-class');
		expect(card).toHaveClass('rounded-2xl');
	});
});

describe('CreatorCardGridSkeleton', () => {
	it('renders 6 skeletons by default (#421 acceptance criterion)', () => {
		const { container, getAllByTestId, getByTestId } = render(
			<CreatorCardGridSkeleton />
		);

		expect(
			getByTestId('creator-card-grid-skeleton')
		).toBeInTheDocument();
		expect(getAllByTestId('creator-card-skeleton')).toHaveLength(6);
		// Each card contributes at least 10 shimmer blocks, so the grid
		// should expose 60+ shimmer nodes.
		const shimmerBlocks = container.querySelectorAll('.skeleton-shimmer');
		expect(shimmerBlocks.length).toBeGreaterThanOrEqual(60);
	});

	it('renders the requested number of cards', () => {
		const { getAllByTestId } = render(<CreatorCardGridSkeleton count={3} />);
		expect(getAllByTestId('creator-card-skeleton')).toHaveLength(3);
	});

	it('propagates `disableShimmer` to every card in the grid', () => {
		const { container, getAllByTestId } = render(
			<CreatorCardGridSkeleton count={2} disableShimmer />
		);

		expect(getAllByTestId('creator-card-skeleton')).toHaveLength(2);
		expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(0);
		expect(
			container.querySelectorAll('.ring-white\\/15').length
		).toBeGreaterThanOrEqual(20);
	});

	it('applies extra className to the grid wrapper', () => {
		const { getByTestId } = render(
			<CreatorCardGridSkeleton className="extra-grid-class" />
		);
		const grid = getByTestId('creator-card-grid-skeleton');
		expect(grid).toHaveClass('extra-grid-class');
		expect(grid).toHaveClass('grid-cols-1');
	});
});
