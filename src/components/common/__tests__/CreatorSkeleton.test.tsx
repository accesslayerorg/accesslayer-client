import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorSkeleton, { CreatorGridSkeleton } from '../CreatorSkeleton';

describe('CreatorSkeleton', () => {
	it('renders shimmer blocks for loading affordance', () => {
		const { container } = render(<CreatorSkeleton />);
		const shimmerBlocks = container.querySelectorAll('.skeleton-shimmer');

		expect(shimmerBlocks).toHaveLength(6);
	});

	it('renders the requested number of cards in grid skeleton', () => {
		const { container } = render(<CreatorGridSkeleton count={3} />);
		const shimmerBlocks = container.querySelectorAll('.skeleton-shimmer');

		expect(shimmerBlocks).toHaveLength(18);
	});
});
