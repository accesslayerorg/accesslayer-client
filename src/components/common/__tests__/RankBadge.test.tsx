import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RankBadge from '../RankBadge';

describe('RankBadge', () => {
	describe('Medal icons for top 3 ranks', () => {
		it('renders gold medal for rank 1', () => {
			render(<RankBadge rank={1} />);
			const badge = screen.getByTestId('rank-badge');
			const medal = screen.getByTestId('rank-1-medal');

			// Verify medal element exists
			expect(medal).toBeInTheDocument();

			// Verify gold color (amber)
			expect(medal).toHaveClass('text-amber-500');

			// Verify "Top" label for rank 1
			expect(badge).toHaveTextContent('Top');
		});

		it('renders silver medal for rank 2', () => {
			render(<RankBadge rank={2} />);
			const badge = screen.getByTestId('rank-badge');
			const medal = screen.getByTestId('rank-2-medal');

			// Verify medal element exists
			expect(medal).toBeInTheDocument();

			// Verify silver color (gray)
			expect(medal).toHaveClass('text-gray-400');

			// Verify "2nd" label for rank 2
			expect(badge).toHaveTextContent('2nd');
		});

		it('renders bronze medal for rank 3', () => {
			render(<RankBadge rank={3} />);
			const badge = screen.getByTestId('rank-badge');
			const medal = screen.getByTestId('rank-3-medal');

			// Verify medal element exists
			expect(medal).toBeInTheDocument();

			// Verify bronze color (amber-700)
			expect(medal).toHaveClass('text-amber-700');

			// Verify "3rd" label for rank 3
			expect(badge).toHaveTextContent('3rd');
		});
	});

	describe('Plain numbers for rank 4+', () => {
		it('renders number for rank 4', () => {
			render(<RankBadge rank={4} />);
			const badge = screen.getByTestId('rank-badge');

			// Verify no medal icon is rendered for rank 4
			expect(screen.queryByTestId('rank-4-medal')).not.toBeInTheDocument();

			// Verify "#4" text is displayed
			expect(badge).toHaveTextContent('#4');
		});

		it('renders number for rank 5', () => {
			render(<RankBadge rank={5} />);
			const badge = screen.getByTestId('rank-badge');

			// Verify no medal icon
			expect(screen.queryByTestId('rank-5-medal')).not.toBeInTheDocument();

			// Verify "#5" text
			expect(badge).toHaveTextContent('#5');
		});

		it('renders number for rank 10', () => {
			render(<RankBadge rank={10} />);
			const badge = screen.getByTestId('rank-badge');

			expect(screen.queryByTestId('rank-10-medal')).not.toBeInTheDocument();
			expect(badge).toHaveTextContent('#10');
		});

		it('renders number for rank 100', () => {
			render(<RankBadge rank={100} />);
			const badge = screen.getByTestId('rank-badge');

			expect(screen.queryByTestId('rank-100-medal')).not.toBeInTheDocument();
			expect(badge).toHaveTextContent('#100');
		});
	});

	describe('Accessibility', () => {
		it('provides accessible label for rank 1 (gold medal)', () => {
			render(<RankBadge rank={1} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveAttribute('aria-label', 'Rank 1 - Gold medal');
		});

		it('provides accessible label for rank 2 (silver medal)', () => {
			render(<RankBadge rank={2} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveAttribute('aria-label', 'Rank 2 - Silver medal');
		});

		it('provides accessible label for rank 3 (bronze medal)', () => {
			render(<RankBadge rank={3} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveAttribute('aria-label', 'Rank 3 - Bronze medal');
		});

		it('provides accessible label for rank 4+', () => {
			render(<RankBadge rank={4} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveAttribute('aria-label', 'Rank 4');
		});
	});

	describe('Styling and layout', () => {
		it('applies base badge classes to all ranks', () => {
			const { rerender } = render(<RankBadge rank={1} />);
			let badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1', 'rounded-full', 'px-2.5', 'py-0.5');

			rerender(<RankBadge rank={4} />);
			badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1', 'rounded-full', 'px-2.5', 'py-0.5');
		});

		it('applies gold background for rank 1', () => {
			render(<RankBadge rank={1} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('bg-amber-100');
		});

		it('applies silver background for rank 2', () => {
			render(<RankBadge rank={2} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('bg-gray-100');
		});

		it('applies bronze background for rank 3', () => {
			render(<RankBadge rank={3} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('bg-amber-50');
		});

		it('applies gray background for rank 4+', () => {
			render(<RankBadge rank={4} />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('bg-gray-100');
		});
	});

	describe('Custom props', () => {
		it('accepts custom className prop', () => {
			render(<RankBadge rank={1} className="custom-class" />);
			const badge = screen.getByTestId('rank-badge');

			expect(badge).toHaveClass('custom-class');
		});

		it('accepts custom dataTestid prop', () => {
			render(<RankBadge rank={1} dataTestid="custom-test-id" />);

			expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
			expect(screen.queryByTestId('rank-badge')).not.toBeInTheDocument();
		});
	});

	describe('Error handling', () => {
		it('does not throw error for rank 1', () => {
			expect(() => render(<RankBadge rank={1} />)).not.toThrow();
		});

		it('does not throw error for rank 2', () => {
			expect(() => render(<RankBadge rank={2} />)).not.toThrow();
		});

		it('does not throw error for rank 3', () => {
			expect(() => render(<RankBadge rank={3} />)).not.toThrow();
		});

		it('does not throw error for rank 4', () => {
			expect(() => render(<RankBadge rank={4} />)).not.toThrow();
		});

		it('does not throw error for rank 100', () => {
			expect(() => render(<RankBadge rank={100} />)).not.toThrow();
		});

		it('does not throw error for rank 1000', () => {
			expect(() => render(<RankBadge rank={1000} />)).not.toThrow();
		});
	});

	describe('Medal icon properties', () => {
		it('renders medal with fill and current color for rank 1', () => {
			render(<RankBadge rank={1} />);
			const medal = screen.getByTestId('rank-1-medal');

			// Medal should have fill class for solid appearance
			expect(medal).toHaveClass('fill-current');

			// Medal should maintain color from parent
			expect(medal).toHaveClass('text-amber-500');
		});

		it('renders medal with size class', () => {
			render(<RankBadge rank={1} />);
			const medal = screen.getByTestId('rank-1-medal');

			expect(medal).toHaveClass('size-3');
		});
	});
});
