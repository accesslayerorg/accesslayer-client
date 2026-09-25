import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Change24hBadge from '../Change24hBadge';

describe('Change24hBadge', () => {
	describe('positive change', () => {
		it('renders green badge with up arrow for positive value', () => {
			render(<Change24hBadge change={5.25} />);

			const badge = screen.getByText('+5.25%');
			expect(badge).toBeInTheDocument();
			expect(badge.closest('div')).toHaveClass('text-emerald-400');
		});

		it('formats positive value to two decimal places with sign', () => {
			render(<Change24hBadge change={3.456} />);
			expect(screen.getByText('+3.46%')).toBeInTheDocument();
		});

		it('shows TrendingUp icon for positive change', () => {
			const { container } = render(<Change24hBadge change={10} />);
			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();
			expect(svg).toHaveClass('lucide-trending-up');
		});
	});

	describe('negative change', () => {
		it('renders red badge with down arrow for negative value', () => {
			render(<Change24hBadge change={-2.1} />);

			const badge = screen.getByText('-2.1%');
			expect(badge).toBeInTheDocument();
			expect(badge.closest('div')).toHaveClass('text-red-400');
		});

		it('formats negative value to two decimal places', () => {
			render(<Change24hBadge change={-0.123} />);
			expect(screen.getByText('-0.12%')).toBeInTheDocument();
		});

		it('shows TrendingDown icon for negative change', () => {
			const { container } = render(<Change24hBadge change={-5} />);
			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();
			expect(svg).toHaveClass('lucide-trending-down');
		});
	});

	describe('zero change', () => {
		it('renders grey badge with dash for zero value', () => {
			render(<Change24hBadge change={0} />);

			const badge = screen.getByText('0%');
			expect(badge).toBeInTheDocument();
			expect(badge.closest('div')).toHaveClass('text-white/40');
		});

		it('shows Minus icon for zero change', () => {
			const { container } = render(<Change24hBadge change={0} />);
			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();
			expect(svg).toHaveClass('lucide-minus');
		});
	});

	describe('null / undefined (no data)', () => {
		it('renders nothing when change is undefined', () => {
			const { container } = render(<Change24hBadge />);
			expect(container.innerHTML).toBe('');
		});

		it('renders nothing when change is explicitly null', () => {
			const { container } = render(<Change24hBadge change={null} />);
			expect(container.innerHTML).toBe('');
		});
	});

	describe('edge cases', () => {
		it('renders correct badge for very small positive value', () => {
			render(<Change24hBadge change={0.01} />);
			expect(screen.getByText('+0.01%')).toBeInTheDocument();
		});

		it('renders correct badge for very small negative value', () => {
			render(<Change24hBadge change={-0.01} />);
			expect(screen.getByText('-0.01%')).toBeInTheDocument();
		});

		it('applies custom className', () => {
			render(<Change24hBadge change={1} className="my-custom-class" />);
			const badge = screen.getByText('+1%').closest('div');
			expect(badge).toHaveClass('my-custom-class');
		});

		it('includes accessible title with 24h context', () => {
			render(<Change24hBadge change={5} />);
			expect(screen.getByTitle('+5% (24h)')).toBeInTheDocument();
		});
	});
});
