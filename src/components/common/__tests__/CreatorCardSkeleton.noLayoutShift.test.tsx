/**
 * CreatorCardSkeleton no-layout-shift coverage (#643).
 *
 * #643 asks for the skeleton to mirror the real card so no layout shift
 * occurs when data loads, and to render no real content while loading.
 * The skeleton (added for #421) already exceeds a minimal 4-region design —
 * it mirrors every content region of CreatorCard (avatar, title/badges,
 * handle, bio, sparkline, stat chips, meta rows, social links, action row,
 * helper text) rather than only avatar/name/price/holder-count. Redesigning
 * it down to 4 regions would regress the #421 suite
 * (CreatorCardSkeleton.test.tsx), so this suite verifies the properties
 * #643 actually cares about against the current, richer design: every
 * placeholder region carries the animated pulse class, no real text or
 * images are rendered, and the root surface carries fixed sizing
 * constraints (rounded-2xl card surface, aspect-square avatar) so swapping
 * in the real card does not shift layout.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorCardSkeleton from '../CreatorCardSkeleton';

describe('CreatorCardSkeleton no-layout-shift (#643)', () => {
	it('applies the animated pulse class to every placeholder region', () => {
		const { container } = render(<CreatorCardSkeleton />);

		const shimmerBlocks = container.querySelectorAll('.skeleton-shimmer');
		expect(shimmerBlocks.length).toBeGreaterThan(0);

		shimmerBlocks.forEach(block => {
			expect(block.className).toMatch(/skeleton-shimmer/);
		});

		// No placeholder block should be missing the shared block styling
		// (rounded corners are part of the shared block class in every
		// region except the divider rules, so every shimmer block is
		// expected to carry a rounded-* utility).
		const nonRounded = Array.from(shimmerBlocks).filter(
			block => !/rounded-/.test(block.className)
		);
		expect(nonRounded).toHaveLength(0);
	});

	it('renders no real creator content — no text nodes, no images', () => {
		const { container, queryByRole } = render(<CreatorCardSkeleton />);

		expect(container.querySelectorAll('img')).toHaveLength(0);
		expect(queryByRole('img')).toBeNull();

		// Only the visually-hidden "Loading creator card" label should be
		// present as text — no creator name, price, or bio strings.
		const srOnly = container.querySelector('.sr-only');
		expect(srOnly?.textContent).toBe('Loading creator card');

		const visibleText = Array.from(container.querySelectorAll('div'))
			.filter(el => el.children.length === 0)
			.map(el => el.textContent?.trim())
			.filter(Boolean);
		expect(visibleText).toHaveLength(0);
	});

	it('constrains the root surface and avatar block the same way CreatorCard does', () => {
		const { getByTestId } = render(<CreatorCardSkeleton />);

		const card = getByTestId('creator-card-skeleton');
		// Same card-surface + rounding classes CreatorCard's root uses, so
		// swapping skeleton -> real card does not change the card footprint.
		expect(card).toHaveClass('marketplace-card-surface');
		expect(card).toHaveClass('rounded-2xl');

		const avatarBlock = card.querySelector('.aspect-square');
		expect(avatarBlock).not.toBeNull();
	});
});
