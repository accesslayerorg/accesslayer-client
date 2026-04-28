import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorSocialLinksList from '../CreatorSocialLinksList';

describe('CreatorSocialLinksList', () => {
	it('renders link-only action chips with keyboard-visible focus styling hook', () => {
		render(<CreatorSocialLinksList handle="creator" />);

		const xLink = screen.getByRole('link', { name: /x/i });
		expect(xLink.className).toContain('link-action-chip');
		expect(xLink.className).toContain('hover:border-amber-400/40');
	});
});
